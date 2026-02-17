"""
Loans Router
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from app.database import get_banks_collection

router = APIRouter()


@router.get("/")
async def get_all_loans(
    no_guarantor: Optional[bool] = Query(None, description="Filter loans without guarantor"),
    max_amount: Optional[int] = Query(None, description="Filter by max loan amount (in million toman)"),
    calculation_method: Optional[str] = Query(None, description="Filter by calculation method")
):
    """Get all loans across all banks with optional filtering."""
    collection = get_banks_collection()
    cursor = collection.find({})
    banks = await cursor.to_list(length=100)

    all_loans = []
    for bank in banks:
        bank_id = bank["id"]
        bank_name_fa = bank.get("nameFA", "")
        bank_name_en = bank.get("nameEN", "")
        bank_category = bank.get("category", "")

        loan_types = bank.get("loanTypes", [])
        for loan in loan_types:
            loan_data = {
                "bankId": bank_id,
                "bankNameFA": bank_name_fa,
                "bankNameEN": bank_name_en,
                "bankCategory": bank_category,
                **loan
            }

            # Apply filters
            if no_guarantor is not None:
                loan_guarantor = loan.get("guarantor", True)
                if no_guarantor and loan_guarantor:
                    continue
                if not no_guarantor and not loan_guarantor:
                    continue

            all_loans.append(loan_data)

    return {
        "total": len(all_loans),
        "loans": all_loans
    }


@router.get("/no-guarantor")
async def get_no_guarantor_loans():
    """Get all loans that don't require a guarantor."""
    collection = get_banks_collection()
    cursor = collection.find({})
    banks = await cursor.to_list(length=100)

    no_guarantor_loans = []
    for bank in banks:
        bank_id = bank["id"]
        bank_name_fa = bank.get("nameFA", "")

        # Check bank-level requirements
        bank_requirements = bank.get("requirements", {})
        bank_no_guarantor = bank_requirements.get("guarantor", True) == False

        # Check loan types
        loan_types = bank.get("loanTypes", [])
        for loan in loan_types:
            loan_guarantor = loan.get("guarantor")
            if loan_guarantor == False or (loan_guarantor is None and bank_no_guarantor):
                no_guarantor_loans.append({
                    "bankId": bank_id,
                    "bankNameFA": bank_name_fa,
                    "loanId": loan.get("id"),
                    "loanNameFA": loan.get("nameFA"),
                    "loanNameEN": loan.get("nameEN"),
                    "maxAmount": loan.get("maxAmount"),
                    "interestRate": loan.get("interestRate"),
                    "repaymentPeriod": loan.get("repaymentPeriod")
                })

    return {
        "total": len(no_guarantor_loans),
        "loans": no_guarantor_loans
    }


@router.get("/by-method/{method}")
async def get_loans_by_calculation_method(method: str):
    """Get loans by calculation method."""
    valid_methods = [
        "points-based", "average-based", "step-based",
        "deposit-based", "salary-based", "pos-based", "collateral-based"
    ]

    if method not in valid_methods:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid method. Valid methods: {', '.join(valid_methods)}"
        )

    collection = get_banks_collection()

    # Find banks that use this calculation method
    cursor = collection.find({
        "$or": [
            {"calculationMethod": method},
            {"loanTypes.calculationMethod": method}
        ]
    })
    banks = await cursor.to_list(length=50)

    loans = []
    for bank in banks:
        bank_method = bank.get("calculationMethod")
        for loan in bank.get("loanTypes", []):
            loan_method = loan.get("calculationMethod", bank_method)
            if loan_method == method:
                loans.append({
                    "bankId": bank["id"],
                    "bankNameFA": bank.get("nameFA"),
                    "loanId": loan.get("id"),
                    "loanNameFA": loan.get("nameFA"),
                    "calculationMethod": method,
                    "maxAmount": loan.get("maxAmount"),
                    "interestRate": loan.get("interestRate")
                })

    return {
        "method": method,
        "total": len(loans),
        "loans": loans
    }


@router.get("/compare")
async def compare_loans(
    loan_ids: str = Query(..., description="Comma-separated list of loan IDs (format: bankId:loanId)")
):
    """Compare multiple loans side by side."""
    collection = get_banks_collection()

    loan_id_list = [lid.strip() for lid in loan_ids.split(",")]
    comparison = []

    for loan_id in loan_id_list:
        if ":" not in loan_id:
            continue

        bank_id, loan_name = loan_id.split(":", 1)
        bank = await collection.find_one({"id": bank_id})

        if not bank:
            continue

        for loan in bank.get("loanTypes", []):
            if loan.get("id") == loan_name:
                comparison.append({
                    "bankId": bank_id,
                    "bankNameFA": bank.get("nameFA"),
                    "bankNameEN": bank.get("nameEN"),
                    "loan": loan
                })
                break

    return {
        "total": len(comparison),
        "comparison": comparison
    }
