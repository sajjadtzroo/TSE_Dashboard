"""
TSE options endpoints: list, chain, underlyings
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from api.cache_decorators import cached
from api.deps import get_db
from api.helpers import get_latest_date
from api.utils import handle_api_errors, to_float
from api.schemas import OptionSchema
from database.models import DailyOHLCV, Option, Security

router = APIRouter(prefix="/api", tags=["options"])


@router.get("/options/underlyings")
@cached(
    module="options",
    endpoint="underlyings",
    trading_ttl=180,
    off_hours_ttl=3600,
    tags=["options"],
)
@handle_api_errors("Failed to fetch options underlyings")
def get_options_underlyings(db: Session = Depends(get_db)):
    """List underlying securities that have options, with option counts and metadata"""
    latest_date = get_latest_date(db, Option)
    if not latest_date:
        return []

    rows = (
        db.query(
            Option.underlying,
            func.count(Option.id).label("total_options"),
            func.count(case((Option.option_type == "call", 1))).label("call_count"),
            func.count(case((Option.option_type == "put", 1))).label("put_count"),
            func.array_agg(func.distinct(Option.expiry_date)).label("expiry_dates"),
        )
        .filter(Option.date == latest_date)
        .group_by(Option.underlying)
        .all()
    )

    # Batch-fetch all underlying Securities
    underlying_symbols = [row.underlying for row in rows]
    securities = (
        db.query(Security).filter(Security.symbol.in_(underlying_symbols)).all()
    )
    sec_lookup = {s.symbol: s for s in securities}

    # Batch-fetch latest close prices for underlyings
    sec_ids = [s.security_id for s in securities]
    price_lookup = {}
    if sec_ids:
        from sqlalchemy import distinct
        # Subquery to get latest date per security
        latest_sub = (
            db.query(
                DailyOHLCV.security_id,
                func.max(DailyOHLCV.date).label("max_date"),
            )
            .filter(DailyOHLCV.security_id.in_(sec_ids))
            .group_by(DailyOHLCV.security_id)
            .subquery()
        )
        price_rows = (
            db.query(DailyOHLCV)
            .join(
                latest_sub,
                (DailyOHLCV.security_id == latest_sub.c.security_id)
                & (DailyOHLCV.date == latest_sub.c.max_date),
            )
            .all()
        )
        for pr in price_rows:
            price_lookup[pr.security_id] = to_float(pr.close) or to_float(pr.last)

    result = []
    for row in rows:
        sec = sec_lookup.get(row.underlying)
        close_price = price_lookup.get(sec.security_id) if sec else None
        result.append(
            {
                "underlying": row.underlying,
                "security_id": sec.security_id if sec else None,
                "name_fa": sec.name_fa if sec else None,
                "type": sec.type if sec else None,
                "sector_name_fa": sec.sector_name_fa if sec else None,
                "close": close_price,
                "total_options": row.total_options,
                "call_count": row.call_count,
                "put_count": row.put_count,
                "expiry_dates": (
                    sorted(row.expiry_dates) if row.expiry_dates else []
                ),
            }
        )
    return result


@router.get("/options/chain")
@cached(
    module="options",
    endpoint="chain",
    trading_ttl=180,
    off_hours_ttl=3600,
    tags=["options"],
)
@handle_api_errors("Failed to fetch options chain")
def get_options_chain(
    underlying: str = Query(..., description="Underlying asset symbol"),
    expiry_date: str | None = Query(default=None, description="Filter by expiry date"),
    db: Session = Depends(get_db),
):
    """Get full options chain for a specific underlying asset"""
    latest_date = get_latest_date(db, Option)
    if not latest_date:
        return {
            "underlying_info": None,
            "data_date": None,
            "expiry_dates": [],
            "options": [],
        }

    query = db.query(Option).filter(
        Option.date == latest_date,
        Option.underlying == underlying,
    )
    if expiry_date:
        query = query.filter(Option.expiry_date == expiry_date)

    query = query.order_by(
        Option.expiry_date, Option.strike_price, Option.option_type
    )
    options = query.all()

    row = (
        db.query(Security, DailyOHLCV)
        .outerjoin(DailyOHLCV, DailyOHLCV.security_id == Security.security_id)
        .filter(Security.symbol == underlying)
        .order_by(DailyOHLCV.date.desc())
        .first()
    )
    sec, latest_ohlcv = row if row else (None, None)

    underlying_price = None
    if latest_ohlcv:
        underlying_price = to_float(latest_ohlcv.close) or to_float(latest_ohlcv.last)

    underlying_info = {
        "underlying": underlying,
        "security_id": sec.security_id if sec else None,
        "name_fa": sec.name_fa if sec else None,
        "type": sec.type if sec else None,
        "sector_name_fa": sec.sector_name_fa if sec else None,
        "close": underlying_price,
    }

    expiry_dates = sorted(set(o.expiry_date for o in options if o.expiry_date))

    options_data = [
        {
            "id": o.id,
            "ins_code": o.ins_code,
            "symbol": o.symbol,
            "name_fa": o.name_fa,
            "option_type": o.option_type,
            "underlying": o.underlying,
            "strike_price": to_float(o.strike_price),
            "expiry_date": o.expiry_date,
            "open": to_float(o.open),
            "high": to_float(o.high),
            "low": to_float(o.low),
            "close": to_float(o.close),
            "last": to_float(o.last),
            "close_change": to_float(o.close_change),
            "volume": o.volume,
            "value": o.value,
            "trades": o.trades,
            "bid_price_1": to_float(o.bid_price_1),
            "ask_price_1": to_float(o.ask_price_1),
        }
        for o in options
    ]

    return {
        "underlying_info": underlying_info,
        "data_date": str(latest_date),
        "expiry_dates": expiry_dates,
        "options": options_data,
    }


@router.get("/options", response_model=list[OptionSchema])
@cached(
    module="options",
    endpoint="list",
    trading_ttl=180,
    off_hours_ttl=3600,
    tags=["options"],
)
@handle_api_errors("Failed to fetch options")
def get_options(
    underlying: str | None = None,
    option_type: str | None = None,
    limit: int | None = Query(default=None, ge=1, le=5000),
    db: Session = Depends(get_db),
):
    """Get options contracts, filterable by underlying asset and option type"""
    latest_date = get_latest_date(db, Option)
    if not latest_date:
        return []

    query = db.query(Option).filter(Option.date == latest_date)
    if underlying:
        query = query.filter(Option.underlying == underlying)
    if option_type:
        query = query.filter(Option.option_type == option_type)

    query = query.order_by(Option.underlying, Option.strike_price)
    if limit:
        query = query.limit(limit)
    return query.all()
