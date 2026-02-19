"""Crypto market tools — 5 tools for the crypto agent."""

import json
import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from database.models import CryptoGlobalMetrics, CryptoOHLCV, CryptoTicker, Security
from rag.tools._helpers import MAX_ROWS, _dec, _find_security, _not_found

logger = logging.getLogger(__name__)


# ── Tool definitions ─────────────────────────────────────────────────────────

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "get_crypto_price",
            "description": "Get current price, 24h change, volume, market cap, and Toman price for a cryptocurrency.",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "Crypto symbol (e.g. 'BTC', 'ETH', 'SOL')",
                    },
                },
                "required": ["symbol"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_crypto_history",
            "description": "Get OHLCV candle history for a cryptocurrency. Returns up to 100 candles.",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "Crypto symbol (e.g. 'BTC', 'ETH')",
                    },
                    "interval": {
                        "type": "string",
                        "description": "Candle interval: 1hour, 4hour, 1day, 1week (default: 1day)",
                    },
                    "days": {
                        "type": "integer",
                        "description": "Number of days of history (default 30, max 365)",
                    },
                },
                "required": ["symbol"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compare_crypto",
            "description": "Compare 2-5 cryptocurrencies side by side (price, 24h change, volume, market cap).",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbols": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of crypto symbols to compare (e.g. ['BTC', 'ETH', 'SOL'])",
                    },
                },
                "required": ["symbols"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_crypto_market_overview",
            "description": "Get overview of top 30 cryptocurrencies with global market stats (market cap, BTC dominance, volume).",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_crypto_fear_greed",
            "description": "Get the current Crypto Fear & Greed Index value and label.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
]


# ── Tool implementations ─────────────────────────────────────────────────────


def get_crypto_price(db: Session, symbol: str) -> str:
    """Get current price for a crypto asset."""
    sec = _find_security(db, symbol, "crypto")
    if not sec:
        return _not_found(symbol, "Crypto")

    ticker = (
        db.query(CryptoTicker)
        .filter(CryptoTicker.security_id == sec.security_id)
        .order_by(desc(CryptoTicker.snapshot_time))
        .first()
    )
    if not ticker:
        return json.dumps({"error": f"No price data for {symbol}"}, ensure_ascii=False)

    return json.dumps(
        {
            "symbol": sec.symbol,
            "name_fa": sec.name_fa,
            "name_en": sec.name_en,
            "last_price": _dec(ticker.last_price),
            "price_change_24h": _dec(ticker.price_change_24h),
            "price_change_pct_24h": _dec(ticker.price_change_pct_24h),
            "high_24h": _dec(ticker.high_24h),
            "low_24h": _dec(ticker.low_24h),
            "volume_24h": _dec(ticker.volume_24h),
            "market_cap_usd": _dec(ticker.market_cap_usd),
            "price_toman": _dec(ticker.price_toman),
            "snapshot_time": str(ticker.snapshot_time),
        },
        ensure_ascii=False,
    )


def get_crypto_history(
    db: Session, symbol: str, interval: str = "1day", days: int = 30
) -> str:
    """Get OHLCV history for a crypto asset."""
    sec = _find_security(db, symbol, "crypto")
    if not sec:
        return _not_found(symbol, "Crypto")

    days = min(max(days, 1), 365)
    cutoff = datetime.now(UTC) - timedelta(days=days)
    limit = min(days * 24 if "hour" in interval else days, MAX_ROWS * 2)

    rows = (
        db.query(CryptoOHLCV)
        .filter(
            CryptoOHLCV.security_id == sec.security_id,
            CryptoOHLCV.interval == interval,
            CryptoOHLCV.open_time >= cutoff,
        )
        .order_by(desc(CryptoOHLCV.open_time))
        .limit(limit)
        .all()
    )

    return json.dumps(
        {
            "symbol": sec.symbol,
            "interval": interval,
            "count": len(rows),
            "candles": [
                {
                    "time": str(r.open_time),
                    "open": _dec(r.open),
                    "high": _dec(r.high),
                    "low": _dec(r.low),
                    "close": _dec(r.close),
                    "volume": _dec(r.volume),
                }
                for r in reversed(rows)
            ],
        },
        ensure_ascii=False,
    )


def compare_crypto(db: Session, symbols: list[str]) -> str:
    """Compare multiple crypto assets."""
    symbols = [s.upper() for s in symbols[:5]]
    results = []
    for sym in symbols:
        sec = _find_crypto(db, sym)
        if not sec:
            results.append({"symbol": sym, "error": "not found"})
            continue
        ticker = (
            db.query(CryptoTicker)
            .filter(CryptoTicker.security_id == sec.security_id)
            .order_by(desc(CryptoTicker.snapshot_time))
            .first()
        )
        if not ticker:
            results.append({"symbol": sym, "error": "no data"})
            continue
        results.append(
            {
                "symbol": sec.symbol,
                "name_fa": sec.name_fa,
                "name_en": sec.name_en,
                "last_price": _dec(ticker.last_price),
                "price_change_pct_24h": _dec(ticker.price_change_pct_24h),
                "volume_24h": _dec(ticker.volume_24h),
                "market_cap_usd": _dec(ticker.market_cap_usd),
                "price_toman": _dec(ticker.price_toman),
            }
        )
    return json.dumps({"comparisons": results}, ensure_ascii=False)


def get_crypto_market_overview(db: Session) -> str:
    """Get top 30 crypto overview + global stats."""
    # Latest ticker per coin
    subq = (
        db.query(
            CryptoTicker.security_id,
            func.max(CryptoTicker.snapshot_time).label("max_time"),
        )
        .group_by(CryptoTicker.security_id)
        .subquery()
    )
    rows = (
        db.query(CryptoTicker, Security)
        .join(
            subq,
            (CryptoTicker.security_id == subq.c.security_id)
            & (CryptoTicker.snapshot_time == subq.c.max_time),
        )
        .join(Security, CryptoTicker.security_id == Security.security_id)
        .all()
    )

    coins = []
    for ticker, sec in rows:
        coins.append(
            {
                "symbol": sec.symbol,
                "name_fa": sec.name_fa,
                "price": _dec(ticker.last_price),
                "change_24h": _dec(ticker.price_change_pct_24h),
                "volume_24h": _dec(ticker.volume_24h),
                "market_cap": _dec(ticker.market_cap_usd),
            }
        )
    coins.sort(key=lambda c: c.get("market_cap") or 0, reverse=True)

    # Global metrics
    gm = db.query(CryptoGlobalMetrics).order_by(desc(CryptoGlobalMetrics.date)).first()
    global_stats = None
    if gm:
        global_stats = {
            "total_market_cap": _dec(gm.total_market_cap_usd),
            "total_volume_24h": _dec(gm.total_volume_24h_usd),
            "btc_dominance": _dec(gm.btc_dominance_pct),
            "eth_dominance": _dec(gm.eth_dominance_pct),
            "fear_greed": gm.fear_greed_value,
            "fear_greed_label": gm.fear_greed_label,
        }

    return json.dumps(
        {"coins": coins, "global_stats": global_stats},
        ensure_ascii=False,
    )


def get_crypto_fear_greed(db: Session) -> str:
    """Get latest Fear & Greed index."""
    gm = db.query(CryptoGlobalMetrics).order_by(desc(CryptoGlobalMetrics.date)).first()
    if not gm:
        return json.dumps({"error": "No Fear & Greed data available"})
    return json.dumps(
        {
            "date": str(gm.date),
            "value": gm.fear_greed_value,
            "label": gm.fear_greed_label,
            "btc_dominance": _dec(gm.btc_dominance_pct),
        },
        ensure_ascii=False,
    )


# ── Dispatch map ──────────────────────────────────────────────────────────────

TOOL_DISPATCH = {
    "get_crypto_price": get_crypto_price,
    "get_crypto_history": get_crypto_history,
    "compare_crypto": compare_crypto,
    "get_crypto_market_overview": get_crypto_market_overview,
    "get_crypto_fear_greed": get_crypto_fear_greed,
}
