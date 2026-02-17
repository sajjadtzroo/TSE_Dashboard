"""
Reusable Pydantic Field Validators

Provides composable validation functions for use as Pydantic field_validators
across all schema modules. These validators raise ValueError (not HTTPException)
so they integrate naturally with Pydantic's validation pipeline.
"""

import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Optional


# ---------------------------------------------------------------------------
# Persian / Arabic text utilities
# ---------------------------------------------------------------------------

# Unicode ranges for Persian/Arabic characters
_PERSIAN_ARABIC_PATTERN = re.compile(
    r"[\u0600-\u06FF"   # Arabic block
    r"\u0750-\u077F"    # Arabic Supplement
    r"\uFB50-\uFDFF"    # Arabic Presentation Forms-A
    r"\uFE70-\uFEFF"    # Arabic Presentation Forms-B
    r"\u200C\u200D"     # Zero-width non-joiner / joiner (used in Persian)
    r"]"
)

_PERSIAN_ONLY_PATTERN = re.compile(
    r"[\u0600-\u06FF\u200C\u200D]"
)


def validate_persian_text(value: str) -> str:
    """
    Validate that a string contains at least one Persian/Arabic character.

    Useful for fields like nameFA where the value should be in Persian.

    Args:
        value: The string to validate.

    Returns:
        The original string if valid.

    Raises:
        ValueError: If no Persian/Arabic characters are found.
    """
    if not value or not value.strip():
        raise ValueError("Persian text must not be empty or blank")
    if not _PERSIAN_ARABIC_PATTERN.search(value):
        raise ValueError(
            "Text must contain at least one Persian/Arabic character"
        )
    return value


def validate_contains_only_persian(value: str) -> str:
    """
    Validate that a string contains *only* Persian/Arabic characters,
    digits, whitespace, and common punctuation.

    Args:
        value: The string to validate.

    Returns:
        The original string if valid.

    Raises:
        ValueError: If disallowed characters are found.
    """
    allowed = re.compile(
        r"^["
        r"\u0600-\u06FF"
        r"\u0750-\u077F"
        r"\uFB50-\uFDFF"
        r"\uFE70-\uFEFF"
        r"\u200C\u200D"
        r"\u06F0-\u06F9"  # Persian digits
        r"\u0660-\u0669"  # Arabic-Indic digits
        r"0-9"
        r"\s"
        r"\.\,\;\:\!\?\-\(\)\[\]"
        r"]+$"
    )
    if not allowed.match(value):
        raise ValueError("Text contains characters outside the allowed Persian character set")
    return value


# ---------------------------------------------------------------------------
# Numeric validators
# ---------------------------------------------------------------------------

def validate_positive_number(value: float, *, field_name: str = "value") -> float:
    """
    Validate that a numeric value is strictly positive.

    Args:
        value: The number to validate.
        field_name: Human-readable field name for error messages.

    Returns:
        The original value.

    Raises:
        ValueError: If value is zero or negative.
    """
    if value <= 0:
        raise ValueError(f"{field_name} must be greater than 0")
    return value


def validate_non_negative_number(value: float, *, field_name: str = "value") -> float:
    """
    Validate that a numeric value is zero or positive.

    Args:
        value: The number to validate.
        field_name: Human-readable field name for error messages.

    Returns:
        The original value.

    Raises:
        ValueError: If value is negative.
    """
    if value < 0:
        raise ValueError(f"{field_name} must be non-negative")
    return value


def validate_percentage(value: float) -> float:
    """
    Validate that a value represents a percentage between 0 and 100 inclusive.

    Args:
        value: The percentage to validate.

    Returns:
        The original value.

    Raises:
        ValueError: If value is outside [0, 100].
    """
    if value < 0 or value > 100:
        raise ValueError("Percentage must be between 0 and 100")
    return value


def validate_positive_integer(value: int, *, field_name: str = "value") -> int:
    """
    Validate that an integer is strictly positive.

    Args:
        value: The integer to validate.
        field_name: Human-readable field name for error messages.

    Returns:
        The original value.

    Raises:
        ValueError: If value is zero or negative.
    """
    if value <= 0:
        raise ValueError(f"{field_name} must be a positive integer")
    return value


def validate_decimal_string(
    value: str,
    *,
    field_name: str = "value",
    positive: bool = True,
    max_decimal_places: int = 2,
    max_value: Optional[Decimal] = None,
) -> str:
    """
    Validate a string represents a valid decimal number.

    Args:
        value: The string to validate.
        field_name: Human-readable field name for error messages.
        positive: Whether the value must be positive.
        max_decimal_places: Maximum number of decimal places allowed.
        max_value: Optional upper bound.

    Returns:
        The original string if valid.

    Raises:
        ValueError: If validation fails.
    """
    try:
        d = Decimal(value)
    except (InvalidOperation, TypeError):
        raise ValueError(f"{field_name} must be a valid decimal number")

    if positive and d <= 0:
        raise ValueError(f"{field_name} must be a positive number")

    if d.as_tuple().exponent < -max_decimal_places:
        raise ValueError(
            f"{field_name} must have at most {max_decimal_places} decimal places"
        )

    if max_value is not None and d > max_value:
        raise ValueError(f"{field_name} must not exceed {max_value}")

    return value


# ---------------------------------------------------------------------------
# Range validators (min < max)
# ---------------------------------------------------------------------------

def validate_min_max_range(
    min_val: Optional[float],
    max_val: Optional[float],
    *,
    min_field: str = "minimum",
    max_field: str = "maximum",
) -> None:
    """
    Validate that min_val <= max_val when both are provided.

    Args:
        min_val: The minimum value (may be None).
        max_val: The maximum value (may be None).
        min_field: Human-readable name for the minimum field.
        max_field: Human-readable name for the maximum field.

    Raises:
        ValueError: If min_val > max_val.
    """
    if min_val is not None and max_val is not None and min_val > max_val:
        raise ValueError(
            f"{max_field} ({max_val}) must be greater than or equal to "
            f"{min_field} ({min_val})"
        )


# ---------------------------------------------------------------------------
# Date validators
# ---------------------------------------------------------------------------

def validate_date_not_in_future(value: date) -> date:
    """
    Validate that a date is not in the future.

    Args:
        value: The date to validate.

    Returns:
        The original date.

    Raises:
        ValueError: If the date is in the future.
    """
    if value > date.today():
        raise ValueError("Date must not be in the future")
    return value


def validate_date_range(start: date, end: date) -> None:
    """
    Validate that start date is before or equal to end date.

    Args:
        start: Start date.
        end: End date.

    Raises:
        ValueError: If start > end.
    """
    if start > end:
        raise ValueError("Start date must be before or equal to end date")


# ---------------------------------------------------------------------------
# Email / URL validators
# ---------------------------------------------------------------------------

_EMAIL_PATTERN = re.compile(
    r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
)


def validate_email(value: str) -> str:
    """
    Basic email format validation.

    For production use with Pydantic, prefer ``pydantic.EmailStr`` which uses
    ``email-validator``. This function is for lightweight standalone checks.

    Args:
        value: The email string.

    Returns:
        The lowercased, stripped email.

    Raises:
        ValueError: If the format is invalid.
    """
    stripped = value.strip().lower()
    if not _EMAIL_PATTERN.match(stripped):
        raise ValueError("Invalid email format")
    return stripped


_URL_PATTERN = re.compile(
    r"^https?://"
    r"[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?"
    r"(\.[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?)*"
    r"(:\d{1,5})?"
    r"(/[^\s]*)?$"
)


def validate_url(value: str) -> str:
    """
    Validate that a string is a well-formed HTTP(S) URL.

    Args:
        value: The URL string.

    Returns:
        The original string if valid.

    Raises:
        ValueError: If the URL is invalid.
    """
    if not _URL_PATTERN.match(value):
        raise ValueError("URL must be a valid HTTP or HTTPS URL")
    return value
