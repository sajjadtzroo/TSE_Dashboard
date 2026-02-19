"""Technical analysis tools — 2 new tools."""

import json
import logging

from sqlalchemy.orm import Session

from database.models import DailyOHLCV
from rag.tools._helpers import _find_security, _not_found

logger = logging.getLogger(__name__)

# ── Tool definitions ─────────────────────────────────────────────────────────

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "compute_technical_indicators",
            "description": "Compute technical indicators (SMA, EMA, RSI, MACD, Bollinger Bands) for a stock over a given period. Returns the latest computed values.",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "Stock symbol in Persian",
                    },
                    "days": {
                        "type": "integer",
                        "description": "Number of trading days to use (default 90, max 365)",
                    },
                    "indicators": {
                        "type": "array",
                        "items": {
                            "type": "string",
                            "enum": ["sma", "ema", "rsi", "macd", "bollinger"],
                        },
                        "description": "Which indicators to compute (default: all)",
                    },
                },
                "required": ["symbol"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_support_resistance",
            "description": "Get pivot-point-based support/resistance levels and period high/low for a stock.",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "Stock symbol in Persian",
                    },
                    "days": {
                        "type": "integer",
                        "description": "Number of trading days to analyze (default 60, max 180)",
                    },
                },
                "required": ["symbol"],
            },
        },
    },
]


# ── Pure-Python indicator computations ────────────────────────────────────────


def _sma(closes: list[float], period: int) -> float | None:
    if len(closes) < period:
        return None
    return sum(closes[-period:]) / period


def _ema(closes: list[float], period: int) -> float | None:
    if len(closes) < period:
        return None
    multiplier = 2.0 / (period + 1)
    ema_val = sum(closes[:period]) / period
    for price in closes[period:]:
        ema_val = (price - ema_val) * multiplier + ema_val
    return ema_val


def _ema_series(closes: list[float], period: int) -> list[float]:
    """Return full EMA series (length == len(closes)), NaN-padded before period."""
    result = [float("nan")] * len(closes)
    if len(closes) < period:
        return result
    multiplier = 2.0 / (period + 1)
    ema_val = sum(closes[:period]) / period
    result[period - 1] = ema_val
    for i in range(period, len(closes)):
        ema_val = (closes[i] - ema_val) * multiplier + ema_val
        result[i] = ema_val
    return result


def _rsi(closes: list[float], period: int = 14) -> float | None:
    if len(closes) < period + 1:
        return None
    gains = []
    losses = []
    for i in range(1, len(closes)):
        change = closes[i] - closes[i - 1]
        gains.append(max(change, 0))
        losses.append(max(-change, 0))
    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period
    for i in range(period, len(gains)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))


def _macd(closes: list[float]) -> dict | None:
    if len(closes) < 26:
        return None
    # Compute full EMA-12 and EMA-26 series
    ema12_series = _ema_series(closes, 12)
    ema26_series = _ema_series(closes, 26)
    # MACD line series (from index 25 onward where both EMAs exist)
    start = 25  # 26 - 1
    macd_values = [ema12_series[i] - ema26_series[i] for i in range(start, len(closes))]
    macd_line = macd_values[-1]
    # Signal = 9-period EMA of MACD values
    signal = _ema(macd_values, 9) if len(macd_values) >= 9 else None
    histogram = (macd_line - signal) if signal is not None else None
    return {
        "macd_line": round(macd_line, 2),
        "signal": round(signal, 2) if signal is not None else None,
        "histogram": round(histogram, 2) if histogram is not None else None,
    }


def _bollinger(closes: list[float], period: int = 20) -> dict | None:
    if len(closes) < period:
        return None
    window = closes[-period:]
    sma = sum(window) / period
    variance = sum((x - sma) ** 2 for x in window) / period
    std = variance**0.5
    return {
        "middle": round(sma, 2),
        "upper": round(sma + 2 * std, 2),
        "lower": round(sma - 2 * std, 2),
    }


# ── Tool implementations ─────────────────────────────────────────────────────


def compute_technical_indicators(
    db: Session,
    symbol: str,
    days: int = 90,
    indicators: list[str] | None = None,
) -> str:
    sec = _find_security(db, symbol)
    if not sec:
        return _not_found(symbol)
    days = min(max(days, 20), 365)
    rows = (
        db.query(DailyOHLCV)
        .filter(DailyOHLCV.security_id == sec.security_id)
        .order_by(DailyOHLCV.date.desc())
        .limit(days)
        .all()
    )
    if not rows:
        return json.dumps(
            {"error": f"No price data for '{symbol}'"}, ensure_ascii=False
        )

    rows = list(reversed(rows))
    closes = [float(r.close) for r in rows if r.close is not None]
    if len(closes) < 14:
        return json.dumps(
            {"error": "Not enough data points for technical analysis"},
            ensure_ascii=False,
        )

    all_indicators = {"sma", "ema", "rsi", "macd", "bollinger"}
    requested = set(indicators) if indicators else all_indicators

    result = {"symbol": symbol, "data_points": len(closes), "latest_close": closes[-1]}

    if "sma" in requested:
        sma20 = _sma(closes, 20)
        sma50 = _sma(closes, 50)
        result["sma_20"] = round(sma20, 2) if sma20 is not None else None
        result["sma_50"] = round(sma50, 2) if sma50 is not None else None

    if "ema" in requested:
        ema12 = _ema(closes, 12)
        ema26 = _ema(closes, 26)
        result["ema_12"] = round(ema12, 2) if ema12 is not None else None
        result["ema_26"] = round(ema26, 2) if ema26 is not None else None

    if "rsi" in requested:
        rsi_val = _rsi(closes, 14)
        result["rsi_14"] = round(rsi_val, 2) if rsi_val is not None else None

    if "macd" in requested:
        result["macd"] = _macd(closes)

    if "bollinger" in requested:
        result["bollinger"] = _bollinger(closes, 20)

    return json.dumps(result, ensure_ascii=False)


def get_support_resistance(db: Session, symbol: str, days: int = 60) -> str:
    sec = _find_security(db, symbol)
    if not sec:
        return _not_found(symbol)
    days = min(max(days, 10), 180)
    rows = (
        db.query(DailyOHLCV)
        .filter(DailyOHLCV.security_id == sec.security_id)
        .order_by(DailyOHLCV.date.desc())
        .limit(days)
        .all()
    )
    if not rows:
        return json.dumps(
            {"error": f"No price data for '{symbol}'"}, ensure_ascii=False
        )

    rows = list(reversed(rows))
    highs = [float(r.high) for r in rows if r.high is not None]
    lows = [float(r.low) for r in rows if r.low is not None]
    closes = [float(r.close) for r in rows if r.close is not None]

    if not highs or not lows or not closes:
        return json.dumps({"error": "Insufficient data"}, ensure_ascii=False)

    period_high = max(highs)
    period_low = min(lows)
    latest_close = closes[-1]

    # Classic pivot points from last day
    h, low, c = highs[-1], lows[-1], closes[-1]
    pivot = (h + low + c) / 3
    r1 = 2 * pivot - low
    s1 = 2 * pivot - h
    r2 = pivot + (h - low)
    s2 = pivot - (h - low)
    r3 = h + 2 * (pivot - low)
    s3 = low - 2 * (h - pivot)

    result = {
        "symbol": symbol,
        "period_days": len(rows),
        "period_high": round(period_high, 2),
        "period_low": round(period_low, 2),
        "latest_close": round(latest_close, 2),
        "pivot_point": round(pivot, 2),
        "resistance": {"r1": round(r1, 2), "r2": round(r2, 2), "r3": round(r3, 2)},
        "support": {"s1": round(s1, 2), "s2": round(s2, 2), "s3": round(s3, 2)},
    }
    return json.dumps(result, ensure_ascii=False)


# ── Dispatch map ──────────────────────────────────────────────────────────────

TOOL_DISPATCH = {
    "compute_technical_indicators": compute_technical_indicators,
    "get_support_resistance": get_support_resistance,
}
