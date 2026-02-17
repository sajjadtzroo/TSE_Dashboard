"""
IME (Iran Mercantile Exchange) endpoints: options, futures, certificates, funds, forwards, physical
"""
import datetime as _dt
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from api.deps import get_db
from api.helpers import get_latest_date
from database.models import (
    IMEOption, IMEFuture, IMECertificate, IMEFund, IMEForward, IMEPhysicalTrade,
)
from api.schemas import (
    IMEOptionSchema, IMEFutureSchema, IMECertificateSchema,
    IMEFundSchema, IMEForwardSchema, IMEPhysicalTradeSchema,
)

router = APIRouter(prefix="/api/ime", tags=["ime"])


@router.get("/options", response_model=List[IMEOptionSchema])
def get_ime_options(
    commodity: Optional[str] = None,
    option_type: Optional[str] = None,
    limit: Optional[int] = Query(default=None, ge=1, le=5000),
    db: Session = Depends(get_db),
):
    """Get IME commodity options, filterable by commodity and option type"""
    try:
        latest_date = get_latest_date(db, IMEOption)
        if not latest_date:
            return []

        query = db.query(IMEOption).filter(IMEOption.date == latest_date)
        if commodity:
            query = query.filter(IMEOption.commodity == commodity)
        if option_type:
            query = query.filter(IMEOption.option_type == option_type)

        query = query.order_by(IMEOption.commodity, IMEOption.price_strike)
        if limit:
            query = query.limit(limit)
        return query.all()
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch IME options") from e


@router.get("/futures", response_model=List[IMEFutureSchema])
def get_ime_futures(
    limit: Optional[int] = Query(default=None, ge=1, le=5000),
    db: Session = Depends(get_db),
):
    """Get IME commodity futures for the latest date"""
    try:
        latest_date = get_latest_date(db, IMEFuture)
        if not latest_date:
            return []

        query = db.query(IMEFuture).filter(IMEFuture.date == latest_date)
        query = query.order_by(IMEFuture.contract_code)
        if limit:
            query = query.limit(limit)
        return query.all()
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch IME futures") from e


@router.get("/certificates", response_model=List[IMECertificateSchema])
def get_ime_certificates(
    cert_type: Optional[int] = Query(default=None, description="1=general, 2=coin/saffron"),
    date: Optional[_dt.date] = None,
    limit: Optional[int] = Query(default=None, ge=1, le=5000),
    db: Session = Depends(get_db),
):
    """Get IME deposit certificates for the latest date"""
    try:
        if date is None:
            date = get_latest_date(db, IMECertificate)
            if not date:
                return []

        query = db.query(IMECertificate).filter(IMECertificate.date == date)
        if cert_type is not None:
            query = query.filter(IMECertificate.cert_type == cert_type)

        query = query.order_by(IMECertificate.contract_code)
        if limit:
            query = query.limit(limit)
        return query.all()
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch IME certificates") from e


@router.get("/funds", response_model=List[IMEFundSchema])
def get_ime_funds(
    date: Optional[_dt.date] = None,
    limit: Optional[int] = Query(default=None, ge=1, le=5000),
    db: Session = Depends(get_db),
):
    """Get IME commodity funds for the latest date"""
    try:
        if date is None:
            date = get_latest_date(db, IMEFund)
            if not date:
                return []

        query = db.query(IMEFund).filter(IMEFund.date == date)
        query = query.order_by(IMEFund.symbol)
        if limit:
            query = query.limit(limit)
        return query.all()
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch IME funds") from e


@router.get("/forwards", response_model=List[IMEForwardSchema])
def get_ime_forwards(
    date: Optional[_dt.date] = None,
    limit: Optional[int] = Query(default=None, ge=1, le=5000),
    db: Session = Depends(get_db),
):
    """Get IME forward contracts for the latest date"""
    try:
        if date is None:
            date = get_latest_date(db, IMEForward)
            if not date:
                return []

        query = db.query(IMEForward).filter(IMEForward.date == date)
        query = query.order_by(IMEForward.symbol)
        if limit:
            query = query.limit(limit)
        return query.all()
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch IME forwards") from e


@router.get("/physical", response_model=List[IMEPhysicalTradeSchema])
def get_ime_physical(
    date_start: Optional[_dt.date] = None,
    date_end: Optional[_dt.date] = None,
    limit: Optional[int] = Query(default=None, ge=1, le=5000),
    db: Session = Depends(get_db),
):
    """Get IME physical trades. Defaults to latest date if no range given."""
    try:
        if date_start and date_end and date_start > date_end:
            raise HTTPException(status_code=400, detail="date_start must be <= date_end")

        if date_start is None and date_end is None:
            latest_date = get_latest_date(
                db, IMEPhysicalTrade, date_column=IMEPhysicalTrade.date_trade
            )
            if not latest_date:
                return []
            date_start = latest_date
            date_end = latest_date

        query = db.query(IMEPhysicalTrade)
        if date_start:
            query = query.filter(IMEPhysicalTrade.date_trade >= date_start)
        if date_end:
            query = query.filter(IMEPhysicalTrade.date_trade <= date_end)

        query = query.order_by(
            IMEPhysicalTrade.date_trade.desc(), IMEPhysicalTrade.code_offer
        )
        if limit:
            query = query.limit(limit)
        return query.all()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch IME physical trades") from e
