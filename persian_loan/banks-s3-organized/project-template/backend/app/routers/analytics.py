"""
Analytics Router
"""

from fastapi import APIRouter
from app.database import get_banks_collection

router = APIRouter()


@router.get("/summary")
async def get_summary():
    """Get overall summary statistics."""
    collection = get_banks_collection()
    cursor = collection.find({})
    banks = await cursor.to_list(length=100)

    total_banks = len(banks)
    traditional_banks = sum(1 for b in banks if b.get("category") == "traditional-banks")
    digital_banks = sum(1 for b in banks if b.get("category") == "digital-banks")

    total_loans = sum(b.get("loansCount", 0) for b in banks)

    # Count by calculation method
    methods = {}
    for bank in banks:
        method = bank.get("calculationMethod", "unknown")
        methods[method] = methods.get(method, 0) + 1

    # Count no-guarantor loans
    no_guarantor_count = 0
    for bank in banks:
        bank_req = bank.get("requirements", {})
        if bank_req.get("guarantor") == False:
            no_guarantor_count += bank.get("loansCount", 0)
        else:
            for loan in bank.get("loanTypes", []):
                if loan.get("guarantor") == False:
                    no_guarantor_count += 1

    return {
        "totalBanks": total_banks,
        "traditionalBanks": traditional_banks,
        "digitalBanks": digital_banks,
        "totalLoans": total_loans,
        "noGuarantorLoans": no_guarantor_count,
        "calculationMethods": methods
    }


@router.get("/by-category")
async def get_banks_by_category():
    """Get banks grouped by category."""
    collection = get_banks_collection()
    cursor = collection.find({})
    banks = await cursor.to_list(length=100)

    categories = {}
    for bank in banks:
        cat = bank.get("category", "unknown")
        if cat not in categories:
            categories[cat] = []
        categories[cat].append({
            "id": bank["id"],
            "nameFA": bank.get("nameFA"),
            "nameEN": bank.get("nameEN"),
            "loansCount": bank.get("loansCount", 0)
        })

    return categories


@router.get("/interest-rates")
async def get_interest_rates_distribution():
    """Get interest rates distribution across banks."""
    collection = get_banks_collection()
    cursor = collection.find({})
    banks = await cursor.to_list(length=100)

    rates = []
    for bank in banks:
        for loan in bank.get("loanTypes", []):
            rate = loan.get("interestRate")
            if rate:
                rates.append({
                    "bankId": bank["id"],
                    "bankNameFA": bank.get("nameFA"),
                    "loanId": loan.get("id"),
                    "loanNameFA": loan.get("nameFA"),
                    "interestRate": rate
                })

    # Group by rate
    rate_groups = {}
    for r in rates:
        rate_str = r["interestRate"]
        if rate_str not in rate_groups:
            rate_groups[rate_str] = []
        rate_groups[rate_str].append(r)

    return {
        "total": len(rates),
        "distribution": rate_groups
    }


@router.get("/loan-amounts")
async def get_loan_amounts_range():
    """Get loan amounts range for each bank."""
    collection = get_banks_collection()
    cursor = collection.find({})
    banks = await cursor.to_list(length=100)

    amounts = []
    for bank in banks:
        bank_amounts = {
            "bankId": bank["id"],
            "bankNameFA": bank.get("nameFA"),
            "bankCategory": bank.get("category"),
            "loans": []
        }

        for loan in bank.get("loanTypes", []):
            min_amt = loan.get("minAmount")
            max_amt = loan.get("maxAmount")
            if min_amt or max_amt:
                bank_amounts["loans"].append({
                    "loanId": loan.get("id"),
                    "loanNameFA": loan.get("nameFA"),
                    "minAmount": min_amt,
                    "maxAmount": max_amt
                })

        if bank_amounts["loans"]:
            amounts.append(bank_amounts)

    return amounts


@router.get("/requirements-matrix")
async def get_requirements_matrix():
    """Get requirements matrix for all banks."""
    collection = get_banks_collection()
    cursor = collection.find({})
    banks = await cursor.to_list(length=100)

    matrix = []
    for bank in banks:
        bank_req = bank.get("requirements", {})
        general_req = bank.get("generalRequirements", {})

        matrix.append({
            "bankId": bank["id"],
            "bankNameFA": bank.get("nameFA"),
            "category": bank.get("category"),
            "requirements": {
                "guarantor": bank_req.get("guarantor", general_req.get("guarantor")),
                "check": bank_req.get("check", general_req.get("check")),
                "promissoryNote": bank_req.get("promissoryNote"),
                "creditRating": bank_req.get("creditRating", general_req.get("creditRating")),
                "noBadChecks": bank_req.get("noBadChecks"),
                "noOverdueDebts": bank_req.get("noOverdueDebts"),
                "onlineCreditCheck": general_req.get("onlineCreditCheck")
            }
        })

    return matrix
