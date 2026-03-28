"""
Commodity market endpoints: prices, OHLCV history, movers.
Data is stored in PostgreSQL by the scheduler (via yfinance).
API reads from DB — no live yfinance calls in request path.
"""

import logging
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from api.cache_decorators import cached
from api.deps import get_db
from api.utils import handle_api_errors, to_float
from api.schemas_commodity import (
    CommodityMoversSchema,
    CommodityOHLCVSchema,
    CommodityPriceSchema,
)
from database.models import Commodity, CommodityOHLCV, CommodityPrice

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/commodity", tags=["commodity"])


# ── Shared query helpers ─────────────────────────────────────────────────────


def _latest_price_subq(db: Session):
    """Subquery: latest snapshot_time per commodity_id."""
    return (
        db.query(
            CommodityPrice.commodity_id,
            func.max(CommodityPrice.snapshot_time).label("max_time"),
        )
        .group_by(CommodityPrice.commodity_id)
        .subquery()
    )


def _price_to_schema(price: CommodityPrice, commodity: Commodity) -> CommodityPriceSchema:
    """Map a CommodityPrice + Commodity ORM pair to the response schema."""
    return CommodityPriceSchema(
        symbol=commodity.symbol,
        name=commodity.name,
        name_fa=commodity.name_fa,
        category=commodity.category,
        unit=commodity.unit,
        price=to_float(price.price) or 0.0,
        change=to_float(price.change),
        change_pct=to_float(price.change_pct),
        high=to_float(price.high),
        low=to_float(price.low),
        open=to_float(price.open),
        prev_close=to_float(price.prev_close),
        volume=to_float(price.volume),
        snapshot_time=price.snapshot_time,
    )


# ── Prices (all commodities) ─────────────────────────────────────────────────


@router.get("/prices", response_model=list[CommodityPriceSchema])
@cached(
    module="commodity",
    endpoint="prices",
    trading_ttl=60,
    off_hours_ttl=300,
    tags=["commodity_prices"],
)
@handle_api_errors("Failed to fetch commodity prices")
def get_commodity_prices(db: Session = Depends(get_db)):
    """Return latest price snapshot for every tracked commodity."""
    subq = _latest_price_subq(db)

    latest = (
        db.query(CommodityPrice, Commodity)
        .join(
            subq,
            (CommodityPrice.commodity_id == subq.c.commodity_id)
            & (CommodityPrice.snapshot_time == subq.c.max_time),
        )
        .join(Commodity, CommodityPrice.commodity_id == Commodity.id)
        .filter(Commodity.is_active.is_(True))
        .all()
    )

    return [_price_to_schema(p, c) for p, c in latest]


# ── Movers (top gainers / losers) ────────────────────────────────────────────
# NOTE: registered BEFORE /{symbol} to avoid path capture


@router.get("/movers", response_model=CommodityMoversSchema)
@cached(
    module="commodity",
    endpoint="movers",
    trading_ttl=60,
    off_hours_ttl=300,
    tags=["commodity_prices"],
)
@handle_api_errors("Failed to fetch commodity movers")
def get_commodity_movers(db: Session = Depends(get_db)):
    """Return top 5 gainers and top 5 losers by daily change percentage."""
    subq = _latest_price_subq(db)

    base_q = (
        db.query(CommodityPrice, Commodity)
        .join(
            subq,
            (CommodityPrice.commodity_id == subq.c.commodity_id)
            & (CommodityPrice.snapshot_time == subq.c.max_time),
        )
        .join(Commodity, CommodityPrice.commodity_id == Commodity.id)
        .filter(
            Commodity.is_active.is_(True),
            CommodityPrice.change_pct.isnot(None),
        )
    )

    gainers = base_q.order_by(desc(CommodityPrice.change_pct)).limit(5).all()
    losers = base_q.order_by(CommodityPrice.change_pct).limit(5).all()

    return CommodityMoversSchema(
        gainers=[_price_to_schema(p, c) for p, c in gainers],
        losers=[_price_to_schema(p, c) for p, c in losers],
    )


# ── Categories ───────────────────────────────────────────────────────────────


@router.get("/categories")
@cached(
    module="commodity",
    endpoint="categories",
    trading_ttl=3600,
    off_hours_ttl=3600,
    tags=["commodity_prices"],
)
@handle_api_errors("Failed to fetch commodity categories")
def get_commodity_categories(db: Session = Depends(get_db)):
    """Return all commodity categories with item counts."""
    rows = (
        db.query(Commodity.category, func.count(Commodity.id))
        .filter(Commodity.is_active.is_(True))
        .group_by(Commodity.category)
        .all()
    )
    return [{"category": cat, "count": cnt} for cat, cnt in rows]


# ── Single commodity detail ──────────────────────────────────────────────────


@router.get("/{symbol}", response_model=CommodityPriceSchema)
@cached(
    module="commodity",
    endpoint="detail",
    trading_ttl=60,
    off_hours_ttl=300,
    tags=["commodity_prices"],
)
@handle_api_errors("Failed to fetch commodity detail")
def get_commodity_detail(symbol: str, db: Session = Depends(get_db)):
    """Return detail for a single commodity."""
    commodity = (
        db.query(Commodity)
        .filter(Commodity.symbol == symbol.upper(), Commodity.is_active.is_(True))
        .first()
    )
    if not commodity:
        raise HTTPException(status_code=404, detail=f"Unknown commodity: {symbol}")

    price = (
        db.query(CommodityPrice)
        .filter(CommodityPrice.commodity_id == commodity.id)
        .order_by(desc(CommodityPrice.snapshot_time))
        .first()
    )
    if not price:
        raise HTTPException(status_code=404, detail=f"No price data for {symbol}")

    return _price_to_schema(price, commodity)


# ── History (OHLCV from DB) ──────────────────────────────────────────────────


@router.get("/{symbol}/history", response_model=list[CommodityOHLCVSchema])
@cached(
    module="commodity",
    endpoint="history",
    trading_ttl=300,
    off_hours_ttl=600,
    tags=["commodity_history"],
)
@handle_api_errors("Failed to fetch commodity history")
def get_commodity_history(
    symbol: str,
    period: str = Query("6mo", pattern="^(1mo|3mo|6mo|1y|2y|5y|max)$"),
    db: Session = Depends(get_db),
):
    """Return daily OHLCV history for a single commodity from the database."""
    commodity = (
        db.query(Commodity)
        .filter(Commodity.symbol == symbol.upper(), Commodity.is_active.is_(True))
        .first()
    )
    if not commodity:
        raise HTTPException(status_code=404, detail=f"Unknown commodity: {symbol}")

    # Map period string to day count
    period_days = {
        "1mo": 30, "3mo": 90, "6mo": 180, "1y": 365,
        "2y": 730, "5y": 1825, "max": 36500,
    }
    days = period_days.get(period, 180)

    from datetime import date, timedelta as td
    cutoff = date.today() - td(days=days)

    rows = (
        db.query(CommodityOHLCV)
        .filter(
            CommodityOHLCV.commodity_id == commodity.id,
            CommodityOHLCV.date >= cutoff,
        )
        .order_by(CommodityOHLCV.date)
        .all()
    )

    return [
        CommodityOHLCVSchema(
            date=str(r.date),
            open=to_float(r.open),
            high=to_float(r.high),
            low=to_float(r.low),
            close=to_float(r.close),
            volume=to_float(r.volume),
        )
        for r in rows
    ]
