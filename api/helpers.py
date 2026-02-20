"""
Shared query helpers for API routes
"""

import re
import time
from datetime import date as date_type

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from api.cache import cache_manager
from database.models import Security

# ── Latest-date cache (Redis with in-memory fallback) ────────────────────────
_latest_date_cache: dict[str, tuple] = {}
_LATEST_DATE_TTL = 60  # seconds


def get_latest_date(db: Session, model_class, date_column=None):
    """Get latest date using MAX() with Redis cache (in-memory fallback)."""
    cache_key = model_class.__tablename__
    redis_key = f"latest_date:{cache_key}"

    # Try Redis first
    cached_str = cache_manager.get_meta(redis_key)
    if cached_str:
        try:
            return date_type.fromisoformat(cached_str)
        except (ValueError, TypeError):
            pass

    # In-memory fallback
    now = time.time()
    cached = _latest_date_cache.get(cache_key)
    if cached and (now - cached[1]) < _LATEST_DATE_TTL:
        return cached[0]

    # Query database
    col = date_column or model_class.date
    result = db.query(func.max(col)).scalar()

    # Store in both caches
    _latest_date_cache[cache_key] = (result, now)
    if result:
        cache_manager.set_meta(redis_key, str(result), ttl=_LATEST_DATE_TTL)

    return result


# ── Symbol validation ──────────────────────────────────────────────────────
_SYMBOL_RE = re.compile(r"^[A-Za-z\u0600-\u06FF0-9_\-\s]{1,50}$")


def validate_symbol(symbol: str) -> str:
    """Validate and return symbol, or raise 400."""
    if not _SYMBOL_RE.match(symbol):
        raise HTTPException(status_code=400, detail="Invalid symbol format")
    return symbol


def get_security_or_404(
    db: Session, symbol: str, *, market_type: str | None = None
) -> Security:
    """Lookup security by symbol; raise 404 if missing.

    Args:
        market_type: Optional filter (e.g. ``"crypto"``).  When provided the
            symbol is upper-cased automatically.
    """
    validate_symbol(symbol)
    query = db.query(Security)
    if market_type:
        query = query.filter(
            Security.symbol == symbol.upper(), Security.market_type == market_type
        )
        label = market_type.capitalize()
    else:
        query = query.filter(Security.symbol == symbol)
        label = "Stock"
    sec = query.first()
    if not sec:
        raise HTTPException(status_code=404, detail=f"{label} '{symbol}' not found")
    return sec
