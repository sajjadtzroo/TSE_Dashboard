"""
Crypto market endpoints: tickers, OHLCV history, global stats, movers.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from api.cache_decorators import cached
from api.deps import get_db
from api.schemas_crypto import (
    CryptoDetailSchema,
    CryptoGlobalStatsSchema,
    CryptoMomentumItem,
    CryptoMoversSchema,
    CryptoOHLCVSchema,
    CryptoTickerSchema,
)
from database.models import CryptoGlobalMetrics, CryptoOHLCV, CryptoTicker, Security

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/crypto", tags=["crypto"])


# ── Helpers ─────────────────────────────────────────────────────────────────


def _get_crypto_security(db: Session, symbol: str) -> Security:
    """Look up a crypto Security row or raise 404."""
    sec = (
        db.query(Security)
        .filter(Security.symbol == symbol.upper(), Security.market_type == "crypto")
        .first()
    )
    if not sec:
        raise HTTPException(status_code=404, detail=f"Crypto '{symbol}' not found")
    return sec


def _ticker_to_schema(ticker: CryptoTicker, sec: Security) -> CryptoTickerSchema:
    """Map a CryptoTicker + Security ORM pair to the response schema."""
    return CryptoTickerSchema(
        symbol=sec.symbol,
        name_fa=sec.name_fa,
        name_en=sec.name_en,
        last_price=float(ticker.last_price) if ticker.last_price is not None else 0.0,
        price_change_24h=(
            float(ticker.price_change_24h)
            if ticker.price_change_24h is not None
            else None
        ),
        price_change_pct_24h=(
            float(ticker.price_change_pct_24h)
            if ticker.price_change_pct_24h is not None
            else None
        ),
        high_24h=float(ticker.high_24h) if ticker.high_24h is not None else None,
        low_24h=float(ticker.low_24h) if ticker.low_24h is not None else None,
        volume_24h=float(ticker.volume_24h) if ticker.volume_24h is not None else None,
        turnover_24h=(
            float(ticker.turnover_24h) if ticker.turnover_24h is not None else None
        ),
        best_bid=float(ticker.best_bid) if ticker.best_bid is not None else None,
        best_ask=float(ticker.best_ask) if ticker.best_ask is not None else None,
        market_cap_usd=(
            float(ticker.market_cap_usd) if ticker.market_cap_usd is not None else None
        ),
        price_toman=(
            float(ticker.price_toman) if ticker.price_toman is not None else None
        ),
        snapshot_time=ticker.snapshot_time,
    )


# ── Market (all coins) ─────────────────────────────────────────────────────


@router.get("/market", response_model=list[CryptoTickerSchema])
@cached(
    module="crypto",
    endpoint="market",
    trading_ttl=30,
    off_hours_ttl=30,
    tags=["crypto_ticker"],
)
def get_crypto_market(db: Session = Depends(get_db)):
    """Return latest ticker snapshot for every tracked crypto coin."""
    try:
        # Subquery: max snapshot_time per security_id
        subq = (
            db.query(
                CryptoTicker.security_id,
                func.max(CryptoTicker.snapshot_time).label("max_time"),
            )
            .group_by(CryptoTicker.security_id)
            .subquery()
        )

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
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch crypto market: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to fetch crypto market"
        ) from e


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
def get_crypto_global_stats(db: Session = Depends(get_db)):
    """Return latest crypto global market metrics."""
    try:
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
            total_market_cap_usd=(
                float(row.total_market_cap_usd)
                if row.total_market_cap_usd is not None
                else None
            ),
            total_volume_24h_usd=(
                float(row.total_volume_24h_usd)
                if row.total_volume_24h_usd is not None
                else None
            ),
            btc_dominance_pct=(
                float(row.btc_dominance_pct)
                if row.btc_dominance_pct is not None
                else None
            ),
            eth_dominance_pct=(
                float(row.eth_dominance_pct)
                if row.eth_dominance_pct is not None
                else None
            ),
            active_coins=(
                float(row.active_coins) if row.active_coins is not None else None
            ),
            fear_greed_value=(
                float(row.fear_greed_value)
                if row.fear_greed_value is not None
                else None
            ),
            fear_greed_label=row.fear_greed_label,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch global crypto stats: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to fetch global crypto stats"
        ) from e


# ── Movers (top gainers / losers) ──────────────────────────────────────────
# NOTE: registered BEFORE /{symbol} to avoid path capture


@router.get("/movers", response_model=CryptoMoversSchema)
@cached(
    module="crypto",
    endpoint="movers",
    trading_ttl=30,
    off_hours_ttl=30,
    tags=["crypto_ticker"],
)
def get_crypto_movers(db: Session = Depends(get_db)):
    """Return top 5 gainers and top 5 losers by 24h price change percentage."""
    try:
        # Latest ticker per coin (same subquery pattern as /market)
        subq = (
            db.query(
                CryptoTicker.security_id,
                func.max(CryptoTicker.snapshot_time).label("max_time"),
            )
            .group_by(CryptoTicker.security_id)
            .subquery()
        )

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
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch crypto movers: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to fetch crypto movers"
        ) from e


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
def get_crypto_signals(db: Session = Depends(get_db)):
    """RSI(14) + 7d/30d momentum signals for all tracked crypto coins."""
    try:
        securities = (
            db.query(Security)
            .filter(Security.market_type == "crypto")
            .all()
        )

        # Subquery: latest ticker per security_id for 24h change
        ticker_subq = (
            db.query(
                CryptoTicker.security_id,
                func.max(CryptoTicker.snapshot_time).label("max_time"),
            )
            .group_by(CryptoTicker.security_id)
            .subquery()
        )
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

        results: list[CryptoMomentumItem] = []
        for sec in securities:
            # Fetch last 31 daily closes (newest first)
            ohlcv_rows = (
                db.query(CryptoOHLCV.close)
                .filter(
                    CryptoOHLCV.security_id == sec.security_id,
                    CryptoOHLCV.interval == "1day",
                    CryptoOHLCV.close.isnot(None),
                )
                .order_by(desc(CryptoOHLCV.open_time))
                .limit(31)
                .all()
            )
            closes = [float(r.close) for r in ohlcv_rows]  # newest → oldest

            # RSI needs chronological order (oldest first)
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
                    symbol=sec.symbol,
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
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to compute crypto signals: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to compute crypto signals"
        ) from e


# ── Single Coin Detail ─────────────────────────────────────────────────────


@router.get("/{symbol}", response_model=CryptoDetailSchema)
@cached(
    module="crypto",
    endpoint="detail",
    trading_ttl=30,
    off_hours_ttl=30,
    tags=["crypto_ticker"],
)
def get_crypto_detail(symbol: str, db: Session = Depends(get_db)):
    """Return latest ticker for a single coin with 24h sparkline."""
    try:
        sec = _get_crypto_security(db, symbol)

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
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch crypto detail for {symbol}: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to fetch crypto detail"
        ) from e


# ── OHLCV History ──────────────────────────────────────────────────────────


@router.get("/{symbol}/history", response_model=list[CryptoOHLCVSchema])
@cached(
    module="crypto",
    endpoint="history",
    trading_ttl=60,
    off_hours_ttl=60,
    tags=["crypto_ohlcv"],
)
def get_crypto_history(
    symbol: str,
    interval: str = Query(
        default="1day", description="Candle interval (1min, 5min, 1hour, 1day, etc.)"
    ),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """Return OHLCV candle data for a crypto coin."""
    try:
        sec = _get_crypto_security(db, symbol)

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
                open=float(r.open) if r.open is not None else None,
                high=float(r.high) if r.high is not None else None,
                low=float(r.low) if r.low is not None else None,
                close=float(r.close) if r.close is not None else None,
                volume=float(r.volume) if r.volume is not None else None,
                turnover=float(r.turnover) if r.turnover is not None else None,
            )
            for r in reversed(rows)
        ]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch crypto history for {symbol}: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to fetch crypto history"
        ) from e
