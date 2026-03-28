"""Loan advisory tools — 4 existing tools + 1 Persian Loan RAG search."""

import json
import logging

import numpy as np
from sqlalchemy import text
from sqlalchemy.orm import Session

from database.models import LoanBank, LoanChunk, LoanCoefficient, LoanProduct, LoanRequirement
from rag.tools._helpers import MAX_ROWS, _dec, _escape_like

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
                    "bank_name": {
                        "type": "string",
                        "description": "Bank name in Persian to filter",
                    },
                    "method": {
                        "type": "string",
                        "enum": [
                            "zero_interest",
                            "average_based",
                            "gold_backed",
                            "credit_card",
                            "pos_based",
                            "installment",
                            "other",
                        ],
                        "description": "Loan calculation method",
                    },
                    "guarantor_required": {
                        "type": "boolean",
                        "description": "Filter by guarantor requirement",
                    },
                    "max_interest_rate": {
                        "type": "number",
                        "description": "Maximum interest rate (%)",
                    },
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
                    "amount": {
                        "type": "integer",
                        "description": "Loan amount in Rials",
                    },
                    "annual_interest_rate": {
                        "type": "number",
                        "description": "Annual interest rate (%)",
                    },
                    "duration_months": {
                        "type": "integer",
                        "description": "Loan duration in months",
                    },
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
        query = query.filter(LoanBank.name_fa.ilike(f"%{_escape_like(bank_name)}%"))
    if method:
        query = query.filter(LoanProduct.calculation_method == method)
    if guarantor_required is not None:
        query = query.filter(LoanProduct.guarantor_required == guarantor_required)
    if max_interest_rate is not None:
        query = query.filter(LoanProduct.interest_rate_max <= max_interest_rate)

    rows = query.order_by(LoanProduct.id).limit(MAX_ROWS).all()
    if not rows:
        return json.dumps(
            {"results": [], "message": "No matching loan products found."},
            ensure_ascii=False,
        )

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
        return json.dumps(
            {"error": f"Loan product #{product_id} not found"}, ensure_ascii=False
        )

    bank = db.query(LoanBank).filter(LoanBank.id == product.bank_id).first()
    coefficients = (
        db.query(LoanCoefficient)
        .filter(LoanCoefficient.product_id == product_id)
        .order_by(LoanCoefficient.repayment_months)
        .all()
    )
    requirements = (
        db.query(LoanRequirement).filter(LoanRequirement.product_id == product_id).all()
    )

    data = {
        "product_id": product.id,
        "bank": bank.name_fa if bank else None,
        "name": product.name_fa,
        "category": product.category_fa or product.category,
        "method": (
            product.calculation_method.value if product.calculation_method else None
        ),
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
        .outerjoin(
            LoanProduct,
            (LoanProduct.bank_id == LoanBank.id) & (LoanProduct.is_active == True),
        )
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
    db: Session,
    amount: int,
    annual_interest_rate: float,
    duration_months: int,
) -> str:
    """Pure math — db arg accepted for dispatch uniformity but unused."""
    if amount <= 0 or duration_months <= 0:
        return json.dumps(
            {"error": "Amount and duration must be positive"}, ensure_ascii=False
        )
    if annual_interest_rate < 0:
        return json.dumps(
            {"error": "Interest rate cannot be negative"}, ensure_ascii=False
        )

    if annual_interest_rate == 0:
        monthly = amount / duration_months
        return json.dumps(
            {
                "monthly_installment": round(monthly),
                "total_payment": amount,
                "total_interest": 0,
                "amount": amount,
                "annual_interest_rate": 0,
                "duration_months": duration_months,
            },
            ensure_ascii=False,
        )

    r = annual_interest_rate / 100.0 / 12.0
    n = duration_months
    monthly = amount * (r * (1 + r) ** n) / ((1 + r) ** n - 1)
    total = monthly * n
    total_interest = total - amount

    return json.dumps(
        {
            "monthly_installment": round(monthly),
            "total_payment": round(total),
            "total_interest": round(total_interest),
            "amount": amount,
            "annual_interest_rate": annual_interest_rate,
            "duration_months": duration_months,
        },
        ensure_ascii=False,
    )


# ── Persian Loan RAG tool ─────────────────────────────────────────────────────

# Credit score → sub-tier mapping
_SCORE_TIERS = [
    (800, "A1"), (750, "A2"), (700, "A3"),
    (650, "B1"), (600, "B2"), (550, "B3"),
    (500, "C1"), (400, "C2"), (0, "D"),
]


def _score_to_subtier(score: int) -> str:
    for threshold, label in _SCORE_TIERS:
        if score >= threshold:
            return label
    return "D"


PERSIAN_LOAN_RAG_TOOL_DEFINITION = {
    "type": "function",
    "function": {
        "name": "persian_loan_rag_search",
        "description": (
            "Search Persian Loan products using vector similarity + credit score filter. "
            "Returns top-5 loans the user qualifies for based on their credit score. "
            "Use this when the user asks about getting a loan, what loans they can get, "
            "or asks for loan recommendations."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "credit_score": {
                    "type": "integer",
                    "description": (
                        "User's numeric credit score (400–900). "
                        "A1=800-900, A2=750-800, A3=700-750, "
                        "B1=650-700, B2=600-650, B3=550-600, "
                        "C1=500-550, C2=400-500, D=below 400."
                    ),
                },
                "max_amount_million": {
                    "type": "number",
                    "description": "Maximum loan amount the user needs, in million toman. Optional.",
                },
                "no_guarantor": {
                    "type": "boolean",
                    "description": "If true, only return loans that do not require a guarantor.",
                },
                "preferences": {
                    "type": "string",
                    "description": "Free-text user preferences, e.g. 'online application', 'no collateral', 'digital bank'.",
                },
            },
            "required": ["credit_score"],
        },
    },
}


def persian_loan_rag_search(
    db: Session,
    credit_score: int,
    max_amount_million: float = None,
    no_guarantor: bool = False,
    preferences: str = "",
) -> str:
    """
    Vector search over loan_chunks pre-filtered by credit score.
    Returns top-5 matching loans with full metadata.
    """
    from rag.embedder import embed_query

    sub_tier = _score_to_subtier(credit_score)

    # Build query text (Farsi + key parameters for best embedding match)
    query_parts = [f"وام مناسب برای رتبه اعتباری {sub_tier} با امتیاز {credit_score}"]
    if max_amount_million:
        query_parts.append(f"مبلغ مورد نیاز تا {max_amount_million} میلیون تومان")
    if no_guarantor:
        query_parts.append("بدون ضامن")
    if preferences:
        query_parts.append(preferences)
    query_text = " — ".join(query_parts)

    try:
        query_vec = embed_query(query_text)
    except Exception as e:
        logger.error("Embedding failed: %s", e)
        return json.dumps({"error": "Embedding service unavailable. Try again later."}, ensure_ascii=False)

    vec_str = "[" + ",".join(f"{v:.6f}" for v in query_vec.tolist()) + "]"

    # SQL: soft-filter by credit score (eligible first, then closest matches),
    # always return results so C/D users still see options with eligibility info.
    sql = text("""
        SELECT
            id, loan_name_fa, bank_name_fa, max_amount, interest_rate,
            has_guarantor, calculation_method, credit_ratings, extra_meta,
            min_credit_score,
            embedding <=> CAST(:vec AS vector) AS distance,
            CASE WHEN min_credit_score IS NULL OR min_credit_score <= :score
                 THEN 1 ELSE 0 END AS eligible
        FROM loan_chunks
        WHERE (:no_guarantor = false OR has_guarantor = false)
        ORDER BY eligible DESC, distance
        LIMIT 5
    """)

    try:
        rows = db.execute(sql, {
            "vec": vec_str,
            "score": credit_score,
            "no_guarantor": no_guarantor,
        }).fetchall()
    except Exception as e:
        logger.error("Vector search failed: %s", e)
        return json.dumps({"error": "Vector search failed. Ensure loan_chunks table is populated."}, ensure_ascii=False)

    if not rows:
        return json.dumps({
            "results": [],
            "message": (
                f"هیچ وامی برای رتبه اعتباری {sub_tier} (امتیاز {credit_score}) یافت نشد. "
                "ممکن است جدول loan_chunks هنوز پر نشده باشد."
            ),
        }, ensure_ascii=False)

    results = []
    for row in rows:
        extra = row.extra_meta or {}
        is_eligible = bool(row.eligible)
        # Eligible loans get full relevance; ineligible loans are penalized
        base_score = round(1 - float(row.distance), 3)
        relevance = base_score if is_eligible else round(base_score * 0.4, 3)
        results.append({
            "chunk_id": row.id,
            "loan_name_fa": row.loan_name_fa,
            "bank_name_fa": row.bank_name_fa,
            "max_amount_million": float(row.max_amount) if row.max_amount else None,
            "interest_rate_pct": float(row.interest_rate) if row.interest_rate else None,
            "has_guarantor": row.has_guarantor,
            "calculation_method": row.calculation_method,
            "accepted_credit_ratings": row.credit_ratings,
            "loan_name_en": extra.get("loan_en", ""),
            "bank_name_en": extra.get("bank_en", ""),
            "features": extra.get("features", [])[:5],
            "repayment_periods_months": extra.get("repayment_periods", []),
            "relevance_score": relevance,
            "eligible": is_eligible,
            "min_required_score": row.min_credit_score,
        })

    return json.dumps({
        "credit_score": credit_score,
        "credit_sub_tier": sub_tier,
        "no_guarantor_filter": no_guarantor,
        "count": len(results),
        "results": results,
    }, ensure_ascii=False)


# ── Dispatch map ──────────────────────────────────────────────────────────────

TOOL_DISPATCH = {
    "search_loan_products": search_loan_products,
    "get_loan_details": get_loan_details,
    "list_banks": list_banks,
    "calculate_loan_installment": calculate_loan_installment,
    "persian_loan_rag_search": persian_loan_rag_search,
}
