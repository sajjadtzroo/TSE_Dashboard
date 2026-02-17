"""
Analytics Service
"""

from typing import Any, Dict, List

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.logger import get_logger
from app.modules.analytics.repository import AnalyticsRepository

logger = get_logger(__name__)


class AnalyticsService:
    """Service for analytics business logic."""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.repository = AnalyticsRepository(db)

    async def get_summary(self) -> dict:
        """Get overall summary statistics."""
        banks = await self.repository.get_all_banks()

        total_banks = len(banks)
        traditional_banks = sum(
            1 for b in banks if b.get("category") == "traditional-banks"
        )
        digital_banks = sum(1 for b in banks if b.get("category") == "digital-banks")
        total_loans = sum(b.get("loansCount", 0) for b in banks)

        # Count by calculation method
        methods = await self.repository.get_calculation_method_distribution()

        # Count no-guarantor loans
        no_guarantor_count = 0
        for bank in banks:
            bank_req = bank.get("requirements", {})
            general_req = bank.get("generalRequirements", {})

            if bank_req.get("guarantor") is False or general_req.get("guarantor") is False:
                no_guarantor_count += bank.get("loansCount", 0)
            else:
                for loan in bank.get("loanTypes", []):
                    if loan.get("guarantor") is False:
                        no_guarantor_count += 1

        return {
            "totalBanks": total_banks,
            "traditionalBanks": traditional_banks,
            "digitalBanks": digital_banks,
            "totalLoans": total_loans,
            "noGuarantorLoans": no_guarantor_count,
            "calculationMethods": methods,
        }

    async def get_by_category(self) -> Dict[str, List[Dict]]:
        """Get banks grouped by category."""
        banks = await self.repository.get_all_banks()

        categories = {}
        for bank in banks:
            cat = bank.get("category", "unknown")
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(
                {
                    "id": bank["id"],
                    "nameFA": bank.get("nameFA"),
                    "nameEN": bank.get("nameEN"),
                    "loansCount": bank.get("loansCount", 0),
                }
            )

        return categories

    async def get_interest_rates(self) -> dict:
        """Get interest rates distribution."""
        banks = await self.repository.get_all_banks()

        rates = []
        numeric_rates = []

        for bank in banks:
            for loan in bank.get("loanTypes", []):
                rate = loan.get("interestRate")
                if rate:
                    rates.append(
                        {
                            "bankId": bank["id"],
                            "bankNameFA": bank.get("nameFA"),
                            "loanId": loan.get("id"),
                            "loanNameFA": loan.get("nameFA"),
                            "interestRate": rate,
                        }
                    )
                    # Try to convert to numeric for statistics
                    try:
                        numeric_rates.append(float(rate.replace("%", "").strip()))
                    except (ValueError, AttributeError):
                        pass

        # Calculate statistics
        if numeric_rates:
            avg_rate = f"{sum(numeric_rates) / len(numeric_rates):.2f}%"
            min_rate = f"{min(numeric_rates):.2f}%"
            max_rate = f"{max(numeric_rates):.2f}%"
        else:
            avg_rate = "0%"
            min_rate = "0%"
            max_rate = "0%"

        return {
            "distribution": rates,
            "avgRate": avg_rate,
            "minRate": min_rate,
            "maxRate": max_rate,
        }

    async def get_loan_amounts(self) -> dict:
        """Get loan amounts range for each bank."""
        banks = await self.repository.get_all_banks()

        amounts = []
        for bank in banks:
            bank_amounts = {
                "bankId": bank["id"],
                "bankNameFA": bank.get("nameFA"),
                "bankCategory": bank.get("category"),
                "loans": [],
            }

            for loan in bank.get("loanTypes", []):
                min_amt = loan.get("minAmount")
                max_amt = loan.get("maxAmount")
                if min_amt or max_amt:
                    bank_amounts["loans"].append(
                        {
                            "loanId": loan.get("id"),
                            "loanNameFA": loan.get("nameFA"),
                            "minAmount": min_amt,
                            "maxAmount": max_amt,
                        }
                    )

            if bank_amounts["loans"]:
                amounts.append(bank_amounts)

        return {"banks": amounts, "totalBanks": len(amounts)}

    async def get_requirements_matrix(self) -> dict:
        """Get requirements matrix for all banks."""
        banks = await self.repository.get_all_banks()

        matrix = []
        for bank in banks:
            bank_req = bank.get("requirements", {})
            general_req = bank.get("generalRequirements", {})

            matrix.append(
                {
                    "bankId": bank["id"],
                    "bankNameFA": bank.get("nameFA"),
                    "category": bank.get("category"),
                    "requirements": {
                        "guarantor": bank_req.get("guarantor", general_req.get("guarantor")),
                        "check": bank_req.get("check", general_req.get("check")),
                        "promissoryNote": bank_req.get("promissoryNote"),
                        "creditRating": bank_req.get(
                            "creditRating", general_req.get("creditRating")
                        ),
                        "noBadChecks": bank_req.get("noBadChecks"),
                        "noOverdueDebts": bank_req.get("noOverdueDebts"),
                        "onlineCreditCheck": general_req.get("onlineCreditCheck"),
                    },
                }
            )

        return {"matrix": matrix, "totalBanks": len(matrix)}
