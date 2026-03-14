"""
Subscription management endpoints.

- GET  /api/subscriptions/me            → current user's active subscription
- POST /api/subscriptions               → admin: activate subscription for a user
- GET  /api/subscriptions               → admin: list all subscriptions
- DELETE /api/subscriptions/{id}        → admin: deactivate a subscription
"""

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import desc
from sqlalchemy.orm import Session

from api.auth import get_current_user, require_role
from api.deps import get_db
from database.models import PLAN_DURATIONS, Subscription, User

router = APIRouter(prefix="/api/subscriptions", tags=["subscriptions"])


# ── Schemas ───────────────────────────────────────────────────────────────────


class SubscriptionResponse(BaseModel):
    id: int
    user_id: int
    plan_type: str
    tier: str
    started_at: datetime
    expires_at: datetime
    is_active: bool
    notes: str | None = None
    created_at: datetime | None = None
    days_remaining: int | None = None

    model_config = {"from_attributes": True}


class ActivateRequest(BaseModel):
    user_id: int = Field(..., description="ID of the user to subscribe")
    plan_type: str = Field(..., description="monthly | 3month | 6month | yearly")
    tier: str = Field(default="pro", description="pro | enterprise")
    notes: str | None = Field(default=None, description="Optional admin notes")


# ── Helpers ───────────────────────────────────────────────────────────────────


def _build_response(sub: Subscription) -> SubscriptionResponse:
    now = datetime.now(UTC)
    days_remaining = max(0, (sub.expires_at - now).days) if sub.is_active else 0
    return SubscriptionResponse(
        id=sub.id,
        user_id=sub.user_id,
        plan_type=sub.plan_type,
        tier=sub.tier,
        started_at=sub.started_at,
        expires_at=sub.expires_at,
        is_active=sub.is_active,
        notes=sub.notes,
        created_at=sub.created_at,
        days_remaining=days_remaining,
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.get("/me", response_model=SubscriptionResponse | None)
def get_my_subscription(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the current user's active subscription, or null if none."""
    sub = (
        db.query(Subscription)
        .filter(
            Subscription.user_id == user.id,
            Subscription.is_active.is_(True),
        )
        .order_by(desc(Subscription.expires_at))
        .first()
    )
    if not sub:
        return None
    # Auto-expire if past due
    if sub.expires_at < datetime.now(UTC):
        sub.is_active = False
        db.commit()
        return None
    return _build_response(sub)


@router.post("", response_model=SubscriptionResponse, status_code=status.HTTP_201_CREATED)
def activate_subscription(
    body: ActivateRequest,
    admin: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Admin: activate a subscription plan for a user.

    - Deactivates any existing active subscription for the user first.
    - Upgrades the user's role to the appropriate tier role.
    """
    if body.plan_type not in PLAN_DURATIONS:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid plan_type. Must be one of: {list(PLAN_DURATIONS.keys())}",
        )
    if body.tier not in ("pro", "enterprise"):
        raise HTTPException(status_code=422, detail="tier must be 'pro' or 'enterprise'")

    target_user = db.query(User).filter(User.id == body.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Deactivate existing active subscriptions
    db.query(Subscription).filter(
        Subscription.user_id == body.user_id,
        Subscription.is_active.is_(True),
    ).update({"is_active": False})

    now = datetime.now(UTC)
    days = PLAN_DURATIONS[body.plan_type]

    sub = Subscription(
        user_id=body.user_id,
        plan_type=body.plan_type,
        tier=body.tier,
        started_at=now,
        expires_at=now + timedelta(days=days),
        is_active=True,
        activated_by_id=admin.id,
        notes=body.notes,
    )
    db.add(sub)

    # Upgrade user role to 'trader' (minimum for pro/enterprise)
    if target_user.role == "viewer":
        target_user.role = "trader"

    db.commit()
    db.refresh(sub)
    return _build_response(sub)


@router.get("", response_model=list[SubscriptionResponse])
def list_subscriptions(
    active_only: bool = False,
    admin: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Admin: list all subscriptions."""
    q = db.query(Subscription).order_by(desc(Subscription.created_at))
    if active_only:
        q = q.filter(Subscription.is_active.is_(True))
    return [_build_response(s) for s in q.all()]


@router.delete("/{subscription_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_subscription(
    subscription_id: int,
    admin: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Admin: deactivate a subscription."""
    sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    sub.is_active = False
    db.commit()
