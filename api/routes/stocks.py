"""
Stock-level endpoints: detail, history, order book, shareholders, tick trades
"""

import datetime as _dt

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from api.cache_decorators import cached
from api.deps import get_db
from api.helpers import get_security_or_404
from api.utils import handle_api_errors, to_float
from api.schemas import (
    DailyOHLCVSchema,
    OrderBookLevelSchema,
    OrderBookSchema,
    ShareholderSchema,
    StockDetailSchema,
    TickTradeSchema,
)
from database.models import (
    DailyOHLCV,
    OrderBook,
    Shareholder,
    TickTrade,
)

router = APIRouter(prefix="/api/stocks", tags=["stocks"])


def _orderbook_levels(snap) -> list[OrderBookLevelSchema]:
    return [
        OrderBookLevelSchema(
            bid_price=to_float(getattr(snap, f"bid_price_{i}")),
            bid_vol=getattr(snap, f"bid_vol_{i}"),
            bid_count=getattr(snap, f"bid_count_{i}"),
            ask_price=to_float(getattr(snap, f"ask_price_{i}")),
            ask_vol=getattr(snap, f"ask_vol_{i}"),
            ask_count=getattr(snap, f"ask_count_{i}"),
        )
        for i in range(1, 6)
    ]


@router.get("/{symbol}", response_model=StockDetailSchema)
@cached(
    module="stocks",
    endpoint="detail",
    trading_ttl=120,
    off_hours_ttl=3600,
    tags=["market_watch"],
)
@handle_api_errors("Failed to fetch stock detail")
def get_stock_detail(symbol: str, db: Session = Depends(get_db)):
    """Get detailed information for a specific stock"""
    sec = get_security_or_404(db, symbol)
    latest_ohlcv = (
        db.query(DailyOHLCV)
        .filter(DailyOHLCV.security_id == sec.security_id)
        .order_by(DailyOHLCV.date.desc())
        .first()
    )
    return StockDetailSchema(security=sec, latest_ohlcv=latest_ohlcv)


@router.get("/{symbol}/history", response_model=list[DailyOHLCVSchema])
@cached(
    module="stocks",
    endpoint="history",
    trading_ttl=300,
    off_hours_ttl=86400,
    tags=["market_watch"],
)
@handle_api_errors("Failed to fetch stock history")
def get_stock_history(
    symbol: str,
    days: int = Query(default=30, ge=0),
    db: Session = Depends(get_db),
):
    """Get historical OHLCV data for a stock.  ``days=0`` returns all available data."""
    sec = get_security_or_404(db, symbol)
    query = (
        db.query(DailyOHLCV)
        .filter(DailyOHLCV.security_id == sec.security_id)
        .order_by(DailyOHLCV.date.desc())
    )
    if days > 0:
        query = query.limit(days)
    return list(reversed(query.all()))


@router.get("/{symbol}/orderbook", response_model=list[OrderBookSchema])
@cached(
    module="stocks",
    endpoint="orderbook",
    trading_ttl=60,
    off_hours_ttl=3600,
    tags=["market_watch"],
)
@handle_api_errors("Failed to fetch order book")
def get_order_book(
    symbol: str,
    limit: int = Query(default=1, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Get latest order book snapshots for a stock"""
    sec = get_security_or_404(db, symbol)
    snapshots = (
        db.query(OrderBook)
        .filter(OrderBook.security_id == sec.security_id)
        .order_by(OrderBook.snapshot_time.desc())
        .limit(limit)
        .all()
    )

    return [
        OrderBookSchema(snapshot_time=snap.snapshot_time, levels=_orderbook_levels(snap))
        for snap in snapshots
    ]


@router.get("/{symbol}/shareholders", response_model=list[ShareholderSchema])
@cached(
    module="stocks",
    endpoint="shareholders",
    trading_ttl=3600,
    off_hours_ttl=86400,
    tags=["market_watch"],
)
@handle_api_errors("Failed to fetch shareholders")
def get_shareholders(
    symbol: str,
    date: _dt.date | None = None,
    db: Session = Depends(get_db),
):
    """Get major shareholders for a stock"""
    sec = get_security_or_404(db, symbol)
    if date is None:
        latest_sub = (
            db.query(func.max(Shareholder.date))
            .filter(Shareholder.security_id == sec.security_id)
            .scalar_subquery()
        )
        return (
            db.query(Shareholder)
            .filter(
                Shareholder.security_id == sec.security_id,
                Shareholder.date == latest_sub,
            )
            .order_by(Shareholder.percent.desc())
            .all()
        )
    return (
        db.query(Shareholder)
        .filter(
            Shareholder.security_id == sec.security_id,
            Shareholder.date == date,
        )
        .order_by(Shareholder.percent.desc())
        .all()
    )


@router.get("/{symbol}/tick-trades", response_model=list[TickTradeSchema])
@cached(
    module="stocks",
    endpoint="tick-trades",
    trading_ttl=300,
    off_hours_ttl=86400,
    tags=["market_watch"],
)
@handle_api_errors("Failed to fetch tick trades")
def get_tick_trades(
    symbol: str,
    date: _dt.date | None = None,
    db: Session = Depends(get_db),
):
    """Get tick-level trade data for a stock"""
    sec = get_security_or_404(db, symbol)
    if date is None:
        latest_sub = (
            db.query(func.max(TickTrade.date))
            .filter(TickTrade.security_id == sec.security_id)
            .scalar_subquery()
        )
        return (
            db.query(TickTrade)
            .filter(
                TickTrade.security_id == sec.security_id,
                TickTrade.date == latest_sub,
            )
            .order_by(TickTrade.row_num)
            .all()
        )
    return (
        db.query(TickTrade)
        .filter(
            TickTrade.security_id == sec.security_id,
            TickTrade.date == date,
        )
        .order_by(TickTrade.row_num)
        .all()
    )
