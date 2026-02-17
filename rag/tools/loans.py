"""Loan advisory tools — 4 new tools."""
import json
import logging
import math

from sqlalchemy.orm import Session

from database.models import LoanBank, LoanProduct, LoanCoefficient, LoanRequirement
from rag.tools._helpers import _dec, MAX_ROWS

logger = logging.getLogger(__name__)

# ── Tool definitions ─────────────────────────────────────────────────────────

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "search_loan_products",
            "description": "Search and filter loan products by bank, calculation method, guarantor requirement, and interest rate.",
            "parameters": {
                "type": "object",
                "properties": {
                    "bank_name": {"type": "string", "description": "Bank name in Persian to filter"},
                    "method": {
                        "type": "string",
                        "enum": ["zero_interest", "average_based", "gold_backed", "credit_card", "pos_based", "installment", "other"],
                        "description": "Loan calculation method",
                    },
                    "guarantor_required": {"type": "boolean", "description": "Filter by guarantor requirement"},
                    "max_interest_rate": {"type": "number", "description": "Maximum interest rate (%)"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_loan_details",
            "description": "Get full details of a specific loan product including coefficients, requirements, and terms.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_id": {"type": "integer", "description": "Loan product ID"},
                },
                "required": ["product_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_banks",
            "description": "List all active banks offering loan products, with their product counts.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "calculate_loan_installment",
            "description": "Calculate monthly installment for a loan using the annuity formula. Returns monthly payment, total payment, and total interest.",
            "parameters": {
                "type": "object",
                "properties": {
                    "amount": {"type": "integer", "description": "Loan amount in Rials"},
                    "annual_interest_rate": {"type": "number", "description": "Annual interest rate (%)"},
                    "duration_months": {"type": "integer", "description": "Loan duration in months"},
                },
                "required": ["amount", "annual_interest_rate", "duration_months"],
            },
        },
    },
]


# ── Tool implementations ─────────────────────────────────────────────────────


def search_loan_products(
    db: Session,
    bank_name: str = None,
    method: str = None,
    guarantor_required: bool = None,
    max_interest_rate: float = None,
) -> str:
    query = (
        db.query(LoanProduct, LoanBank)
        .join(LoanBank, LoanProduct.bank_id == LoanBank.id)
        .filter(LoanProduct.is_active == True, LoanBank.is_active == True)
    )
    if bank_name:
        query = query.filter(LoanBank.name_fa.ilike(f"%{bank_name}%"))
    if method:
        query = query.filter(LoanProduct.calculation_method == method)
    if guarantor_required is not None:
        query = query.filter(LoanProduct.guarantor_required == guarantor_required)
    if max_interest_rate is not None:
        query = query.filter(LoanProduct.interest_rate_max <= max_interest_rate)

    rows = query.order_by(LoanProduct.id).limit(MAX_ROWS).all()
    if not rows:
        return json.dumps({"results": [], "message": "No matching loan products found."}, ensure_ascii=False)

    data = [
        {
            "product_id": p.id,
            "bank": b.name_fa,
            "name": p.name_fa,
            "method": p.calculation_method.value if p.calculation_method else None,
            "interest_rate_min": _dec(p.interest_rate_min),
            "interest_rate_max": _dec(p.interest_rate_max),
            "max_amount_display": p.max_amount_display,
            "repayment_months": f"{p.repayment_period_min or '?'}-{p.repayment_period_max or '?'}",
            "guarantor_required": p.guarantor_required,
        }
        for p, b in rows
    ]
    return json.dumps({"count": len(data), "products": data}, ensure_ascii=False)


def get_loan_details(db: Session, product_id: int) -> str:
    product = db.query(LoanProduct).filter(LoanProduct.id == product_id).first()
    if not product:
        return json.dumps({"error": f"Loan product #{product_id} not found"}, ensure_ascii=False)

    bank = db.query(LoanBank).filter(LoanBank.id == product.bank_id).first()
    coefficients = (
        db.query(LoanCoefficient)
        .filter(LoanCoefficient.product_id == product_id)
        .order_by(LoanCoefficient.repayment_months)
        .all()
    )
    requirements = (
        db.query(LoanRequirement)
        .filter(LoanRequirement.product_id == product_id)
        .all()
    )

    data = {
        "product_id": product.id,
        "bank": bank.name_fa if bank else None,
        "name": product.name_fa,
        "category": product.category_fa or product.category,
        "method": product.calculation_method.value if product.calculation_method else None,
        "interest_rate_min": _dec(product.interest_rate_min),
        "interest_rate_max": _dec(product.interest_rate_max),
        "fee_min": _dec(product.fee_min),
        "fee_max": _dec(product.fee_max),
        "max_amount": product.max_amount,
        "max_amount_display": product.max_amount_display,
        "loan_multiplier": product.loan_multiplier,
        "repayment_period_min": product.repayment_period_min,
        "repayment_period_max": product.repayment_period_max,
        "guarantor_required": product.guarantor_required,
        "guarantor_description": product.guarantor_description,
        "description": product.description_fa or product.description,
        "coefficients": [
            {
                "fee_percent": _dec(c.fee_percent),
                "deposit_months": c.deposit_months,
                "repayment_months": c.repayment_months,
                "ratio_percent": c.ratio_percent,
            }
            for c in coefficients
        ],
        "requirements": [
            {
                "type": r.requirement_type.value if r.requirement_type else None,
                "description": r.description_fa or r.description,
                "mandatory": r.is_mandatory,
            }
            for r in requirements
        ],
    }
    return json.dumps(data, ensure_ascii=False)


def list_banks(db: Session) -> str:
    from sqlalchemy import func
    rows = (
        db.query(LoanBank, func.count(LoanProduct.id).label("product_count"))
        .outerjoin(LoanProduct, (LoanProduct.bank_id == LoanBank.id) & (LoanProduct.is_active == True))
        .filter(LoanBank.is_active == True)
        .group_by(LoanBank.id)
        .order_by(LoanBank.name_fa)
        .all()
    )
    data = [
        {
            "bank_id": b.id,
            "name": b.name_fa,
            "category": b.category.value if b.category else None,
            "bank_type": b.bank_type,
            "product_count": count,
        }
        for b, count in rows
    ]
    return json.dumps({"count": len(data), "banks": data}, ensure_ascii=False)


def calculate_loan_installment(
    db: Session, amount: int, annual_interest_rate: float, duration_months: int,
) -> str:
    """Pure math — db arg accepted for dispatch uniformity but unused."""
    if amount <= 0 or duration_months <= 0:
        return json.dumps({"error": "Amount and duration must be positive"}, ensure_ascii=False)
    if annual_interest_rate < 0:
        return json.dumps({"error": "Interest rate cannot be negative"}, ensure_ascii=False)

    if annual_interest_rate == 0:
        monthly = amount / duration_months
        return json.dumps({
            "monthly_installment": round(monthly),
            "total_payment": amount,
            "total_interest": 0,
            "amount": amount,
            "annual_interest_rate": 0,
            "duration_months": duration_months,
        }, ensure_ascii=False)

    r = annual_interest_rate / 100.0 / 12.0
    n = duration_months
    monthly = amount * (r * (1 + r) ** n) / ((1 + r) ** n - 1)
    total = monthly * n
    total_interest = total - amount

    return json.dumps({
        "monthly_installment": round(monthly),
        "total_payment": round(total),
        "total_interest": round(total_interest),
        "amount": amount,
        "annual_interest_rate": annual_interest_rate,
        "duration_months": duration_months,
    }, ensure_ascii=False)


# ── Dispatch map ──────────────────────────────────────────────────────────────

TOOL_DISPATCH = {
    "search_loan_products": search_loan_products,
    "get_loan_details": get_loan_details,
    "list_banks": list_banks,
    "calculate_loan_installment": calculate_loan_installment,
}
