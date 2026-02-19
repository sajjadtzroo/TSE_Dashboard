"""
Business logic for the Loan module.
All database queries and business rules are encapsulated here.
"""

import logging
from datetime import UTC, datetime

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from database.models import (
    BankCategory,
    LoanBank,
    LoanCalculationMethod,
    LoanProduct,
    PaymentAlert,
    PaymentSchedule,
    UserLoan,
)

logger = logging.getLogger(__name__)


# ── Bank queries ─────────────────────────────────────────────────────────────


def get_banks(db: Session, category: str | None = None) -> list:
    """Get all active banks, optionally filtered by category."""
    q = db.query(LoanBank).filter(LoanBank.is_active.is_(True))
    if category:
        q = q.filter(LoanBank.category == category)
    banks = q.order_by(LoanBank.name_fa).all()
    # Attach products_count
    for bank in banks:
        bank.products_count = (
            db.query(func.count(LoanProduct.id))
            .filter(LoanProduct.bank_id == bank.id, LoanProduct.is_active.is_(True))
            .scalar()
        )
    return banks


def get_bank_detail(db: Session, bank_id: int) -> LoanBank | None:
    """Get bank with its active products."""
    bank = (
        db.query(LoanBank)
        .options(joinedload(LoanBank.products))
        .filter(LoanBank.id == bank_id, LoanBank.is_active.is_(True))
        .first()
    )
    if bank:
        bank.products = [p for p in bank.products if p.is_active]
    return bank


def get_bank_by_slug(db: Session, slug: str) -> LoanBank | None:
    """Get bank by slug with its active products."""
    bank = (
        db.query(LoanBank)
        .options(joinedload(LoanBank.products))
        .filter(LoanBank.bank_slug == slug, LoanBank.is_active.is_(True))
        .first()
    )
    if bank:
        bank.products = [p for p in bank.products if p.is_active]
    return bank


# ── Product queries ──────────────────────────────────────────────────────────


def get_products(
    db: Session,
    guarantor: bool | None = None,
    method: str | None = None,
    bank_id: int | None = None,
) -> list:
    """Get all active loan products with optional filters."""
    q = db.query(LoanProduct).filter(LoanProduct.is_active.is_(True))
    if guarantor is not None:
        q = q.filter(LoanProduct.guarantor_required == guarantor)
    if method:
        q = q.filter(LoanProduct.calculation_method == method)
    if bank_id:
        q = q.filter(LoanProduct.bank_id == bank_id)
    products = q.join(LoanBank).order_by(LoanBank.name_fa, LoanProduct.name_fa).all()
    # Attach bank info
    for p in products:
        if p.bank:
            p.bank_name_fa = p.bank.name_fa
            p.bank_slug = p.bank.bank_slug
    return products


def get_product_detail(db: Session, product_id: int) -> LoanProduct | None:
    """Get product with coefficients, requirements, and bank info."""
    product = (
        db.query(LoanProduct)
        .options(
            joinedload(LoanProduct.bank),
            joinedload(LoanProduct.coefficients),
            joinedload(LoanProduct.requirements),
        )
        .filter(LoanProduct.id == product_id, LoanProduct.is_active.is_(True))
        .first()
    )
    if product and product.bank:
        product.bank_name_fa = product.bank.name_fa
        product.bank_slug = product.bank.bank_slug
    return product


def get_products_by_bank(db: Session, bank_id: int) -> list:
    """Get all active products for a specific bank."""
    return get_products(db, bank_id=bank_id)


# ── Analytics ────────────────────────────────────────────────────────────────


def get_analytics_summary(db: Session) -> dict:
    """Summary statistics across all loan data."""
    total_banks = (
        db.query(func.count(LoanBank.id)).filter(LoanBank.is_active.is_(True)).scalar()
    )
    traditional = (
        db.query(func.count(LoanBank.id))
        .filter(
            LoanBank.is_active.is_(True), LoanBank.category == BankCategory.traditional
        )
        .scalar()
    )
    digital = (
        db.query(func.count(LoanBank.id))
        .filter(LoanBank.is_active.is_(True), LoanBank.category == BankCategory.digital)
        .scalar()
    )
    total_products = (
        db.query(func.count(LoanProduct.id))
        .filter(LoanProduct.is_active.is_(True))
        .scalar()
    )
    no_guarantor = (
        db.query(func.count(LoanProduct.id))
        .filter(
            LoanProduct.is_active.is_(True), LoanProduct.guarantor_required.is_(False)
        )
        .scalar()
    )
    zero_interest = (
        db.query(func.count(LoanProduct.id))
        .filter(
            LoanProduct.is_active.is_(True),
            LoanProduct.calculation_method == LoanCalculationMethod.zero_interest,
        )
        .scalar()
    )
    avg_rate = (
        db.query(func.avg(LoanProduct.interest_rate_min))
        .filter(
            LoanProduct.is_active.is_(True), LoanProduct.interest_rate_min.isnot(None)
        )
        .scalar()
    )
    max_amount = (
        db.query(func.max(LoanProduct.max_amount))
        .filter(LoanProduct.is_active.is_(True))
        .scalar()
    )

    return {
        "total_banks": total_banks or 0,
        "traditional_banks": traditional or 0,
        "digital_banks": digital or 0,
        "total_products": total_products or 0,
        "no_guarantor_count": no_guarantor or 0,
        "zero_interest_count": zero_interest or 0,
        "avg_interest_rate": round(float(avg_rate), 2) if avg_rate else None,
        "max_loan_amount": max_amount,
    }


def get_interest_rate_distribution(db: Session) -> list:
    """Distribution of interest rates across products."""
    ranges = [
        ("0%", 0, 0),
        ("1-5%", 0.01, 5),
        ("5-10%", 5.01, 10),
        ("10-15%", 10.01, 15),
        ("15-20%", 15.01, 20),
        ("20%+", 20.01, 100),
    ]
    result = []
    for label, low, high in ranges:
        if low == 0 and high == 0:
            count = (
                db.query(func.count(LoanProduct.id))
                .filter(
                    LoanProduct.is_active.is_(True),
                    LoanProduct.interest_rate_min == 0,
                )
                .scalar()
            )
        else:
            count = (
                db.query(func.count(LoanProduct.id))
                .filter(
                    LoanProduct.is_active.is_(True),
                    LoanProduct.interest_rate_min >= low,
                    LoanProduct.interest_rate_min <= high,
                )
                .scalar()
            )
        result.append({"range_label": label, "count": count or 0})
    return result


def get_loan_amount_ranges(db: Session) -> list:
    """Distribution of max loan amounts."""
    ranges = [
        ("< 100M", 0, 1_000_000_000),
        ("100M - 500M", 1_000_000_000, 5_000_000_000),
        ("500M - 1B", 5_000_000_000, 10_000_000_000),
        ("1B+", 10_000_000_000, None),
    ]
    result = []
    for label, low, high in ranges:
        q = db.query(func.count(LoanProduct.id)).filter(
            LoanProduct.is_active.is_(True),
            LoanProduct.max_amount.isnot(None),
            LoanProduct.max_amount >= low,
        )
        if high is not None:
            q = q.filter(LoanProduct.max_amount < high)
        result.append({"range_label": label, "count": q.scalar() or 0})
    return result


def get_requirements_matrix(db: Session) -> list:
    """Requirements matrix: product → requirement types."""
    products = (
        db.query(LoanProduct)
        .options(joinedload(LoanProduct.requirements), joinedload(LoanProduct.bank))
        .filter(LoanProduct.is_active.is_(True))
        .all()
    )
    result = []
    for p in products:
        if p.requirements:
            result.append(
                {
                    "bank_name_fa": p.bank.name_fa if p.bank else "",
                    "product_name_fa": p.name_fa,
                    "requirement_types": list(
                        {r.requirement_type.value for r in p.requirements}
                    ),
                    "requirements": [
                        r.description_fa or r.description for r in p.requirements
                    ],
                }
            )
    return result


# ── User loans ───────────────────────────────────────────────────────────────


def get_user_loans(db: Session, user_id: int) -> list:
    """Get all active loans for a user."""
    loans = (
        db.query(UserLoan)
        .options(joinedload(UserLoan.product).joinedload(LoanProduct.bank))
        .filter(UserLoan.user_id == user_id, UserLoan.is_active.is_(True))
        .order_by(UserLoan.created_at.desc())
        .all()
    )
    for loan in loans:
        if loan.product and loan.product.bank:
            loan.product.bank_name_fa = loan.product.bank.name_fa
            loan.product.bank_slug = loan.product.bank.bank_slug
    return loans


def create_user_loan(db: Session, user_id: int, data: dict) -> UserLoan:
    """Create a new user tracked loan."""
    loan = UserLoan(user_id=user_id, **data)
    db.add(loan)
    db.commit()
    db.refresh(loan)
    return loan


def delete_user_loan(db: Session, user_id: int, loan_id: int) -> bool:
    """Soft-delete a user tracked loan."""
    loan = (
        db.query(UserLoan)
        .filter(UserLoan.id == loan_id, UserLoan.user_id == user_id)
        .first()
    )
    if not loan:
        return False
    loan.is_active = False
    db.commit()
    return True


def get_payment_schedule(db: Session, user_id: int, loan_id: int) -> list:
    """Get payment schedule for a user loan."""
    loan = (
        db.query(UserLoan)
        .filter(UserLoan.id == loan_id, UserLoan.user_id == user_id)
        .first()
    )
    if not loan:
        return []
    return (
        db.query(PaymentSchedule)
        .filter(PaymentSchedule.user_loan_id == loan_id)
        .order_by(PaymentSchedule.installment_number)
        .all()
    )


def mark_payment_paid(
    db: Session,
    user_id: int,
    loan_id: int,
    installment_num: int,
    paid_at: datetime | None = None,
) -> PaymentSchedule | None:
    """Mark a payment installment as paid."""
    # Verify ownership
    loan = (
        db.query(UserLoan)
        .filter(UserLoan.id == loan_id, UserLoan.user_id == user_id)
        .first()
    )
    if not loan:
        return None
    schedule = (
        db.query(PaymentSchedule)
        .filter(
            PaymentSchedule.user_loan_id == loan_id,
            PaymentSchedule.installment_number == installment_num,
        )
        .first()
    )
    if not schedule:
        return None
    schedule.status = "paid"
    schedule.paid_at = paid_at or datetime.now(UTC)
    db.commit()
    return schedule


def get_user_alerts(db: Session, user_id: int) -> list:
    """Get payment alerts for a user."""
    return (
        db.query(PaymentAlert)
        .filter(PaymentAlert.user_id == user_id)
        .order_by(PaymentAlert.created_at.desc())
        .limit(50)
        .all()
    )
