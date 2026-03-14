"""
Risk profiling endpoints: questionnaire submission, profile retrieval,
portfolio suggestions.
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import desc
from sqlalchemy.orm import Session

from api.auth import require_role
from api.deps import get_db
from api.services_risk import compute_risk_score
from database.models import SuggestedPortfolio, User, UserRiskProfile

router = APIRouter(prefix="/api/risk-profile", tags=["risk-profile"])


# ── Schemas ──────────────────────────────────────────────────────────────────


class QuestionnaireSubmission(BaseModel):
    answers: dict = Field(..., description='{"q1": 8, "q2": 6, ...}')
    version: int = Field(default=1)


class ProfileResponse(BaseModel):
    id: int
    composite_score: float
    ability_score: float
    willingness_score: float
    final_score: float
    profile_category: str
    target_allocation: dict
    risk_constraints: dict | None = None
    is_active: bool
    expires_at: datetime | None = None
    created_at: datetime | None = None


class SuggestionResponse(BaseModel):
    id: int
    holdings: list
    target_allocation: dict
    expected_metrics: dict | None = None
    status: str
    market_snapshot: dict | None = None
    created_at: datetime | None = None


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.post("", response_model=ProfileResponse, status_code=status.HTTP_201_CREATED)
def submit_questionnaire(
    body: QuestionnaireSubmission,
    user: User = Depends(require_role("trader")),
    db: Session = Depends(get_db),
):
    """Submit questionnaire answers, compute and store risk profile."""
    # Deactivate any existing active profiles
    db.query(UserRiskProfile).filter(
        UserRiskProfile.user_id == user.id,
        UserRiskProfile.is_active.is_(True),
    ).update({"is_active": False})

    # Compute server-side score
    result = compute_risk_score(body.answers)

    profile = UserRiskProfile(
        user_id=user.id,
        questionnaire_version=body.version,
        answers=body.answers,
        composite_score=result["composite_score"],
        ability_score=result["ability_score"],
        willingness_score=result["willingness_score"],
        final_score=result["final_score"],
        profile_category=result["profile_category"],
        target_allocation=result["target_allocation"],
        is_active=True,
        expires_at=result["expires_at"],
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/me", response_model=ProfileResponse)
def get_active_profile(
    user: User = Depends(require_role("trader")),
    db: Session = Depends(get_db),
):
    """Get the current user's active risk profile."""
    profile = (
        db.query(UserRiskProfile)
        .filter(
            UserRiskProfile.user_id == user.id,
            UserRiskProfile.is_active.is_(True),
        )
        .first()
    )
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active risk profile found. Please complete the questionnaire.",
        )
    return profile


@router.get("/history", response_model=list[ProfileResponse])
def get_profile_history(
    user: User = Depends(require_role("trader")),
    db: Session = Depends(get_db),
):
    """List all past risk profiles for the current user."""
    profiles = (
        db.query(UserRiskProfile)
        .filter(UserRiskProfile.user_id == user.id)
        .order_by(desc(UserRiskProfile.created_at))
        .all()
    )
    return profiles


@router.post("/suggest", response_model=SuggestionResponse, status_code=status.HTTP_201_CREATED)
def generate_suggestion(
    user: User = Depends(require_role("trader")),
    db: Session = Depends(get_db),
):
    """Generate a portfolio suggestion from the active risk profile."""
    profile = (
        db.query(UserRiskProfile)
        .filter(
            UserRiskProfile.user_id == user.id,
            UserRiskProfile.is_active.is_(True),
        )
        .first()
    )
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active risk profile. Complete the questionnaire first.",
        )

    # Build static suggestion based on category (phase 1)
    from api.services_risk import RISK_CATEGORIES

    cat_config = next((c for c in RISK_CATEGORIES if c["key"] == profile.profile_category), None)
    allocation = cat_config["allocation"] if cat_config else profile.target_allocation

    # Build holdings from allocation
    holdings = [
        {"asset_class": cls, "weight": pct, "rationale": f"Target allocation for {profile.profile_category}"}
        for cls, pct in allocation.items()
        if pct > 0
    ]

    suggestion = SuggestedPortfolio(
        risk_profile_id=profile.id,
        user_id=user.id,
        holdings=holdings,
        target_allocation=allocation,
        expected_metrics=None,
        status="suggested",
    )
    db.add(suggestion)
    db.commit()
    db.refresh(suggestion)
    return suggestion


@router.get("/suggestions", response_model=list[SuggestionResponse])
def list_suggestions(
    user: User = Depends(require_role("trader")),
    db: Session = Depends(get_db),
):
    """List all portfolio suggestions for the current user."""
    suggestions = (
        db.query(SuggestedPortfolio)
        .filter(SuggestedPortfolio.user_id == user.id)
        .order_by(desc(SuggestedPortfolio.created_at))
        .all()
    )
    return suggestions


@router.post("/suggestions/{suggestion_id}/accept", response_model=SuggestionResponse)
def accept_suggestion(
    suggestion_id: int,
    user: User = Depends(require_role("trader")),
    db: Session = Depends(get_db),
):
    """Mark a portfolio suggestion as accepted."""
    suggestion = (
        db.query(SuggestedPortfolio)
        .filter(
            SuggestedPortfolio.id == suggestion_id,
            SuggestedPortfolio.user_id == user.id,
        )
        .first()
    )
    if not suggestion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Suggestion not found.",
        )
    suggestion.status = "accepted"
    db.commit()
    db.refresh(suggestion)
    return suggestion
