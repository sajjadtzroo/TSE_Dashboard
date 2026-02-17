"""
Loan module API endpoints.
Provides bank info, loan products, analytics, and user loan tracking.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from api.deps import get_db
from api.auth import require_role
from api.cache_decorators import cached
from api.schemas_loans import (
    LoanBankSummary, LoanBankDetail,
    LoanProductSummary, LoanProductDetail,
    LoanAnalyticsSummary, InterestRateDistribution,
    LoanAmountRange, RequirementsMatrixEntry,
    UserLoanCreate, UserLoanSchema,
    PaymentScheduleSchema, PaymentMarkPaid, PaymentAlertSchema,
)
from api import services_loans as svc

router = APIRouter(prefix="/api/loans", tags=["loans"])


# ── Banks ────────────────────────────────────────────────────────────────────

@router.get("/banks", response_model=List[LoanBankSummary])
@cached(module="loans", endpoint="banks", trading_ttl=3600, off_hours_ttl=86400, tags=["loans"])
def list_banks(
    category: Optional[str] = Query(None, description="Filter: traditional or digital"),
    db: Session = Depends(get_db),
):
    """Get all banks, optionally filtered by category."""
    return svc.get_banks(db, category=category)


@router.get("/banks/traditional", response_model=List[LoanBankSummary])
@cached(module="loans", endpoint="banks-traditional", trading_ttl=3600, off_hours_ttl=86400, tags=["loans"])
def list_traditional_banks(db: Session = Depends(get_db)):
    """Get traditional banks only."""
    return svc.get_banks(db, category="traditional")


@router.get("/banks/digital", response_model=List[LoanBankSummary])
@cached(module="loans", endpoint="banks-digital", trading_ttl=3600, off_hours_ttl=86400, tags=["loans"])
def list_digital_banks(db: Session = Depends(get_db)):
    """Get digital/neo banks only."""
    return svc.get_banks(db, category="digital")


@router.get("/banks/{bank_id}", response_model=LoanBankDetail)
@cached(module="loans", endpoint="bank-detail", trading_ttl=3600, off_hours_ttl=86400, tags=["loans"])
def get_bank(bank_id: int, db: Session = Depends(get_db)):
    """Get bank detail with its loan products."""
    bank = svc.get_bank_detail(db, bank_id)
    if not bank:
        raise HTTPException(status_code=404, detail="Bank not found")
    return bank


@router.get("/banks/{bank_id}/loans", response_model=List[LoanProductSummary])
@cached(module="loans", endpoint="bank-loans", trading_ttl=3600, off_hours_ttl=86400, tags=["loans"])
def get_bank_loans(bank_id: int, db: Session = Depends(get_db)):
    """Get all loan products for a specific bank."""
    return svc.get_products_by_bank(db, bank_id)


# ── Loan Products ────────────────────────────────────────────────────────────

@router.get("/list", response_model=List[LoanProductSummary])
@cached(module="loans", endpoint="products-list", trading_ttl=3600, off_hours_ttl=86400, tags=["loans"])
def list_products(
    guarantor: Optional[bool] = Query(None, description="Filter by guarantor requirement"),
    method: Optional[str] = Query(None, description="Filter by calculation method"),
    db: Session = Depends(get_db),
):
    """Get all loan products with optional filters."""
    return svc.get_products(db, guarantor=guarantor, method=method)


@router.get("/no-guarantor", response_model=List[LoanProductSummary])
@cached(module="loans", endpoint="no-guarantor", trading_ttl=3600, off_hours_ttl=86400, tags=["loans"])
def list_no_guarantor(db: Session = Depends(get_db)):
    """Get loans that don't require a guarantor."""
    return svc.get_products(db, guarantor=False)


@router.get("/by-method/{method}", response_model=List[LoanProductSummary])
@cached(module="loans", endpoint="by-method", trading_ttl=3600, off_hours_ttl=86400, tags=["loans"])
def list_by_method(method: str, db: Session = Depends(get_db)):
    """Get loans filtered by calculation method."""
    return svc.get_products(db, method=method)


@router.get("/product/{product_id}", response_model=LoanProductDetail)
@cached(module="loans", endpoint="product-detail", trading_ttl=3600, off_hours_ttl=86400, tags=["loans"])
def get_product(product_id: int, db: Session = Depends(get_db)):
    """Get full product detail with coefficients and requirements."""
    product = svc.get_product_detail(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Loan product not found")
    return product


# ── Analytics ────────────────────────────────────────────────────────────────

@router.get("/analytics/summary", response_model=LoanAnalyticsSummary)
@cached(module="loans", endpoint="analytics-summary", trading_ttl=3600, off_hours_ttl=86400, tags=["loans"])
def analytics_summary(db: Session = Depends(get_db)):
    """Summary statistics across all loan data."""
    return svc.get_analytics_summary(db)


@router.get("/analytics/interest-rates", response_model=List[InterestRateDistribution])
@cached(module="loans", endpoint="analytics-rates", trading_ttl=3600, off_hours_ttl=86400, tags=["loans"])
def analytics_interest_rates(db: Session = Depends(get_db)):
    """Interest rate distribution across products."""
    return svc.get_interest_rate_distribution(db)


@router.get("/analytics/loan-amounts", response_model=List[LoanAmountRange])
@cached(module="loans", endpoint="analytics-amounts", trading_ttl=3600, off_hours_ttl=86400, tags=["loans"])
def analytics_loan_amounts(db: Session = Depends(get_db)):
    """Loan amount range distribution."""
    return svc.get_loan_amount_ranges(db)


@router.get("/analytics/requirements-matrix", response_model=List[RequirementsMatrixEntry])
@cached(module="loans", endpoint="analytics-requirements", trading_ttl=3600, off_hours_ttl=86400, tags=["loans"])
def analytics_requirements_matrix(db: Session = Depends(get_db)):
    """Requirements matrix across all products."""
    return svc.get_requirements_matrix(db)


# ── User Loans (authenticated) ──────────────────────────────────────────────

@router.get("/my-loans", response_model=List[UserLoanSchema])
def list_my_loans(
    user=Depends(require_role("viewer")),
    db: Session = Depends(get_db),
):
    """Get current user's tracked loans."""
    return svc.get_user_loans(db, user.id)


@router.post("/my-loans", response_model=UserLoanSchema, status_code=201)
def create_my_loan(
    data: UserLoanCreate,
    user=Depends(require_role("viewer")),
    db: Session = Depends(get_db),
):
    """Add a loan to the user's tracking list."""
    loan = svc.create_user_loan(db, user.id, data.model_dump(exclude_unset=True))
    return loan


@router.delete("/my-loans/{loan_id}", status_code=204)
def delete_my_loan(
    loan_id: int,
    user=Depends(require_role("viewer")),
    db: Session = Depends(get_db),
):
    """Remove a loan from the user's tracking list."""
    if not svc.delete_user_loan(db, user.id, loan_id):
        raise HTTPException(status_code=404, detail="Loan not found")


@router.get("/my-loans/{loan_id}/schedule", response_model=List[PaymentScheduleSchema])
def get_my_schedule(
    loan_id: int,
    user=Depends(require_role("viewer")),
    db: Session = Depends(get_db),
):
    """Get payment schedule for a tracked loan."""
    return svc.get_payment_schedule(db, user.id, loan_id)


@router.patch("/my-loans/{loan_id}/schedule/{installment_num}")
def mark_paid(
    loan_id: int,
    installment_num: int,
    body: PaymentMarkPaid,
    user=Depends(require_role("viewer")),
    db: Session = Depends(get_db),
):
    """Mark a payment installment as paid."""
    schedule = svc.mark_payment_paid(db, user.id, loan_id, installment_num, body.paid_at)
    if not schedule:
        raise HTTPException(status_code=404, detail="Payment not found")
    return {"status": "ok", "installment": installment_num}


@router.get("/alerts", response_model=List[PaymentAlertSchema])
def list_alerts(
    user=Depends(require_role("viewer")),
    db: Session = Depends(get_db),
):
    """Get payment alerts for the current user."""
    return svc.get_user_alerts(db, user.id)
