"""
Pydantic schemas for Loan module API request/response validation
"""
import datetime as _dt
from typing import Optional, List, Any, Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field


# ── API Envelope (matches frontend apiResponseSchema) ────────────────────────

T = TypeVar("T")


class ApiMeta(BaseModel):
    timestamp: str


class ApiEnvelope(BaseModel):
    """Wrapper matching frontend's apiResponseSchema(T): {success, data, meta, errors}"""
    success: bool = True
    data: Any = None
    meta: ApiMeta
    errors: Optional[Any] = None


# ── Bank schemas ─────────────────────────────────────────────────────────────

class LoanBankSummary(BaseModel):
    """Bank summary for list views"""
    id: int
    bank_slug: str
    name_fa: str
    name_en: Optional[str] = None
    category: str
    bank_type: Optional[str] = None
    website: Optional[str] = None
    description_fa: Optional[str] = None
    logo_url: Optional[str] = None
    products_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class LoanBankDetail(BaseModel):
    """Bank detail with products"""
    id: int
    bank_slug: str
    name_fa: str
    name_en: Optional[str] = None
    category: str
    bank_type: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    description_fa: Optional[str] = None
    scoring_system: Optional[dict] = None
    digital_branch: Optional[dict] = None
    logo_url: Optional[str] = None
    products: List["LoanProductSummary"] = []

    model_config = ConfigDict(from_attributes=True)


# ── Product schemas ──────────────────────────────────────────────────────────

class LoanProductSummary(BaseModel):
    """Loan product summary for list views"""
    id: int
    bank_id: int
    loan_slug: str
    name_fa: str
    name_en: Optional[str] = None
    category: Optional[str] = None
    category_fa: Optional[str] = None
    calculation_method: str
    interest_rate_min: Optional[float] = None
    interest_rate_max: Optional[float] = None
    fee_min: Optional[float] = None
    fee_max: Optional[float] = None
    max_amount: Optional[int] = None
    max_amount_display: Optional[str] = None
    loan_multiplier: Optional[str] = None
    guarantor_required: bool = False
    description_fa: Optional[str] = None
    bank_name_fa: Optional[str] = None
    bank_slug: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class LoanCoefficientSchema(BaseModel):
    """Coefficient table entry"""
    id: int
    fee_percent: float
    deposit_months: int
    repayment_months: int
    ratio_percent: str
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class LoanRequirementSchema(BaseModel):
    """Loan requirement"""
    id: int
    requirement_type: str
    description: str
    description_fa: Optional[str] = None
    is_mandatory: bool = True

    model_config = ConfigDict(from_attributes=True)


class LoanProductDetail(BaseModel):
    """Full loan product detail"""
    id: int
    bank_id: int
    loan_slug: str
    name_fa: str
    name_en: Optional[str] = None
    category: Optional[str] = None
    category_fa: Optional[str] = None
    calculation_method: str
    interest_rate_min: Optional[float] = None
    interest_rate_max: Optional[float] = None
    fee_min: Optional[float] = None
    fee_max: Optional[float] = None
    max_amount: Optional[int] = None
    max_amount_display: Optional[str] = None
    loan_multiplier: Optional[str] = None
    deposit_to_facility_ratio: Optional[str] = None
    repayment_period_min: Optional[int] = None
    repayment_period_max: Optional[int] = None
    guarantor_required: bool = False
    guarantor_description: Optional[str] = None
    description: Optional[str] = None
    description_fa: Optional[str] = None
    extra_data: Optional[dict] = None
    bank_name_fa: Optional[str] = None
    bank_slug: Optional[str] = None
    coefficients: List[LoanCoefficientSchema] = []
    requirements: List[LoanRequirementSchema] = []

    model_config = ConfigDict(from_attributes=True)


# ── Analytics schemas ────────────────────────────────────────────────────────

class LoanAnalyticsSummary(BaseModel):
    """Summary statistics"""
    total_banks: int
    traditional_banks: int
    digital_banks: int
    total_products: int
    no_guarantor_count: int
    zero_interest_count: int
    avg_interest_rate: Optional[float] = None
    max_loan_amount: Optional[int] = None


class InterestRateDistribution(BaseModel):
    """Interest rate distribution"""
    range_label: str
    count: int


class LoanAmountRange(BaseModel):
    """Loan amount range distribution"""
    range_label: str
    count: int


class RequirementsMatrixEntry(BaseModel):
    """Requirements matrix row"""
    bank_name_fa: str
    product_name_fa: str
    requirement_types: List[str]
    requirements: List[str]


# ── User loan schemas ────────────────────────────────────────────────────────

class UserLoanCreate(BaseModel):
    """Create a user tracked loan"""
    product_id: int
    loan_amount: Optional[int] = Field(default=None, ge=0)
    duration_months: Optional[int] = Field(default=None, ge=1)
    notes: Optional[str] = None


class UserLoanSchema(BaseModel):
    """User tracked loan"""
    id: int
    user_id: int
    product_id: int
    loan_amount: Optional[int] = None
    duration_months: Optional[int] = None
    notes: Optional[str] = None
    is_active: bool
    created_at: _dt.datetime
    product: Optional[LoanProductSummary] = None

    model_config = ConfigDict(from_attributes=True)


class PaymentScheduleSchema(BaseModel):
    """Payment schedule entry"""
    id: int
    installment_number: int
    due_date: _dt.date
    amount: int
    principal: Optional[int] = None
    interest: Optional[int] = None
    status: str
    paid_at: Optional[_dt.datetime] = None

    model_config = ConfigDict(from_attributes=True)


class PaymentMarkPaid(BaseModel):
    """Mark a payment as paid"""
    paid_at: Optional[_dt.datetime] = None


class PaymentAlertSchema(BaseModel):
    """Payment alert"""
    id: int
    user_loan_id: int
    alert_type: str
    message: Optional[str] = None
    is_read: bool
    scheduled_for: Optional[_dt.datetime] = None
    created_at: _dt.datetime

    model_config = ConfigDict(from_attributes=True)


# ── Import schemas ──────────────────────────────────────────────────────────

class FileUploadResponse(BaseModel):
    """Response after uploading a file (camelCase keys to match frontend)"""
    fileId: str
    filename: str
    contentType: str
    size: int


class OCRResultResponse(BaseModel):
    """OCR processing result (snake_case — frontend maps to camelCase)"""
    file_id: str
    language: str
    text: str
    confidence: float = 0
    page_count: int = 0


class WebScrapingRequest(BaseModel):
    """Web scraping request body"""
    urls: List[str] = Field(min_length=1)
    bankId: Optional[str] = None
    deepScrape: bool = False


class WebScrapingResultItem(BaseModel):
    """Result for a single scraped URL"""
    url: str
    status: str
    data: Optional[Any] = None
    error: Optional[str] = None


class WebScrapingResponse(BaseModel):
    """Web scraping response"""
    importId: str
    results: List[WebScrapingResultItem]


class ImportStatusResponse(BaseModel):
    """Single import job status (backend field names)"""
    id: str
    type: str
    status: str
    source: Optional[str] = None
    results: Optional[Any] = None
    error: Optional[str] = None


class ImportListResponse(BaseModel):
    """Paginated list of imports"""
    total: int
    imports: List[ImportStatusResponse]


class ImportStatsResponse(BaseModel):
    """Aggregate import statistics"""
    total: int
    byType: dict = {}
    byStatus: dict = {}
