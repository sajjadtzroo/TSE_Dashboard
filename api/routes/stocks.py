"""
Stock-level endpoints: detail, history, order book, shareholders, tick trades
"""
import datetime as _dt
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from api.deps import get_db
from api.helpers import get_security_or_404
from api.cache_decorators import cached
from database.models import (
    DailyOHLCV, OrderBook, Shareholder, TickTrade,
)
from api.schemas import (
    DailyOHLCVSchema, StockDetailSchema,
    OrderBookSchema, OrderBookLevelSchema,
    ShareholderSchema, TickTradeSchema,
)

router = APIRouter(prefix="/api/stocks", tags=["stocks"])


@router.get("/{symbol}", response_model=StockDetailSchema)
@cached(module="stocks", endpoint="detail", trading_ttl=120, off_hours_ttl=3600, tags=["market_watch"])
def get_stock_detail(symbol: str, db: Session = Depends(get_db)):
    """Get detailed information for a specific stock"""
    try:
        sec = get_security_or_404(db, symbol)
        latest_ohlcv = (
            db.query(DailyOHLCV)
            .filter(DailyOHLCV.security_id == sec.security_id)
            .order_by(DailyOHLCV.date.desc())
            .first()
        )
        return StockDetailSchema(security=sec, latest_ohlcv=latest_ohlcv)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch stock detail") from e


@router.get("/{symbol}/history", response_model=List[DailyOHLCVSchema])
@cached(module="stocks", endpoint="history", trading_ttl=300, off_hours_ttl=86400, tags=["market_watch"])
def get_stock_history(
    symbol: str,
    days: int = Query(default=30, ge=1, le=1825),
    db: Session = Depends(get_db),
):
    """Get historical OHLCV data for a stock"""
    try:
        sec = get_security_or_404(db, symbol)
        query = (
            db.query(DailyOHLCV)
            .filter(DailyOHLCV.security_id == sec.security_id)
            .order_by(DailyOHLCV.date.desc())
            .limit(days)
        )
        return list(reversed(query.all()))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch stock history") from e


@router.get("/{symbol}/orderbook", response_model=List[OrderBookSchema])
@cached(module="stocks", endpoint="orderbook", trading_ttl=60, off_hours_ttl=3600, tags=["market_watch"])
def get_order_book(
    symbol: str,
    limit: int = Query(default=1, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Get latest order book snapshots for a stock"""
    try:
        sec = get_security_or_404(db, symbol)
        snapshots = (
            db.query(OrderBook)
            .filter(OrderBook.security_id == sec.security_id)
            .order_by(OrderBook.snapshot_time.desc())
            .limit(limit)
            .all()
        )

        result = []
        for snap in snapshots:
            levels = []
            for i in range(1, 6):
                bid_val = getattr(snap, f'bid_price_{i}')
                ask_val = getattr(snap, f'ask_price_{i}')
                levels.append(OrderBookLevelSchema(
                    bid_price=float(bid_val) if bid_val is not None else None,
                    bid_vol=getattr(snap, f'bid_vol_{i}'),
                    bid_count=getattr(snap, f'bid_count_{i}'),
                    ask_price=float(ask_val) if ask_val is not None else None,
                    ask_vol=getattr(snap, f'ask_vol_{i}'),
                    ask_count=getattr(snap, f'ask_count_{i}'),
                ))
            result.append(OrderBookSchema(snapshot_time=snap.snapshot_time, levels=levels))
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch order book") from e


@router.get("/{symbol}/shareholders", response_model=List[ShareholderSchema])
@cached(module="stocks", endpoint="shareholders", trading_ttl=3600, off_hours_ttl=86400, tags=["market_watch"])
def get_shareholders(
    symbol: str,
    date: Optional[_dt.date] = None,
    db: Session = Depends(get_db),
):
    """Get major shareholders for a stock"""
    try:
        sec = get_security_or_404(db, symbol)
        if date is None:
            date = db.query(func.max(Shareholder.date)).filter(
                Shareholder.security_id == sec.security_id
            ).scalar()
            if not date:
                return []
        return (
            db.query(Shareholder)
            .filter(
                Shareholder.security_id == sec.security_id,
                Shareholder.date == date,
            )
            .order_by(Shareholder.percent.desc())
            .all()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch shareholders") from e


@router.get("/{symbol}/tick-trades", response_model=List[TickTradeSchema])
@cached(module="stocks", endpoint="tick-trades", trading_ttl=300, off_hours_ttl=86400, tags=["market_watch"])
def get_tick_trades(
    symbol: str,
    date: Optional[_dt.date] = None,
    db: Session = Depends(get_db),
):
    """Get tick-level trade data for a stock"""
    try:
        sec = get_security_or_404(db, symbol)
        if date is None:
            date = db.query(func.max(TickTrade.date)).filter(
                TickTrade.security_id == sec.security_id
            ).scalar()
            if not date:
                return []
        return (
            db.query(TickTrade)
            .filter(
                TickTrade.security_id == sec.security_id,
                TickTrade.date == date,
            )
            .order_by(TickTrade.row_num)
            .all()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch tick trades") from e
