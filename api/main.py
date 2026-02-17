"""
FastAPI main application
Provides REST API for TSETMC stock market data (PostgreSQL backend)
"""
from fastapi import FastAPI, Depends, HTTPException, Query, BackgroundTasks, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime as _dt
import sys
import subprocess
import hashlib
from pathlib import Path

# Add parent directory to path to import database modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from database.connection import get_db_manager
from database.models import (
    Security, DailyOHLCV, OrderBook, Option, IMEOption, IMEFuture,
    MarketIndex, ETFNav, MarketPrice, IMECertificate, IMEFund,
    IMEForward, IMEPhysicalTrade, Shareholder, CodalAnnouncement, TickTrade,
    PDFDocument, DocumentChunk,
)
from config.settings import DATABASE_URL, CORS_ORIGINS_LIST
from api.schemas import (
    SecuritySchema,
    DailyOHLCVSchema,
    MarketOverviewSchema,
    StockDetailSchema,
    OrderBookSchema,
    OrderBookLevelSchema,
    OptionSchema,
    IMEOptionSchema,
    IMEFutureSchema,
    MarketIndexSchema,
    ETFNavSchema,
    MarketPriceSchema,
    ClientTypeSchema,
    IMECertificateSchema,
    IMEFundSchema,
    IMEForwardSchema,
    IMEPhysicalTradeSchema,
    ShareholderSchema,
    CodalAnnouncementSchema,
    TickTradeSchema,
    RAGSearchRequest,
    RAGSearchResponse,
    RAGSearchResult,
    RAGChatRequest,
    RAGChatResponse,
    RAGStatusResponse,
    RAGProcessResponse,
    RAGUploadResponse,
    RAGDocumentSchema,
    ChatRequest,
    ChatResponse,
    ModelsResponse,
    ModelInfo,
)

app = FastAPI(
    title="TSETMC Stock Market API",
    description="Real-time and historical data for Tehran Stock Exchange",
    version="3.0.0"
)

# ── Scheduler lifecycle ──────────────────────────────────────────────────────
_tsetmc_scheduler = None

@app.on_event("startup")
def startup_scheduler():
    # Ensure database tables exist
    from database.connection import get_db_manager
    from config.settings import DATABASE_URL
    get_db_manager(DATABASE_URL).create_tables()

    global _tsetmc_scheduler
    from scheduler.scheduler import TSETMCScheduler
    _tsetmc_scheduler = TSETMCScheduler()
    _tsetmc_scheduler.setup_jobs()
    _tsetmc_scheduler.start()

@app.on_event("shutdown")
def shutdown_scheduler():
    if _tsetmc_scheduler:
        _tsetmc_scheduler.shutdown()

# CORS middleware - restrict to configured origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS_LIST,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database manager
db_manager = get_db_manager(DATABASE_URL)


def get_db():
    """Dependency to get database session"""
    with db_manager.get_session() as session:
        yield session


@app.get("/api")
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
        }
    }


# ─── HEALTH CHECK ENDPOINTS ──────────────────────────────────────────────────


@app.get("/health")
def health_check():
    """Basic health check endpoint - returns 200 OK if service is running"""
    return {"status": "healthy", "version": "3.0.0"}


@app.get("/health/deep")
def deep_health_check(db: Session = Depends(get_db)):
    """
    Deep health check - verifies all components are working correctly.
    Checks: Database connectivity, scheduler status, data freshness
    """
    from datetime import datetime, timedelta

    components = {}
    overall_status = "healthy"

    # Check database connectivity
    try:
        db.execute("SELECT 1")
        components["database"] = {
            "status": "healthy",
            "message": "Database connection successful"
        }
    except Exception as e:
        components["database"] = {
            "status": "unhealthy",
            "message": f"Database connection failed: {str(e)}"
        }
        overall_status = "unhealthy"

    # Check scheduler status
    try:
        if _tsetmc_scheduler and _tsetmc_scheduler.scheduler.running:
            scheduler_status = _tsetmc_scheduler.get_status()
            components["scheduler"] = {
                "status": "healthy",
                "running": True,
                "job_count": scheduler_status.get("job_count", 0)
            }
        else:
            components["scheduler"] = {
                "status": "degraded",
                "running": False,
                "message": "Scheduler is not running"
            }
            if overall_status == "healthy":
                overall_status = "degraded"
    except Exception as e:
        components["scheduler"] = {
            "status": "unhealthy",
            "message": f"Scheduler check failed: {str(e)}"
        }
        overall_status = "unhealthy"

    # Check data freshness (latest OHLCV data)
    try:
        latest_date_result = db.query(DailyOHLCV.date).order_by(DailyOHLCV.date.desc()).first()
        if latest_date_result:
            latest_date = latest_date_result[0]
            age_days = (datetime.now().date() - latest_date).days

            if age_days == 0:
                data_status = "fresh"
            elif age_days <= 3:
                data_status = "acceptable"
            else:
                data_status = "stale"
                if overall_status == "healthy":
                    overall_status = "degraded"

            components["data_freshness"] = {
                "status": "healthy" if data_status == "fresh" else "degraded",
                "latest_date": str(latest_date),
                "age_days": age_days,
                "assessment": data_status
            }
        else:
            components["data_freshness"] = {
                "status": "unhealthy",
                "message": "No data found in database"
            }
            overall_status = "unhealthy"
    except Exception as e:
        components["data_freshness"] = {
            "status": "unhealthy",
            "message": f"Data freshness check failed: {str(e)}"
        }
        overall_status = "unhealthy"

    return {
        "status": overall_status,
        "version": "3.0.0",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "components": components
    }


# ─── EXISTING ENDPOINTS ──────────────────────────────────────────────────────


@app.get("/api/companies", response_model=List[SecuritySchema])
def get_companies(
    active_only: bool = True,
    sector: Optional[str] = None,
    type: Optional[str] = None,
    market_type: Optional[str] = None,
    limit: Optional[int] = Query(default=None, le=5000),
    db: Session = Depends(get_db)
):
    """Get list of all securities"""
    query = db.query(Security)

    if active_only:
        query = query.filter(Security.is_active == True)
    if sector:
        query = query.filter(Security.sector_name_fa == sector)
    if type:
        query = query.filter(Security.type == type)
    if market_type:
        query = query.filter(Security.market_type == market_type)
    if limit:
        query = query.limit(limit)

    return query.all()


@app.get("/api/sectors")
def get_sectors(db: Session = Depends(get_db)):
    """Get list of all sectors"""
    sectors = db.query(Security.sector_name_fa).distinct().all()
    return [s[0] for s in sectors if s[0]]


@app.get("/api/market-overview", response_model=List[MarketOverviewSchema])
def get_market_overview(
    sector: Optional[str] = None,
    limit: Optional[int] = Query(default=None, le=5000),
    db: Session = Depends(get_db)
):
    """Get market overview with latest prices for all stocks"""
    latest_date_result = db.query(DailyOHLCV.date).order_by(DailyOHLCV.date.desc()).first()

    if not latest_date_result:
        return []

    latest_date = latest_date_result[0]

    query = db.query(
        Security, DailyOHLCV
    ).join(
        DailyOHLCV, Security.security_id == DailyOHLCV.security_id
    ).filter(
        Security.is_active == True,
        DailyOHLCV.date == latest_date
    )

    if sector:
        query = query.filter(Security.sector_name_fa == sector)
    if limit:
        query = query.limit(limit)

    results = query.all()

    market_data = []
    for sec, ohlcv in results:
        market_data.append(MarketOverviewSchema(
            ins_code=sec.ins_code,
            symbol=sec.symbol,
            name_fa=sec.name_fa,
            sector_name_fa=sec.sector_name_fa,
            date=ohlcv.date,
            close=float(ohlcv.close) if ohlcv.close else 0,
            last=float(ohlcv.last) if ohlcv.last else None,
            close_change=float(ohlcv.close_change) if ohlcv.close_change else 0,
            close_change_pct=float(ohlcv.close_change_pct) if ohlcv.close_change_pct else 0,
            volume=ohlcv.volume or 0,
            value=ohlcv.value or 0,
            trades=ohlcv.trades or 0,
            low=float(ohlcv.low) if ohlcv.low else 0,
            high=float(ohlcv.high) if ohlcv.high else 0,
            pe_ratio=float(ohlcv.pe_ratio) if ohlcv.pe_ratio else None,
            eps=float(ohlcv.eps) if ohlcv.eps else None,
            market_cap=ohlcv.market_cap,
        ))

    return market_data


@app.get("/api/client-type", response_model=List[ClientTypeSchema])
def get_client_type(
    sector: Optional[str] = None,
    limit: Optional[int] = Query(default=None, le=5000),
    db: Session = Depends(get_db)
):
    """Get market overview with client type (real/legal) buy/sell data"""
    latest_date_result = db.query(DailyOHLCV.date).order_by(DailyOHLCV.date.desc()).first()

    if not latest_date_result:
        return []

    latest_date = latest_date_result[0]

    query = db.query(
        Security, DailyOHLCV
    ).join(
        DailyOHLCV, Security.security_id == DailyOHLCV.security_id
    ).filter(
        Security.is_active == True,
        DailyOHLCV.date == latest_date
    )

    if sector:
        query = query.filter(Security.sector_name_fa == sector)
    if limit:
        query = query.limit(limit)

    results = query.all()

    data = []
    for sec, ohlcv in results:
        data.append(ClientTypeSchema(
            ins_code=sec.ins_code,
            symbol=sec.symbol,
            name_fa=sec.name_fa,
            sector_name_fa=sec.sector_name_fa,
            date=ohlcv.date,
            close=float(ohlcv.close) if ohlcv.close else 0,
            last=float(ohlcv.last) if ohlcv.last else None,
            close_change=float(ohlcv.close_change) if ohlcv.close_change else 0,
            close_change_pct=float(ohlcv.close_change_pct) if ohlcv.close_change_pct else 0,
            volume=ohlcv.volume or 0,
            value=ohlcv.value or 0,
            trades=ohlcv.trades or 0,
            low=float(ohlcv.low) if ohlcv.low else 0,
            high=float(ohlcv.high) if ohlcv.high else 0,
            pe_ratio=float(ohlcv.pe_ratio) if ohlcv.pe_ratio else None,
            eps=float(ohlcv.eps) if ohlcv.eps else None,
            market_cap=ohlcv.market_cap,
            real_buy_count=ohlcv.real_buy_count,
            real_buy_volume=ohlcv.real_buy_volume,
            real_sell_count=ohlcv.real_sell_count,
            real_sell_volume=ohlcv.real_sell_volume,
            legal_buy_count=ohlcv.legal_buy_count,
            legal_buy_volume=ohlcv.legal_buy_volume,
            legal_sell_count=ohlcv.legal_sell_count,
            legal_sell_volume=ohlcv.legal_sell_volume,
        ))

    return data


@app.get("/api/stocks/{symbol}", response_model=StockDetailSchema)
def get_stock_detail(symbol: str, db: Session = Depends(get_db)):
    """Get detailed information for a specific stock"""
    sec = db.query(Security).filter(Security.symbol == symbol).first()

    if not sec:
        raise HTTPException(status_code=404, detail=f"Stock {symbol} not found")

    latest_ohlcv = db.query(DailyOHLCV).filter(
        DailyOHLCV.security_id == sec.security_id
    ).order_by(DailyOHLCV.date.desc()).first()

    return StockDetailSchema(
        security=sec,
        latest_ohlcv=latest_ohlcv,
    )


@app.get("/api/stocks/{symbol}/history", response_model=List[DailyOHLCVSchema])
def get_stock_history(
    symbol: str,
    days: int = Query(default=30, le=100000),
    db: Session = Depends(get_db)
):
    """Get historical OHLCV data for a stock"""
    sec = db.query(Security).filter(Security.symbol == symbol).first()

    if not sec:
        raise HTTPException(status_code=404, detail=f"Stock {symbol} not found")

    query = db.query(DailyOHLCV).filter(
        DailyOHLCV.security_id == sec.security_id
    ).order_by(DailyOHLCV.date.desc())

    if days < 100000:
        query = query.limit(days)

    return list(reversed(query.all()))


@app.get("/api/stocks/{symbol}/orderbook", response_model=List[OrderBookSchema])
def get_order_book(
    symbol: str,
    limit: int = Query(default=1, le=100),
    db: Session = Depends(get_db)
):
    """Get latest order book snapshots for a stock"""
    sec = db.query(Security).filter(Security.symbol == symbol).first()

    if not sec:
        raise HTTPException(status_code=404, detail=f"Stock {symbol} not found")

    snapshots = db.query(OrderBook).filter(
        OrderBook.security_id == sec.security_id
    ).order_by(OrderBook.snapshot_time.desc()).limit(limit).all()

    result = []
    for snap in snapshots:
        levels = []
        for i in range(1, 6):
            levels.append(OrderBookLevelSchema(
                bid_price=float(getattr(snap, f'bid_price_{i}')) if getattr(snap, f'bid_price_{i}') else None,
                bid_vol=getattr(snap, f'bid_vol_{i}'),
                bid_count=getattr(snap, f'bid_count_{i}'),
                ask_price=float(getattr(snap, f'ask_price_{i}')) if getattr(snap, f'ask_price_{i}') else None,
                ask_vol=getattr(snap, f'ask_vol_{i}'),
                ask_count=getattr(snap, f'ask_count_{i}'),
            ))
        result.append(OrderBookSchema(
            snapshot_time=snap.snapshot_time,
            levels=levels,
        ))

    return result


@app.get("/api/options/underlyings")
def get_options_underlyings(db: Session = Depends(get_db)):
    """List underlying securities that have options, with option counts and metadata"""
    from sqlalchemy import func, case

    latest_date_result = db.query(Option.date).order_by(Option.date.desc()).first()
    if not latest_date_result:
        return []

    latest_date = latest_date_result[0]

    rows = db.query(
        Option.underlying,
        func.count(Option.id).label('total_options'),
        func.count(case((Option.option_type == 'call', 1))).label('call_count'),
        func.count(case((Option.option_type == 'put', 1))).label('put_count'),
        func.array_agg(func.distinct(Option.expiry_date)).label('expiry_dates'),
    ).filter(
        Option.date == latest_date
    ).group_by(Option.underlying).all()

    result = []
    for row in rows:
        sec = db.query(Security).filter(Security.symbol == row.underlying).first()
        result.append({
            "underlying": row.underlying,
            "security_id": sec.security_id if sec else None,
            "name_fa": sec.name_fa if sec else None,
            "type": sec.type if sec else None,
            "sector_name_fa": sec.sector_name_fa if sec else None,
            "total_options": row.total_options,
            "call_count": row.call_count,
            "put_count": row.put_count,
            "expiry_dates": sorted(row.expiry_dates) if row.expiry_dates else [],
        })

    return result


@app.get("/api/options/chain")
def get_options_chain(
    underlying: str = Query(..., description="Underlying asset symbol"),
    expiry_date: Optional[str] = Query(default=None, description="Filter by expiry date"),
    db: Session = Depends(get_db),
):
    """Get full options chain for a specific underlying asset"""
    latest_date_result = db.query(Option.date).order_by(Option.date.desc()).first()
    if not latest_date_result:
        return {"underlying_info": None, "data_date": None, "expiry_dates": [], "options": []}

    latest_date = latest_date_result[0]

    query = db.query(Option).filter(
        Option.date == latest_date,
        Option.underlying == underlying,
    )

    if expiry_date:
        query = query.filter(Option.expiry_date == expiry_date)

    query = query.order_by(Option.expiry_date, Option.strike_price, Option.option_type)
    options = query.all()

    # Get underlying security metadata
    sec = db.query(Security).filter(Security.symbol == underlying).first()
    underlying_info = {
        "underlying": underlying,
        "security_id": sec.security_id if sec else None,
        "name_fa": sec.name_fa if sec else None,
        "type": sec.type if sec else None,
        "sector_name_fa": sec.sector_name_fa if sec else None,
    }

    expiry_dates = sorted(set(o.expiry_date for o in options if o.expiry_date))

    options_data = []
    for o in options:
        options_data.append({
            "id": o.id,
            "ins_code": o.ins_code,
            "symbol": o.symbol,
            "name_fa": o.name_fa,
            "option_type": o.option_type,
            "underlying": o.underlying,
            "strike_price": float(o.strike_price) if o.strike_price else None,
            "expiry_date": o.expiry_date,
            "open": float(o.open) if o.open else None,
            "high": float(o.high) if o.high else None,
            "low": float(o.low) if o.low else None,
            "close": float(o.close) if o.close else None,
            "last": float(o.last) if o.last else None,
            "close_change": float(o.close_change) if o.close_change else None,
            "volume": o.volume,
            "value": o.value,
            "trades": o.trades,
            "bid_price_1": float(o.bid_price_1) if o.bid_price_1 else None,
            "ask_price_1": float(o.ask_price_1) if o.ask_price_1 else None,
        })

    return {
        "underlying_info": underlying_info,
        "data_date": str(latest_date),
        "expiry_dates": expiry_dates,
        "options": options_data,
    }


@app.get("/api/options", response_model=List[OptionSchema])
def get_options(
    underlying: Optional[str] = None,
    option_type: Optional[str] = None,
    limit: Optional[int] = Query(default=None, le=5000),
    db: Session = Depends(get_db)
):
    """Get options contracts, filterable by underlying asset and option type"""
    latest_date_result = db.query(Option.date).order_by(Option.date.desc()).first()
    if not latest_date_result:
        return []

    query = db.query(Option).filter(Option.date == latest_date_result[0])

    if underlying:
        query = query.filter(Option.underlying == underlying)
    if option_type:
        query = query.filter(Option.option_type == option_type)

    query = query.order_by(Option.underlying, Option.strike_price)

    if limit:
        query = query.limit(limit)

    return query.all()


@app.get("/api/ime/options", response_model=List[IMEOptionSchema])
def get_ime_options(
    commodity: Optional[str] = None,
    option_type: Optional[str] = None,
    limit: Optional[int] = Query(default=None, le=5000),
    db: Session = Depends(get_db)
):
    """Get IME commodity options, filterable by commodity and option type"""
    latest_date_result = db.query(IMEOption.date).order_by(IMEOption.date.desc()).first()
    if not latest_date_result:
        return []

    query = db.query(IMEOption).filter(IMEOption.date == latest_date_result[0])

    if commodity:
        query = query.filter(IMEOption.commodity == commodity)
    if option_type:
        query = query.filter(IMEOption.option_type == option_type)

    query = query.order_by(IMEOption.commodity, IMEOption.price_strike)

    if limit:
        query = query.limit(limit)

    return query.all()


@app.get("/api/ime/futures", response_model=List[IMEFutureSchema])
def get_ime_futures(
    limit: Optional[int] = Query(default=None, le=5000),
    db: Session = Depends(get_db)
):
    """Get IME commodity futures for the latest date"""
    latest_date_result = db.query(IMEFuture.date).order_by(IMEFuture.date.desc()).first()
    if not latest_date_result:
        return []

    query = db.query(IMEFuture).filter(IMEFuture.date == latest_date_result[0])
    query = query.order_by(IMEFuture.contract_code)

    if limit:
        query = query.limit(limit)

    return query.all()


# ─── NEW ENDPOINTS ────────────────────────────────────────────────────────────


@app.get("/api/market/indices", response_model=List[MarketIndexSchema])
def get_market_indices(
    date: Optional[_dt.date] = None,
    db: Session = Depends(get_db)
):
    """Get market indices for a given date (defaults to latest)"""
    if date is None:
        latest = db.query(MarketIndex.date).order_by(MarketIndex.date.desc()).first()
        if not latest:
            return []
        date = latest[0]

    return db.query(MarketIndex).filter(
        MarketIndex.date == date
    ).order_by(MarketIndex.name).all()


@app.get("/api/market/indices/{name}/history")
def get_market_index_history(
    name: str,
    days: int = Query(default=365, le=5000),
    db: Session = Depends(get_db)
):
    """Get historical data for a specific market index by name"""
    results = db.query(MarketIndex).filter(
        MarketIndex.name == name
    ).order_by(MarketIndex.date.desc()).limit(days).all()

    return [
        {
            "date": str(r.date),
            "index_value": float(r.index_value) if r.index_value else None,
            "index_change_pct": float(r.index_change_pct) if r.index_change_pct else None,
        }
        for r in reversed(results)
    ]


@app.get("/api/market/etf-nav", response_model=List[ETFNavSchema])
def get_etf_nav(
    symbol: Optional[str] = None,
    fund_type: Optional[str] = None,
    date: Optional[_dt.date] = None,
    db: Session = Depends(get_db)
):
    """Get ETF NAV data (latest date by default). Joins with securities for symbol/name."""
    if date is None:
        latest = db.query(ETFNav.date).order_by(ETFNav.date.desc()).first()
        if not latest:
            return []
        date = latest[0]

    rows = db.query(ETFNav, Security).join(
        Security, ETFNav.security_id == Security.security_id
    ).filter(ETFNav.date == date)

    if symbol:
        rows = rows.filter(Security.symbol == symbol)
    if fund_type:
        rows = rows.filter(ETFNav.fund_type == fund_type)

    rows = rows.order_by(Security.symbol).all()

    result = []
    for nav, sec in rows:
        result.append(ETFNavSchema(
            id=nav.id,
            security_id=nav.security_id,
            date=nav.date,
            time=nav.time,
            symbol=sec.symbol,
            name_fa=sec.name_fa,
            nav_issuance=float(nav.nav_issuance) if nav.nav_issuance else None,
            nav_redemption=float(nav.nav_redemption) if nav.nav_redemption else None,
            last_price=float(nav.last_price) if nav.last_price else None,
            bubble_pct=float(nav.bubble_pct) if nav.bubble_pct else None,
            fund_type=nav.fund_type,
        ))

    return result


@app.get("/api/market/prices", response_model=List[MarketPriceSchema])
def get_market_prices(
    market_type: Optional[str] = Query(default=None, description="gold, currency, commodity, crypto"),
    date: Optional[_dt.date] = None,
    db: Session = Depends(get_db)
):
    """Get gold/currency/commodity/crypto prices. Joins with securities for metadata."""
    if date is None:
        latest = db.query(MarketPrice.date).order_by(MarketPrice.date.desc()).first()
        if not latest:
            return []
        date = latest[0]

    rows = db.query(MarketPrice, Security).join(
        Security, MarketPrice.security_id == Security.security_id
    ).filter(MarketPrice.date == date)

    if market_type:
        rows = rows.filter(Security.market_type == market_type)

    rows = rows.order_by(Security.symbol).all()

    result = []
    for mp, sec in rows:
        result.append(MarketPriceSchema(
            id=mp.id,
            security_id=mp.security_id,
            date=mp.date,
            time=mp.time,
            symbol=sec.symbol,
            name_fa=sec.name_fa,
            market_type=sec.market_type,
            price=float(mp.price) if mp.price else None,
            price_toman=float(mp.price_toman) if mp.price_toman else None,
            change_value=float(mp.change_value) if mp.change_value else None,
            change_pct=float(mp.change_pct) if mp.change_pct else None,
            unit=mp.unit,
            market_cap=float(mp.market_cap) if mp.market_cap else None,
            icon_url=mp.icon_url,
        ))

    return result


@app.get("/api/ime/certificates", response_model=List[IMECertificateSchema])
def get_ime_certificates(
    cert_type: Optional[int] = Query(default=None, description="1=general, 2=coin/saffron"),
    date: Optional[_dt.date] = None,
    limit: Optional[int] = Query(default=None, le=5000),
    db: Session = Depends(get_db)
):
    """Get IME deposit certificates for the latest date"""
    if date is None:
        latest = db.query(IMECertificate.date).order_by(IMECertificate.date.desc()).first()
        if not latest:
            return []
        date = latest[0]

    query = db.query(IMECertificate).filter(IMECertificate.date == date)

    if cert_type is not None:
        query = query.filter(IMECertificate.cert_type == cert_type)

    query = query.order_by(IMECertificate.contract_code)

    if limit:
        query = query.limit(limit)

    return query.all()


@app.get("/api/ime/funds", response_model=List[IMEFundSchema])
def get_ime_funds(
    date: Optional[_dt.date] = None,
    limit: Optional[int] = Query(default=None, le=5000),
    db: Session = Depends(get_db)
):
    """Get IME commodity funds for the latest date"""
    if date is None:
        latest = db.query(IMEFund.date).order_by(IMEFund.date.desc()).first()
        if not latest:
            return []
        date = latest[0]

    query = db.query(IMEFund).filter(IMEFund.date == date)
    query = query.order_by(IMEFund.symbol)

    if limit:
        query = query.limit(limit)

    return query.all()


@app.get("/api/ime/forwards", response_model=List[IMEForwardSchema])
def get_ime_forwards(
    date: Optional[_dt.date] = None,
    limit: Optional[int] = Query(default=None, le=5000),
    db: Session = Depends(get_db)
):
    """Get IME forward contracts for the latest date"""
    if date is None:
        latest = db.query(IMEForward.date).order_by(IMEForward.date.desc()).first()
        if not latest:
            return []
        date = latest[0]

    query = db.query(IMEForward).filter(IMEForward.date == date)
    query = query.order_by(IMEForward.symbol)

    if limit:
        query = query.limit(limit)

    return query.all()


@app.get("/api/ime/physical", response_model=List[IMEPhysicalTradeSchema])
def get_ime_physical(
    date_start: Optional[_dt.date] = None,
    date_end: Optional[_dt.date] = None,
    limit: Optional[int] = Query(default=None, le=5000),
    db: Session = Depends(get_db)
):
    """Get IME physical trades. Defaults to latest date if no range given."""
    if date_start is None and date_end is None:
        latest = db.query(IMEPhysicalTrade.date_trade).order_by(
            IMEPhysicalTrade.date_trade.desc()
        ).first()
        if not latest:
            return []
        date_start = latest[0]
        date_end = latest[0]

    query = db.query(IMEPhysicalTrade)

    if date_start:
        query = query.filter(IMEPhysicalTrade.date_trade >= date_start)
    if date_end:
        query = query.filter(IMEPhysicalTrade.date_trade <= date_end)

    query = query.order_by(IMEPhysicalTrade.date_trade.desc(), IMEPhysicalTrade.code_offer)

    if limit:
        query = query.limit(limit)

    return query.all()


@app.get("/api/stocks/{symbol}/shareholders", response_model=List[ShareholderSchema])
def get_shareholders(
    symbol: str,
    date: Optional[_dt.date] = None,
    db: Session = Depends(get_db)
):
    """Get major shareholders for a stock"""
    sec = db.query(Security).filter(Security.symbol == symbol).first()
    if not sec:
        raise HTTPException(status_code=404, detail=f"Stock {symbol} not found")

    if date is None:
        latest = db.query(Shareholder.date).filter(
            Shareholder.security_id == sec.security_id
        ).order_by(Shareholder.date.desc()).first()
        if not latest:
            return []
        date = latest[0]

    return db.query(Shareholder).filter(
        Shareholder.security_id == sec.security_id,
        Shareholder.date == date,
    ).order_by(Shareholder.percent.desc()).all()


@app.get("/api/codal", response_model=List[CodalAnnouncementSchema])
def get_codal(
    symbol: Optional[str] = None,
    category: Optional[int] = None,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, le=200),
    db: Session = Depends(get_db)
):
    """Get Codal announcements, paginated"""
    query = db.query(CodalAnnouncement)

    if symbol:
        query = query.filter(CodalAnnouncement.symbol == symbol)
    if category is not None:
        query = query.filter(CodalAnnouncement.category == category)

    query = query.order_by(CodalAnnouncement.id.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)

    return query.all()


@app.get("/api/stocks/{symbol}/tick-trades", response_model=List[TickTradeSchema])
def get_tick_trades(
    symbol: str,
    date: Optional[_dt.date] = None,
    db: Session = Depends(get_db)
):
    """Get tick-level trade data for a stock"""
    sec = db.query(Security).filter(Security.symbol == symbol).first()
    if not sec:
        raise HTTPException(status_code=404, detail=f"Stock {symbol} not found")

    if date is None:
        latest = db.query(TickTrade.date).filter(
            TickTrade.security_id == sec.security_id
        ).order_by(TickTrade.date.desc()).first()
        if not latest:
            return []
        date = latest[0]

    return db.query(TickTrade).filter(
        TickTrade.security_id == sec.security_id,
        TickTrade.date == date,
    ).order_by(TickTrade.row_num).all()


# ─── STATS & SCRAPER ─────────────────────────────────────────────────────────


@app.get("/api/stats")
def get_statistics(db: Session = Depends(get_db)):
    """Get overall market statistics"""
    total_securities = db.query(Security).filter(Security.is_active == True).count()

    latest_date_result = db.query(DailyOHLCV.date).order_by(DailyOHLCV.date.desc()).first()
    latest_date = latest_date_result[0] if latest_date_result else None

    securities_with_data = 0
    total_volume = 0
    total_value = 0

    if latest_date:
        from sqlalchemy import func
        stats = db.query(
            func.count(DailyOHLCV.id),
            func.sum(DailyOHLCV.volume),
            func.sum(DailyOHLCV.value),
        ).filter(DailyOHLCV.date == latest_date).one()
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


@app.post("/api/scraper/run/{spider_name}")
def run_scraper(spider_name: str, background_tasks: BackgroundTasks):
    """Trigger a scraper manually"""
    allowed_spiders = [
        'market_watch', 'instrument_details', 'history_backfill',
        'options', 'ime_options', 'ime_futures',
        'market_indices', 'etf_nav', 'ime_certificates', 'ime_funds',
        'ime_forwards', 'market_prices', 'ime_physical',
        'shareholders', 'codal', 'tick_trades',
    ]

    if spider_name not in allowed_spiders:
        raise HTTPException(status_code=400, detail=f"Invalid spider name. Allowed: {allowed_spiders}")

    def run_spider_task(spider: str):
        try:
            subprocess.run(
                [sys.executable, "-m", "scrapy", "crawl", spider, "-s", "LOG_LEVEL=INFO"],
                check=True,
                capture_output=True
            )
        except subprocess.CalledProcessError as e:
            print(f"Spider {spider} failed: {e}")

    background_tasks.add_task(run_spider_task, spider_name)

    return {
        "status": "started",
        "spider": spider_name,
        "message": f"Scraper {spider_name} started in background."
    }


@app.post("/api/scraper/update-all")
def update_all_data(background_tasks: BackgroundTasks):
    """Run both market_watch and instrument_details scrapers"""

    def run_all_spiders():
        from concurrent.futures import ThreadPoolExecutor

        def run_spider(spider):
            try:
                subprocess.run(
                    [sys.executable, "-m", "scrapy", "crawl", spider, "-s", "LOG_LEVEL=INFO"],
                    check=True,
                    capture_output=True
                )
            except subprocess.CalledProcessError as e:
                print(f"Spider {spider} failed: {e}")

        spiders = ['market_watch', 'instrument_details']
        with ThreadPoolExecutor(max_workers=2) as executor:
            executor.map(run_spider, spiders)

    background_tasks.add_task(run_all_spiders)

    return {
        "status": "started",
        "spiders": ["market_watch", "instrument_details"],
        "message": "All scrapers started in parallel."
    }


@app.get("/api/scheduler/status")
def get_scheduler_status():
    """Get scheduler status and job list"""
    if _tsetmc_scheduler:
        return _tsetmc_scheduler.get_status()
    return {"running": False, "timezone": "Asia/Tehran", "job_count": 0, "jobs": []}


# ─── RAG ENDPOINTS ───────────────────────────────────────────────────────────


@app.post("/api/rag/search", response_model=RAGSearchResponse)
def rag_search(req: RAGSearchRequest, db: Session = Depends(get_db)):
    """Semantic search over embedded financial report chunks"""
    from rag.pipeline import search
    results = search(db, query=req.query, top_k=req.top_k, symbol=req.symbol)
    return RAGSearchResponse(
        query=req.query,
        results=[RAGSearchResult(**r) for r in results],
    )


@app.post("/api/rag/chat", response_model=RAGChatResponse)
def rag_chat(req: RAGChatRequest, db: Session = Depends(get_db)):
    """RAG chat: retrieve context + LLM answer with source citations"""
    from rag.chat import chat
    result = chat(db, message=req.message, symbol=req.symbol, top_k=req.top_k)
    return RAGChatResponse(**result)


@app.get("/api/rag/status", response_model=RAGStatusResponse)
def rag_status(db: Session = Depends(get_db)):
    """Get RAG pipeline status and statistics"""
    from rag.pipeline import get_status
    return RAGStatusResponse(**get_status(db))


@app.post("/api/rag/process", response_model=RAGProcessResponse)
def rag_process(background_tasks: BackgroundTasks):
    """Trigger RAG pipeline manually (runs in background)"""
    def _run_pipeline():
        from database.connection import get_db_manager
        from rag.pipeline import process_new_documents
        mgr = get_db_manager()
        with mgr.get_session() as session:
            process_new_documents(session)

    background_tasks.add_task(_run_pipeline)
    return RAGProcessResponse(
        status="started",
        message="RAG pipeline started in background.",
    )


@app.post("/api/rag/upload", response_model=RAGUploadResponse)
def rag_upload(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    symbol: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """Upload a document (PDF, TXT, etc.) for RAG processing"""
    ALLOWED_TYPES = {
        "application/pdf", "text/plain", "application/json",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/html", "text/markdown",
    }
    MAX_SIZE = 50 * 1024 * 1024  # 50 MB

    content = file.file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 50 MB limit")

    file_hash = hashlib.sha256(content).hexdigest()
    existing = db.query(PDFDocument).filter(PDFDocument.download_hash == file_hash).first()
    if existing:
        raise HTTPException(status_code=409, detail="Document already uploaded")

    doc_title = title or file.filename or "Untitled"
    upload_source_url = f"upload://{file.filename}"
    doc = PDFDocument(
        title=doc_title,
        symbol=symbol,
        status="pending",
        download_hash=file_hash,
        source_url=upload_source_url,
        source="upload",
    )
    db.add(doc)
    db.flush()

    upload_dir = Path("data/uploads")
    upload_dir.mkdir(parents=True, exist_ok=True)
    dest = upload_dir / f"{doc.id}_{file.filename}"
    dest.write_bytes(content)
    doc.file_path = str(dest)
    doc.status = "downloaded"
    db.commit()
    db.refresh(doc)

    def _process(doc_id: int):
        from database.connection import get_db_manager
        from rag.pipeline import process_single_document
        mgr = get_db_manager()
        with mgr.get_session() as session:
            process_single_document(session, doc_id)

    background_tasks.add_task(_process, doc.id)
    return RAGUploadResponse(
        document_id=doc.id,
        title=doc.title,
        status=doc.status,
        message="Document uploaded and queued for processing.",
    )


@app.get("/api/rag/documents", response_model=List[RAGDocumentSchema])
def rag_documents(
    skip: int = 0,
    limit: int = Query(default=50, le=200),
    db: Session = Depends(get_db),
):
    """List all RAG documents with pagination"""
    docs = db.query(PDFDocument).order_by(PDFDocument.id.desc()).offset(skip).limit(limit).all()
    result = []
    for doc in docs:
        source = doc.source if doc.source else "codal"
        result.append(RAGDocumentSchema(
            id=doc.id,
            title=doc.title,
            symbol=doc.symbol,
            status=doc.status,
            page_count=doc.page_count,
            created_at=doc.created_at,
            source=source,
        ))
    return result


@app.delete("/api/rag/documents/{doc_id}")
def rag_delete_document(doc_id: int, db: Session = Depends(get_db)):
    """Delete an uploaded RAG document (upload source only)"""
    doc = db.query(PDFDocument).filter(PDFDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.source != "upload":
        raise HTTPException(status_code=403, detail="Only uploaded documents can be deleted")
    db.query(DocumentChunk).filter(DocumentChunk.document_id == doc_id).delete()
    db.delete(doc)
    db.commit()
    return {"status": "deleted", "document_id": doc_id}


# ─── CHAT ENDPOINTS ───────────────────────────────────────────────────────────


@app.get("/api/chat/models", response_model=ModelsResponse)
def get_chat_models():
    """Get available LLM models for chat"""
    from config.settings import AVAILABLE_MODELS, RAG_CHAT_MODEL
    return ModelsResponse(
        models=[ModelInfo(**m) for m in AVAILABLE_MODELS],
        default=RAG_CHAT_MODEL,
    )


@app.post("/api/chat", response_model=ChatResponse)
def chat_with_tools(req: ChatRequest, db: Session = Depends(get_db)):
    """Multi-turn chat with tool calling and live database access"""
    from rag.tool_executor import run_chat_with_tools
    messages = [{"role": m.role, "content": m.content or ""} for m in req.messages]
    result = run_chat_with_tools(
        db=db,
        messages=messages,
        model=req.model,
        symbol=req.symbol,
        top_k=req.top_k,
    )
    return ChatResponse(**result)


# Serve frontend static files (must be after all /api routes)
_frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"
if _frontend_dist.is_dir():
    app.mount("/assets", StaticFiles(directory=_frontend_dist / "assets"), name="static")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve the React SPA for all non-API routes"""
        file_path = _frontend_dist / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(_frontend_dist / "index.html")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
