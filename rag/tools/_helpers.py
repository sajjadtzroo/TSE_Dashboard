"""Shared helpers for all tool modules."""
import json
from decimal import Decimal

from sqlalchemy.orm import Session

from database.models import Security

MAX_ROWS = 50


def _dec(v):
    """Convert Decimal/numeric to float for JSON serialization."""
    if v is None:
        return None
    if isinstance(v, Decimal):
        return float(v)
    return v


def _find_security(db: Session, symbol: str) -> Security | None:
    """Find security by symbol (exact match)."""
    return db.query(Security).filter(Security.symbol == symbol).first()


def _not_found(symbol: str) -> str:
    return json.dumps({"error": f"Stock '{symbol}' not found"}, ensure_ascii=False)
