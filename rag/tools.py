"""
Tool definitions and implementations for the intelligent chatbot.
Each tool queries the database via ORM (no raw SQL interpolation).
"""
import json
import logging
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from database.models import (
    Security, DailyOHLCV, OrderBook, MarketIndex, ETFNav, MarketPrice,
)

logger = logging.getLogger(__name__)

MAX_ROWS = 50


def _dec(v):
    """Convert Decimal/numeric to float for JSON serialization."""
    if v is None:
        return None
    if isinstance(v, Decimal):
        return float(v)
    return v


# ─── TOOL DEFINITIONS (OpenAI function-calling format) ────────────────────────

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "search_documents",
            "description": "Search financial reports and Codal PDF documents using semantic similarity. Use this for questions about company financials, annual reports, board decisions, earnings, etc.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query in Persian or English",
                    },
                    "symbol": {
                        "type": "string",
                        "description": "Optional stock symbol to filter (e.g. 'فولاد')",
                    },
                },
                "required": ["query"],
            },
        },
    },
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
                        "description": "Stock symbol in Persian (e.g. 'فولاد', 'خودرو', 'فملی')",
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
            "parameters": {
                "type": "object",
                "properties": {},
            },
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
                        "description": "Sector name in Persian (e.g. 'فلزات اساسی', 'خودرو و ساخت قطعات')",
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
]


# ─── TOOL IMPLEMENTATIONS ─────────────────────────────────────────────────────


def _find_security(db: Session, symbol: str) -> Security | None:
    """Find security by symbol (exact match)."""
    return db.query(Security).filter(Security.symbol == symbol).first()


def search_documents(db: Session, query: str, symbol: str = None, top_k: int = 5) -> str:
    """Semantic search over Codal PDFs — delegates to rag.pipeline.search()."""
    from rag.pipeline import search
    results = search(db, query=query, top_k=top_k, symbol=symbol)
    if not results:
        return json.dumps({"results": [], "message": "No relevant documents found."}, ensure_ascii=False)
    output = []
    for r in results:
        output.append({
            "title": r.get("title", ""),
            "symbol": r.get("symbol", ""),
            "page_numbers": r.get("page_numbers", ""),
            "similarity": round(r.get("similarity", 0), 3),
            "content": r["content"][:500],
        })
    return json.dumps({"results": output}, ensure_ascii=False)


def get_stock_price(db: Session, symbol: str) -> str:
    """Latest price + fundamentals for a stock."""
    sec = _find_security(db, symbol)
    if not sec:
        return json.dumps({"error": f"Stock '{symbol}' not found"}, ensure_ascii=False)

    ohlcv = (
        db.query(DailyOHLCV)
        .filter(DailyOHLCV.security_id == sec.security_id)
        .order_by(DailyOHLCV.date.desc())
        .first()
    )
    if not ohlcv:
        return json.dumps({"error": f"No price data for '{symbol}'"}, ensure_ascii=False)

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
    """Historical OHLCV data."""
    sec = _find_security(db, symbol)
    if not sec:
        return json.dumps({"error": f"Stock '{symbol}' not found"}, ensure_ascii=False)

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
    return json.dumps({"symbol": symbol, "days": len(data), "history": data}, ensure_ascii=False)


def get_order_book(db: Session, symbol: str) -> str:
    """Latest 5-level bid/ask order book."""
    sec = _find_security(db, symbol)
    if not sec:
        return json.dumps({"error": f"Stock '{symbol}' not found"}, ensure_ascii=False)

    snap = (
        db.query(OrderBook)
        .filter(OrderBook.security_id == sec.security_id)
        .order_by(OrderBook.snapshot_time.desc())
        .first()
    )
    if not snap:
        return json.dumps({"error": f"No order book data for '{symbol}'"}, ensure_ascii=False)

    levels = []
    for i in range(1, 6):
        levels.append({
            "level": i,
            "bid_price": _dec(getattr(snap, f"bid_price_{i}")),
            "bid_vol": getattr(snap, f"bid_vol_{i}"),
            "bid_count": getattr(snap, f"bid_count_{i}"),
            "ask_price": _dec(getattr(snap, f"ask_price_{i}")),
            "ask_vol": getattr(snap, f"ask_vol_{i}"),
            "ask_count": getattr(snap, f"ask_count_{i}"),
        })
    return json.dumps({
        "symbol": symbol,
        "snapshot_time": str(snap.snapshot_time),
        "levels": levels,
    }, ensure_ascii=False)


def get_market_indices(db: Session) -> str:
    """Latest market indices."""
    latest = db.query(MarketIndex.date).order_by(MarketIndex.date.desc()).first()
    if not latest:
        return json.dumps({"error": "No market index data available"}, ensure_ascii=False)

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
    """All active stocks in a sector."""
    stocks = (
        db.query(Security)
        .filter(Security.sector_name_fa == sector, Security.is_active == True)
        .order_by(Security.symbol)
        .limit(MAX_ROWS)
        .all()
    )
    if not stocks:
        return json.dumps({"error": f"No stocks found in sector '{sector}'"}, ensure_ascii=False)

    data = [
        {
            "symbol": s.symbol,
            "name": s.name_fa,
            "market_type": s.market_type,
        }
        for s in stocks
    ]
    return json.dumps({"sector": sector, "count": len(data), "stocks": data}, ensure_ascii=False)


def get_market_prices(db: Session, market_type: str) -> str:
    """Gold/currency/commodity/crypto prices."""
    latest = db.query(MarketPrice.date).order_by(MarketPrice.date.desc()).first()
    if not latest:
        return json.dumps({"error": "No market price data available"}, ensure_ascii=False)

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
    return json.dumps({"market_type": market_type, "date": str(latest[0]), "prices": data}, ensure_ascii=False)


def get_etf_nav(db: Session, symbol: str = None) -> str:
    """ETF NAV data."""
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


# ─── DISPATCH MAP ──────────────────────────────────────────────────────────────

TOOL_DISPATCH = {
    "search_documents": search_documents,
    "get_stock_price": get_stock_price,
    "get_stock_history": get_stock_history,
    "get_order_book": get_order_book,
    "get_market_indices": get_market_indices,
    "get_sector_stocks": get_sector_stocks,
    "get_market_prices": get_market_prices,
    "get_etf_nav": get_etf_nav,
}
