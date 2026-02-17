"""
Comprehensive Schema Validation Tests

Covers:
- Required field enforcement
- Field-level constraints (min_length, ge, le, pattern)
- Custom field validators (Persian text, URL, percentage, etc.)
- Cross-field / model-level validators (min < max ranges)
- Alias (camelCase) round-tripping
- Reusable validators from app.common.validators.field_validators
"""

import pytest
from pydantic import ValidationError

# ---------------------------------------------------------------------------
# Import schemas
# ---------------------------------------------------------------------------
from app.modules.banks.schemas import (
    BankBase,
    BankCategory,
    BankCreate,
    BankListResponse,
    BankResponse,
    BankSummary,
    BankUpdate,
    LoanTierSchema,
    LoanTypeSchema,
)
from app.modules.loans.schemas import (
    LoanCompareRequest,
    LoanCompareResponse,
    LoanListResponse,
    LoanSearchParams,
    LoanSummary,
)
from app.common.validators.field_validators import (
    validate_decimal_string,
    validate_email,
    validate_min_max_range,
    validate_non_negative_number,
    validate_percentage,
    validate_persian_text,
    validate_positive_integer,
    validate_positive_number,
    validate_url,
)


# =========================================================================
# Helpers
# =========================================================================

def _valid_bank_base(**overrides) -> dict:
    """Return a minimal valid BankBase dict with camelCase keys."""
    data = {
        "id": "bank-melli",
        "nameFA": "\u0628\u0627\u0646\u06a9 \u0645\u0644\u06cc",
        "nameEN": "Bank Melli",
        "category": "traditional-banks",
    }
    data.update(overrides)
    return data


def _valid_loan_type(**overrides) -> dict:
    """Return a minimal valid LoanTypeSchema dict."""
    data = {
        "id": "general-loan",
        "nameFA": "\u0648\u0627\u0645 \u0639\u0645\u0648\u0645\u06cc",
        "nameEN": "General Loan",
    }
    data.update(overrides)
    return data


def _valid_loan_summary(**overrides) -> dict:
    data = {
        "bankId": "bank-melli",
        "bankNameFA": "\u0628\u0627\u0646\u06a9 \u0645\u0644\u06cc",
    }
    data.update(overrides)
    return data


# =========================================================================
# 1. Reusable field validators (unit tests)
# =========================================================================

class TestValidatePersianText:
    def test_valid_persian(self):
        assert validate_persian_text("\u0628\u0627\u0646\u06a9") == "\u0628\u0627\u0646\u06a9"

    def test_mixed_persian_english(self):
        result = validate_persian_text("\u0628\u0627\u0646\u06a9 Melli")
        assert "\u0628\u0627\u0646\u06a9" in result

    def test_empty_string_rejected(self):
        with pytest.raises(ValueError, match="empty"):
            validate_persian_text("")

    def test_blank_string_rejected(self):
        with pytest.raises(ValueError, match="empty"):
            validate_persian_text("   ")

    def test_pure_english_rejected(self):
        with pytest.raises(ValueError, match="Persian"):
            validate_persian_text("Bank Melli")


class TestValidatePositiveNumber:
    def test_positive(self):
        assert validate_positive_number(1.5) == 1.5

    def test_zero_rejected(self):
        with pytest.raises(ValueError, match="greater than 0"):
            validate_positive_number(0)

    def test_negative_rejected(self):
        with pytest.raises(ValueError, match="greater than 0"):
            validate_positive_number(-5)


class TestValidateNonNegativeNumber:
    def test_zero_accepted(self):
        assert validate_non_negative_number(0) == 0

    def test_positive_accepted(self):
        assert validate_non_negative_number(42.5) == 42.5

    def test_negative_rejected(self):
        with pytest.raises(ValueError, match="non-negative"):
            validate_non_negative_number(-0.01)


class TestValidatePercentage:
    def test_zero(self):
        assert validate_percentage(0) == 0

    def test_hundred(self):
        assert validate_percentage(100) == 100

    def test_mid_range(self):
        assert validate_percentage(18.5) == 18.5

    def test_over_100_rejected(self):
        with pytest.raises(ValueError, match="between 0 and 100"):
            validate_percentage(100.1)

    def test_negative_rejected(self):
        with pytest.raises(ValueError, match="between 0 and 100"):
            validate_percentage(-1)


class TestValidatePositiveInteger:
    def test_valid(self):
        assert validate_positive_integer(1) == 1

    def test_zero_rejected(self):
        with pytest.raises(ValueError, match="positive integer"):
            validate_positive_integer(0)


class TestValidateDecimalString:
    def test_valid(self):
        assert validate_decimal_string("123.45") == "123.45"

    def test_positive_enforced(self):
        with pytest.raises(ValueError, match="positive"):
            validate_decimal_string("-10", positive=True)

    def test_too_many_decimals(self):
        with pytest.raises(ValueError, match="decimal places"):
            validate_decimal_string("1.123", max_decimal_places=2)

    def test_invalid_format(self):
        with pytest.raises(ValueError, match="valid decimal"):
            validate_decimal_string("abc")


class TestValidateEmail:
    def test_valid_email(self):
        assert validate_email("user@example.com") == "user@example.com"

    def test_strips_and_lowercases(self):
        assert validate_email("  User@Example.COM  ") == "user@example.com"

    def test_invalid_email(self):
        with pytest.raises(ValueError, match="email"):
            validate_email("not-an-email")


class TestValidateUrl:
    def test_valid_https(self):
        assert validate_url("https://example.com") == "https://example.com"

    def test_valid_http(self):
        assert validate_url("http://localhost:8000") == "http://localhost:8000"

    def test_missing_scheme(self):
        with pytest.raises(ValueError, match="URL"):
            validate_url("example.com")

    def test_ftp_rejected(self):
        with pytest.raises(ValueError, match="URL"):
            validate_url("ftp://example.com")


class TestValidateMinMaxRange:
    def test_valid_range(self):
        validate_min_max_range(10, 20)  # should not raise

    def test_equal_values_ok(self):
        validate_min_max_range(10, 10)  # should not raise

    def test_none_values_ok(self):
        validate_min_max_range(None, 20)
        validate_min_max_range(10, None)
        validate_min_max_range(None, None)

    def test_min_greater_than_max(self):
        with pytest.raises(ValueError, match="greater than or equal"):
            validate_min_max_range(30, 20)


# =========================================================================
# 2. BankBase schema
# =========================================================================

class TestBankBase:
    def test_valid_bank_base(self):
        bank = BankBase(**_valid_bank_base())
        assert bank.id == "bank-melli"
        assert bank.name_fa == "\u0628\u0627\u0646\u06a9 \u0645\u0644\u06cc"
        assert bank.name_en == "Bank Melli"
        assert bank.category == "traditional-banks"

    def test_missing_id(self):
        data = _valid_bank_base()
        del data["id"]
        with pytest.raises(ValidationError) as exc_info:
            BankBase(**data)
        assert "id" in str(exc_info.value)

    def test_missing_name_fa(self):
        data = _valid_bank_base()
        del data["nameFA"]
        with pytest.raises(ValidationError):
            BankBase(**data)

    def test_missing_name_en(self):
        data = _valid_bank_base()
        del data["nameEN"]
        with pytest.raises(ValidationError):
            BankBase(**data)

    def test_missing_category(self):
        data = _valid_bank_base()
        del data["category"]
        with pytest.raises(ValidationError):
            BankBase(**data)

    def test_empty_id_rejected(self):
        with pytest.raises(ValidationError):
            BankBase(**_valid_bank_base(id=""))

    def test_invalid_category_rejected(self):
        with pytest.raises(ValidationError, match="Invalid category"):
            BankBase(**_valid_bank_base(category="nonexistent"))

    def test_valid_categories(self):
        for cat in BankCategory:
            bank = BankBase(**_valid_bank_base(category=cat.value))
            assert bank.category == cat.value

    def test_name_fa_must_be_persian(self):
        with pytest.raises(ValidationError, match="Persian"):
            BankBase(**_valid_bank_base(nameFA="Bank Melli"))

    def test_valid_website(self):
        bank = BankBase(**_valid_bank_base(website="https://bmi.ir"))
        assert bank.website == "https://bmi.ir"

    def test_invalid_website_rejected(self):
        with pytest.raises(ValidationError, match="URL"):
            BankBase(**_valid_bank_base(website="not-a-url"))

    def test_none_website_allowed(self):
        bank = BankBase(**_valid_bank_base(website=None))
        assert bank.website is None

    def test_camelcase_alias_works(self):
        """Ensure we can pass data via camelCase and read via snake_case."""
        bank = BankBase(**_valid_bank_base())
        assert bank.name_fa == "\u0628\u0627\u0646\u06a9 \u0645\u0644\u06cc"
        # Also verify serialization with aliases
        d = bank.model_dump(by_alias=True)
        assert "nameFA" in d
        assert "nameEN" in d


# =========================================================================
# 3. LoanTypeSchema
# =========================================================================

class TestLoanTypeSchema:
    def test_valid_minimal(self):
        lt = LoanTypeSchema(**_valid_loan_type())
        assert lt.id == "general-loan"
        assert lt.name_fa == "\u0648\u0627\u0645 \u0639\u0645\u0648\u0645\u06cc"
        assert lt.name_en == "General Loan"

    def test_missing_id(self):
        data = _valid_loan_type()
        del data["id"]
        with pytest.raises(ValidationError):
            LoanTypeSchema(**data)

    def test_missing_name_fa(self):
        data = _valid_loan_type()
        del data["nameFA"]
        with pytest.raises(ValidationError):
            LoanTypeSchema(**data)

    def test_missing_name_en(self):
        data = _valid_loan_type()
        del data["nameEN"]
        with pytest.raises(ValidationError):
            LoanTypeSchema(**data)

    def test_name_fa_must_be_persian(self):
        with pytest.raises(ValidationError, match="Persian"):
            LoanTypeSchema(**_valid_loan_type(nameFA="General Loan"))

    def test_interest_rate_numeric_valid(self):
        lt = LoanTypeSchema(**_valid_loan_type(interestRateNumeric=18.5))
        assert lt.interest_rate_numeric == 18.5

    def test_interest_rate_numeric_zero(self):
        lt = LoanTypeSchema(**_valid_loan_type(interestRateNumeric=0))
        assert lt.interest_rate_numeric == 0

    def test_interest_rate_numeric_100(self):
        lt = LoanTypeSchema(**_valid_loan_type(interestRateNumeric=100))
        assert lt.interest_rate_numeric == 100

    def test_interest_rate_over_100_rejected(self):
        with pytest.raises(ValidationError):
            LoanTypeSchema(**_valid_loan_type(interestRateNumeric=101))

    def test_interest_rate_negative_rejected(self):
        with pytest.raises(ValidationError):
            LoanTypeSchema(**_valid_loan_type(interestRateNumeric=-1))

    def test_min_max_amount_valid(self):
        lt = LoanTypeSchema(
            **_valid_loan_type(minAmountNumeric=1000, maxAmountNumeric=5000)
        )
        assert lt.min_amount_numeric == 1000
        assert lt.max_amount_numeric == 5000

    def test_min_max_amount_equal(self):
        lt = LoanTypeSchema(
            **_valid_loan_type(minAmountNumeric=1000, maxAmountNumeric=1000)
        )
        assert lt.min_amount_numeric == lt.max_amount_numeric

    def test_min_greater_than_max_rejected(self):
        with pytest.raises(ValidationError, match="greater than or equal"):
            LoanTypeSchema(
                **_valid_loan_type(minAmountNumeric=5000, maxAmountNumeric=1000)
            )

    def test_negative_amount_rejected(self):
        with pytest.raises(ValidationError):
            LoanTypeSchema(**_valid_loan_type(minAmountNumeric=-100))

    def test_alias_round_trip(self):
        data = _valid_loan_type(
            interestRateNumeric=18, minAmountNumeric=1000, maxAmountNumeric=5000
        )
        lt = LoanTypeSchema(**data)
        d = lt.model_dump(by_alias=True)
        assert "nameFA" in d
        assert "nameEN" in d
        assert "interestRateNumeric" in d
        assert "minAmountNumeric" in d
        assert "maxAmountNumeric" in d


# =========================================================================
# 4. BankCreate
# =========================================================================

class TestBankCreate:
    def test_valid_bank_create(self):
        data = _valid_bank_base()
        data["loanTypes"] = [_valid_loan_type()]
        bank = BankCreate(**data)
        assert len(bank.loan_types) == 1
        assert bank.loan_types[0].id == "general-loan"

    def test_no_loan_types_allowed(self):
        """loan_types is optional; None is fine."""
        bank = BankCreate(**_valid_bank_base())
        assert bank.loan_types is None

    def test_empty_loan_types_rejected(self):
        data = _valid_bank_base()
        data["loanTypes"] = []
        with pytest.raises(ValidationError, match="at least one item"):
            BankCreate(**data)

    def test_duplicate_loan_type_ids_rejected(self):
        lt = _valid_loan_type()
        data = _valid_bank_base()
        data["loanTypes"] = [lt, lt]
        with pytest.raises(ValidationError, match="Duplicate loan type IDs"):
            BankCreate(**data)

    def test_nested_loan_type_validation(self):
        """Invalid nested loan type should bubble up."""
        bad_lt = {"id": "", "nameFA": "test", "nameEN": "Test"}
        data = _valid_bank_base()
        data["loanTypes"] = [bad_lt]
        with pytest.raises(ValidationError):
            BankCreate(**data)

    def test_loans_count_non_negative(self):
        bank = BankCreate(**_valid_bank_base(loansCount=0))
        assert bank.loans_count == 0

    def test_loans_count_negative_rejected(self):
        with pytest.raises(ValidationError):
            BankCreate(**_valid_bank_base(loansCount=-1))


# =========================================================================
# 5. BankUpdate
# =========================================================================

class TestBankUpdate:
    def test_empty_update_ok(self):
        """An update with no fields is valid (no-op)."""
        update = BankUpdate()
        assert update.name_fa is None
        assert update.category is None

    def test_partial_update(self):
        update = BankUpdate(nameFA="\u0628\u0627\u0646\u06a9 \u062c\u062f\u06cc\u062f")
        assert update.name_fa == "\u0628\u0627\u0646\u06a9 \u062c\u062f\u06cc\u062f"

    def test_invalid_category_in_update(self):
        with pytest.raises(ValidationError, match="Invalid category"):
            BankUpdate(category="bad-category")

    def test_invalid_website_in_update(self):
        with pytest.raises(ValidationError, match="URL"):
            BankUpdate(website="not-a-url")

    def test_name_fa_persian_validation_in_update(self):
        with pytest.raises(ValidationError, match="Persian"):
            BankUpdate(nameFA="English Only")


# =========================================================================
# 6. BankResponse
# =========================================================================

class TestBankResponse:
    def test_from_dict(self):
        data = _valid_bank_base()
        data["loansCount"] = 5
        data["calculationMethod"] = "points-based"
        resp = BankResponse(**data)
        assert resp.loans_count == 5
        assert resp.calculation_method == "points-based"


# =========================================================================
# 7. BankSummary
# =========================================================================

class TestBankSummary:
    def test_valid_summary(self):
        s = BankSummary(
            id="x",
            nameFA="\u0628\u0627\u0646\u06a9",
            nameEN="Bank",
            category="traditional-banks",
            loansCount=3,
        )
        assert s.loans_count == 3


# =========================================================================
# 8. BankListResponse
# =========================================================================

class TestBankListResponse:
    def test_valid(self):
        resp = BankListResponse(
            total=1,
            banks=[
                BankSummary(
                    id="x",
                    nameFA="\u0628\u0627\u0646\u06a9",
                    nameEN="Bank",
                    category="traditional-banks",
                )
            ],
        )
        assert resp.total == 1

    def test_negative_total_rejected(self):
        with pytest.raises(ValidationError):
            BankListResponse(total=-1, banks=[])


# =========================================================================
# 9. LoanSummary
# =========================================================================

class TestLoanSummary:
    def test_valid_minimal(self):
        ls = LoanSummary(**_valid_loan_summary())
        assert ls.bank_id == "bank-melli"

    def test_missing_bank_id(self):
        with pytest.raises(ValidationError):
            LoanSummary(bankNameFA="\u0628\u0627\u0646\u06a9")

    def test_missing_bank_name_fa(self):
        with pytest.raises(ValidationError):
            LoanSummary(bankId="bank-melli")

    def test_interest_rate_numeric_bounds(self):
        ls = LoanSummary(**_valid_loan_summary(interestRateNumeric=18.0))
        assert ls.interest_rate_numeric == 18.0

        with pytest.raises(ValidationError):
            LoanSummary(**_valid_loan_summary(interestRateNumeric=101))

    def test_amount_range_validation(self):
        with pytest.raises(ValidationError, match="maxAmountNumeric"):
            LoanSummary(
                **_valid_loan_summary(minAmountNumeric=5000, maxAmountNumeric=1000)
            )

    def test_alias_round_trip(self):
        ls = LoanSummary(**_valid_loan_summary())
        d = ls.model_dump(by_alias=True)
        assert "bankId" in d
        assert "bankNameFA" in d


# =========================================================================
# 10. LoanCompareRequest
# =========================================================================

class TestLoanCompareRequest:
    def test_valid_request(self):
        req = LoanCompareRequest(loanIds=["a:loan1", "b:loan2"])
        assert len(req.loan_ids) == 2

    def test_single_id_rejected(self):
        with pytest.raises(ValidationError):
            LoanCompareRequest(loanIds=["only-one"])

    def test_too_many_ids_rejected(self):
        with pytest.raises(ValidationError):
            LoanCompareRequest(loanIds=[f"loan-{i}" for i in range(11)])

    def test_duplicate_ids_rejected(self):
        with pytest.raises(ValidationError, match="Duplicate"):
            LoanCompareRequest(loanIds=["same", "same"])

    def test_alias_works(self):
        req = LoanCompareRequest(**{"loanIds": ["a", "b"]})
        assert req.loan_ids == ["a", "b"]


# =========================================================================
# 11. LoanSearchParams
# =========================================================================

class TestLoanSearchParams:
    def test_empty_params_ok(self):
        p = LoanSearchParams()
        assert p.bank_id is None

    def test_interest_rate_range(self):
        p = LoanSearchParams(minInterestRate=5, maxInterestRate=20)
        assert p.min_interest_rate == 5
        assert p.max_interest_rate == 20

    def test_interest_rate_min_greater_than_max(self):
        with pytest.raises(ValidationError, match="minInterestRate"):
            LoanSearchParams(minInterestRate=25, maxInterestRate=10)

    def test_loan_amount_range(self):
        p = LoanSearchParams(minLoanAmount=1000, maxLoanAmount=50000)
        assert p.min_loan_amount == 1000

    def test_loan_amount_min_greater_than_max(self):
        with pytest.raises(ValidationError, match="minLoanAmount"):
            LoanSearchParams(minLoanAmount=50000, maxLoanAmount=1000)

    def test_negative_interest_rate_rejected(self):
        with pytest.raises(ValidationError):
            LoanSearchParams(minInterestRate=-5)

    def test_interest_rate_over_100_rejected(self):
        with pytest.raises(ValidationError):
            LoanSearchParams(maxInterestRate=150)


# =========================================================================
# 12. LoanListResponse
# =========================================================================

class TestLoanListResponse:
    def test_valid(self):
        resp = LoanListResponse(total=0, items=[])
        assert resp.total == 0

    def test_negative_total_rejected(self):
        with pytest.raises(ValidationError):
            LoanListResponse(total=-1, items=[])


# =========================================================================
# 13. LoanTierSchema
# =========================================================================

class TestLoanTierSchema:
    def test_valid(self):
        t = LoanTierSchema(amount="500000000", pointsRequired=100)
        assert t.amount == "500000000"
        assert t.points_required == 100

    def test_missing_amount(self):
        with pytest.raises(ValidationError):
            LoanTierSchema(pointsRequired=100)

    def test_negative_points_rejected(self):
        with pytest.raises(ValidationError):
            LoanTierSchema(amount="100", pointsRequired=-1)


# =========================================================================
# 14. OpenAPI json_schema_extra presence
# =========================================================================

class TestOpenAPIExamples:
    def test_bank_base_has_examples(self):
        schema = BankBase.model_json_schema()
        assert "examples" in schema

    def test_loan_type_has_examples(self):
        schema = LoanTypeSchema.model_json_schema()
        assert "examples" in schema

    def test_bank_create_has_examples(self):
        schema = BankCreate.model_json_schema()
        assert "examples" in schema

    def test_loan_summary_has_examples(self):
        schema = LoanSummary.model_json_schema()
        assert "examples" in schema

    def test_loan_compare_request_has_examples(self):
        schema = LoanCompareRequest.model_json_schema()
        assert "examples" in schema
