"""Market data tools — 9 tools (7 existing + 2 new)."""

import json
import logging

from sqlalchemy.orm import Session

from database.models import (
    DailyOHLCV,
    ETFNav,
    MarketIndex,
    MarketPrice,
    OrderBook,
    Security,
    Shareholder,
)
from rag.tools._helpers import MAX_ROWS, _dec, _find_security, _not_found

logger = logging.getLogger(__name__)

# ── Tool definitions ─────────────────────────────────────────────────────────

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "get_stock_price",
            "description": "Get the latest price, P/E ratio, EPS, market cap, volume and other trading data for a stock by its Persian symbol.",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "Stock symbol in Persian (e.g. '\u0641\u0648\u0644\u0627\u062f', '\u062e\u0648\u062f\u0631\u0648', '\u0641\u0645\u0644\u06cc')",
                    },
                },
                "required": ["symbol"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_stock_history",
            "description": "Get historical daily OHLCV (open, high, low, close, volume) data for a stock. Returns up to 365 days.",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "Stock symbol in Persian",
                    },
                    "days": {
                        "type": "integer",
                        "description": "Number of trading days to return (default 30, max 365)",
                    },
                },
                "required": ["symbol"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_order_book",
            "description": "Get the latest 5-level bid/ask order book for a stock.",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "Stock symbol in Persian",
                    },
                },
                "required": ["symbol"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_market_indices",
            "description": "Get TSE market indices (TEDPIX, sector indices, etc.) for the latest trading day.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_sector_stocks",
            "description": "Get all active stocks belonging to a specific sector. Use Persian sector names.",
            "parameters": {
                "type": "object",
                "properties": {
                    "sector": {
                        "type": "string",
                        "description": "Sector name in Persian (e.g. '\u0641\u0644\u0632\u0627\u062a \u0627\u0633\u0627\u0633\u06cc', '\u062e\u0648\u062f\u0631\u0648 \u0648 \u0633\u0627\u062e\u062a \u0642\u0637\u0639\u0627\u062a')",
                    },
                },
                "required": ["sector"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_market_prices",
            "description": "Get gold, currency, commodity, or cryptocurrency prices.",
            "parameters": {
                "type": "object",
                "properties": {
                    "market_type": {
                        "type": "string",
                        "enum": ["gold", "currency", "commodity", "crypto"],
                        "description": "Type of market to query",
                    },
                },
                "required": ["market_type"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_etf_nav",
            "description": "Get ETF Net Asset Value (NAV), last price, and premium/discount data.",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "Optional ETF symbol to filter. If omitted, returns all ETFs.",
                    },
                },
            },
        },
    },
    # ── New tools ─────────────────────────────────────────────────────────────
    {
        "type": "function",
        "function": {
            "name": "get_client_type_data",
            "description": "Get real (individual) vs. legal (institutional) buy/sell data for a stock over recent trading days.",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "Stock symbol in Persian",
                    },
                    "days": {
                        "type": "integer",
                        "description": "Number of trading days (default 5, max 30)",
                    },
                },
                "required": ["symbol"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_shareholders",
            "description": "Get major shareholders (latest snapshot) for a stock, showing shareholder names, share counts, and ownership percentages.",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "Stock symbol in Persian",
                    },
                },
                "required": ["symbol"],
            },
        },
    },
]


# ── Tool implementations ─────────────────────────────────────────────────────


def get_stock_price(db: Session, symbol: str) -> str:
    sec = _find_security(db, symbol)
    if not sec:
        return _not_found(symbol)
    ohlcv = (
        db.query(DailyOHLCV)
        .filter(DailyOHLCV.security_id == sec.security_id)
        .order_by(DailyOHLCV.date.desc())
        .first()
    )
    if not ohlcv:
        return json.dumps(
            {"error": f"No price data for '{symbol}'"}, ensure_ascii=False
        )
    data = {
        "symbol": sec.symbol,
        "name": sec.name_fa,
        "sector": sec.sector_name_fa,
        "date": str(ohlcv.date),
        "close": _dec(ohlcv.close),
        "last": _dec(ohlcv.last),
        "open": _dec(ohlcv.open),
        "high": _dec(ohlcv.high),
        "low": _dec(ohlcv.low),
        "close_change": _dec(ohlcv.close_change),
        "close_change_pct": _dec(ohlcv.close_change_pct),
        "volume": ohlcv.volume,
        "value": ohlcv.value,
        "trades": ohlcv.trades,
        "eps": _dec(ohlcv.eps),
        "pe_ratio": _dec(ohlcv.pe_ratio),
        "market_cap": ohlcv.market_cap,
        "total_shares": sec.total_shares,
    }
    return json.dumps(data, ensure_ascii=False)


def get_stock_history(db: Session, symbol: str, days: int = 30) -> str:
    sec = _find_security(db, symbol)
    if not sec:
        return _not_found(symbol)
    days = min(max(days, 1), 365)
    rows = (
        db.query(DailyOHLCV)
        .filter(DailyOHLCV.security_id == sec.security_id)
        .order_by(DailyOHLCV.date.desc())
        .limit(days)
        .all()
    )
    data = [
        {
            "date": str(r.date),
            "open": _dec(r.open),
            "high": _dec(r.high),
            "low": _dec(r.low),
            "close": _dec(r.close),
            "volume": r.volume,
            "value": r.value,
        }
        for r in reversed(rows)
    ]
    return json.dumps(
        {"symbol": symbol, "days": len(data), "history": data}, ensure_ascii=False
    )


def get_order_book(db: Session, symbol: str) -> str:
    sec = _find_security(db, symbol)
    if not sec:
        return _not_found(symbol)
    snap = (
        db.query(OrderBook)
        .filter(OrderBook.security_id == sec.security_id)
        .order_by(OrderBook.snapshot_time.desc())
        .first()
    )
    if not snap:
        return json.dumps(
            {"error": f"No order book data for '{symbol}'"}, ensure_ascii=False
        )
    levels = []
    for i in range(1, 6):
        levels.append(
            {
                "level": i,
                "bid_price": _dec(getattr(snap, f"bid_price_{i}")),
                "bid_vol": getattr(snap, f"bid_vol_{i}"),
                "bid_count": getattr(snap, f"bid_count_{i}"),
                "ask_price": _dec(getattr(snap, f"ask_price_{i}")),
                "ask_vol": getattr(snap, f"ask_vol_{i}"),
                "ask_count": getattr(snap, f"ask_count_{i}"),
            }
        )
    return json.dumps(
        {"symbol": symbol, "snapshot_time": str(snap.snapshot_time), "levels": levels},
        ensure_ascii=False,
    )


def get_market_indices(db: Session) -> str:
    latest = db.query(MarketIndex.date).order_by(MarketIndex.date.desc()).first()
    if not latest:
        return json.dumps(
            {"error": "No market index data available"}, ensure_ascii=False
        )
    rows = (
        db.query(MarketIndex)
        .filter(MarketIndex.date == latest[0])
        .order_by(MarketIndex.name)
        .limit(MAX_ROWS)
        .all()
    )
    data = [
        {
            "name": r.name,
            "value": _dec(r.index_value),
            "change": _dec(r.index_change),
            "change_pct": _dec(r.index_change_pct),
        }
        for r in rows
    ]
    return json.dumps({"date": str(latest[0]), "indices": data}, ensure_ascii=False)


def get_sector_stocks(db: Session, sector: str) -> str:
    stocks = (
        db.query(Security)
        .filter(Security.sector_name_fa == sector, Security.is_active == True)
        .order_by(Security.symbol)
        .limit(MAX_ROWS)
        .all()
    )
    if not stocks:
        return json.dumps(
            {"error": f"No stocks found in sector '{sector}'"}, ensure_ascii=False
        )
    data = [
        {"symbol": s.symbol, "name": s.name_fa, "market_type": s.market_type}
        for s in stocks
    ]
    return json.dumps(
        {"sector": sector, "count": len(data), "stocks": data}, ensure_ascii=False
    )


def get_market_prices(db: Session, market_type: str) -> str:
    latest = db.query(MarketPrice.date).order_by(MarketPrice.date.desc()).first()
    if not latest:
        return json.dumps(
            {"error": "No market price data available"}, ensure_ascii=False
        )
    rows = (
        db.query(MarketPrice, Security)
        .join(Security, MarketPrice.security_id == Security.security_id)
        .filter(MarketPrice.date == latest[0], Security.market_type == market_type)
        .order_by(Security.symbol)
        .limit(MAX_ROWS)
        .all()
    )
    data = [
        {
            "symbol": sec.symbol,
            "name": sec.name_fa,
            "price": _dec(mp.price),
            "price_toman": _dec(mp.price_toman),
            "change_pct": _dec(mp.change_pct),
            "unit": mp.unit,
        }
        for mp, sec in rows
    ]
    return json.dumps(
        {"market_type": market_type, "date": str(latest[0]), "prices": data},
        ensure_ascii=False,
    )


def get_etf_nav(db: Session, symbol: str = None) -> str:
    latest = db.query(ETFNav.date).order_by(ETFNav.date.desc()).first()
    if not latest:
        return json.dumps({"error": "No ETF NAV data available"}, ensure_ascii=False)
    query = (
        db.query(ETFNav, Security)
        .join(Security, ETFNav.security_id == Security.security_id)
        .filter(ETFNav.date == latest[0])
    )
    if symbol:
        query = query.filter(Security.symbol == symbol)
    rows = query.order_by(Security.symbol).limit(MAX_ROWS).all()
    data = [
        {
            "symbol": sec.symbol,
            "name": sec.name_fa,
            "nav_issuance": _dec(nav.nav_issuance),
            "nav_redemption": _dec(nav.nav_redemption),
            "last_price": _dec(nav.last_price),
            "bubble_pct": _dec(nav.bubble_pct),
            "fund_type": nav.fund_type,
        }
        for nav, sec in rows
    ]
    return json.dumps({"date": str(latest[0]), "etfs": data}, ensure_ascii=False)


# ── New: Client type data ─────────────────────────────────────────────────────


def get_client_type_data(db: Session, symbol: str, days: int = 5) -> str:
    sec = _find_security(db, symbol)
    if not sec:
        return _not_found(symbol)
    days = min(max(days, 1), 30)
    rows = (
        db.query(DailyOHLCV)
        .filter(DailyOHLCV.security_id == sec.security_id)
        .order_by(DailyOHLCV.date.desc())
        .limit(days)
        .all()
    )
    if not rows:
        return json.dumps(
            {"error": f"No client type data for '{symbol}'"}, ensure_ascii=False
        )
    data = []
    for r in reversed(rows):
        data.append(
            {
                "date": str(r.date),
                "real_buy_count": r.real_buy_count,
                "real_buy_volume": r.real_buy_volume,
                "real_sell_count": r.real_sell_count,
                "real_sell_volume": r.real_sell_volume,
                "legal_buy_count": r.legal_buy_count,
                "legal_buy_volume": r.legal_buy_volume,
                "legal_sell_count": r.legal_sell_count,
                "legal_sell_volume": r.legal_sell_volume,
            }
        )
    return json.dumps(
        {"symbol": symbol, "days": len(data), "client_type": data}, ensure_ascii=False
    )


# ── New: Major shareholders ───────────────────────────────────────────────────


def get_shareholders(db: Session, symbol: str) -> str:
    sec = _find_security(db, symbol)
    if not sec:
        return _not_found(symbol)
    # Get latest snapshot date for this security
    latest = (
        db.query(Shareholder.date)
        .filter(Shareholder.security_id == sec.security_id)
        .order_by(Shareholder.date.desc())
        .first()
    )
    if not latest:
        return json.dumps(
            {"error": f"No shareholder data for '{symbol}'"}, ensure_ascii=False
        )
    rows = (
        db.query(Shareholder)
        .filter(
            Shareholder.security_id == sec.security_id, Shareholder.date == latest[0]
        )
        .order_by(Shareholder.percent.desc())
        .limit(MAX_ROWS)
        .all()
    )
    data = [
        {
            "name": r.name,
            "volume": r.volume,
            "percent": _dec(r.percent),
            "change": r.change,
        }
        for r in rows
    ]
    return json.dumps(
        {"symbol": symbol, "date": str(latest[0]), "shareholders": data},
        ensure_ascii=False,
    )


# ── Dispatch map ──────────────────────────────────────────────────────────────

TOOL_DISPATCH = {
    "get_stock_price": get_stock_price,
    "get_stock_history": get_stock_history,
    "get_order_book": get_order_book,
    "get_market_indices": get_market_indices,
    "get_sector_stocks": get_sector_stocks,
    "get_market_prices": get_market_prices,
    "get_etf_nav": get_etf_nav,
    "get_client_type_data": get_client_type_data,
    "get_shareholders": get_shareholders,
}
