"""Portfolio advisor tools — risk profile and suggestion retrieval."""

import json
import logging

from sqlalchemy import desc
from sqlalchemy.orm import Session

from database.models import SuggestedPortfolio, UserRiskProfile

logger = logging.getLogger(__name__)

# ── Tool definitions ─────────────────────────────────────────────────────────

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "get_user_risk_profile",
            "description": (
                "Fetch the active risk profile for the authenticated user. "
                "Returns risk category, scores (composite, ability, willingness, final), "
                "target allocation, and constraints. Returns null if no profile exists."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "user_id": {
                        "type": "integer",
                        "description": "User ID (injected automatically)",
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_suggested_portfolio",
            "description": (
                "Fetch the latest portfolio suggestion for the authenticated user. "
                "Returns holdings, target allocation, expected metrics, and status."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "user_id": {
                        "type": "integer",
                        "description": "User ID (injected automatically)",
                    },
                },
                "required": [],
            },
        },
    },
]

TOOL_DISPATCH = {
    "get_user_risk_profile": lambda db, **kw: get_user_risk_profile(db, **kw),
    "get_suggested_portfolio": lambda db, **kw: get_suggested_portfolio(db, **kw),
}


# ── Implementations ──────────────────────────────────────────────────────────


def get_user_risk_profile(db: Session, user_id: int = None) -> str:
    """Fetch active risk profile for a user."""
    if not user_id:
        return json.dumps({"error": "No user authenticated. Please log in to access your risk profile."})

    profile = (
        db.query(UserRiskProfile)
        .filter(
            UserRiskProfile.user_id == user_id,
            UserRiskProfile.is_active.is_(True),
        )
        .first()
    )
    if not profile:
        return json.dumps({
            "result": None,
            "message": "No risk profile found. Please complete the risk questionnaire at /portfolio/analyst first.",
        })

    return json.dumps({
        "result": {
            "id": profile.id,
            "category": profile.profile_category,
            "composite_score": float(profile.composite_score),
            "ability_score": float(profile.ability_score),
            "willingness_score": float(profile.willingness_score),
            "final_score": float(profile.final_score),
            "target_allocation": profile.target_allocation,
            "risk_constraints": profile.risk_constraints,
            "expires_at": profile.expires_at.isoformat() if profile.expires_at else None,
            "created_at": profile.created_at.isoformat() if profile.created_at else None,
        }
    })


def get_suggested_portfolio(db: Session, user_id: int = None) -> str:
    """Fetch the latest suggested portfolio for a user."""
    if not user_id:
        return json.dumps({"error": "No user authenticated. Please log in to access portfolio suggestions."})

    suggestion = (
        db.query(SuggestedPortfolio)
        .filter(SuggestedPortfolio.user_id == user_id)
        .order_by(desc(SuggestedPortfolio.created_at))
        .first()
    )
    if not suggestion:
        return json.dumps({
            "result": None,
            "message": "No portfolio suggestion found. Complete the risk questionnaire first.",
        })

    return json.dumps({
        "result": {
            "id": suggestion.id,
            "holdings": suggestion.holdings,
            "target_allocation": suggestion.target_allocation,
            "expected_metrics": suggestion.expected_metrics,
            "status": suggestion.status,
            "market_snapshot": suggestion.market_snapshot,
            "created_at": suggestion.created_at.isoformat() if suggestion.created_at else None,
        }
    })
