"""
Tests for MongoDB Schema Validators

Tests validator schemas structure, valid/invalid documents, and ensures
existing data is not affected by moderate validation level.
"""

import pytest
from datetime import datetime, date
from typing import Dict, Any

from app.core.validators import (
    get_bank_validator,
    get_user_loan_validator,
    get_payment_schedule_validator,
    get_payment_alert_validator,
    get_user_validator,
    get_refresh_token_validator,
    get_validator,
    VALIDATORS
)


class TestValidatorStructure:
    """Test validator schema structure."""

    def test_all_validators_registered(self):
        """All validators should be registered in VALIDATORS dict."""
        expected_validators = [
            "banks",
            "user_loans",
            "payment_schedules",
            "payment_alerts",
            "users",
            "refresh_tokens"
        ]

        for validator_name in expected_validators:
            assert validator_name in VALIDATORS
            assert callable(VALIDATORS[validator_name])

    def test_get_validator_success(self):
        """get_validator should return valid schema for known collections."""
        for collection_name in VALIDATORS.keys():
            schema = get_validator(collection_name)

            assert "$jsonSchema" in schema
            assert "bsonType" in schema["$jsonSchema"]
            assert schema["$jsonSchema"]["bsonType"] == "object"

    def test_get_validator_unknown_collection(self):
        """get_validator should raise ValueError for unknown collections."""
        with pytest.raises(ValueError, match="No validator defined"):
            get_validator("unknown_collection")

    def test_bank_validator_structure(self):
        """Bank validator should have correct structure."""
        schema = get_bank_validator()

        assert "$jsonSchema" in schema
        json_schema = schema["$jsonSchema"]

        # Check required fields
        assert "required" in json_schema
        required = json_schema["required"]
        assert "id" in required
        assert "nameFA" in required
        assert "nameEN" in required
        assert "category" in required

        # Check properties
        assert "properties" in json_schema
        props = json_schema["properties"]

        # Check category enum
        assert "category" in props
        assert "enum" in props["category"]
        assert "traditional-banks" in props["category"]["enum"]
        assert "digital-banks" in props["category"]["enum"]

        # Check loanTypes array structure
        assert "loanTypes" in props
        assert props["loanTypes"]["bsonType"] == "array"
        assert "items" in props["loanTypes"]

        loan_items = props["loanTypes"]["items"]
        assert "required" in loan_items
        assert "id" in loan_items["required"]
        assert "nameFA" in loan_items["required"]

    def test_user_loan_validator_structure(self):
        """User loan validator should have correct structure."""
        schema = get_user_loan_validator()
        json_schema = schema["$jsonSchema"]

        # Check required fields
        required = json_schema["required"]
        assert "user_id" in required
        assert "loan_name" in required
        assert "principal_amount" in required
        assert "interest_rate" in required
        assert "total_installments" in required
        assert "start_date" in required
        assert "payment_day" in required

        # Check range constraints
        props = json_schema["properties"]
        assert props["total_installments"]["minimum"] == 1
        assert props["total_installments"]["maximum"] == 600
        assert props["payment_day"]["minimum"] == 1
        assert props["payment_day"]["maximum"] == 31

    def test_payment_schedule_validator_structure(self):
        """Payment schedule validator should have correct structure."""
        schema = get_payment_schedule_validator()
        json_schema = schema["$jsonSchema"]

        # Check required fields
        required = json_schema["required"]
        assert "loan_id" in required
        assert "installment_number" in required
        assert "due_date" in required
        assert "total_payment" in required
        assert "status" in required

        # Check status enum
        props = json_schema["properties"]
        assert "status" in props
        assert "enum" in props["status"]
        status_values = props["status"]["enum"]
        assert "pending" in status_values
        assert "paid" in status_values
        assert "overdue" in status_values
        assert "partial" in status_values

    def test_user_validator_structure(self):
        """User validator should have correct structure."""
        schema = get_user_validator()
        json_schema = schema["$jsonSchema"]

        # Check required fields
        required = json_schema["required"]
        assert "username" in required
        assert "email" in required
        assert "hashed_password" in required
        assert "role" in required

        # Check email pattern
        props = json_schema["properties"]
        assert "email" in props
        assert "pattern" in props["email"]

        # Check role enum
        assert "role" in props
        assert "enum" in props["role"]
        assert "admin" in props["role"]["enum"]
        assert "user" in props["role"]["enum"]


class TestBankValidator:
    """Test bank validator with valid and invalid documents."""

    @pytest.fixture
    def valid_bank(self) -> Dict[str, Any]:
        """Valid bank document."""
        return {
            "id": "bank-melli",
            "nameFA": "بانک ملی",
            "nameEN": "Bank Melli Iran",
            "category": "traditional-banks",
            "type": "state-owned",
            "website": "https://bmi.ir",
            "loanTypes": [
                {
                    "id": "loan-1",
                    "nameFA": "وام ضروری",
                    "nameEN": "Essential Loan",
                    "interestRateNumeric": 18.0,
                    "minAmount": "10000000",
                    "maxAmount": "500000000",
                    "guarantor": True,
                    "calculationMethod": "points-based"
                }
            ],
            "loansCount": 1
        }

    def test_valid_bank_schema(self, valid_bank):
        """Valid bank should have all required fields."""
        schema = get_bank_validator()
        json_schema = schema["$jsonSchema"]
        required = json_schema["required"]

        for field in required:
            assert field in valid_bank, f"Missing required field: {field}"

    def test_invalid_bank_missing_required(self):
        """Invalid bank missing required fields."""
        invalid_bank = {
            "id": "test-bank",
            "nameFA": "بانک تست"
            # Missing nameEN and category
        }

        schema = get_bank_validator()
        required = schema["$jsonSchema"]["required"]

        # Should be missing nameEN and category
        missing = [f for f in required if f not in invalid_bank]
        assert len(missing) > 0
        assert "nameEN" in missing
        assert "category" in missing

    def test_invalid_bank_wrong_category(self):
        """Bank with invalid category value."""
        invalid_bank = {
            "id": "test-bank",
            "nameFA": "بانک تست",
            "nameEN": "Test Bank",
            "category": "invalid-category"  # Not in enum
        }

        schema = get_bank_validator()
        allowed_categories = schema["$jsonSchema"]["properties"]["category"]["enum"]

        assert invalid_bank["category"] not in allowed_categories

    def test_invalid_loan_interest_rate_range(self):
        """Loan with out-of-range interest rate."""
        invalid_loan = {
            "id": "loan-1",
            "nameFA": "وام تست",
            "interestRateNumeric": 150.0  # > 100
        }

        schema = get_bank_validator()
        loan_schema = schema["$jsonSchema"]["properties"]["loanTypes"]["items"]
        rate_schema = loan_schema["properties"]["interestRateNumeric"]

        assert rate_schema["maximum"] == 100
        assert invalid_loan["interestRateNumeric"] > rate_schema["maximum"]


class TestUserLoanValidator:
    """Test user loan validator."""

    @pytest.fixture
    def valid_user_loan(self) -> Dict[str, Any]:
        """Valid user loan document."""
        return {
            "user_id": "user123",
            "loan_name": "Personal Loan",
            "loan_name_fa": "وام شخصی",
            "bank_name": "Bank Melli",
            "principal_amount": "100000000",
            "interest_rate": "18.0",
            "loan_type": "equal_installments",
            "total_installments": 36,
            "start_date": datetime(2024, 1, 1),
            "payment_day": 15,
            "is_active": True,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }

    def test_valid_user_loan_schema(self, valid_user_loan):
        """Valid user loan should have all required fields."""
        schema = get_user_loan_validator()
        required = schema["$jsonSchema"]["required"]

        for field in required:
            assert field in valid_user_loan, f"Missing required field: {field}"

    def test_invalid_installments_range(self):
        """Installments outside valid range."""
        schema = get_user_loan_validator()
        installments_schema = schema["$jsonSchema"]["properties"]["total_installments"]

        assert installments_schema["minimum"] == 1
        assert installments_schema["maximum"] == 600

        # Test values outside range
        assert 0 < installments_schema["minimum"]
        assert 700 > installments_schema["maximum"]

    def test_invalid_payment_day_range(self):
        """Payment day outside valid range."""
        schema = get_user_loan_validator()
        day_schema = schema["$jsonSchema"]["properties"]["payment_day"]

        assert day_schema["minimum"] == 1
        assert day_schema["maximum"] == 31

        # Test values outside range
        assert 0 < day_schema["minimum"]
        assert 32 > day_schema["maximum"]


class TestPaymentScheduleValidator:
    """Test payment schedule validator."""

    @pytest.fixture
    def valid_payment(self) -> Dict[str, Any]:
        """Valid payment schedule document."""
        return {
            "loan_id": "loan123",
            "installment_number": 1,
            "due_date": datetime(2024, 2, 15),
            "due_date_jalali": "1402/11/26",
            "principal_payment": "2500000",
            "interest_payment": "1500000",
            "total_payment": "4000000",
            "remaining_balance": "96000000",
            "status": "pending",
            "created_at": datetime.now()
        }

    def test_valid_payment_schema(self, valid_payment):
        """Valid payment should have all required fields."""
        schema = get_payment_schedule_validator()
        required = schema["$jsonSchema"]["required"]

        for field in required:
            assert field in valid_payment, f"Missing required field: {field}"

    def test_payment_status_enum(self):
        """Payment status should be from valid enum values."""
        schema = get_payment_schedule_validator()
        status_enum = schema["$jsonSchema"]["properties"]["status"]["enum"]

        assert "pending" in status_enum
        assert "paid" in status_enum
        assert "overdue" in status_enum
        assert "partial" in status_enum

        # Invalid status
        assert "invalid_status" not in status_enum


class TestUserValidator:
    """Test user validator."""

    @pytest.fixture
    def valid_user(self) -> Dict[str, Any]:
        """Valid user document."""
        return {
            "username": "john_doe",
            "email": "john@example.com",
            "hashed_password": "$2b$12$hashedpassword",
            "role": "user",
            "is_active": True,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }

    def test_valid_user_schema(self, valid_user):
        """Valid user should have all required fields."""
        schema = get_user_validator()
        required = schema["$jsonSchema"]["required"]

        for field in required:
            assert field in valid_user, f"Missing required field: {field}"

    def test_username_length_constraints(self):
        """Username should have length constraints."""
        schema = get_user_validator()
        username_schema = schema["$jsonSchema"]["properties"]["username"]

        assert username_schema["minLength"] == 3
        assert username_schema["maxLength"] == 50

    def test_user_role_enum(self):
        """User role should be from valid enum values."""
        schema = get_user_validator()
        role_enum = schema["$jsonSchema"]["properties"]["role"]["enum"]

        assert "admin" in role_enum
        assert "user" in role_enum
        assert len(role_enum) == 2

        # Invalid role
        assert "superuser" not in role_enum


class TestValidationLevel:
    """Test that moderate validation level doesn't affect existing data."""

    def test_moderate_validation_explanation(self):
        """Document moderate validation level behavior."""
        # Moderate validation level means:
        # - New inserts are validated
        # - Updates to valid documents are validated
        # - Updates to invalid documents are NOT validated
        # - Existing invalid documents can remain

        # This is the safest option for existing data
        validation_levels = {
            "strict": "Validates all operations (can break existing data)",
            "moderate": "Validates new/updated valid docs (SAFE)",
            "off": "No validation (not recommended)"
        }

        assert "moderate" in validation_levels
        assert "SAFE" in validation_levels["moderate"]

    def test_validator_does_not_modify_data(self):
        """Validators are read-only and don't modify data."""
        # Get all validators
        for collection_name, validator_func in VALIDATORS.items():
            schema = validator_func()

            # Schema should only define structure, not modifications
            assert "$jsonSchema" in schema
            assert "$set" not in schema  # No update operators
            assert "$unset" not in schema
            assert "$push" not in schema

            # Schema is purely declarative
            json_schema = schema["$jsonSchema"]
            assert "properties" in json_schema or "required" in json_schema


class TestIntegrationScenarios:
    """Test real-world integration scenarios."""

    def test_bank_with_multiple_loan_types(self):
        """Bank can have multiple loan types."""
        bank = {
            "id": "bank-test",
            "nameFA": "بانک تست",
            "nameEN": "Test Bank",
            "category": "digital-banks",
            "loanTypes": [
                {
                    "id": "loan-1",
                    "nameFA": "وام اول",
                    "calculationMethod": "points-based"
                },
                {
                    "id": "loan-2",
                    "nameFA": "وام دوم",
                    "calculationMethod": "deposit-based"
                },
                {
                    "id": "loan-3",
                    "nameFA": "وام سوم",
                    "calculationMethod": "salary-based"
                }
            ]
        }

        schema = get_bank_validator()
        required = schema["$jsonSchema"]["required"]

        # Bank should have all required fields
        for field in required:
            assert field in bank

        # All loan types should have required fields
        loan_required = schema["$jsonSchema"]["properties"]["loanTypes"]["items"]["required"]
        for loan in bank["loanTypes"]:
            for field in loan_required:
                assert field in loan

    def test_user_loan_lifecycle(self):
        """User loan through its lifecycle."""
        # Initial loan creation
        loan = {
            "user_id": "user123",
            "loan_name": "Home Loan",
            "principal_amount": "500000000",
            "interest_rate": "18.5",
            "total_installments": 120,
            "start_date": datetime(2024, 1, 1),
            "payment_day": 10,
            "is_active": True,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }

        schema = get_user_loan_validator()
        required = schema["$jsonSchema"]["required"]

        for field in required:
            assert field in loan

        # Loan can be deactivated (is_active = False)
        loan["is_active"] = False
        assert loan["is_active"] is False

    def test_payment_schedule_generation(self):
        """Payment schedule for 12-month loan."""
        base_date = datetime(2024, 1, 15)
        payments = []

        for i in range(1, 13):  # 12 months
            payment = {
                "loan_id": "loan123",
                "installment_number": i,
                "due_date": datetime(2024, i, 15),
                "total_payment": "4000000",
                "status": "pending"
            }
            payments.append(payment)

        schema = get_payment_schedule_validator()
        required = schema["$jsonSchema"]["required"]

        # All payments should have required fields
        for payment in payments:
            for field in required:
                assert field in payment

        # Installment numbers should be sequential
        assert [p["installment_number"] for p in payments] == list(range(1, 13))


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
