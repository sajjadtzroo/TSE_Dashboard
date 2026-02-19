"""
Loan module API endpoints.
Provides bank info, loan products, analytics, and user loan tracking.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from api import services_loans as svc
from api.auth import require_role
from api.cache_decorators import cached
from api.deps import get_db
from api.schemas_loans import (
    LoanBankDetail,
    LoanBankSummary,
    LoanProductDetail,
    LoanProductSummary,
    PaymentAlertSchema,
    PaymentMarkPaid,
    PaymentScheduleSchema,
    UserLoanCreate,
    UserLoanSchema,
)
from api.utils import wrap_response as _wrap

router = APIRouter(prefix="/api/loans", tags=["loans"])


# ── camelCase mapping helpers (frontend Zod schemas expect camelCase) ────────


def _category_label(cat: str) -> str:
    """Map DB category ('traditional'/'digital') to frontend enum value."""
    if not cat:
        return "traditional-banks"
    if cat.endswith("-banks"):
        return cat
    return f"{cat}-banks"


def _format_rate(rate_min, rate_max) -> str | None:
    """Format interest rate range as display string."""
    if rate_min is not None and rate_max is not None:
        if rate_min == rate_max:
            return f"{rate_min}%"
        return f"{rate_min}%-{rate_max}%"
    if rate_min is not None:
        return f"{rate_min}%"
    if rate_max is not None:
        return f"{rate_max}%"
    return None


def _bank_base_fields(obj) -> dict:
    """Shared bank fields for both summary and detail mappers."""
    return {
        "id": str(obj.id),
        "nameFA": obj.name_fa,
        "nameEN": obj.name_en or "",
        "slug": obj.bank_slug,
        "category": _category_label(obj.category),
        "type": obj.bank_type,
        "parentBank": obj.parent_bank,
        "website": obj.website,
        "logo": obj.logo_url,
    }


def _bank_to_camel(b) -> dict:
    """Map bank ORM object → camelCase dict matching frontend bankSchema."""
    obj = LoanBankSummary.model_validate(b)
    return {**_bank_base_fields(obj), "descriptionFA": obj.description_fa, "loansCount": obj.products_count}


def _bank_detail_to_camel(b) -> dict:
    """Map bank detail ORM object → camelCase dict matching frontend bankSchema."""
    obj = LoanBankDetail.model_validate(b)
    products = obj.products or []
    extra = obj.extra_bank_data or {}

    result = {
        **_bank_base_fields(obj),
        "description": obj.description,
        "descriptionFA": obj.description_fa,
        "scoringSystem": obj.scoring_system,
        "digitalBranch": obj.digital_branch,
        "extraBankData": obj.extra_bank_data,
        "loanTypes": [_product_to_camel(p) for p in products],
        "loansCount": len(products),
    }

    # ── Extract rich fields from JSONB extra_bank_data to top-level ───
    _BANK_EXTRA_FIELDS = {
        "contact": "contact",
        "appDownload": "appDownload",
        "websitePortal": "websitePortal",
        "parentBankWebsite": "parentBankWebsite",
        "parentBankFA": "parentBankFA",
        "launchDateFA": "launchDateFA",
        "socialMedia": "socialMedia",
        "statistics": "statistics",
        "specialFeatures": "specialFeatures",
        "process": "process",
        "processingTimes": "processingTimes",
        "mandatoryRequirements": "mandatoryRequirements",
        "userFeedback": "userFeedback",
        "creditRatingSystem": "creditRatingSystem",
        "generalFeatures": "generalFeatures",
        "generalRequirements": "generalRequirements",
        "guarantorTypes": "guarantorTypes",
        "images": "_images",
    }
    for camel_key, extra_key in _BANK_EXTRA_FIELDS.items():
        val = extra.get(extra_key)
        if val is not None:
            result[camel_key] = val

    # invitationBased may be at top level or nested in specialFeatures
    if extra.get("invitationBased"):
        result["invitationBased"] = True
    elif isinstance(extra.get("specialFeatures"), dict) and extra["specialFeatures"].get("invitationBased"):
        result["invitationBased"] = True

    # applicationProcess is an alias for process
    if "process" not in result and extra.get("applicationProcess"):
        result["process"] = extra["applicationProcess"]

    return result


def _product_to_camel(p) -> dict:
    """Map product ORM/Pydantic object → camelCase dict matching frontend loanTypeSchema."""
    obj = (
        p if isinstance(p, LoanProductSummary) else LoanProductSummary.model_validate(p)
    )
    return {
        "id": str(obj.id),
        "nameFA": obj.name_fa,
        "nameEN": obj.name_en,
        "category": obj.category,
        "categoryFA": obj.category_fa,
        "calculationMethod": obj.calculation_method,
        "interestRate": _format_rate(obj.interest_rate_min, obj.interest_rate_max),
        "interestRateNumeric": obj.interest_rate_min,
        "maxAmount": obj.max_amount_display,
        "maxAmountNumeric": obj.max_amount,
        "loanMultiplier": obj.loan_multiplier,
        "guarantor": obj.guarantor_required,
        "descriptionFA": obj.description_fa,
        "slug": obj.loan_slug,
        "bankId": str(obj.bank_id) if obj.bank_id else None,
        "bankNameFA": obj.bank_name_fa or "",
        "bankSlug": obj.bank_slug,
    }


def _product_detail_to_camel(p) -> dict:
    """Map product detail ORM object → camelCase dict matching frontend."""
    obj = LoanProductDetail.model_validate(p)
    d = {
        "id": str(obj.id),
        "nameFA": obj.name_fa,
        "nameEN": obj.name_en,
        "category": obj.category,
        "categoryFA": obj.category_fa,
        "calculationMethod": obj.calculation_method,
        "interestRate": _format_rate(obj.interest_rate_min, obj.interest_rate_max),
        "interestRateNumeric": obj.interest_rate_min,
        "feeMin": obj.fee_min,
        "feeMax": obj.fee_max,
        "maxAmount": obj.max_amount_display,
        "maxAmountNumeric": obj.max_amount,
        "loanMultiplier": obj.loan_multiplier,
        "depositToFacilityRatio": obj.deposit_to_facility_ratio,
        "repaymentPeriodMin": obj.repayment_period_min,
        "repaymentPeriodMax": obj.repayment_period_max,
        "guarantor": obj.guarantor_required,
        "guarantorDescription": obj.guarantor_description,
        "description": obj.description,
        "descriptionFA": obj.description_fa,
        "extraData": obj.extra_data,
        "slug": obj.loan_slug,
        "bankId": str(obj.bank_id) if obj.bank_id else None,
        "bankNameFA": obj.bank_name_fa or "",
        "bankSlug": obj.bank_slug,
        "coefficients": [
            {
                "id": c.id,
                "feePercent": c.fee_percent,
                "depositMonths": c.deposit_months,
                "repaymentMonths": c.repayment_months,
                "ratioPercent": c.ratio_percent,
                "description": c.description,
            }
            for c in (obj.coefficients or [])
        ],
        "requirements": [
            {
                "id": r.id,
                "requirementType": r.requirement_type,
                "description": r.description,
                "descriptionFA": r.description_fa,
                "isMandatory": r.is_mandatory,
            }
            for r in (obj.requirements or [])
        ],
    }
    if obj.repayment_period_min and obj.repayment_period_max:
        if obj.repayment_period_min == obj.repayment_period_max:
            d["repaymentPeriod"] = f"{obj.repayment_period_min} ماه"
        else:
            d["repaymentPeriod"] = (
                f"{obj.repayment_period_min}-{obj.repayment_period_max} ماه"
            )
    elif obj.repayment_period_max:
        d["repaymentPeriod"] = f"تا {obj.repayment_period_max} ماه"

    # ── Extract rich fields from JSONB extra_data to top-level ────────
    extra = obj.extra_data or {}
    _PRODUCT_EXTRA_FIELDS = {
        "targetAudience": "targetAudience",
        "targetAudienceFA": "targetAudienceFA",
        "borrowerCreditRating": "borrowerCreditRating",
        "creditCheckRequired": "creditCheckRequired",
        "depositAmountOneMonth": "depositAmountOneMonth",
        "depositAmountThreeMonths": "depositAmountThreeMonths",
        "depositAmountSixMonths": "depositAmountSixMonths",
        "averageBalanceRequired": "averageBalanceRequired",
        "minimumDepositAmount": "minimumDepositAmount",
        "feeByDuration": "feeByDuration",
        "feeStructure": "feeStructure",
        "sources": "sources",
        "specialCard": "specialCard",
        "teacherLoan": "teacherLoan",
        "creditRatingRequirements": "creditRatingRequirements",
        "guarantorRequirements": "guarantorRequirements",
        "stepSystem": "stepSystem",
        "processingTime": "processingTime",
        "processingTimeFA": "processingTimeFA",
        "note": "note",
    }
    for camel_key, extra_key in _PRODUCT_EXTRA_FIELDS.items():
        val = extra.get(extra_key)
        if val is not None:
            d[camel_key] = val

    return d


# ── Banks ────────────────────────────────────────────────────────────────────


@router.get("/banks")
@cached(
    module="loans",
    endpoint="banks",
    trading_ttl=3600,
    off_hours_ttl=86400,
    tags=["loans"],
)
def list_banks(
    category: str | None = Query(None, description="Filter: traditional or digital"),
    db: Session = Depends(get_db),
):
    """Get all banks, optionally filtered by category."""
    banks = svc.get_banks(db, category=category)
    return _wrap([_bank_to_camel(b) for b in banks])


@router.get("/banks/traditional")
@cached(
    module="loans",
    endpoint="banks-traditional",
    trading_ttl=3600,
    off_hours_ttl=86400,
    tags=["loans"],
)
def list_traditional_banks(db: Session = Depends(get_db)):
    """Get traditional banks only."""
    banks = svc.get_banks(db, category="traditional")
    return _wrap([_bank_to_camel(b) for b in banks])


@router.get("/banks/digital")
@cached(
    module="loans",
    endpoint="banks-digital",
    trading_ttl=3600,
    off_hours_ttl=86400,
    tags=["loans"],
)
def list_digital_banks(db: Session = Depends(get_db)):
    """Get digital/neo banks only."""
    banks = svc.get_banks(db, category="digital")
    return _wrap([_bank_to_camel(b) for b in banks])


@router.get("/banks/{bank_id}")
@cached(
    module="loans",
    endpoint="bank-detail",
    trading_ttl=3600,
    off_hours_ttl=86400,
    tags=["loans"],
)
def get_bank(bank_id: int, db: Session = Depends(get_db)):
    """Get bank detail with its loan products."""
    bank = svc.get_bank_detail(db, bank_id)
    if not bank:
        raise HTTPException(status_code=404, detail="Bank not found")
    return _wrap(_bank_detail_to_camel(bank))


@router.get("/banks/{bank_id}/loans")
@cached(
    module="loans",
    endpoint="bank-loans",
    trading_ttl=3600,
    off_hours_ttl=86400,
    tags=["loans"],
)
def get_bank_loans(bank_id: int, db: Session = Depends(get_db)):
    """Get all loan products for a specific bank."""
    bank = svc.get_bank_detail(db, bank_id)
    products = svc.get_products_by_bank(db, bank_id)
    return _wrap(
        {
            "bankId": str(bank_id),
            "bankNameFA": getattr(bank, "name_fa", "") if bank else "",
            "bankNameEN": getattr(bank, "name_en", "") if bank else "",
            "loans": [_product_to_camel(p) for p in products],
        }
    )


# ── Loan Products ────────────────────────────────────────────────────────────


@router.get("/list")
@cached(
    module="loans",
    endpoint="products-list",
    trading_ttl=3600,
    off_hours_ttl=86400,
    tags=["loans"],
)
def list_products(
    guarantor: bool | None = Query(None, description="Filter by guarantor requirement"),
    method: str | None = Query(None, description="Filter by calculation method"),
    db: Session = Depends(get_db),
):
    """Get all loan products with optional filters."""
    products = svc.get_products(db, guarantor=guarantor, method=method)
    return _wrap([_product_to_camel(p) for p in products])


@router.get("/no-guarantor")
@cached(
    module="loans",
    endpoint="no-guarantor",
    trading_ttl=3600,
    off_hours_ttl=86400,
    tags=["loans"],
)
def list_no_guarantor(db: Session = Depends(get_db)):
    """Get loans that don't require a guarantor."""
    products = svc.get_products(db, guarantor=False)
    return _wrap([_product_to_camel(p) for p in products])


@router.get("/by-method/{method}")
@cached(
    module="loans",
    endpoint="by-method",
    trading_ttl=3600,
    off_hours_ttl=86400,
    tags=["loans"],
)
def list_by_method(method: str, db: Session = Depends(get_db)):
    """Get loans filtered by calculation method."""
    products = svc.get_products(db, method=method)
    return _wrap([_product_to_camel(p) for p in products])


@router.get("/product/{product_id}")
@cached(
    module="loans",
    endpoint="product-detail",
    trading_ttl=3600,
    off_hours_ttl=86400,
    tags=["loans"],
)
def get_product(product_id: int, db: Session = Depends(get_db)):
    """Get full product detail with coefficients and requirements."""
    product = svc.get_product_detail(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Loan product not found")
    return _wrap(_product_detail_to_camel(product))


# ── Analytics ────────────────────────────────────────────────────────────────


@router.get("/analytics/summary")
@cached(
    module="loans",
    endpoint="analytics-summary",
    trading_ttl=3600,
    off_hours_ttl=86400,
    tags=["loans"],
)
def analytics_summary(db: Session = Depends(get_db)):
    """Summary statistics across all loan data."""
    raw = svc.get_analytics_summary(db)
    # Map to camelCase keys expected by frontend summaryStatsSchema
    return _wrap(
        {
            "totalBanks": raw["total_banks"],
            "totalLoans": raw["total_products"],
            "digitalBanks": raw["digital_banks"],
            "traditionalBanks": raw["traditional_banks"],
            "noGuarantorLoans": raw["no_guarantor_count"],
            "averageInterestRate": raw.get("avg_interest_rate"),
            "calculationMethods": {},
        }
    )


@router.get("/analytics/by-category")
@cached(
    module="loans",
    endpoint="analytics-by-category",
    trading_ttl=3600,
    off_hours_ttl=86400,
    tags=["loans"],
)
def analytics_by_category(db: Session = Depends(get_db)):
    """Banks grouped by category."""
    traditional = svc.get_banks(db, category="traditional")
    digital = svc.get_banks(db, category="digital")

    def _bank_to_dict(b):
        return {
            "id": str(b.id),
            "nameFA": b.name_fa,
            "nameEN": b.name_en or "",
            "slug": b.bank_slug,
            "productsCount": getattr(b, "products_count", 0),
        }

    return _wrap(
        {
            "traditional-banks": [_bank_to_dict(b) for b in traditional],
            "digital-banks": [_bank_to_dict(b) for b in digital],
        }
    )


@router.get("/analytics/interest-rates")
@cached(
    module="loans",
    endpoint="analytics-rates",
    trading_ttl=3600,
    off_hours_ttl=86400,
    tags=["loans"],
)
def analytics_interest_rates(db: Session = Depends(get_db)):
    """Interest rate distribution across products."""
    dist = svc.get_interest_rate_distribution(db)
    rates = [r.get("count", 0) for r in dist if r.get("range_label") not in ("0%",)]
    return _wrap(
        {
            "distribution": dist,
            "avgRate": sum(rates) / len(rates) if rates else 0,
            "minRate": 0,
            "maxRate": max(rates) if rates else 0,
        }
    )


@router.get("/analytics/loan-amounts")
@cached(
    module="loans",
    endpoint="analytics-amounts",
    trading_ttl=3600,
    off_hours_ttl=86400,
    tags=["loans"],
)
def analytics_loan_amounts(db: Session = Depends(get_db)):
    """Loan amount range distribution."""
    raw = svc.get_loan_amount_ranges(db)
    return _wrap(
        {
            "banks": raw,
            "totalBanks": len(raw),
        }
    )


@router.get("/analytics/requirements-matrix")
@cached(
    module="loans",
    endpoint="analytics-requirements",
    trading_ttl=3600,
    off_hours_ttl=86400,
    tags=["loans"],
)
def analytics_requirements_matrix(db: Session = Depends(get_db)):
    """Requirements matrix across all products."""
    raw = svc.get_requirements_matrix(db)
    return _wrap(
        {
            "matrix": raw,
            "totalBanks": len(raw),
        }
    )


# ── User Loans (authenticated) ──────────────────────────────────────────────


@router.get("/my-loans", response_model=list[UserLoanSchema])
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


@router.get("/my-loans/{loan_id}/schedule", response_model=list[PaymentScheduleSchema])
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
    schedule = svc.mark_payment_paid(
        db, user.id, loan_id, installment_num, body.paid_at
    )
    if not schedule:
        raise HTTPException(status_code=404, detail="Payment not found")
    return {"status": "ok", "installment": installment_num}


@router.get("/alerts", response_model=list[PaymentAlertSchema])
def list_alerts(
    user=Depends(require_role("viewer")),
    db: Session = Depends(get_db),
):
    """Get payment alerts for the current user."""
    return svc.get_user_alerts(db, user.id)
