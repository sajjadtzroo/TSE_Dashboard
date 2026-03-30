"""
Crypto market endpoints: tickers, OHLCV history, global stats, movers.
"""

import logging
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, func, text
from sqlalchemy.orm import Session

from api.cache_decorators import cached
from api.deps import get_db
from api.helpers import get_security_or_404
from api.utils import handle_api_errors, to_float
from api.schemas_crypto import (
    CryptoDetailSchema,
    CryptoGlobalStatsSchema,
    CryptoMomentumItem,
    CryptoMoversSchema,
    CryptoOHLCVSchema,
    CryptoTickerSchema,
)
from config.crypto_symbols import CMC_TO_FA, FA_TO_CMC
from database.models import CryptoGlobalMetrics, CryptoOHLCV, CryptoTicker, Security

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/crypto", tags=["crypto"])


# ── CMC ↔ Farsi symbol helpers ──────────────────────────────────────────────

def _resolve_crypto_symbol(symbol: str) -> str:
    """Translate a CMC English symbol (e.g. 'BTC') to its Farsi DB symbol."""
    return CMC_TO_FA.get(symbol.upper(), symbol)


def _to_cmc_symbol(fa_symbol: str) -> str:
    """Translate a Farsi DB symbol back to CMC English for API responses."""
    return FA_TO_CMC.get(fa_symbol, fa_symbol)


# ── Shared query helpers ─────────────────────────────────────────────────────

def _latest_ticker_subq(db: Session):
    """Subquery: latest snapshot_time per security_id across CryptoTicker rows."""
    return (
        db.query(
            CryptoTicker.security_id,
            func.max(CryptoTicker.snapshot_time).label("max_time"),
        )
        .group_by(CryptoTicker.security_id)
        .subquery()
    )


# ── Helpers ─────────────────────────────────────────────────────────────────


def _ticker_to_schema(ticker: CryptoTicker, sec: Security) -> CryptoTickerSchema:
    """Map a CryptoTicker + Security ORM pair to the response schema."""
    return CryptoTickerSchema(
        symbol=_to_cmc_symbol(sec.symbol),
        name_fa=sec.name_fa,
        name_en=sec.name_en,
        last_price=to_float(ticker.last_price) or 0.0,
        price_change_24h=to_float(ticker.price_change_24h),
        price_change_pct_24h=to_float(ticker.price_change_pct_24h),
        high_24h=to_float(ticker.high_24h),
        low_24h=to_float(ticker.low_24h),
        volume_24h=to_float(ticker.volume_24h),
        turnover_24h=to_float(ticker.turnover_24h),
        best_bid=to_float(ticker.best_bid),
        best_ask=to_float(ticker.best_ask),
        market_cap_usd=to_float(ticker.market_cap_usd),
        price_toman=to_float(ticker.price_toman),
        snapshot_time=ticker.snapshot_time,
    )


# ── Market (all coins) ─────────────────────────────────────────────────────


@router.get("/market", response_model=list[CryptoTickerSchema])
@cached(
    module="crypto",
    endpoint="market",
    trading_ttl=120,
    off_hours_ttl=120,
    tags=["crypto_ticker"],
)
@handle_api_errors("Failed to fetch crypto market")
def get_crypto_market(db: Session = Depends(get_db)):
    """Return latest ticker snapshot for every tracked crypto coin."""
    subq = _latest_ticker_subq(db)

    # Join to get full ticker rows + Security metadata
    latest = (
        db.query(CryptoTicker, Security)
        .join(
            subq,
            (CryptoTicker.security_id == subq.c.security_id)
            & (CryptoTicker.snapshot_time == subq.c.max_time),
        )
        .join(Security, CryptoTicker.security_id == Security.security_id)
        .all()
    )

    return [_ticker_to_schema(ticker, sec) for ticker, sec in latest]


# ── Global Stats ───────────────────────────────────────────────────────────
# NOTE: registered BEFORE /{symbol} to avoid path capture


@router.get("/stats/global", response_model=CryptoGlobalStatsSchema)
@cached(
    module="crypto",
    endpoint="stats-global",
    trading_ttl=300,
    off_hours_ttl=300,
    tags=["crypto_global"],
)
@handle_api_errors("Failed to fetch global crypto stats")
def get_crypto_global_stats(db: Session = Depends(get_db)):
    """Return latest crypto global market metrics."""
    row = (
        db.query(CryptoGlobalMetrics)
        .order_by(desc(CryptoGlobalMetrics.date))
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=404, detail="No global crypto stats available"
        )

    return CryptoGlobalStatsSchema(
        date=row.date,
        total_market_cap_usd=to_float(row.total_market_cap_usd),
        total_volume_24h_usd=to_float(row.total_volume_24h_usd),
        btc_dominance_pct=to_float(row.btc_dominance_pct),
        eth_dominance_pct=to_float(row.eth_dominance_pct),
        active_coins=to_float(row.active_coins),
        fear_greed_value=to_float(row.fear_greed_value),
        fear_greed_label=row.fear_greed_label,
    )


# ── Fear & Greed History ──────────────────────────────────────────────────


@router.get("/fear-greed-history")
@cached(
    module="crypto",
    endpoint="fear-greed-history",
    trading_ttl=300,
    off_hours_ttl=600,
    tags=["crypto_global"],
)
@handle_api_errors("Failed to fetch fear & greed history")
def get_fear_greed_history(
    days: int = Query(30, ge=7, le=90),
    db: Session = Depends(get_db),
):
    """Return recent Fear & Greed index values for sparkline display."""
    rows = (
        db.query(
            CryptoGlobalMetrics.date,
            CryptoGlobalMetrics.fear_greed_value,
            CryptoGlobalMetrics.fear_greed_label,
        )
        .order_by(desc(CryptoGlobalMetrics.date))
        .limit(days)
        .all()
    )
    return [
        {
            "date": str(r.date),
            "value": to_float(r.fear_greed_value),
            "label": r.fear_greed_label,
        }
        for r in reversed(rows)
    ]


# ── Movers (top gainers / losers) ──────────────────────────────────────────
# NOTE: registered BEFORE /{symbol} to avoid path capture


@router.get("/movers", response_model=CryptoMoversSchema)
@cached(
    module="crypto",
    endpoint="movers",
    trading_ttl=120,
    off_hours_ttl=120,
    tags=["crypto_ticker"],
)
@handle_api_errors("Failed to fetch crypto movers")
def get_crypto_movers(db: Session = Depends(get_db)):
    """Return top 5 gainers and top 5 losers by 24h price change percentage."""
    subq = _latest_ticker_subq(db)

    base_q = (
        db.query(CryptoTicker, Security)
        .join(
            subq,
            (CryptoTicker.security_id == subq.c.security_id)
            & (CryptoTicker.snapshot_time == subq.c.max_time),
        )
        .join(Security, CryptoTicker.security_id == Security.security_id)
        .filter(CryptoTicker.price_change_pct_24h.isnot(None))
    )

    gainers = (
        base_q.order_by(desc(CryptoTicker.price_change_pct_24h)).limit(5).all()
    )
    losers = base_q.order_by(CryptoTicker.price_change_pct_24h).limit(5).all()

    return CryptoMoversSchema(
        gainers=[_ticker_to_schema(t, s) for t, s in gainers],
        losers=[_ticker_to_schema(t, s) for t, s in losers],
    )


# ── RSI Momentum Signals ────────────────────────────────────────────────────
# NOTE: registered BEFORE /{symbol} to avoid path capture


def _compute_rsi(closes: list[float], period: int = 14) -> float | None:
    """Wilder's smoothed RSI(period).  Requires len(closes) >= period + 1."""
    if len(closes) < period + 1:
        return None
    deltas = [closes[i] - closes[i - 1] for i in range(1, len(closes))]
    gains = [max(d, 0) for d in deltas]
    losses = [abs(min(d, 0)) for d in deltas]

    # Initial averages (simple mean over first `period` values)
    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period

    # Wilder smoothing for remaining values
    for i in range(period, len(deltas)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period

    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return round(100 - (100 / (1 + rs)), 2)


@router.get("/signals", response_model=list[CryptoMomentumItem])
@cached(
    module="crypto",
    endpoint="signals",
    trading_ttl=300,
    off_hours_ttl=300,
    tags=["crypto_ohlcv"],
)
@handle_api_errors("Failed to compute crypto signals")
def get_crypto_signals(db: Session = Depends(get_db)):
    """RSI(14) + 7d/30d momentum signals for all tracked crypto coins."""
    securities = (
        db.query(Security)
        .filter(Security.market_type == "crypto")
        .all()
    )

    # Latest ticker per security_id for 24h change
    ticker_subq = _latest_ticker_subq(db)
    latest_tickers = (
        db.query(CryptoTicker)
        .join(
            ticker_subq,
            (CryptoTicker.security_id == ticker_subq.c.security_id)
            & (CryptoTicker.snapshot_time == ticker_subq.c.max_time),
        )
        .all()
    )
    ticker_map: dict[int, CryptoTicker] = {t.security_id: t for t in latest_tickers}

    # Single query: rank last 31 daily closes per coin using a window function
    # instead of firing one query per security (N+1 → 1).
    ohlcv_bulk = db.execute(text("""
        SELECT security_id, close
        FROM (
            SELECT security_id, close,
                   ROW_NUMBER() OVER (
                       PARTITION BY security_id
                       ORDER BY open_time DESC
                   ) AS rn
            FROM crypto_ohlcv
            WHERE interval = '1day' AND close IS NOT NULL
        ) ranked
        WHERE rn <= 31
        ORDER BY security_id, rn
    """)).fetchall()

    # Group closes by security_id (rows are already ordered newest→oldest per coin)
    closes_map: dict[int, list[float]] = defaultdict(list)
    for row in ohlcv_bulk:
        closes_map[row[0]].append(float(row[1]))

    results: list[CryptoMomentumItem] = []
    for sec in securities:
        closes = closes_map.get(sec.security_id, [])  # newest → oldest

        chron_closes = list(reversed(closes))
        rsi = _compute_rsi(chron_closes[-15:]) if len(chron_closes) >= 15 else None

        change_7d: float | None = None
        if len(closes) >= 8 and closes[7] and closes[7] != 0:
            change_7d = round((closes[0] - closes[7]) / closes[7] * 100, 2)

        change_30d: float | None = None
        if len(closes) >= 31 and closes[30] and closes[30] != 0:
            change_30d = round((closes[0] - closes[30]) / closes[30] * 100, 2)

        ticker = ticker_map.get(sec.security_id)
        change_24h = (
            float(ticker.price_change_pct_24h)
            if ticker and ticker.price_change_pct_24h is not None
            else None
        )

        if rsi is not None and rsi > 70:
            signal = "overbought"
        elif rsi is not None and rsi < 30:
            signal = "oversold"
        else:
            signal = "neutral"

        results.append(
            CryptoMomentumItem(
                symbol=_to_cmc_symbol(sec.symbol),
                name_fa=sec.name_fa,
                rsi=rsi,
                change_7d=change_7d,
                change_30d=change_30d,
                change_24h=change_24h,
                signal=signal,
            )
        )

    # Sort: overbought first (rsi desc), then neutral, then oversold
    order = {"overbought": 0, "neutral": 1, "oversold": 2}
    results.sort(key=lambda x: (order[x.signal], -(x.rsi or 0)))
    return results


# ── Single Coin Detail ─────────────────────────────────────────────────────


@router.get("/{symbol}", response_model=CryptoDetailSchema)
@cached(
    module="crypto",
    endpoint="detail",
    trading_ttl=60,
    off_hours_ttl=60,
    tags=["crypto_ticker"],
)
@handle_api_errors("Failed to fetch crypto detail")
def get_crypto_detail(symbol: str, db: Session = Depends(get_db)):
    """Return latest ticker for a single coin with 24h sparkline."""
    sec = get_security_or_404(db, _resolve_crypto_symbol(symbol), market_type="crypto")

    # Latest ticker
    ticker = (
        db.query(CryptoTicker)
        .filter(CryptoTicker.security_id == sec.security_id)
        .order_by(desc(CryptoTicker.snapshot_time))
        .first()
    )
    if not ticker:
        raise HTTPException(
            status_code=404, detail=f"No ticker data for '{symbol.upper()}'"
        )

    # 24h sparkline: last 24 ticker snapshots' last_price
    sparkline_rows = (
        db.query(CryptoTicker.last_price)
        .filter(CryptoTicker.security_id == sec.security_id)
        .order_by(desc(CryptoTicker.snapshot_time))
        .limit(24)
        .all()
    )
    sparkline_24h = [
        float(row.last_price)
        for row in reversed(sparkline_rows)
        if row.last_price is not None
    ]

    base = _ticker_to_schema(ticker, sec)
    return CryptoDetailSchema(
        **base.model_dump(),
        sparkline_24h=sparkline_24h,
    )


# ── OHLCV History ──────────────────────────────────────────────────────────


@router.get("/{symbol}/history", response_model=list[CryptoOHLCVSchema])
@cached(
    module="crypto",
    endpoint="history",
    trading_ttl=300,
    off_hours_ttl=300,
    tags=["crypto_ohlcv"],
)
@handle_api_errors("Failed to fetch crypto history")
def get_crypto_history(
    symbol: str,
    interval: str = Query(
        default="1day", description="Candle interval (1min, 5min, 1hour, 1day, etc.)"
    ),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """Return OHLCV candle data for a crypto coin."""
    sec = get_security_or_404(db, _resolve_crypto_symbol(symbol), market_type="crypto")

    rows = (
        db.query(CryptoOHLCV)
        .filter(
            CryptoOHLCV.security_id == sec.security_id,
            CryptoOHLCV.interval == interval,
        )
        .order_by(desc(CryptoOHLCV.open_time))
        .limit(limit)
        .all()
    )

    return [
        CryptoOHLCVSchema(
            security_id=r.security_id,
            interval=r.interval,
            open_time=r.open_time,
            open=to_float(r.open),
            high=to_float(r.high),
            low=to_float(r.low),
            close=to_float(r.close),
            volume=to_float(r.volume),
            turnover=to_float(r.turnover),
        )
        for r in reversed(rows)
    ]
