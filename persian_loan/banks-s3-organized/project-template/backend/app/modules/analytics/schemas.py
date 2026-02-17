"""
Analytics Schemas
"""

from typing import Any, Dict, List

from pydantic import BaseModel, Field


class SummaryResponse(BaseModel):
    """Summary statistics response."""

    total_banks: int = Field(..., alias="totalBanks")
    traditional_banks: int = Field(..., alias="traditionalBanks")
    digital_banks: int = Field(..., alias="digitalBanks")
    total_loans: int = Field(..., alias="totalLoans")
    no_guarantor_loans: int = Field(..., alias="noGuarantorLoans")
    calculation_methods: Dict[str, int] = Field(..., alias="calculationMethods")

    class Config:
        populate_by_name = True


class BankCategoryItem(BaseModel):
    """Bank item in category."""

    id: str
    name_fa: str = Field(..., alias="nameFA")
    name_en: str = Field(..., alias="nameEN")
    loans_count: int = Field(..., alias="loansCount")

    class Config:
        populate_by_name = True


class InterestRateItem(BaseModel):
    """Interest rate distribution item."""

    bank_id: str = Field(..., alias="bankId")
    bank_name_fa: str = Field(..., alias="bankNameFA")
    loan_id: str = Field(..., alias="loanId")
    loan_name_fa: str = Field(..., alias="loanNameFA")
    interest_rate: str = Field(..., alias="interestRate")

    class Config:
        populate_by_name = True


class LoanAmountRange(BaseModel):
    """Loan amount range."""

    loan_id: str = Field(..., alias="loanId")
    loan_name_fa: str = Field(..., alias="loanNameFA")
    min_amount: str | None = Field(None, alias="minAmount")
    max_amount: str | None = Field(None, alias="maxAmount")

    class Config:
        populate_by_name = True


class BankAmounts(BaseModel):
    """Bank loan amounts."""

    bank_id: str = Field(..., alias="bankId")
    bank_name_fa: str = Field(..., alias="bankNameFA")
    bank_category: str = Field(..., alias="bankCategory")
    loans: List[LoanAmountRange]

    class Config:
        populate_by_name = True


class RequirementsMatrixItem(BaseModel):
    """Requirements matrix item."""

    bank_id: str = Field(..., alias="bankId")
    bank_name_fa: str = Field(..., alias="bankNameFA")
    category: str
    requirements: Dict[str, Any]

    class Config:
        populate_by_name = True


class ByCategoryResponse(BaseModel):
    """Banks by category response."""

    traditional_banks: List[BankCategoryItem] = Field(default_factory=list, alias="traditional-banks")
    digital_banks: List[BankCategoryItem] = Field(default_factory=list, alias="digital-banks")

    class Config:
        populate_by_name = True


class InterestRatesResponse(BaseModel):
    """Interest rate distribution response."""

    distribution: List[InterestRateItem]
    avg_rate: str = Field(..., alias="avgRate")
    min_rate: str = Field(..., alias="minRate")
    max_rate: str = Field(..., alias="maxRate")

    class Config:
        populate_by_name = True


class LoanAmountsResponse(BaseModel):
    """Loan amounts response."""

    banks: List[BankAmounts]
    total_banks: int = Field(..., alias="totalBanks")

    class Config:
        populate_by_name = True


class RequirementsMatrixResponse(BaseModel):
    """Requirements matrix response."""

    matrix: List[RequirementsMatrixItem]
    total_banks: int = Field(..., alias="totalBanks")

    class Config:
        populate_by_name = True
