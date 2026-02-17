"""
Tools endpoints: Codal announcements + financial statements
"""
import datetime as _dt
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from api.deps import get_db
from database.models import CodalAnnouncement, FinancialStatement
from api.schemas import CodalAnnouncementSchema, FinancialStatementSchema, PaginatedCodalResponse

router = APIRouter(prefix="/api", tags=["tools"])


@router.get("/codal", response_model=PaginatedCodalResponse)
def get_codal(
    symbol: Optional[str] = None,
    category: Optional[int] = None,
    search: Optional[str] = Query(default=None, max_length=200),
    from_date: Optional[str] = Query(default=None, description="Filter from date (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(default=None, description="Filter to date (YYYY-MM-DD)"),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """Get Codal announcements with search, filters, and server-side pagination."""
    try:
        query = db.query(CodalAnnouncement)
        if symbol:
            query = query.filter(CodalAnnouncement.symbol == symbol)
        if category is not None:
            query = query.filter(CodalAnnouncement.category == category)
        if search:
            pattern = f"%{search}%"
            query = query.filter(or_(
                CodalAnnouncement.title.ilike(pattern),
                CodalAnnouncement.company_name.ilike(pattern),
                CodalAnnouncement.symbol.ilike(pattern),
            ))
        if from_date:
            query = query.filter(CodalAnnouncement.date_publish >= from_date)
        if to_date:
            query = query.filter(CodalAnnouncement.date_publish <= to_date)

        total = query.count()
        items = query.order_by(CodalAnnouncement.date_publish.desc(), CodalAnnouncement.id.desc()) \
                     .offset((page - 1) * per_page).limit(per_page).all()
        return {"items": items, "total": total}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch Codal announcements") from e


@router.get("/codal/symbols", response_model=List[str])
def get_codal_symbols(db: Session = Depends(get_db)):
    """Return distinct symbols from codal_announcements for filter dropdown."""
    try:
        rows = db.query(CodalAnnouncement.symbol) \
                 .filter(CodalAnnouncement.symbol.isnot(None)) \
                 .distinct() \
                 .order_by(CodalAnnouncement.symbol) \
                 .all()
        return [r[0] for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch symbols") from e


@router.get("/codal/financials", response_model=List[FinancialStatementSchema])
def get_financial_statements(
    symbol: Optional[str] = None,
    statement_type: Optional[str] = Query(
        default=None,
        description="income_statement, balance_sheet, comprehensive_income, equity_changes, cash_flow"
    ),
    is_audited: Optional[bool] = None,
    is_consolidated: Optional[bool] = None,
    period_months: Optional[int] = Query(default=None, description="3, 6, 9, or 12"),
    from_period: Optional[_dt.date] = Query(
        default=None, description="Start date (Gregorian, inclusive)"
    ),
    to_period: Optional[_dt.date] = Query(
        default=None, description="End date (Gregorian, inclusive)"
    ),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """Get parsed financial statements with filtering.

    Financial statements are immutable historical data — responses are cache-friendly.
    """
    try:
        query = db.query(FinancialStatement)

        if symbol:
            query = query.filter(FinancialStatement.symbol == symbol)
        if statement_type:
            query = query.filter(FinancialStatement.statement_type == statement_type)
        if is_audited is not None:
            query = query.filter(FinancialStatement.is_audited == is_audited)
        if is_consolidated is not None:
            query = query.filter(FinancialStatement.is_consolidated == is_consolidated)
        if period_months is not None:
            query = query.filter(FinancialStatement.period_months == period_months)
        if from_period:
            query = query.filter(FinancialStatement.period_end_date >= from_period)
        if to_period:
            query = query.filter(FinancialStatement.period_end_date <= to_period)

        query = query.order_by(FinancialStatement.period_end_date.desc())
        query = query.offset((page - 1) * per_page).limit(per_page)

        results = query.all()

        # Financial statements are immutable — set aggressive cache headers
        response = JSONResponse(
            content=[FinancialStatementSchema.model_validate(r).model_dump(mode='json') for r in results]
        )
        response.headers['Cache-Control'] = 'public, max-age=86400'
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch financial statements") from e
