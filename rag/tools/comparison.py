"""Comparison tools — 2 new tools."""
import json
import logging

from sqlalchemy.orm import Session
from sqlalchemy import func

from database.models import Security, DailyOHLCV
from rag.tools._helpers import _dec, _find_security, MAX_ROWS

logger = logging.getLogger(__name__)

# ── Tool definitions ─────────────────────────────────────────────────────────

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "compare_stocks",
            "description": "Compare multiple stocks side-by-side on key metrics: price, P/E, EPS, market cap, volume, daily change%. Provide up to 10 Persian stock symbols.",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbols": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of stock symbols in Persian (max 10)",
                    },
                },
                "required": ["symbols"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "screen_stocks",
            "description": "Filter and rank stocks based on criteria like sector, P/E range, market cap, or volume. Returns a sorted list.",
            "parameters": {
                "type": "object",
                "properties": {
                    "sector": {"type": "string", "description": "Sector name in Persian to filter"},
                    "min_pe": {"type": "number", "description": "Minimum P/E ratio"},
                    "max_pe": {"type": "number", "description": "Maximum P/E ratio"},
                    "min_market_cap": {"type": "integer", "description": "Minimum market cap in Rials"},
                    "sort_by": {
                        "type": "string",
                        "enum": ["market_cap", "pe_ratio", "volume", "change_pct"],
                        "description": "Field to sort by (default: market_cap)",
                    },
                    "limit": {"type": "integer", "description": "Max results (default 20, max 50)"},
                },
            },
        },
    },
]


# ── Tool implementations ─────────────────────────────────────────────────────


def compare_stocks(db: Session, symbols: list[str]) -> str:
    symbols = symbols[:10]
    results = []
    for sym in symbols:
        sec = _find_security(db, sym)
        if not sec:
            results.append({"symbol": sym, "error": "not found"})
            continue
        ohlcv = (
            db.query(DailyOHLCV)
            .filter(DailyOHLCV.security_id == sec.security_id)
            .order_by(DailyOHLCV.date.desc())
            .first()
        )
        if not ohlcv:
            results.append({"symbol": sym, "error": "no data"})
            continue
        results.append({
            "symbol": sec.symbol,
            "name": sec.name_fa,
            "sector": sec.sector_name_fa,
            "date": str(ohlcv.date),
            "close": _dec(ohlcv.close),
            "change_pct": _dec(ohlcv.close_change_pct),
            "volume": ohlcv.volume,
            "value": ohlcv.value,
            "eps": _dec(ohlcv.eps),
            "pe_ratio": _dec(ohlcv.pe_ratio),
            "market_cap": ohlcv.market_cap,
        })
    return json.dumps({"count": len(results), "comparison": results}, ensure_ascii=False)


def screen_stocks(
    db: Session,
    sector: str = None,
    min_pe: float = None,
    max_pe: float = None,
    min_market_cap: int = None,
    sort_by: str = "market_cap",
    limit: int = 20,
) -> str:
    limit = min(max(limit, 1), 50)

    # Subquery: latest date per security
    latest_sub = (
        db.query(
            DailyOHLCV.security_id,
            func.max(DailyOHLCV.date).label("max_date"),
        )
        .group_by(DailyOHLCV.security_id)
        .subquery()
    )

    query = (
        db.query(DailyOHLCV, Security)
        .join(Security, DailyOHLCV.security_id == Security.security_id)
        .join(
            latest_sub,
            (DailyOHLCV.security_id == latest_sub.c.security_id)
            & (DailyOHLCV.date == latest_sub.c.max_date),
        )
        .filter(Security.is_active == True, Security.market_type == "tse")
    )

    if sector:
        query = query.filter(Security.sector_name_fa == sector)
    if min_pe is not None:
        query = query.filter(DailyOHLCV.pe_ratio >= min_pe)
    if max_pe is not None:
        query = query.filter(DailyOHLCV.pe_ratio <= max_pe)
    if min_market_cap is not None:
        query = query.filter(DailyOHLCV.market_cap >= min_market_cap)

    sort_map = {
        "market_cap": DailyOHLCV.market_cap.desc().nullslast(),
        "pe_ratio": DailyOHLCV.pe_ratio.asc().nullslast(),
        "volume": DailyOHLCV.volume.desc().nullslast(),
        "change_pct": DailyOHLCV.close_change_pct.desc().nullslast(),
    }
    order = sort_map.get(sort_by, sort_map["market_cap"])
    rows = query.order_by(order).limit(limit).all()

    data = [
        {
            "symbol": sec.symbol,
            "name": sec.name_fa,
            "sector": sec.sector_name_fa,
            "close": _dec(o.close),
            "change_pct": _dec(o.close_change_pct),
            "volume": o.volume,
            "eps": _dec(o.eps),
            "pe_ratio": _dec(o.pe_ratio),
            "market_cap": o.market_cap,
        }
        for o, sec in rows
    ]
    return json.dumps({"count": len(data), "sort_by": sort_by, "stocks": data}, ensure_ascii=False)


# ── Dispatch map ──────────────────────────────────────────────────────────────

TOOL_DISPATCH = {
    "compare_stocks": compare_stocks,
    "screen_stocks": screen_stocks,
}
