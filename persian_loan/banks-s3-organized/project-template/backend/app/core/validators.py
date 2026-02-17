"""
MongoDB Schema Validators

JSON Schema validators for enforcing data quality at the database level.
These validators are applied with validationLevel: "moderate" to validate
new inserts/updates without breaking existing data.

Usage:
    from app.core.validators import get_bank_validator, get_reminder_validator

    # Apply to collection
    db.command("collMod", "banks", validator=get_bank_validator())
"""

from typing import Dict, Any


def get_bank_validator() -> Dict[str, Any]:
    """
    Bank collection schema validator.

    Enforces:
    - Required fields: id, nameFA, nameEN, category
    - category must be enum ["traditional-banks", "digital-banks"]
    - loanTypes array with nested validation
    - interestRateNumeric: 0-100 range or null
    - minAmount/maxAmount: positive numbers (as strings)
    - guarantor: boolean
    - calculationMethod: enum values

    Returns:
        MongoDB JSON Schema validator
    """
    return {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["id", "nameFA", "nameEN", "category"],
            "properties": {
                "id": {
                    "bsonType": "string",
                    "description": "Bank unique identifier (required)"
                },
                "nameFA": {
                    "bsonType": "string",
                    "description": "Persian name (required)"
                },
                "nameEN": {
                    "bsonType": "string",
                    "description": "English name (required)"
                },
                "category": {
                    "enum": ["traditional-banks", "digital-banks"],
                    "description": "Bank category (required)"
                },
                "type": {
                    "bsonType": ["string", "null"],
                    "description": "Bank type (optional)"
                },
                "website": {
                    "bsonType": ["string", "null"],
                    "description": "Bank website URL (optional)"
                },
                "description": {
                    "bsonType": ["string", "null"],
                    "description": "English description (optional)"
                },
                "descriptionFA": {
                    "bsonType": ["string", "null"],
                    "description": "Persian description (optional)"
                },
                "parentBank": {
                    "bsonType": ["string", "null"],
                    "description": "Parent bank name (optional)"
                },
                "parentBankFA": {
                    "bsonType": ["string", "null"],
                    "description": "Parent bank Persian name (optional)"
                },
                "loanTypes": {
                    "bsonType": "array",
                    "description": "Array of loan types offered by bank",
                    "items": {
                        "bsonType": "object",
                        "required": ["id", "nameFA"],
                        "properties": {
                            "id": {
                                "bsonType": "string",
                                "description": "Loan type unique identifier"
                            },
                            "nameFA": {
                                "bsonType": "string",
                                "description": "Persian loan name"
                            },
                            "nameEN": {
                                "bsonType": ["string", "null"],
                                "description": "English loan name"
                            },
                            "category": {
                                "bsonType": ["string", "null"],
                                "description": "Loan category"
                            },
                            "categoryFA": {
                                "bsonType": ["string", "null"],
                                "description": "Persian loan category"
                            },
                            "minAmount": {
                                "bsonType": ["string", "null"],
                                "description": "Minimum loan amount (as string for precision)"
                            },
                            "maxAmount": {
                                "bsonType": ["string", "null"],
                                "description": "Maximum loan amount (as string for precision)"
                            },
                            "interestRate": {
                                "bsonType": ["string", "null"],
                                "description": "Interest rate as string (e.g., '18%')"
                            },
                            "interestRateFA": {
                                "bsonType": ["string", "null"],
                                "description": "Persian interest rate"
                            },
                            "interestRateNumeric": {
                                "bsonType": ["double", "null"],
                                "minimum": 0,
                                "maximum": 100,
                                "description": "Numeric interest rate (0-100 or null)"
                            },
                            "repaymentPeriod": {
                                "bsonType": ["string", "null"],
                                "description": "Repayment period"
                            },
                            "guarantor": {
                                "bsonType": ["bool", "null"],
                                "description": "Whether guarantor is required"
                            },
                            "calculationMethod": {
                                "enum": [
                                    "points-based",
                                    "average-based",
                                    "step-based",
                                    "deposit-based",
                                    "salary-based",
                                    "pos-based",
                                    "collateral-based",
                                    None
                                ],
                                "description": "Loan calculation method"
                            },
                            "requirements": {
                                "bsonType": ["array", "null"],
                                "description": "Loan requirements array"
                            },
                            "requirementsFA": {
                                "bsonType": ["array", "null"],
                                "description": "Persian loan requirements"
                            },
                            "description": {
                                "bsonType": ["string", "null"],
                                "description": "Loan description"
                            },
                            "descriptionFA": {
                                "bsonType": ["string", "null"],
                                "description": "Persian loan description"
                            }
                        }
                    }
                },
                "scoringSystem": {
                    "bsonType": ["object", "null"],
                    "description": "Bank scoring system details"
                },
                "loanTiers": {
                    "bsonType": ["array", "null"],
                    "description": "Loan tiers for points-based systems"
                },
                "requirements": {
                    "bsonType": ["object", "null"],
                    "description": "General bank requirements"
                },
                "specialFeatures": {
                    "bsonType": ["object", "null"],
                    "description": "Bank special features"
                },
                "loans": {
                    "bsonType": ["array", "null"],
                    "description": "Array of loan IDs"
                },
                "loansCount": {
                    "bsonType": ["int", "null"],
                    "minimum": 0,
                    "description": "Number of loans"
                },
                "lastUpdated": {
                    "bsonType": ["string", "null"],
                    "description": "Last update timestamp"
                }
            }
        }
    }


def get_user_loan_validator() -> Dict[str, Any]:
    """
    User loans collection schema validator.

    Enforces:
    - Required: user_id, loan_name, principal_amount, interest_rate,
                total_installments, start_date, payment_day
    - principal_amount and interest_rate: strings for decimal precision
    - total_installments: 1-600 range
    - payment_day: 1-31 range
    - is_active: boolean
    - dates: ISO date strings

    Returns:
        MongoDB JSON Schema validator
    """
    return {
        "$jsonSchema": {
            "bsonType": "object",
            "required": [
                "user_id",
                "loan_name",
                "principal_amount",
                "interest_rate",
                "total_installments",
                "start_date",
                "payment_day"
            ],
            "properties": {
                "user_id": {
                    "bsonType": "string",
                    "description": "User ID who owns the loan (required)"
                },
                "loan_name": {
                    "bsonType": "string",
                    "minLength": 1,
                    "maxLength": 200,
                    "description": "Loan name (required)"
                },
                "loan_name_fa": {
                    "bsonType": ["string", "null"],
                    "description": "Persian loan name (optional)"
                },
                "bank_name": {
                    "bsonType": ["string", "null"],
                    "description": "Bank name (optional)"
                },
                "bank_name_fa": {
                    "bsonType": ["string", "null"],
                    "description": "Persian bank name (optional)"
                },
                "principal_amount": {
                    "bsonType": "string",
                    "description": "Principal loan amount as string (required)"
                },
                "interest_rate": {
                    "bsonType": "string",
                    "description": "Annual interest rate as string (required)"
                },
                "loan_type": {
                    "enum": [
                        "equal_installments",
                        "reducing_balance",
                        "graduated",
                        "balloon",
                        "interest_only",
                        None
                    ],
                    "description": "Loan repayment type"
                },
                "total_installments": {
                    "bsonType": "int",
                    "minimum": 1,
                    "maximum": 600,
                    "description": "Total number of installments (1-600)"
                },
                "start_date": {
                    "bsonType": "date",
                    "description": "Loan start date (required)"
                },
                "payment_day": {
                    "bsonType": "int",
                    "minimum": 1,
                    "maximum": 31,
                    "description": "Day of month for payment (1-31)"
                },
                "description": {
                    "bsonType": ["string", "null"],
                    "description": "Loan description"
                },
                "notes": {
                    "bsonType": ["string", "null"],
                    "description": "User notes"
                },
                "is_active": {
                    "bsonType": "bool",
                    "description": "Whether loan is active"
                },
                "created_at": {
                    "bsonType": "date",
                    "description": "Creation timestamp"
                },
                "updated_at": {
                    "bsonType": "date",
                    "description": "Last update timestamp"
                }
            }
        }
    }


def get_payment_schedule_validator() -> Dict[str, Any]:
    """
    Payment schedules collection schema validator.

    Enforces:
    - Required: loan_id, installment_number, due_date, total_payment, status
    - installment_number: positive integer
    - status: enum values
    - payment amounts: strings for decimal precision
    - dates: proper date types

    Returns:
        MongoDB JSON Schema validator
    """
    return {
        "$jsonSchema": {
            "bsonType": "object",
            "required": [
                "loan_id",
                "installment_number",
                "due_date",
                "total_payment",
                "status"
            ],
            "properties": {
                "loan_id": {
                    "bsonType": "string",
                    "description": "Associated loan ID (required)"
                },
                "installment_number": {
                    "bsonType": "int",
                    "minimum": 1,
                    "description": "Installment sequence number (required)"
                },
                "due_date": {
                    "bsonType": "date",
                    "description": "Payment due date (required)"
                },
                "due_date_jalali": {
                    "bsonType": ["string", "null"],
                    "description": "Jalali/Persian calendar date"
                },
                "principal_payment": {
                    "bsonType": ["string", "null"],
                    "description": "Principal portion of payment"
                },
                "interest_payment": {
                    "bsonType": ["string", "null"],
                    "description": "Interest portion of payment"
                },
                "total_payment": {
                    "bsonType": "string",
                    "description": "Total payment amount (required)"
                },
                "remaining_balance": {
                    "bsonType": ["string", "null"],
                    "description": "Remaining loan balance"
                },
                "status": {
                    "enum": ["pending", "paid", "overdue", "partial"],
                    "description": "Payment status (required)"
                },
                "paid_date": {
                    "bsonType": ["date", "null"],
                    "description": "Actual payment date"
                },
                "paid_amount": {
                    "bsonType": ["string", "null"],
                    "description": "Actual amount paid"
                },
                "created_at": {
                    "bsonType": ["date", "null"],
                    "description": "Creation timestamp"
                },
                "updated_at": {
                    "bsonType": ["date", "null"],
                    "description": "Last update timestamp"
                }
            }
        }
    }


def get_payment_alert_validator() -> Dict[str, Any]:
    """
    Payment alerts collection schema validator.

    Enforces:
    - Required: user_id, loan_id, due_date, priority, status
    - priority: enum values
    - status: enum values
    - boolean flags: proper boolean type

    Returns:
        MongoDB JSON Schema validator
    """
    return {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["user_id", "loan_id", "due_date", "priority", "status"],
            "properties": {
                "user_id": {
                    "bsonType": "string",
                    "description": "User ID (required)"
                },
                "loan_id": {
                    "bsonType": "string",
                    "description": "Associated loan ID (required)"
                },
                "loan_name": {
                    "bsonType": ["string", "null"],
                    "description": "Loan name"
                },
                "loan_name_fa": {
                    "bsonType": ["string", "null"],
                    "description": "Persian loan name"
                },
                "bank_name": {
                    "bsonType": ["string", "null"],
                    "description": "Bank name"
                },
                "bank_name_fa": {
                    "bsonType": ["string", "null"],
                    "description": "Persian bank name"
                },
                "installment_number": {
                    "bsonType": ["int", "null"],
                    "minimum": 1,
                    "description": "Installment number"
                },
                "due_date": {
                    "bsonType": "date",
                    "description": "Payment due date (required)"
                },
                "due_date_jalali": {
                    "bsonType": ["string", "null"],
                    "description": "Jalali calendar date"
                },
                "amount": {
                    "bsonType": ["string", "null"],
                    "description": "Payment amount"
                },
                "days_until_due": {
                    "bsonType": ["int", "null"],
                    "description": "Days remaining until due"
                },
                "priority": {
                    "enum": ["low", "medium", "high", "urgent"],
                    "description": "Alert priority (required)"
                },
                "status": {
                    "enum": ["pending", "paid", "overdue", "partial"],
                    "description": "Payment status (required)"
                },
                "message": {
                    "bsonType": ["string", "null"],
                    "description": "Alert message"
                },
                "message_fa": {
                    "bsonType": ["string", "null"],
                    "description": "Persian alert message"
                },
                "is_read": {
                    "bsonType": "bool",
                    "description": "Whether alert has been read"
                },
                "is_sent": {
                    "bsonType": "bool",
                    "description": "Whether alert has been sent"
                },
                "created_at": {
                    "bsonType": ["date", "null"],
                    "description": "Creation timestamp"
                },
                "read_at": {
                    "bsonType": ["date", "null"],
                    "description": "Read timestamp"
                },
                "sent_at": {
                    "bsonType": ["date", "null"],
                    "description": "Sent timestamp"
                }
            }
        }
    }


def get_user_validator() -> Dict[str, Any]:
    """
    Users collection schema validator.

    Enforces:
    - Required: username, email, hashed_password, role
    - email: pattern validation (basic)
    - role: enum ["admin", "user"]
    - username: 3-50 characters
    - boolean flags: proper type

    Returns:
        MongoDB JSON Schema validator
    """
    return {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["username", "email", "hashed_password", "role"],
            "properties": {
                "username": {
                    "bsonType": "string",
                    "minLength": 3,
                    "maxLength": 50,
                    "description": "Username (3-50 chars, required)"
                },
                "email": {
                    "bsonType": "string",
                    "pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
                    "description": "Valid email address (required)"
                },
                "hashed_password": {
                    "bsonType": "string",
                    "description": "Hashed password (required)"
                },
                "role": {
                    "enum": ["admin", "user"],
                    "description": "User role (required)"
                },
                "is_active": {
                    "bsonType": "bool",
                    "description": "Whether user is active"
                },
                "created_at": {
                    "bsonType": ["date", "null"],
                    "description": "Account creation timestamp"
                },
                "updated_at": {
                    "bsonType": ["date", "null"],
                    "description": "Last update timestamp"
                }
            }
        }
    }


def get_refresh_token_validator() -> Dict[str, Any]:
    """
    Refresh tokens collection schema validator.

    Enforces:
    - Required: token, user_id, expires_at
    - Boolean flags: proper type

    Returns:
        MongoDB JSON Schema validator
    """
    return {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["token", "user_id", "expires_at"],
            "properties": {
                "token": {
                    "bsonType": "string",
                    "description": "Hashed refresh token (required)"
                },
                "user_id": {
                    "bsonType": "string",
                    "description": "Associated user ID (required)"
                },
                "expires_at": {
                    "bsonType": "date",
                    "description": "Token expiration time (required)"
                },
                "is_revoked": {
                    "bsonType": "bool",
                    "description": "Whether token is revoked"
                },
                "created_at": {
                    "bsonType": ["date", "null"],
                    "description": "Creation timestamp"
                }
            }
        }
    }


# Validator mapping for easy access
VALIDATORS = {
    "banks": get_bank_validator,
    "user_loans": get_user_loan_validator,
    "payment_schedules": get_payment_schedule_validator,
    "payment_alerts": get_payment_alert_validator,
    "users": get_user_validator,
    "refresh_tokens": get_refresh_token_validator,
}


def get_validator(collection_name: str) -> Dict[str, Any]:
    """
    Get validator for a specific collection.

    Args:
        collection_name: Name of the collection

    Returns:
        MongoDB JSON Schema validator

    Raises:
        ValueError: If collection name is not recognized
    """
    validator_func = VALIDATORS.get(collection_name)
    if not validator_func:
        raise ValueError(
            f"No validator defined for collection '{collection_name}'. "
            f"Available: {list(VALIDATORS.keys())}"
        )
    return validator_func()
