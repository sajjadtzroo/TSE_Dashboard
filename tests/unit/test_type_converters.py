"""
Unit tests for type converter utilities.
"""

from datetime import date, datetime

from tsetmc_scraper.parsers.type_converters import (
    clean_text,
    persian_to_english_numbers,
    safe_bool,
    safe_date,
    safe_float,
    safe_int,
)


class TestPersianToEnglish:
    def test_persian_numbers(self):
        assert persian_to_english_numbers("۱۲۳۴۵۶۷۸۹۰") == "1234567890"

    def test_mixed_content(self):
        assert persian_to_english_numbers("test۱۲۳") == "test123"

    def test_empty_string(self):
        assert persian_to_english_numbers("") == ""

    def test_none(self):
        assert persian_to_english_numbers(None) is None

    def test_non_string(self):
        assert persian_to_english_numbers(123) == 123


class TestSafeInt:
    def test_valid_string(self):
        assert safe_int("123") == 123

    def test_persian_string(self):
        assert safe_int("۱۲۳") == 123

    def test_float_string(self):
        assert safe_int("123.9") == 123

    def test_negative(self):
        assert safe_int("-45") == -45

    def test_invalid_string(self):
        assert safe_int("abc") is None

    def test_invalid_with_default(self):
        assert safe_int("abc", 0) == 0

    def test_none(self):
        assert safe_int(None) is None

    def test_empty_string(self):
        assert safe_int("") is None

    def test_int_input(self):
        assert safe_int(42) == 42

    def test_float_input(self):
        assert safe_int(42.9) == 42


class TestSafeFloat:
    def test_valid_string(self):
        assert safe_float("123.45") == 123.45

    def test_persian_string(self):
        assert safe_float("۱۲۳.۴۵") == 123.45

    def test_negative(self):
        assert safe_float("-45.5") == -45.5

    def test_invalid_string(self):
        assert safe_float("abc") is None

    def test_invalid_with_default(self):
        assert safe_float("abc", 0.0) == 0.0

    def test_none(self):
        assert safe_float(None) is None

    def test_empty_string(self):
        assert safe_float("") is None

    def test_int_input(self):
        assert safe_float(42) == 42.0

    def test_float_input(self):
        assert safe_float(42.5) == 42.5


class TestSafeDate:
    def test_yyyymmdd_string(self):
        result = safe_date("20260216")
        assert result == date(2026, 2, 16)

    def test_yyyymmdd_int(self):
        result = safe_date(20260216)
        assert result == date(2026, 2, 16)

    def test_date_input(self):
        input_date = date(2026, 2, 16)
        assert safe_date(input_date) == input_date

    def test_datetime_input(self):
        input_dt = datetime(2026, 2, 16, 10, 30)
        assert safe_date(input_dt) == date(2026, 2, 16)

    def test_invalid_string(self):
        assert safe_date("invalid") is None

    def test_invalid_with_default(self):
        default = date(2020, 1, 1)
        assert safe_date("invalid", default) == default

    def test_none(self):
        assert safe_date(None) is None

    def test_empty_string(self):
        assert safe_date("") is None


class TestSafeBool:
    def test_true_bool(self):
        assert safe_bool(True) is True

    def test_false_bool(self):
        assert safe_bool(False) is False

    def test_true_int(self):
        assert safe_bool(1) is True

    def test_false_int(self):
        assert safe_bool(0) is False

    def test_true_string(self):
        assert safe_bool("true") is True
        assert safe_bool("True") is True
        assert safe_bool("yes") is True
        assert safe_bool("1") is True

    def test_false_string(self):
        assert safe_bool("false") is False
        assert safe_bool("False") is False
        assert safe_bool("no") is False
        assert safe_bool("0") is False

    def test_none(self):
        assert safe_bool(None) is False

    def test_none_with_default(self):
        assert safe_bool(None, True) is True


class TestCleanText:
    def test_extra_whitespace(self):
        assert clean_text("  hello   world  ") == "hello world"

    def test_persian_numbers(self):
        assert clean_text("test۱۲۳") == "test123"

    def test_combined(self):
        assert clean_text("  test  ۱۲۳  ") == "test 123"

    def test_none(self):
        assert clean_text(None) is None

    def test_empty_string(self):
        assert clean_text("") is None

    def test_non_string(self):
        assert clean_text(123) == "123"
