"""
Tools endpoints: Codal announcements + financial statements
"""

import datetime as _dt
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy import or_
from sqlalchemy.orm import Session

from api.deps import get_db
from api.schemas import (
    FinancialStatementSchema,
    PaginatedCodalResponse,
)
from database.models import CodalAnnouncement, CodalRawResponse, FinancialStatement

router = APIRouter(prefix="/api", tags=["tools"])


@router.get("/codal", response_model=PaginatedCodalResponse)
def get_codal(
    symbol: str | None = None,
    category: int | None = None,
    search: str | None = Query(default=None, max_length=200),
    from_date: str | None = Query(
        default=None, description="Filter from date (YYYY-MM-DD)"
    ),
    to_date: str | None = Query(
        default=None, description="Filter to date (YYYY-MM-DD)"
    ),
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
            query = query.filter(
                or_(
                    CodalAnnouncement.title.ilike(pattern),
                    CodalAnnouncement.company_name.ilike(pattern),
                    CodalAnnouncement.symbol.ilike(pattern),
                )
            )
        if from_date:
            query = query.filter(CodalAnnouncement.date_publish >= from_date)
        if to_date:
            query = query.filter(CodalAnnouncement.date_publish <= to_date)

        total = query.count()
        items = (
            query.order_by(CodalAnnouncement.date_publish.desc(), CodalAnnouncement.id.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
            .all()
        )
        return {"items": items, "total": total}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Failed to fetch Codal announcements"
        ) from e


@router.get("/codal/symbols", response_model=list[str])
def get_codal_symbols(db: Session = Depends(get_db)):
    """Return distinct symbols from codal_announcements for filter dropdown."""
    try:
        rows = (
            db.query(CodalAnnouncement.symbol)
            .filter(CodalAnnouncement.symbol.isnot(None))
            .distinct()
            .order_by(CodalAnnouncement.symbol)
            .all()
        )
        return [r[0] for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch symbols") from e


@router.get("/codal/financials", response_model=list[FinancialStatementSchema])
def get_financial_statements(
    symbol: str | None = None,
    statement_type: str | None = Query(
        default=None,
        description="income_statement, balance_sheet, comprehensive_income, equity_changes, cash_flow",
    ),
    is_audited: bool | None = None,
    is_consolidated: bool | None = None,
    period_months: int | None = Query(default=None, description="3, 6, 9, or 12"),
    from_period: _dt.date | None = Query(
        default=None, description="Start date (Gregorian, inclusive)"
    ),
    to_period: _dt.date | None = Query(
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
        query = db.query(
            FinancialStatement, CodalAnnouncement.link_pdf, CodalAnnouncement.link_excel
        ).outerjoin(
            CodalAnnouncement,
            FinancialStatement.codal_announcement_id == CodalAnnouncement.id,
        )

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

        rows = query.all()

        items = []
        for fs, link_pdf, link_excel in rows:
            schema = FinancialStatementSchema.model_validate(fs)
            schema.codal_link_pdf = link_pdf
            schema.codal_link_excel = link_excel
            items.append(schema.model_dump(mode="json"))

        # Financial statements are immutable — set aggressive cache headers
        response = JSONResponse(content=items)
        response.headers["Cache-Control"] = "public, max-age=86400"
        return response
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Failed to fetch financial statements"
        ) from e


@router.get("/codal/financials/{announcement_id}/raw")
def get_financial_raw_html(announcement_id: int, db: Session = Depends(get_db)):
    """Serve locally-stored gzipped Codal HTML for a given announcement."""
    raw = (
        db.query(CodalRawResponse)
        .filter(CodalRawResponse.codal_announcement_id == announcement_id)
        .first()
    )
    if not raw:
        raise HTTPException(status_code=404, detail="Raw HTML not found")

    file_path = Path(raw.storage_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Raw file missing from storage")

    # Serve gzipped HTML with proper encoding header
    return FileResponse(
        path=str(file_path),
        media_type="text/html",
        headers={
            "Content-Encoding": "gzip",
            "Cache-Control": "public, max-age=604800",
        },
    )
