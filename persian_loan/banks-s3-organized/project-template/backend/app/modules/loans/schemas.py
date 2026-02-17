"""
Loans Schemas

Strict validation for loan summary, comparison, and search models
with camelCase aliases for API compatibility and OpenAPI examples.
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


# ---------------------------------------------------------------------------
# Loan Summary
# ---------------------------------------------------------------------------

class LoanSummary(BaseModel):
    """
    Flat loan summary used in search/list results.

    Required fields: bankId, bankNameFA.
    """

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "examples": [
                {
                    "bankId": "bank-melli",
                    "bankNameFA": "\u0628\u0627\u0646\u06a9 \u0645\u0644\u06cc",
                    "bankNameEN": "Bank Melli",
                    "bankCategory": "traditional-banks",
                    "loanId": "general-loan",
                    "loanNameFA": "\u0648\u0627\u0645 \u0639\u0645\u0648\u0645\u06cc",
                    "loanNameEN": "General Loan",
                    "maxAmount": "500000000",
                    "interestRate": "18%",
                    "repaymentPeriod": "60 \u0645\u0627\u0647",
                    "guarantor": True,
                    "calculationMethod": "points-based",
                }
            ]
        },
    )

    # Required
    bank_id: str = Field(
        ...,
        alias="bankId",
        min_length=1,
        description="Bank identifier that offers this loan",
    )
    bank_name_fa: str = Field(
        ...,
        alias="bankNameFA",
        min_length=1,
        description="Bank name in Persian",
    )

    # Optional
    bank_name_en: Optional[str] = Field(None, alias="bankNameEN")
    bank_category: Optional[str] = Field(None, alias="bankCategory")
    loan_id: Optional[str] = Field(None, alias="loanId")
    loan_name_fa: Optional[str] = Field(None, alias="loanNameFA")
    loan_name_en: Optional[str] = Field(None, alias="loanNameEN")
    max_amount: Optional[str] = Field(None, alias="maxAmount")
    min_amount: Optional[str] = Field(None, alias="minAmount")
    interest_rate: Optional[str] = Field(None, alias="interestRate")
    repayment_period: Optional[str] = Field(None, alias="repaymentPeriod")
    guarantor: Optional[bool] = Field(None, description="Whether a guarantor is required")
    calculation_method: Optional[str] = Field(None, alias="calculationMethod")

    # Numeric helpers (used for filtering / sorting)
    interest_rate_numeric: Optional[float] = Field(
        None, alias="interestRateNumeric", ge=0, le=100,
        description="Numeric interest rate for filtering (0-100)",
    )
    min_amount_numeric: Optional[float] = Field(
        None, alias="minAmountNumeric", ge=0,
        description="Numeric minimum amount for filtering",
    )
    max_amount_numeric: Optional[float] = Field(
        None, alias="maxAmountNumeric", ge=0,
        description="Numeric maximum amount for filtering",
    )

    @model_validator(mode="after")
    def _validate_amount_range(self) -> "LoanSummary":
        """max_amount_numeric must be >= min_amount_numeric when both present."""
        if (
            self.min_amount_numeric is not None
            and self.max_amount_numeric is not None
            and self.max_amount_numeric < self.min_amount_numeric
        ):
            raise ValueError(
                "maxAmountNumeric must be >= minAmountNumeric"
            )
        return self


# ---------------------------------------------------------------------------
# Loan List Response
# ---------------------------------------------------------------------------

class LoanListResponse(BaseModel):
    """Paginated list of loans."""

    total: int = Field(..., ge=0, description="Total number of loans matching the query")
    items: List[Dict[str, Any]] = Field(
        ..., description="List of loan documents"
    )


# ---------------------------------------------------------------------------
# Loan Compare
# ---------------------------------------------------------------------------

class LoanCompareRequest(BaseModel):
    """
    Request body for comparing multiple loans side by side.

    At least two loan IDs must be provided, up to a maximum of 10.
    """

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "examples": [
                {
                    "loanIds": [
                        "bank-melli:general-loan",
                        "digikala-finance:deposit-loan",
                    ]
                }
            ]
        },
    )

    loan_ids: List[str] = Field(
        ...,
        alias="loanIds",
        min_length=2,
        max_length=10,
        description="List of loan identifiers to compare (2-10)",
    )

    @field_validator("loan_ids")
    @classmethod
    def _validate_unique_ids(cls, v: List[str]) -> List[str]:
        if len(v) != len(set(v)):
            raise ValueError("Duplicate loan IDs are not allowed in comparison")
        return v


class LoanCompareResponse(BaseModel):
    """Side-by-side loan comparison result."""

    model_config = ConfigDict(populate_by_name=True)

    comparison: List[Dict[str, Any]] = Field(
        ..., description="Comparison data for each loan"
    )
    total_compared: int = Field(
        ...,
        alias="totalCompared",
        ge=0,
        description="Number of loans compared",
    )


# ---------------------------------------------------------------------------
# Loan Search / Filter Parameters (used as query model)
# ---------------------------------------------------------------------------

class LoanSearchParams(BaseModel):
    """
    Query parameters for searching / filtering loans.

    All fields are optional filters.
    """

    model_config = ConfigDict(populate_by_name=True)

    bank_id: Optional[str] = Field(None, alias="bankId", description="Filter by bank ID")
    bank_category: Optional[str] = Field(None, alias="bankCategory", description="Filter by bank category")
    calculation_method: Optional[str] = Field(
        None, alias="calculationMethod", description="Filter by calculation method"
    )
    guarantor: Optional[bool] = Field(None, description="Filter by guarantor requirement")
    min_interest_rate: Optional[float] = Field(
        None, alias="minInterestRate", ge=0, le=100,
        description="Minimum interest rate filter",
    )
    max_interest_rate: Optional[float] = Field(
        None, alias="maxInterestRate", ge=0, le=100,
        description="Maximum interest rate filter",
    )
    min_loan_amount: Optional[float] = Field(
        None, alias="minLoanAmount", ge=0,
        description="Minimum loan amount filter",
    )
    max_loan_amount: Optional[float] = Field(
        None, alias="maxLoanAmount", ge=0,
        description="Maximum loan amount filter",
    )
    search: Optional[str] = Field(
        None, max_length=200, description="Free-text search (name, description)"
    )

    @model_validator(mode="after")
    def _validate_ranges(self) -> "LoanSearchParams":
        """Ensure min <= max for interest rate and amount filters."""
        if (
            self.min_interest_rate is not None
            and self.max_interest_rate is not None
            and self.min_interest_rate > self.max_interest_rate
        ):
            raise ValueError("minInterestRate must be <= maxInterestRate")
        if (
            self.min_loan_amount is not None
            and self.max_loan_amount is not None
            and self.min_loan_amount > self.max_loan_amount
        ):
            raise ValueError("minLoanAmount must be <= maxLoanAmount")
        return self
