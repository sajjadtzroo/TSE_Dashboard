"""
IME (Iran Mercantile Exchange) endpoints: options, futures, certificates, funds, forwards, physical
"""

import datetime as _dt

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from api.cache_decorators import cached
from api.deps import get_db
from api.helpers import get_latest_date
from api.schemas import (
    IMECertificateSchema,
    IMEForwardSchema,
    IMEFundSchema,
    IMEFutureSchema,
    IMEOptionSchema,
    IMEPhysicalTradeSchema,
)
from database.models import (
    IMECertificate,
    IMEForward,
    IMEFund,
    IMEFuture,
    IMEOption,
    IMEPhysicalTrade,
)

router = APIRouter(prefix="/api/ime", tags=["ime"])


def _query_latest(db, model, *, date=None, filters=(), order_by, limit=None):
    """Return rows for the latest (or given) date with optional filters."""
    if date is None:
        date = get_latest_date(db, model)
        if not date:
            return []
    q = db.query(model).filter(model.date == date)
    for f in filters:
        q = q.filter(f)
    order_cols = order_by if isinstance(order_by, (list, tuple)) else [order_by]
    q = q.order_by(*order_cols)
    if limit:
        q = q.limit(limit)
    return q.all()


@router.get("/options", response_model=list[IMEOptionSchema])
@cached(
    module="ime",
    endpoint="options",
    trading_ttl=600,
    off_hours_ttl=86400,
    tags=["ime_options"],
)
def get_ime_options(
    commodity: str | None = None,
    option_type: str | None = None,
    limit: int | None = Query(default=None, ge=1, le=5000),
    db: Session = Depends(get_db),
):
    """Get IME commodity options, filterable by commodity and option type"""
    try:
        filters = []
        if commodity:
            filters.append(IMEOption.commodity == commodity)
        if option_type:
            filters.append(IMEOption.option_type == option_type)
        return _query_latest(
            db, IMEOption,
            filters=filters,
            order_by=[IMEOption.commodity, IMEOption.price_strike],
            limit=limit,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch IME options") from e


@router.get("/futures", response_model=list[IMEFutureSchema])
@cached(
    module="ime",
    endpoint="futures",
    trading_ttl=600,
    off_hours_ttl=86400,
    tags=["ime_futures"],
)
def get_ime_futures(
    limit: int | None = Query(default=None, ge=1, le=5000),
    db: Session = Depends(get_db),
):
    """Get IME commodity futures for the latest date"""
    try:
        return _query_latest(db, IMEFuture, order_by=IMEFuture.contract_code, limit=limit)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch IME futures") from e


@router.get("/certificates", response_model=list[IMECertificateSchema])
@cached(
    module="ime",
    endpoint="certificates",
    trading_ttl=600,
    off_hours_ttl=86400,
    tags=["ime_certificates"],
)
def get_ime_certificates(
    cert_type: int | None = Query(default=None, description="1=general, 2=coin/saffron"),
    date: _dt.date | None = None,
    limit: int | None = Query(default=None, ge=1, le=5000),
    db: Session = Depends(get_db),
):
    """Get IME deposit certificates for the latest date"""
    try:
        filters = [IMECertificate.cert_type == cert_type] if cert_type is not None else []
        return _query_latest(
            db, IMECertificate,
            date=date,
            filters=filters,
            order_by=IMECertificate.contract_code,
            limit=limit,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch IME certificates") from e


@router.get("/funds", response_model=list[IMEFundSchema])
@cached(
    module="ime",
    endpoint="funds",
    trading_ttl=600,
    off_hours_ttl=86400,
    tags=["ime_funds"],
)
def get_ime_funds(
    date: _dt.date | None = None,
    limit: int | None = Query(default=None, ge=1, le=5000),
    db: Session = Depends(get_db),
):
    """Get IME commodity funds for the latest date"""
    try:
        return _query_latest(db, IMEFund, date=date, order_by=IMEFund.symbol, limit=limit)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch IME funds") from e


@router.get("/forwards", response_model=list[IMEForwardSchema])
@cached(
    module="ime",
    endpoint="forwards",
    trading_ttl=600,
    off_hours_ttl=86400,
    tags=["ime_forwards"],
)
def get_ime_forwards(
    date: _dt.date | None = None,
    limit: int | None = Query(default=None, ge=1, le=5000),
    db: Session = Depends(get_db),
):
    """Get IME forward contracts for the latest date"""
    try:
        return _query_latest(db, IMEForward, date=date, order_by=IMEForward.symbol, limit=limit)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch IME forwards") from e


@router.get("/physical", response_model=list[IMEPhysicalTradeSchema])
@cached(
    module="ime",
    endpoint="physical",
    trading_ttl=600,
    off_hours_ttl=86400,
    tags=["ime_physical"],
)
def get_ime_physical(
    date_start: _dt.date | None = None,
    date_end: _dt.date | None = None,
    limit: int | None = Query(default=None, ge=1, le=5000),
    db: Session = Depends(get_db),
):
    """Get IME physical trades. Defaults to latest date if no range given."""
    try:
        if date_start and date_end and date_start > date_end:
            raise HTTPException(status_code=400, detail="date_start must be <= date_end")

        if date_start is None and date_end is None:
            latest_date = get_latest_date(db, IMEPhysicalTrade, date_column=IMEPhysicalTrade.date_trade)
            if not latest_date:
                return []
            date_start = date_end = latest_date

        q = db.query(IMEPhysicalTrade)
        if date_start:
            q = q.filter(IMEPhysicalTrade.date_trade >= date_start)
        if date_end:
            q = q.filter(IMEPhysicalTrade.date_trade <= date_end)
        q = q.order_by(IMEPhysicalTrade.date_trade.desc(), IMEPhysicalTrade.code_offer)
        if limit:
            q = q.limit(limit)
        return q.all()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch IME physical trades") from e
