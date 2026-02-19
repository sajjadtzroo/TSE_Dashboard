"""
Pydantic schemas for Loan module API request/response validation
"""

import datetime as _dt
from typing import Any, TypeVar

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
    errors: Any | None = None


# ── Bank schemas ─────────────────────────────────────────────────────────────


class LoanBankSummary(BaseModel):
    """Bank summary for list views"""

    id: int
    bank_slug: str
    name_fa: str
    name_en: str | None = None
    category: str
    bank_type: str | None = None
    parent_bank: str | None = None
    website: str | None = None
    description_fa: str | None = None
    logo_url: str | None = None
    products_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class LoanBankDetail(BaseModel):
    """Bank detail with products"""

    id: int
    bank_slug: str
    name_fa: str
    name_en: str | None = None
    category: str
    bank_type: str | None = None
    parent_bank: str | None = None
    website: str | None = None
    description: str | None = None
    description_fa: str | None = None
    scoring_system: dict | None = None
    digital_branch: dict | None = None
    extra_bank_data: dict | None = None
    logo_url: str | None = None
    products: list["LoanProductSummary"] = []

    model_config = ConfigDict(from_attributes=True)


# ── Product schemas ──────────────────────────────────────────────────────────


class LoanProductSummary(BaseModel):
    """Loan product summary for list views"""

    id: int
    bank_id: int
    loan_slug: str
    name_fa: str
    name_en: str | None = None
    category: str | None = None
    category_fa: str | None = None
    calculation_method: str
    interest_rate_min: float | None = None
    interest_rate_max: float | None = None
    fee_min: float | None = None
    fee_max: float | None = None
    max_amount: int | None = None
    max_amount_display: str | None = None
    loan_multiplier: str | None = None
    guarantor_required: bool = False
    description_fa: str | None = None
    bank_name_fa: str | None = None
    bank_slug: str | None = None

    model_config = ConfigDict(from_attributes=True)


class LoanCoefficientSchema(BaseModel):
    """Coefficient table entry"""

    id: int
    fee_percent: float
    deposit_months: int
    repayment_months: int
    ratio_percent: str
    description: str | None = None

    model_config = ConfigDict(from_attributes=True)


class LoanRequirementSchema(BaseModel):
    """Loan requirement"""

    id: int
    requirement_type: str
    description: str
    description_fa: str | None = None
    is_mandatory: bool = True

    model_config = ConfigDict(from_attributes=True)


class LoanProductDetail(BaseModel):
    """Full loan product detail"""

    id: int
    bank_id: int
    loan_slug: str
    name_fa: str
    name_en: str | None = None
    category: str | None = None
    category_fa: str | None = None
    calculation_method: str
    interest_rate_min: float | None = None
    interest_rate_max: float | None = None
    fee_min: float | None = None
    fee_max: float | None = None
    max_amount: int | None = None
    max_amount_display: str | None = None
    loan_multiplier: str | None = None
    deposit_to_facility_ratio: str | None = None
    repayment_period_min: int | None = None
    repayment_period_max: int | None = None
    guarantor_required: bool = False
    guarantor_description: str | None = None
    description: str | None = None
    description_fa: str | None = None
    extra_data: dict | None = None
    bank_name_fa: str | None = None
    bank_slug: str | None = None
    coefficients: list[LoanCoefficientSchema] = []
    requirements: list[LoanRequirementSchema] = []

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
    avg_interest_rate: float | None = None
    max_loan_amount: int | None = None


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
    requirement_types: list[str]
    requirements: list[str]


# ── User loan schemas ────────────────────────────────────────────────────────


class UserLoanCreate(BaseModel):
    """Create a user tracked loan"""

    product_id: int
    loan_amount: int | None = Field(default=None, ge=0)
    duration_months: int | None = Field(default=None, ge=1)
    notes: str | None = None


class UserLoanSchema(BaseModel):
    """User tracked loan"""

    id: int
    user_id: int
    product_id: int
    loan_amount: int | None = None
    duration_months: int | None = None
    notes: str | None = None
    is_active: bool
    created_at: _dt.datetime
    product: LoanProductSummary | None = None

    model_config = ConfigDict(from_attributes=True)


class PaymentScheduleSchema(BaseModel):
    """Payment schedule entry"""

    id: int
    installment_number: int
    due_date: _dt.date
    amount: int
    principal: int | None = None
    interest: int | None = None
    status: str
    paid_at: _dt.datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class PaymentMarkPaid(BaseModel):
    """Mark a payment as paid"""

    paid_at: _dt.datetime | None = None


class PaymentAlertSchema(BaseModel):
    """Payment alert"""

    id: int
    user_loan_id: int
    alert_type: str
    message: str | None = None
    is_read: bool
    scheduled_for: _dt.datetime | None = None
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

    urls: list[str] = Field(min_length=1)
    bankId: str | None = None
    deepScrape: bool = False


class WebScrapingResultItem(BaseModel):
    """Result for a single scraped URL"""

    url: str
    status: str
    data: Any | None = None
    error: str | None = None


class WebScrapingResponse(BaseModel):
    """Web scraping response"""

    importId: str
    results: list[WebScrapingResultItem]


class ImportStatusResponse(BaseModel):
    """Single import job status (backend field names)"""

    id: str
    type: str
    status: str
    source: str | None = None
    results: Any | None = None
    error: str | None = None


class ImportListResponse(BaseModel):
    """Paginated list of imports"""

    total: int
    imports: list[ImportStatusResponse]


class ImportStatsResponse(BaseModel):
    """Aggregate import statistics"""

    total: int
    byType: dict = {}
    byStatus: dict = {}
