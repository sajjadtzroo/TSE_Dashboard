"""Options market tools — TSE equity options and IME commodity options."""

import json
import logging
from datetime import date

from sqlalchemy import desc
from sqlalchemy.orm import Session

from database.models import IMEOption, Option
from rag.tools._helpers import MAX_ROWS, _dec, _not_found

logger = logging.getLogger(__name__)


TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "get_options_chain",
            "description": (
                "Get the TSE equity options chain for an underlying asset. "
                "Returns all call and put contracts with strike price, expiry, "
                "last price, bid/ask, volume, and open interest equivalent."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "underlying": {
                        "type": "string",
                        "description": "Underlying asset name or symbol (e.g. 'فولاد', 'خودرو', 'شاخص کل')",
                    },
                    "option_type": {
                        "type": "string",
                        "enum": ["call", "put"],
                        "description": "Filter by option type. Omit to return both calls and puts.",
                    },
                    "expiry_date": {
                        "type": "string",
                        "description": "Filter by expiry date (Shamsi string, e.g. '1403/06/28'). Omit for all expiries.",
                    },
                },
                "required": ["underlying"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_option_detail",
            "description": (
                "Get full detail for a single TSE options contract by its symbol "
                "(e.g. 'ضفولا1234'). Returns OHLCV, bid/ask, strike, expiry, and change."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "Exact options contract symbol from TSETMC.",
                    },
                },
                "required": ["symbol"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_ime_options",
            "description": (
                "Get IME (Iran Mercantile Exchange) commodity options contracts. "
                "Returns commodity options with strike, expiry, settlement price, open interest, and bid/ask."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "commodity": {
                        "type": "string",
                        "description": "Commodity code or name (e.g. 'GOLD', 'steel'). Omit for all commodities.",
                    },
                    "option_type": {
                        "type": "string",
                        "enum": ["call", "put"],
                        "description": "Filter by option type. Omit for both.",
                    },
                },
                "required": [],
            },
        },
    },
]


def get_options_chain(
    db: Session,
    underlying: str,
    option_type: str | None = None,
    expiry_date: str | None = None,
) -> str:
    """Return the latest options chain snapshot for the given underlying."""
    # Get the most recent trading date available for this underlying
    latest_date = (
        db.query(Option.date)
        .filter(Option.underlying.ilike(f"%{underlying}%"))
        .order_by(desc(Option.date))
        .scalar()
    )
    if not latest_date:
        return _not_found(underlying, "Options chain for")

    q = db.query(Option).filter(
        Option.underlying.ilike(f"%{underlying}%"),
        Option.date == latest_date,
    )
    if option_type:
        q = q.filter(Option.option_type == option_type.lower())
    if expiry_date:
        q = q.filter(Option.expiry_date == expiry_date)

    rows = q.order_by(Option.expiry_date, Option.strike_price, Option.option_type).limit(MAX_ROWS).all()

    if not rows:
        return _not_found(underlying, "Options chain for")

    contracts = [
        {
            "symbol": r.symbol,
            "name_fa": r.name_fa,
            "option_type": r.option_type,
            "strike_price": _dec(r.strike_price),
            "expiry_date": r.expiry_date,
            "last": _dec(r.last),
            "close": _dec(r.close),
            "close_change": _dec(r.close_change),
            "volume": r.volume,
            "trades": r.trades,
            "bid_price": _dec(r.bid_price_1),
            "bid_vol": r.bid_vol_1,
            "ask_price": _dec(r.ask_price_1),
            "ask_vol": r.ask_vol_1,
        }
        for r in rows
    ]

    return json.dumps(
        {
            "underlying": underlying,
            "trade_date": str(latest_date),
            "count": len(contracts),
            "contracts": contracts,
        },
        ensure_ascii=False,
    )


def get_option_detail(db: Session, symbol: str) -> str:
    """Return full detail for a single options contract."""
    row = (
        db.query(Option)
        .filter(Option.symbol == symbol)
        .order_by(desc(Option.date))
        .first()
    )
    if not row:
        return _not_found(symbol, "Option contract")

    return json.dumps(
        {
            "symbol": row.symbol,
            "name_fa": row.name_fa,
            "option_type": row.option_type,
            "underlying": row.underlying,
            "strike_price": _dec(row.strike_price),
            "expiry_date": row.expiry_date,
            "trade_date": str(row.date),
            "open": _dec(row.open),
            "high": _dec(row.high),
            "low": _dec(row.low),
            "close": _dec(row.close),
            "last": _dec(row.last),
            "yesterday": _dec(row.yesterday),
            "close_change": _dec(row.close_change),
            "volume": row.volume,
            "value": row.value,
            "trades": row.trades,
            "bid_price": _dec(row.bid_price_1),
            "bid_vol": row.bid_vol_1,
            "ask_price": _dec(row.ask_price_1),
            "ask_vol": row.ask_vol_1,
            "threshold_min": _dec(row.threshold_min),
            "threshold_max": _dec(row.threshold_max),
        },
        ensure_ascii=False,
    )


def get_ime_options(
    db: Session,
    commodity: str | None = None,
    option_type: str | None = None,
) -> str:
    """Return latest IME commodity options."""
    latest_date = (
        db.query(IMEOption.date).order_by(desc(IMEOption.date)).scalar()
    )
    if not latest_date:
        return json.dumps({"error": "No IME options data available"}, ensure_ascii=False)

    q = db.query(IMEOption).filter(IMEOption.date == latest_date)
    if commodity:
        q = q.filter(IMEOption.commodity.ilike(f"%{commodity}%"))
    if option_type:
        q = q.filter(IMEOption.option_type == option_type.lower())

    rows = q.order_by(IMEOption.commodity, IMEOption.price_strike, IMEOption.option_type).limit(MAX_ROWS).all()

    contracts = [
        {
            "contract_code": r.contract_code,
            "commodity": r.commodity,
            "option_type": r.option_type,
            "strike_price": r.price_strike,
            "expiry_date": r.date_end,
            "days_remaining": r.day_remain,
            "settlement_price": r.settlement_price,
            "last": r.last,
            "last_change_pct": _dec(r.last_change_pct),
            "volume": r.volume,
            "open_interest": r.interest_open,
            "bid_price": r.bid_price_1,
            "bid_vol": r.bid_vol_1,
            "ask_price": r.ask_price_1,
            "ask_vol": r.ask_vol_1,
            "margin_initial": r.margin_initial,
        }
        for r in rows
    ]

    return json.dumps(
        {
            "trade_date": str(latest_date),
            "count": len(contracts),
            "contracts": contracts,
        },
        ensure_ascii=False,
    )


TOOL_DISPATCH = {
    "get_options_chain": get_options_chain,
    "get_option_detail": get_option_detail,
    "get_ime_options": get_ime_options,
}
