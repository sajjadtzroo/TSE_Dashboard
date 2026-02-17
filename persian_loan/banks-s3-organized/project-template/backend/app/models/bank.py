"""
Bank Pydantic Models
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class BankType(str, Enum):
    TRADITIONAL = "traditional"
    DIGITAL = "digital"
    NEOBANK = "neobank"


class BankOwnership(str, Enum):
    STATE_OWNED = "state-owned"
    PRIVATE = "private"
    PUBLIC = "public"


class LoanCalculationMethod(str, Enum):
    POINTS_BASED = "points-based"
    AVERAGE_BASED = "average-based"
    STEP_BASED = "step-based"
    DEPOSIT_BASED = "deposit-based"
    SALARY_BASED = "salary-based"
    POS_BASED = "pos-based"
    COLLATERAL_BASED = "collateral-based"


class BilingualText(BaseModel):
    """Bilingual text model."""
    en: str
    fa: str


class LoanTier(BaseModel):
    """Loan tier for points-based systems."""
    amount: str
    repayment: Optional[str] = None
    pointsRequired: Optional[int] = None
    monthlyPayment: Optional[str] = None


class LoanRequirements(BaseModel):
    """Loan requirements model."""
    guarantor: Optional[bool] = None
    check: Optional[bool] = None
    promissoryNote: Optional[bool] = None
    creditRating: Optional[List[str]] = None
    noBadChecks: Optional[bool] = None
    noOverdueDebts: Optional[bool] = None
    accountAverage: Optional[str] = None
    minDeposit: Optional[str] = None

    # Credit Rating Fields
    borrowerCreditRating: Optional[List[str]] = None
    guarantorCreditRating: Optional[List[str]] = None
    minimumCreditScore: Optional[str] = None
    creditCheckRequired: Optional[bool] = None

    # Deposit Ratio Fields
    depositToFacilityRatio: Optional[str] = None  # e.g., "1:2", "1:5"
    depositRatioPercentage: Optional[str] = None  # e.g., "50%", "20%"
    minimumDepositAmount: Optional[str] = None
    depositDurationRequired: Optional[str] = None  # e.g., "3 months"


class LoanType(BaseModel):
    """Individual loan type within a bank."""
    id: str
    nameFA: str
    nameEN: str
    category: Optional[str] = None
    categoryFA: Optional[str] = None
    minAmount: Optional[str] = None
    maxAmount: Optional[str] = None
    interestRate: Optional[str] = None
    interestRateFA: Optional[str] = None
    repaymentPeriod: Optional[str] = None
    guarantor: Optional[bool] = None
    requirements: Optional[List[str]] = None
    requirementsFA: Optional[List[str]] = None
    description: Optional[str] = None
    descriptionFA: Optional[str] = None
    calculationMethod: Optional[LoanCalculationMethod] = None

    # Deposit Calculator Fields
    loanMultiplier: Optional[str] = None  # e.g., "370%"
    loanMultiplierFA: Optional[str] = None
    coefficientTable: Optional[List[Dict[str, Any]]] = None
    depositAmountOneMonth: Optional[str] = None
    depositAmountThreeMonths: Optional[str] = None
    depositAmountSixMonths: Optional[str] = None
    averageBalanceRequired: Optional[str] = None

    # Credit Rating Matrix
    creditRatingRequirements: Optional[Dict[str, Any]] = None
    guarantorRequirements: Optional[Dict[str, Any]] = None

    # Fee Structure
    depositFee: Optional[str] = None
    feeByDuration: Optional[Dict[str, str]] = None
    feeStructure: Optional[Dict[str, Any]] = None

    # Credit Rating Fields
    borrowerCreditRating: Optional[List[str]] = None
    guarantorCreditRating: Optional[List[str]] = None
    minimumCreditScore: Optional[str] = None

    # Deposit Ratio Fields
    depositToFacilityRatio: Optional[str] = None
    depositRatioPercentage: Optional[str] = None


class ScoringSystem(BaseModel):
    """Points/scoring system model."""
    formula: Optional[str] = None
    formulaFA: Optional[str] = None
    pointPurchase: Optional[bool] = None
    pointTransfer: Optional[bool] = None
    maxLoan: Optional[str] = None


class BankSpecialFeatures(BaseModel):
    """Bank-specific features model."""
    invitationBased: Optional[bool] = None
    pointsSystem: Optional[Dict[str, Any]] = None
    specialPrograms: Optional[List[str]] = None
    loyaltyBenefits: Optional[Dict[str, Any]] = None


class BankBase(BaseModel):
    """Base bank model."""
    id: str
    nameFA: str
    nameEN: str
    category: str
    type: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    descriptionFA: Optional[str] = None


class BankCreate(BankBase):
    """Bank creation model."""
    parentBank: Optional[str] = None
    parentBankFA: Optional[str] = None
    loanTypes: Optional[List[LoanType]] = []
    scoringSystem: Optional[ScoringSystem] = None
    loanTiers: Optional[List[LoanTier]] = None
    requirements: Optional[LoanRequirements] = None
    specialFeatures: Optional[BankSpecialFeatures] = None
    loans: Optional[List[str]] = []
    loansCount: Optional[int] = 0
    extraData: Optional[Dict[str, Any]] = Field(default_factory=dict)


class BankResponse(BankBase):
    """Bank response model."""
    parentBank: Optional[str] = None
    parentBankFA: Optional[str] = None
    loanTypes: Optional[List[LoanType]] = []
    scoringSystem: Optional[ScoringSystem] = None
    loanTiers: Optional[List[LoanTier]] = None
    requirements: Optional[LoanRequirements] = None
    specialFeatures: Optional[BankSpecialFeatures] = None
    loans: Optional[List[str]] = []
    loansCount: Optional[int] = 0
    lastUpdated: Optional[str] = None

    class Config:
        from_attributes = True


class BankSummary(BaseModel):
    """Bank summary for list views."""
    id: str
    nameFA: str
    nameEN: str
    category: str
    type: Optional[str] = None
    loansCount: int = 0
    calculationMethod: Optional[str] = None
