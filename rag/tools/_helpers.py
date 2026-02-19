"""Shared helpers for all tool modules."""

import datetime
import json
from decimal import Decimal

import jdatetime
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


def _find_security(
    db: Session, symbol: str, market_type: str | None = None
) -> Security | None:
    """Find security by symbol (exact match), optionally filtering by market_type."""
    q = db.query(Security).filter(Security.symbol == symbol.upper())
    if market_type:
        q = q.filter(Security.market_type == market_type)
    return q.first()


def _to_jalali(date_obj) -> str:
    """Convert a Python date/datetime to Jalali (Shamsi) string YYYY-MM-DD."""
    if date_obj is None:
        return ""
    if isinstance(date_obj, datetime.datetime):
        date_obj = date_obj.date()
    try:
        jd = jdatetime.date.fromgregorian(date=date_obj)
        return jd.strftime("%Y-%m-%d")
    except Exception:
        return str(date_obj)


def _not_found(symbol: str, label: str = "Stock") -> str:
    return json.dumps({"error": f"{label} '{symbol}' not found"}, ensure_ascii=False)


def _escape_like(s: str) -> str:
    """Escape SQL LIKE wildcards to prevent injection."""
    return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
