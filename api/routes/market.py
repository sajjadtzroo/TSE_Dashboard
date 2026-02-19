"""
Market-level endpoints: overview, stats, sectors, indices, ETF NAV, prices, client type
"""

import datetime as _dt

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from api.cache_decorators import cached
from api.deps import get_db
from api.helpers import get_latest_date
from api.utils import to_float
from api.schemas import (
    ClientTypeSchema,
    ETFNavSchema,
    MarketIndexSchema,
    MarketOverviewSchema,
    MarketPriceSchema,
    SecuritySchema,
)
from database.models import (
    DailyOHLCV,
    ETFNav,
    MarketIndex,
    MarketPrice,
    Security,
)

router = APIRouter(prefix="/api", tags=["market"])


# ── Root ────────────────────────────────────────────────────────────────────


@router.get("")
def read_root():
    return {
        "name": "TSETMC Stock Market API",
        "version": "3.0.0",
        "endpoints": {
            "companies": "/api/companies",
            "market_overview": "/api/market-overview",
            "stock_detail": "/api/stocks/{symbol}",
            "historical_prices": "/api/stocks/{symbol}/history",
            "order_book": "/api/stocks/{symbol}/orderbook",
            "shareholders": "/api/stocks/{symbol}/shareholders",
            "tick_trades": "/api/stocks/{symbol}/tick-trades",
            "options": "/api/options",
            "options_underlyings": "/api/options/underlyings",
            "options_chain": "/api/options/chain?underlying={symbol}",
            "codal": "/api/codal",
            "market_indices": "/api/market/indices",
            "etf_nav": "/api/market/etf-nav",
            "market_prices": "/api/market/prices",
            "ime_options": "/api/ime/options",
            "ime_futures": "/api/ime/futures",
            "ime_certificates": "/api/ime/certificates",
            "ime_funds": "/api/ime/funds",
            "ime_forwards": "/api/ime/forwards",
            "ime_physical": "/api/ime/physical",
            "stats": "/api/stats",
        },
    }


# ── Companies & Sectors ─────────────────────────────────────────────────────


@router.get("/companies", response_model=list[SecuritySchema])
@cached(
    module="market",
    endpoint="companies",
    trading_ttl=900,
    off_hours_ttl=86400,
    tags=["instrument_details"],
)
def get_companies(
    active_only: bool = True,
    sector: str | None = None,
    type: str | None = None,
    market_type: str | None = None,
    limit: int = Query(default=1000, ge=1, le=5000),
    db: Session = Depends(get_db),
):
    """Get list of all securities"""
    try:
        query = db.query(Security)
        if active_only:
            query = query.filter(Security.is_active == True)
        if sector:
            query = query.filter(Security.sector_name_fa == sector)
        if type:
            query = query.filter(Security.type == type)
        if market_type:
            query = query.filter(Security.market_type == market_type)
        query = query.limit(limit)
        return query.all()
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch companies") from e


@router.get("/sectors")
@cached(
    module="market",
    endpoint="sectors",
    trading_ttl=1800,
    off_hours_ttl=86400,
    tags=["instrument_details"],
)
def get_sectors(db: Session = Depends(get_db)):
    """Get list of all sectors"""
    try:
        sectors = db.query(Security.sector_name_fa).distinct().all()
        return [s[0] for s in sectors if s[0]]
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch sectors") from e


# ── Market Overview ──────────────────────────────────────────────────────────


@router.get("/market-overview", response_model=list[MarketOverviewSchema])
@cached(
    module="market",
    endpoint="market-overview",
    trading_ttl=120,
    off_hours_ttl=3600,
    tags=["market_watch"],
)
def get_market_overview(
    sector: str | None = None,
    limit: int = Query(default=500, ge=1, le=5000),
    db: Session = Depends(get_db),
):
    """Get market overview with latest prices for all stocks"""
    try:
        latest_date = get_latest_date(db, DailyOHLCV)
        if not latest_date:
            return []

        query = (
            db.query(Security, DailyOHLCV)
            .join(DailyOHLCV, Security.security_id == DailyOHLCV.security_id)
            .filter(Security.is_active == True, DailyOHLCV.date == latest_date)
        )
        if sector:
            query = query.filter(Security.sector_name_fa == sector)
        query = query.limit(limit)

        results = query.all()
        return [
            MarketOverviewSchema(
                ins_code=sec.ins_code,
                symbol=sec.symbol,
                name_fa=sec.name_fa,
                sector_name_fa=sec.sector_name_fa,
                date=ohlcv.date,
                close=to_float(ohlcv.close),
                last=to_float(ohlcv.last),
                close_change=to_float(ohlcv.close_change),
                close_change_pct=to_float(ohlcv.close_change_pct),
                volume=ohlcv.volume or 0,
                value=ohlcv.value or 0,
                trades=ohlcv.trades or 0,
                low=to_float(ohlcv.low),
                high=to_float(ohlcv.high),
                pe_ratio=to_float(ohlcv.pe_ratio),
                eps=to_float(ohlcv.eps),
                market_cap=ohlcv.market_cap,
            )
            for sec, ohlcv in results
        ]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Failed to fetch market overview"
        ) from e


# ── Client Type ──────────────────────────────────────────────────────────────


@router.get("/client-type", response_model=list[ClientTypeSchema])
@cached(
    module="market",
    endpoint="client-type",
    trading_ttl=120,
    off_hours_ttl=3600,
    tags=["market_watch"],
)
def get_client_type(
    sector: str | None = None,
    limit: int = Query(default=500, ge=1, le=5000),
    db: Session = Depends(get_db),
):
    """Get market overview with client type (real/legal) buy/sell data"""
    try:
        latest_date = get_latest_date(db, DailyOHLCV)
        if not latest_date:
            return []

        query = (
            db.query(Security, DailyOHLCV)
            .join(DailyOHLCV, Security.security_id == DailyOHLCV.security_id)
            .filter(Security.is_active == True, DailyOHLCV.date == latest_date)
        )
        if sector:
            query = query.filter(Security.sector_name_fa == sector)
        query = query.limit(limit)

        results = query.all()
        return [
            ClientTypeSchema(
                ins_code=sec.ins_code,
                symbol=sec.symbol,
                name_fa=sec.name_fa,
                sector_name_fa=sec.sector_name_fa,
                date=ohlcv.date,
                close=to_float(ohlcv.close),
                last=to_float(ohlcv.last),
                close_change=to_float(ohlcv.close_change),
                close_change_pct=to_float(ohlcv.close_change_pct),
                volume=ohlcv.volume or 0,
                value=ohlcv.value or 0,
                trades=ohlcv.trades or 0,
                low=to_float(ohlcv.low),
                high=to_float(ohlcv.high),
                pe_ratio=to_float(ohlcv.pe_ratio),
                eps=to_float(ohlcv.eps),
                market_cap=ohlcv.market_cap,
                real_buy_count=ohlcv.real_buy_count,
                real_buy_volume=ohlcv.real_buy_volume,
                real_sell_count=ohlcv.real_sell_count,
                real_sell_volume=ohlcv.real_sell_volume,
                legal_buy_count=ohlcv.legal_buy_count,
                legal_buy_volume=ohlcv.legal_buy_volume,
                legal_sell_count=ohlcv.legal_sell_count,
                legal_sell_volume=ohlcv.legal_sell_volume,
            )
            for sec, ohlcv in results
        ]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Failed to fetch client type data"
        ) from e


# ── Stats ────────────────────────────────────────────────────────────────────


@router.get("/stats")
@cached(
    module="market",
    endpoint="stats",
    trading_ttl=60,
    off_hours_ttl=3600,
    tags=["market_watch"],
)
def get_statistics(db: Session = Depends(get_db)):
    """Get overall market statistics"""
    try:
        total_securities = db.query(Security).filter(Security.is_active == True).count()
        latest_date = get_latest_date(db, DailyOHLCV)

        securities_with_data = 0
        total_volume = 0
        total_value = 0

        if latest_date:
            stats = (
                db.query(
                    func.count(DailyOHLCV.id),
                    func.sum(DailyOHLCV.volume),
                    func.sum(DailyOHLCV.value),
                )
                .filter(DailyOHLCV.date == latest_date)
                .one()
            )
            securities_with_data = stats[0] or 0
            total_volume = int(stats[1] or 0)
            total_value = int(stats[2] or 0)

        return {
            "total_securities": total_securities,
            "securities_with_data_today": securities_with_data,
            "latest_date": str(latest_date) if latest_date else None,
            "total_volume_today": total_volume,
            "total_value_today": total_value,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch statistics") from e


# ── Market Indices ───────────────────────────────────────────────────────────


@router.get("/market/indices", response_model=list[MarketIndexSchema])
@cached(
    module="market",
    endpoint="indices",
    trading_ttl=180,
    off_hours_ttl=3600,
    tags=["market_indices"],
)
def get_market_indices(
    date: _dt.date | None = None,
    db: Session = Depends(get_db),
):
    """Get market indices for a given date (defaults to latest)"""
    try:
        if date is None:
            date = get_latest_date(db, MarketIndex)
            if not date:
                return []
        return (
            db.query(MarketIndex)
            .filter(MarketIndex.date == date)
            .order_by(MarketIndex.name)
            .all()
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Failed to fetch market indices"
        ) from e


_INDEX_ALIASES = {
    "TEDPIX": "شاخص کل",
    "tedpix": "شاخص کل",
    "شاخص كل": "شاخص کل",  # Arabic ك → Persian ک
}


@router.get("/market/indices/{name}/history")
def get_market_index_history(
    name: str,
    days: int = Query(default=365, ge=1, le=5000),
    db: Session = Depends(get_db),
):
    """Get historical data for a specific market index by name"""
    try:
        resolved_name = _INDEX_ALIASES.get(name, name)
        results = (
            db.query(MarketIndex)
            .filter(MarketIndex.name == resolved_name)
            .order_by(MarketIndex.date.desc())
            .limit(days)
            .all()
        )

        if not results:
            raise HTTPException(status_code=404, detail=f"Index '{name}' not found")

        return [
            {
                "date": str(r.date),
                "index_value": to_float(r.index_value),
                "index_change_pct": to_float(r.index_change_pct),
            }
            for r in reversed(results)
        ]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Failed to fetch index history"
        ) from e


# ── ETF NAV ──────────────────────────────────────────────────────────────────


@router.get("/market/etf-nav", response_model=list[ETFNavSchema])
@cached(
    module="market",
    endpoint="etf-nav",
    trading_ttl=180,
    off_hours_ttl=3600,
    tags=["etf_nav"],
)
def get_etf_nav(
    symbol: str | None = None,
    fund_type: str | None = None,
    date: _dt.date | None = None,
    db: Session = Depends(get_db),
):
    """Get ETF NAV data (latest date by default). Joins with securities for symbol/name."""
    try:
        if date is None:
            date = get_latest_date(db, ETFNav)
            if not date:
                return []

        rows = (
            db.query(ETFNav, Security)
            .join(Security, ETFNav.security_id == Security.security_id)
            .filter(ETFNav.date == date)
        )

        if symbol:
            rows = rows.filter(Security.symbol == symbol)
        if fund_type:
            rows = rows.filter(ETFNav.fund_type == fund_type)

        rows = rows.order_by(Security.symbol).all()

        return [
            ETFNavSchema(
                id=nav.id,
                security_id=nav.security_id,
                date=nav.date,
                time=nav.time,
                symbol=sec.symbol,
                name_fa=sec.name_fa,
                nav_issuance=to_float(nav.nav_issuance),
                nav_redemption=to_float(nav.nav_redemption),
                last_price=to_float(nav.last_price),
                bubble_pct=to_float(nav.bubble_pct),
                fund_type=nav.fund_type,
            )
            for nav, sec in rows
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch ETF NAV") from e


# ── Market Prices (gold/currency/commodity/crypto) ──────────────────────────


@router.get("/market/prices", response_model=list[MarketPriceSchema])
@cached(
    module="market",
    endpoint="prices",
    trading_ttl=600,
    off_hours_ttl=3600,
    tags=["market_prices"],
)
def get_market_prices(
    market_type: str | None = Query(
        default=None, description="gold, currency, commodity, crypto"
    ),
    date: _dt.date | None = None,
    db: Session = Depends(get_db),
):
    """Get gold/currency/commodity/crypto prices."""
    try:
        if date is None:
            date = get_latest_date(db, MarketPrice)
            if not date:
                return []

        rows = (
            db.query(MarketPrice, Security)
            .join(Security, MarketPrice.security_id == Security.security_id)
            .filter(MarketPrice.date == date)
        )

        if market_type:
            rows = rows.filter(Security.market_type == market_type)

        rows = rows.order_by(Security.symbol).all()

        return [
            MarketPriceSchema(
                id=mp.id,
                security_id=mp.security_id,
                date=mp.date,
                time=mp.time,
                symbol=sec.symbol,
                name_fa=sec.name_fa,
                market_type=sec.market_type,
                price=to_float(mp.price),
                price_toman=to_float(mp.price_toman),
                change_value=to_float(mp.change_value),
                change_pct=to_float(mp.change_pct),
                unit=mp.unit,
                market_cap=to_float(mp.market_cap),
                icon_url=mp.icon_url,
            )
            for mp, sec in rows
        ]
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Failed to fetch market prices"
        ) from e
