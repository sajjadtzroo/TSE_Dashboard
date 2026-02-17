"""
Banks Schemas (Pydantic Models)

Strict validation for bank and loan-type data, with camelCase aliases
for API compatibility and OpenAPI examples.
"""

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.common.validators.field_validators import (
    validate_min_max_range,
    validate_persian_text,
    validate_url,
)


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class BankType(str, Enum):
    TRADITIONAL = "traditional"
    DIGITAL = "digital"
    NEOBANK = "neobank"


class BankCategory(str, Enum):
    TRADITIONAL_BANKS = "traditional-banks"
    DIGITAL_BANKS = "digital-banks"


class LoanCalculationMethod(str, Enum):
    POINTS_BASED = "points-based"
    AVERAGE_BASED = "average-based"
    STEP_BASED = "step-based"
    DEPOSIT_BASED = "deposit-based"
    SALARY_BASED = "salary-based"
    POS_BASED = "pos-based"
    COLLATERAL_BASED = "collateral-based"


# ---------------------------------------------------------------------------
# Loan Tier
# ---------------------------------------------------------------------------

class LoanTierSchema(BaseModel):
    """Single tier in a points-based or step-based loan."""

    model_config = ConfigDict(populate_by_name=True)

    amount: str = Field(..., min_length=1, description="Loan amount for this tier")
    repayment: Optional[str] = Field(None, description="Repayment amount/description")
    points_required: Optional[int] = Field(
        None,
        alias="pointsRequired",
        ge=0,
        description="Minimum points required for this tier",
    )
    monthly_payment: Optional[str] = Field(
        None, alias="monthlyPayment", description="Monthly payment amount"
    )


# ---------------------------------------------------------------------------
# Loan Type
# ---------------------------------------------------------------------------

class LoanTypeSchema(BaseModel):
    """
    A single loan product offered by a bank.

    Required fields: id, nameFA, nameEN.
    Numeric fields carry range constraints and a cross-field min<max check.
    """

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "examples": [
                {
                    "id": "general-loan",
                    "nameFA": "\u0648\u0627\u0645 \u0639\u0645\u0648\u0645\u06cc",
                    "nameEN": "General Loan",
                    "category": "general",
                    "minAmount": "10000000",
                    "maxAmount": "500000000",
                    "interestRate": "18%",
                    "repaymentPeriod": "60 \u0645\u0627\u0647",
                    "guarantor": True,
                    "interestRateNumeric": 18.0,
                    "minAmountNumeric": 10000000,
                    "maxAmountNumeric": 500000000,
                }
            ]
        },
    )

    # --- Required fields ---
    id: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Unique loan-type identifier",
    )
    name_fa: str = Field(
        ...,
        alias="nameFA",
        min_length=1,
        max_length=200,
        description="Loan name in Persian (Farsi)",
    )
    name_en: str = Field(
        ...,
        alias="nameEN",
        min_length=1,
        max_length=200,
        description="Loan name in English",
    )

    # --- Optional descriptive fields ---
    category: Optional[str] = Field(None, max_length=100, description="Loan category")
    category_fa: Optional[str] = Field(
        None, alias="categoryFA", max_length=100, description="Loan category in Persian"
    )
    min_amount: Optional[str] = Field(None, alias="minAmount", description="Minimum loan amount (display)")
    max_amount: Optional[str] = Field(None, alias="maxAmount", description="Maximum loan amount (display)")
    interest_rate: Optional[str] = Field(None, alias="interestRate", description="Interest rate (display)")
    repayment_period: Optional[str] = Field(None, alias="repaymentPeriod", description="Repayment period (display)")
    guarantor: Optional[bool] = Field(None, description="Whether a guarantor is required")
    requirements: Optional[List[str]] = Field(None, description="List of requirements")
    description: Optional[str] = Field(None, description="Free-text description")

    # --- Numeric (computed) fields with constraints ---
    min_amount_numeric: Optional[float] = Field(
        None,
        alias="minAmountNumeric",
        ge=0,
        description="Minimum loan amount as a number",
    )
    max_amount_numeric: Optional[float] = Field(
        None,
        alias="maxAmountNumeric",
        ge=0,
        description="Maximum loan amount as a number",
    )
    interest_rate_numeric: Optional[float] = Field(
        None,
        alias="interestRateNumeric",
        ge=0,
        le=100,
        description="Interest rate as a percentage (0-100)",
    )

    # --- Deposit Calculator Fields ---
    loan_multiplier: Optional[str] = Field(None, alias="loanMultiplier")
    loan_multiplier_fa: Optional[str] = Field(None, alias="loanMultiplierFA")
    coefficient_table: Optional[List[Dict[str, Any]]] = Field(None, alias="coefficientTable")
    deposit_amount_one_month: Optional[str] = Field(None, alias="depositAmountOneMonth")
    deposit_amount_three_months: Optional[str] = Field(None, alias="depositAmountThreeMonths")
    deposit_amount_six_months: Optional[str] = Field(None, alias="depositAmountSixMonths")
    average_balance_required: Optional[str] = Field(None, alias="averageBalanceRequired")

    # --- Credit Rating Matrix ---
    credit_rating_requirements: Optional[Dict[str, Any]] = Field(None, alias="creditRatingRequirements")
    guarantor_requirements: Optional[Dict[str, Any]] = Field(None, alias="guarantorRequirements")

    # --- Fee Structure ---
    deposit_fee: Optional[str] = Field(None, alias="depositFee")
    fee_by_duration: Optional[Dict[str, str]] = Field(None, alias="feeByDuration")
    fee_structure: Optional[Dict[str, Any]] = Field(None, alias="feeStructure")

    # --- Credit Rating Fields ---
    borrower_credit_rating: Optional[List[str]] = Field(None, alias="borrowerCreditRating")
    guarantor_credit_rating: Optional[List[str]] = Field(None, alias="guarantorCreditRating")
    minimum_credit_score: Optional[str] = Field(None, alias="minimumCreditScore")

    # --- Deposit Ratio Fields ---
    deposit_to_facility_ratio: Optional[str] = Field(None, alias="depositToFacilityRatio")
    deposit_ratio_percentage: Optional[str] = Field(None, alias="depositRatioPercentage")

    # -- Field validators --

    @field_validator("name_fa")
    @classmethod
    def _validate_name_fa_persian(cls, v: str) -> str:
        """Ensure nameFA contains Persian characters."""
        return validate_persian_text(v)

    @field_validator("interest_rate_numeric")
    @classmethod
    def _validate_interest_rate(cls, v: Optional[float]) -> Optional[float]:
        """Double-check interest rate bounds (ge/le on Field already enforces this,
        but this gives a clearer error message)."""
        if v is not None and (v < 0 or v > 100):
            raise ValueError("Interest rate must be between 0 and 100")
        return v

    # -- Model-level validators --

    @model_validator(mode="after")
    def _validate_amount_range(self) -> "LoanTypeSchema":
        """Ensure max_amount_numeric >= min_amount_numeric."""
        validate_min_max_range(
            self.min_amount_numeric,
            self.max_amount_numeric,
            min_field="minAmountNumeric",
            max_field="maxAmountNumeric",
        )
        return self


# ---------------------------------------------------------------------------
# Scoring System
# ---------------------------------------------------------------------------

class ScoringSystemSchema(BaseModel):
    """Bank scoring / points system metadata."""

    model_config = ConfigDict(populate_by_name=True)

    formula: Optional[str] = Field(None, description="Scoring formula")
    formula_fa: Optional[str] = Field(None, alias="formulaFA", description="Scoring formula in Persian")
    point_purchase: Optional[bool] = Field(None, alias="pointPurchase")
    point_transfer: Optional[bool] = Field(None, alias="pointTransfer")
    max_loan: Optional[str] = Field(None, alias="maxLoan")


# ---------------------------------------------------------------------------
# Special Features
# ---------------------------------------------------------------------------

class BankSpecialFeaturesSchema(BaseModel):
    """Special features or programs offered by a bank."""

    model_config = ConfigDict(populate_by_name=True)

    invitation_based: Optional[bool] = Field(None, alias="invitationBased")
    points_system: Optional[Dict[str, Any]] = Field(None, alias="pointsSystem")
    special_programs: Optional[List[str]] = Field(None, alias="specialPrograms")
    loyalty_benefits: Optional[Dict[str, Any]] = Field(None, alias="loyaltyBenefits")


# ---------------------------------------------------------------------------
# Bank Requirements
# ---------------------------------------------------------------------------

class BankRequirementsSchema(BaseModel):
    """Requirements a borrower must meet for a bank's loans."""

    model_config = ConfigDict(populate_by_name=True)

    guarantor: Optional[bool] = None
    check: Optional[bool] = None
    promissory_note: Optional[bool] = Field(None, alias="promissoryNote")
    credit_rating: Optional[List[str]] = Field(None, alias="creditRating")
    no_bad_checks: Optional[bool] = Field(None, alias="noBadChecks")
    no_overdue_debts: Optional[bool] = Field(None, alias="noOverdueDebts")

    # Credit Rating Fields
    borrower_credit_rating: Optional[List[str]] = Field(None, alias="borrowerCreditRating")
    guarantor_credit_rating: Optional[List[str]] = Field(None, alias="guarantorCreditRating")
    minimum_credit_score: Optional[str] = Field(None, alias="minimumCreditScore")
    credit_check_required: Optional[bool] = Field(None, alias="creditCheckRequired")

    # Deposit Ratio Fields
    deposit_to_facility_ratio: Optional[str] = Field(None, alias="depositToFacilityRatio")
    deposit_ratio_percentage: Optional[str] = Field(None, alias="depositRatioPercentage")
    minimum_deposit_amount: Optional[str] = Field(None, alias="minimumDepositAmount")
    deposit_duration_required: Optional[str] = Field(None, alias="depositDurationRequired")


# ---------------------------------------------------------------------------
# Bank Base
# ---------------------------------------------------------------------------

class BankBase(BaseModel):
    """
    Core bank identity fields shared by create, update, and response schemas.

    Required fields: id, nameFA, nameEN, category.
    """

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "examples": [
                {
                    "id": "bank-melli",
                    "nameFA": "\u0628\u0627\u0646\u06a9 \u0645\u0644\u06cc",
                    "nameEN": "Bank Melli",
                    "category": "traditional-banks",
                    "type": "traditional",
                    "website": "https://bmi.ir",
                }
            ]
        },
    )

    id: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Unique bank identifier (slug)",
    )
    name_fa: str = Field(
        ...,
        alias="nameFA",
        min_length=1,
        max_length=200,
        description="Bank name in Persian",
    )
    name_en: str = Field(
        ...,
        alias="nameEN",
        min_length=1,
        max_length=200,
        description="Bank name in English",
    )
    category: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Bank category (must be a valid BankCategory value)",
    )
    type: Optional[str] = Field(
        None, max_length=50, description="Bank type (traditional, digital, neobank)"
    )
    website: Optional[str] = Field(None, description="Bank website URL")

    # -- Validators --

    @field_validator("name_fa")
    @classmethod
    def _validate_name_fa(cls, v: str) -> str:
        return validate_persian_text(v)

    @field_validator("category")
    @classmethod
    def _validate_category(cls, v: str) -> str:
        valid = [c.value for c in BankCategory]
        if v not in valid:
            raise ValueError(
                f"Invalid category '{v}'. Must be one of: {', '.join(valid)}"
            )
        return v

    @field_validator("website")
    @classmethod
    def _validate_website(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v.strip():
            return validate_url(v)
        return v


# ---------------------------------------------------------------------------
# Bank Create
# ---------------------------------------------------------------------------

class BankCreate(BankBase):
    """
    Schema for creating a new bank.

    Inherits required fields from BankBase. All additional fields are optional
    because they may be populated later or sourced from external data.
    """

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "examples": [
                {
                    "id": "bank-test",
                    "nameFA": "\u0628\u0627\u0646\u06a9 \u062a\u0633\u062a",
                    "nameEN": "Test Bank",
                    "category": "traditional-banks",
                    "type": "traditional",
                    "website": "https://example.com",
                    "loanTypes": [
                        {
                            "id": "loan-1",
                            "nameFA": "\u0648\u0627\u0645 \u0639\u0645\u0648\u0645\u06cc",
                            "nameEN": "General Loan",
                            "interestRate": "18%",
                            "maxAmount": "500000000",
                        }
                    ],
                }
            ]
        },
    )

    parent_bank: Optional[str] = Field(None, alias="parentBank")
    description: Optional[str] = None
    description_fa: Optional[str] = Field(None, alias="descriptionFA")
    loan_types: Optional[List[LoanTypeSchema]] = Field(
        None,
        alias="loanTypes",
        description="List of loan products offered by this bank",
    )
    scoring_system: Optional[ScoringSystemSchema] = Field(None, alias="scoringSystem")
    loan_tiers: Optional[List[LoanTierSchema]] = Field(None, alias="loanTiers")
    requirements: Optional[BankRequirementsSchema] = None
    special_features: Optional[BankSpecialFeaturesSchema] = Field(
        None, alias="specialFeatures"
    )
    loans: Optional[List[str]] = Field(default_factory=list)
    loans_count: Optional[int] = Field(0, alias="loansCount", ge=0)

    @field_validator("loan_types")
    @classmethod
    def _validate_loan_types_not_empty(
        cls, v: Optional[List[LoanTypeSchema]]
    ) -> Optional[List[LoanTypeSchema]]:
        """If loan_types is provided it must not be an empty list."""
        if v is not None and len(v) == 0:
            raise ValueError("loanTypes must contain at least one item when provided")
        return v

    @field_validator("loan_types")
    @classmethod
    def _validate_loan_types_unique_ids(
        cls, v: Optional[List[LoanTypeSchema]]
    ) -> Optional[List[LoanTypeSchema]]:
        """Loan type IDs must be unique within a bank."""
        if v is not None:
            ids = [lt.id for lt in v]
            if len(ids) != len(set(ids)):
                raise ValueError("Duplicate loan type IDs found in loanTypes")
        return v


# ---------------------------------------------------------------------------
# Bank Update (partial)
# ---------------------------------------------------------------------------

class BankUpdate(BaseModel):
    """
    Schema for partially updating a bank.

    Every field is optional so the caller can send only the fields they want
    to change. Validation still runs on any provided value.
    """

    model_config = ConfigDict(populate_by_name=True)

    name_fa: Optional[str] = Field(
        None, alias="nameFA", min_length=1, max_length=200
    )
    name_en: Optional[str] = Field(
        None, alias="nameEN", min_length=1, max_length=200
    )
    category: Optional[str] = Field(None, max_length=100)
    type: Optional[str] = Field(None, max_length=50)
    website: Optional[str] = None
    parent_bank: Optional[str] = Field(None, alias="parentBank")
    description: Optional[str] = None
    description_fa: Optional[str] = Field(None, alias="descriptionFA")
    loan_types: Optional[List[LoanTypeSchema]] = Field(None, alias="loanTypes")
    scoring_system: Optional[ScoringSystemSchema] = Field(None, alias="scoringSystem")
    loan_tiers: Optional[List[LoanTierSchema]] = Field(None, alias="loanTiers")
    requirements: Optional[BankRequirementsSchema] = None
    special_features: Optional[BankSpecialFeaturesSchema] = Field(
        None, alias="specialFeatures"
    )
    loans: Optional[List[str]] = None
    loans_count: Optional[int] = Field(None, alias="loansCount", ge=0)

    @field_validator("name_fa")
    @classmethod
    def _validate_name_fa(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return validate_persian_text(v)
        return v

    @field_validator("category")
    @classmethod
    def _validate_category(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            valid = [c.value for c in BankCategory]
            if v not in valid:
                raise ValueError(
                    f"Invalid category '{v}'. Must be one of: {', '.join(valid)}"
                )
        return v

    @field_validator("website")
    @classmethod
    def _validate_website(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v.strip():
            return validate_url(v)
        return v


# ---------------------------------------------------------------------------
# Bank Response
# ---------------------------------------------------------------------------

class BankResponse(BankBase):
    """Full bank representation returned by the API."""

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
    )

    parent_bank: Optional[str] = Field(None, alias="parentBank")
    parent_bank_fa: Optional[str] = Field(None, alias="parentBankFA")
    description: Optional[str] = None
    description_fa: Optional[str] = Field(None, alias="descriptionFA")
    loan_types: Optional[List[Dict[str, Any]]] = Field(None, alias="loanTypes")
    scoring_system: Optional[Dict[str, Any]] = Field(None, alias="scoringSystem")
    loan_tiers: Optional[List[Dict[str, Any]]] = Field(None, alias="loanTiers")
    requirements: Optional[Dict[str, Any]] = None
    special_features: Optional[Dict[str, Any]] = Field(None, alias="specialFeatures")
    loans: Optional[List[str]] = Field(default_factory=list)
    loans_count: Optional[int] = Field(0, alias="loansCount", ge=0)
    calculation_method: Optional[str] = Field(None, alias="calculationMethod")
    last_updated: Optional[str] = Field(None, alias="lastUpdated")


# ---------------------------------------------------------------------------
# Bank Summary (list views)
# ---------------------------------------------------------------------------

class BankSummary(BaseModel):
    """Lightweight bank representation for list/search views."""

    model_config = ConfigDict(populate_by_name=True)

    id: str
    name_fa: str = Field(..., alias="nameFA")
    name_en: str = Field(..., alias="nameEN")
    category: str
    type: Optional[str] = None
    loans_count: int = Field(0, alias="loansCount", ge=0)
    calculation_method: Optional[str] = Field(None, alias="calculationMethod")


# ---------------------------------------------------------------------------
# Bank List Response
# ---------------------------------------------------------------------------

class BankListResponse(BaseModel):
    """Paginated list of bank summaries."""

    total: int = Field(..., ge=0, description="Total number of banks matching the query")
    banks: List[BankSummary]
