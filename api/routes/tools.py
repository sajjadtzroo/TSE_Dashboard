"""
Tools endpoints: Codal announcements + financial statements
"""
import datetime as _dt
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from api.deps import get_db
from database.models import CodalAnnouncement, FinancialStatement
from api.schemas import CodalAnnouncementSchema, FinancialStatementSchema

router = APIRouter(prefix="/api", tags=["tools"])


@router.get("/codal", response_model=List[CodalAnnouncementSchema])
def get_codal(
    symbol: Optional[str] = None,
    category: Optional[int] = None,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """Get Codal announcements, paginated"""
    try:
        query = db.query(CodalAnnouncement)
        if symbol:
            query = query.filter(CodalAnnouncement.symbol == symbol)
        if category is not None:
            query = query.filter(CodalAnnouncement.category == category)

        query = query.order_by(CodalAnnouncement.id.desc())
        query = query.offset((page - 1) * per_page).limit(per_page)
        return query.all()
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch Codal announcements") from e


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
