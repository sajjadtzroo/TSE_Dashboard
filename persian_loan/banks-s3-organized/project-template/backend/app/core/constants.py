"""
Application Constants

Centralized location for all magic strings, numbers, and enums used throughout the application.
"""

from enum import Enum


# Calculation Methods
class CalculationMethod(str, Enum):
    """Loan calculation methods used by Iranian banks."""
    POINTS_BASED = "points-based"
    AVERAGE_BASED = "average-based"
    STEP_BASED = "step-based"
    DEPOSIT_BASED = "deposit-based"
    SALARY_BASED = "salary-based"
    POS_BASED = "pos-based"
    COLLATERAL_BASED = "collateral-based"


# Bank Categories
class BankCategory(str, Enum):
    """Bank category types."""
    TRADITIONAL = "traditional-banks"
    DIGITAL = "digital-banks"


# Payment Status
class PaymentStatus(str, Enum):
    """Payment schedule status."""
    PENDING = "pending"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


# Alert Priority
class AlertPriority(str, Enum):
    """Alert priority levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


# Query Limits
class QueryLimits:
    """Default query limits for pagination."""
    DEFAULT_SKIP = 0
    DEFAULT_LIMIT = 100
    MAX_LIMIT = 100
    MAX_BANKS = 100
    MAX_LOANS = 500
    MAX_PAYMENTS = 360
    MAX_ALERTS = 100


# Scheduler Configuration
class SchedulerConfig:
    """Background scheduler configuration."""
    UPCOMING_PAYMENTS_HOUR = 8
    UPCOMING_PAYMENTS_MINUTE = 0
    OVERDUE_PAYMENTS_HOUR = 9
    OVERDUE_PAYMENTS_MINUTE = 0
    NOTIFICATION_HOURS = "8,12,18"
    UPCOMING_THRESHOLD_DAYS = 3


# Financial Constants
class FinancialConstants:
    """Constants for financial calculations."""
    MONTHS_PER_YEAR = 12
    DAYS_PER_YEAR = 365
    PERCENT_DIVISOR = 100
    DECIMAL_PRECISION = 28
    DEFAULT_LATE_PENALTY_RATE = "6"  # 6% annual late penalty


# File Upload Configuration
class FileUploadConfig:
    """Configuration for file uploads."""
    ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg"]
    ALLOWED_DOCUMENT_TYPES = ["application/pdf"]
    MAX_URLS_PER_SCRAPE = 10
    MAX_IMPORT_LIMIT = 100


# Collection Names
class Collections:
    """MongoDB collection names."""
    BANKS = "banks"
    USER_LOANS = "user_loans"
    PAYMENT_SCHEDULES = "payment_schedules"
    PAYMENT_ALERTS = "payment_alerts"
    IMPORTS = "imports"


# Index Names
class Indexes:
    """MongoDB index names."""
    USER_ID = "user_id"
    LOAN_ID = "loan_id"
    DUE_DATE = "due_date"
    STATUS = "status"
    IS_ACTIVE = "is_active"
    IS_READ = "is_read"
    CATEGORY = "category"


# API Response Messages
class ResponseMessages:
    """Standard API response messages."""
    BANK_CREATED = "Bank {bank_id} created successfully"
    BANK_UPDATED = "Bank {bank_id} updated successfully"
    BANK_DELETED = "Bank {bank_id} deleted successfully"
    LOAN_DELETED = "Loan deleted successfully"
    PAYMENT_MARKED_PAID = "Payment {installment_number} marked as paid"

    # Error messages
    BANK_EXISTS = "Bank {bank_id} already exists"
    BANK_NOT_FOUND = "Bank with id '{bank_id}' not found"
    LOAN_NOT_FOUND = "Loan {loan_id} not found"
    INVALID_METHOD = "Invalid method. Valid methods: {methods}"
    FILE_UPLOAD_FAILED = "File upload failed: {error}"
    OCR_FAILED = "OCR processing failed: {error}"
    SCRAPING_FAILED = "Web scraping failed: {error}"
    IMPORT_NOT_FOUND = "Import not found"
