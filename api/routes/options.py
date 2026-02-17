"""
TSE options endpoints: list, chain, underlyings
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, case
from sqlalchemy.orm import Session

from api.deps import get_db
from api.helpers import get_latest_date
from api.cache_decorators import cached
from database.models import Option, Security
from api.schemas import OptionSchema

router = APIRouter(prefix="/api", tags=["options"])


@router.get("/options/underlyings")
@cached(module="options", endpoint="underlyings", trading_ttl=180, off_hours_ttl=3600, tags=["options"])
def get_options_underlyings(db: Session = Depends(get_db)):
    """List underlying securities that have options, with option counts and metadata"""
    try:
        latest_date = get_latest_date(db, Option)
        if not latest_date:
            return []

        rows = (
            db.query(
                Option.underlying,
                func.count(Option.id).label('total_options'),
                func.count(case((Option.option_type == 'call', 1))).label('call_count'),
                func.count(case((Option.option_type == 'put', 1))).label('put_count'),
                func.array_agg(func.distinct(Option.expiry_date)).label('expiry_dates'),
            )
            .filter(Option.date == latest_date)
            .group_by(Option.underlying)
            .all()
        )

        # Batch-fetch all underlying Securities
        underlying_symbols = [row.underlying for row in rows]
        securities = db.query(Security).filter(
            Security.symbol.in_(underlying_symbols)
        ).all()
        sec_lookup = {s.symbol: s for s in securities}

        result = []
        for row in rows:
            sec = sec_lookup.get(row.underlying)
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
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch options underlyings") from e


@router.get("/options/chain")
@cached(module="options", endpoint="chain", trading_ttl=180, off_hours_ttl=3600, tags=["options"])
def get_options_chain(
    underlying: str = Query(..., description="Underlying asset symbol"),
    expiry_date: Optional[str] = Query(default=None, description="Filter by expiry date"),
    db: Session = Depends(get_db),
):
    """Get full options chain for a specific underlying asset"""
    try:
        latest_date = get_latest_date(db, Option)
        if not latest_date:
            return {"underlying_info": None, "data_date": None, "expiry_dates": [], "options": []}

        query = db.query(Option).filter(
            Option.date == latest_date,
            Option.underlying == underlying,
        )
        if expiry_date:
            query = query.filter(Option.expiry_date == expiry_date)

        query = query.order_by(Option.expiry_date, Option.strike_price, Option.option_type)
        options = query.all()

        sec = db.query(Security).filter(Security.symbol == underlying).first()
        underlying_info = {
            "underlying": underlying,
            "security_id": sec.security_id if sec else None,
            "name_fa": sec.name_fa if sec else None,
            "type": sec.type if sec else None,
            "sector_name_fa": sec.sector_name_fa if sec else None,
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
            }
            for o in options
        ]

        return {
            "underlying_info": underlying_info,
            "data_date": str(latest_date),
            "expiry_dates": expiry_dates,
            "options": options_data,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch options chain") from e


@router.get("/options", response_model=List[OptionSchema])
@cached(module="options", endpoint="list", trading_ttl=180, off_hours_ttl=3600, tags=["options"])
def get_options(
    underlying: Optional[str] = None,
    option_type: Optional[str] = None,
    limit: Optional[int] = Query(default=None, ge=1, le=5000),
    db: Session = Depends(get_db),
):
    """Get options contracts, filterable by underlying asset and option type"""
    try:
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
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch options") from e
