"""
Payment Reminders Schemas
"""

from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


class LoanTypeEnum(str, Enum):
    """Types of loan repayment methods."""
    EQUAL_INSTALLMENTS = "equal_installments"  # قسط مساوی
    REDUCING_BALANCE = "reducing_balance"  # مانده نزولی
    GRADUATED = "graduated"  # پلکانی
    BALLOON = "balloon"  # بالونی
    INTEREST_ONLY = "interest_only"  # فقط سود


class PaymentStatusEnum(str, Enum):
    """Payment status enumeration."""
    PENDING = "pending"
    PAID = "paid"
    OVERDUE = "overdue"
    PARTIAL = "partial"


class AlertPriorityEnum(str, Enum):
    """Alert priority levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class UserLoanBase(BaseModel):
    """Base schema for user loans."""
    loan_name: str = Field(..., alias="loanName", min_length=1, max_length=200)
    loan_name_fa: Optional[str] = Field(None, alias="loanNameFA")
    bank_name: Optional[str] = Field(None, alias="bankName")
    bank_name_fa: Optional[str] = Field(None, alias="bankNameFA")

    # Loan financial details - use str for precise decimal handling
    principal_amount: str = Field(..., alias="principalAmount")  # مبلغ وام
    interest_rate: str = Field(..., alias="interestRate")  # نرخ سود سالانه (درصد)
    loan_type: LoanTypeEnum = Field(default=LoanTypeEnum.EQUAL_INSTALLMENTS, alias="loanType")

    # Loan term
    total_installments: int = Field(..., alias="totalInstallments", ge=1, le=600)
    start_date: date = Field(..., alias="startDate")
    payment_day: int = Field(..., alias="paymentDay", ge=1, le=31)

    @field_validator("start_date")
    @classmethod
    def validate_start_date(cls, v: date) -> date:
        """Validate start date is not too far in the past or future."""
        from datetime import timedelta
        today = date.today()
        max_past = today - timedelta(days=3650)  # 10 years ago
        max_future = today + timedelta(days=365)  # 1 year in future

        if v < max_past:
            raise ValueError("Start date cannot be more than 10 years in the past")
        if v > max_future:
            raise ValueError("Start date cannot be more than 1 year in the future")
        return v

    # Optional fields
    description: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("principal_amount")
    @classmethod
    def validate_principal_amount(cls, v: str) -> str:
        """Validate principal amount is positive and reasonable."""
        try:
            amount = Decimal(v)
            if amount <= 0:
                raise ValueError("Principal amount must be positive")
            if amount > Decimal("10000000000000"):  # 10 trillion max
                raise ValueError("Principal amount exceeds maximum allowed value")
            # Check for reasonable decimal places (max 2)
            if amount.as_tuple().exponent < -2:
                raise ValueError("Principal amount should have at most 2 decimal places")
            return v
        except (ValueError, ArithmeticError) as e:
            if "Principal" in str(e):
                raise
            raise ValueError("Invalid principal amount format")

    @field_validator("interest_rate")
    @classmethod
    def validate_interest_rate(cls, v: str) -> str:
        """Validate interest rate is between 0-100."""
        try:
            rate = Decimal(v)
            if rate < 0:
                raise ValueError("Interest rate cannot be negative")
            if rate > 100:
                raise ValueError("Interest rate cannot exceed 100%")
            return v
        except (ValueError, ArithmeticError) as e:
            if "Interest" in str(e):
                raise
            raise ValueError("Invalid interest rate format")

    class Config:
        populate_by_name = True


class UserLoanCreate(UserLoanBase):
    """Schema for creating a user loan."""
    user_id: str = Field(..., alias="userId")


class UserLoanUpdate(BaseModel):
    """Schema for updating a user loan."""
    loan_name: Optional[str] = Field(None, alias="loanName")
    loan_name_fa: Optional[str] = Field(None, alias="loanNameFA")
    bank_name: Optional[str] = Field(None, alias="bankName")
    bank_name_fa: Optional[str] = Field(None, alias="bankNameFA")
    principal_amount: Optional[str] = Field(None, alias="principalAmount")
    interest_rate: Optional[str] = Field(None, alias="interestRate")
    loan_type: Optional[LoanTypeEnum] = Field(None, alias="loanType")
    total_installments: Optional[int] = Field(None, alias="totalInstallments", ge=1, le=360)
    start_date: Optional[date] = Field(None, alias="startDate")
    payment_day: Optional[int] = Field(None, alias="paymentDay", ge=1, le=31)
    description: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = Field(None, alias="isActive")

    class Config:
        populate_by_name = True


class PaymentScheduleItem(BaseModel):
    """Schema for a single payment in the schedule."""
    installment_number: int = Field(..., alias="installmentNumber")
    due_date: date = Field(..., alias="dueDate")
    due_date_jalali: str = Field(..., alias="dueDateJalali")

    # Payment breakdown - precise decimal strings
    principal_payment: str = Field(..., alias="principalPayment")
    interest_payment: str = Field(..., alias="interestPayment")
    total_payment: str = Field(..., alias="totalPayment")
    remaining_balance: str = Field(..., alias="remainingBalance")

    # Status
    status: PaymentStatusEnum = PaymentStatusEnum.PENDING
    paid_date: Optional[date] = Field(None, alias="paidDate")
    paid_amount: Optional[str] = Field(None, alias="paidAmount")

    class Config:
        populate_by_name = True


class UserLoanResponse(UserLoanBase):
    """Schema for user loan response with calculated fields."""
    id: str
    user_id: str = Field(..., alias="userId")

    # Calculated fields
    monthly_payment: str = Field(..., alias="monthlyPayment")
    total_payment: str = Field(..., alias="totalPayment")
    total_interest: str = Field(..., alias="totalInterest")

    # Payment schedule summary
    paid_installments: int = Field(default=0, alias="paidInstallments")
    remaining_installments: int = Field(..., alias="remainingInstallments")
    next_payment_date: Optional[date] = Field(None, alias="nextPaymentDate")
    next_payment_date_jalali: Optional[str] = Field(None, alias="nextPaymentDateJalali")

    # Timestamps
    is_active: bool = Field(default=True, alias="isActive")
    created_at: datetime = Field(..., alias="createdAt")
    updated_at: datetime = Field(..., alias="updatedAt")

    class Config:
        populate_by_name = True


class UserLoanWithSchedule(UserLoanResponse):
    """Schema for user loan with full payment schedule."""
    payment_schedule: List[PaymentScheduleItem] = Field(..., alias="paymentSchedule")

    class Config:
        populate_by_name = True


class AlertResponse(BaseModel):
    """Schema for payment alert response."""
    id: str
    loan_id: str = Field(..., alias="loanId")
    loan_name: str = Field(..., alias="loanName")
    loan_name_fa: Optional[str] = Field(None, alias="loanNameFA")
    bank_name: Optional[str] = Field(None, alias="bankName")
    bank_name_fa: Optional[str] = Field(None, alias="bankNameFA")

    # Payment details
    installment_number: int = Field(..., alias="installmentNumber")
    due_date: date = Field(..., alias="dueDate")
    due_date_jalali: str = Field(..., alias="dueDateJalali")
    amount: str

    # Alert metadata
    days_until_due: int = Field(..., alias="daysUntilDue")
    priority: AlertPriorityEnum
    status: PaymentStatusEnum
    message: str
    message_fa: str = Field(..., alias="messageFA")

    class Config:
        populate_by_name = True


class AlertsListResponse(BaseModel):
    """Schema for alerts list response."""
    total: int
    urgent: int  # 3 days or less
    upcoming: int  # 4-30 days
    overdue: int
    alerts: List[AlertResponse]


class LoanListResponse(BaseModel):
    """Schema for loan list response."""
    total: int
    active: int
    completed: int
    loans: List[UserLoanResponse]


class PaymentCalculationRequest(BaseModel):
    """Schema for payment calculation request."""
    principal_amount: str = Field(..., alias="principalAmount")
    interest_rate: str = Field(..., alias="interestRate")
    total_installments: int = Field(..., alias="totalInstallments", ge=1, le=360)
    loan_type: LoanTypeEnum = Field(default=LoanTypeEnum.EQUAL_INSTALLMENTS, alias="loanType")
    start_date: Optional[date] = Field(None, alias="startDate")
    payment_day: Optional[int] = Field(None, alias="paymentDay", ge=1, le=31)

    class Config:
        populate_by_name = True


class PaymentCalculationResponse(BaseModel):
    """Schema for payment calculation response."""
    monthly_payment: str = Field(..., alias="monthlyPayment")
    total_payment: str = Field(..., alias="totalPayment")
    total_interest: str = Field(..., alias="totalInterest")
    effective_rate: str = Field(..., alias="effectiveRate")
    payment_schedule: List[PaymentScheduleItem] = Field(..., alias="paymentSchedule")

    class Config:
        populate_by_name = True
