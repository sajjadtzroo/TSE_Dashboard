"""
Type conversion utilities for TSETMC scraper.
Replaces 29 duplicate @staticmethod converters across spiders.
"""

import logging
import re
from datetime import date, datetime
from typing import Any

import jdatetime

logger = logging.getLogger(__name__)


def persian_to_english_numbers(text: str) -> str:
    """
    Convert Persian/Arabic numerals to English numerals.

    Args:
        text: String containing Persian numerals

    Returns:
        String with English numerals

    Examples:
        >>> persian_to_english_numbers("۱۲۳۴")
        '1234'
        >>> persian_to_english_numbers("test")
        'test'
    """
    if not text or not isinstance(text, str):
        return text

    persian_nums = "۰۱۲۳۴۵۶۷۸۹"
    english_nums = "0123456789"
    translation_table = str.maketrans(persian_nums, english_nums)

    return text.translate(translation_table)


def safe_int(value: Any, default: int | None = None) -> int | None:
    """
    Safely convert value to integer with Persian number support.

    Args:
        value: Value to convert (str, int, float, or None)
        default: Default value if conversion fails (default: None)

    Returns:
        Integer value or default

    Examples:
        >>> safe_int("123")
        123
        >>> safe_int("۱۲۳")
        123
        >>> safe_int("abc", 0)
        0
        >>> safe_int(None)
        None
    """
    if value is None or value == "":
        return default

    try:
        # Convert Persian numbers first if it's a string
        if isinstance(value, str):
            value = persian_to_english_numbers(value.strip())

        # Convert through float to handle "123.0" strings
        return int(float(value))
    except (ValueError, TypeError):
        return default


def safe_float(value: Any, default: float | None = None) -> float | None:
    """
    Safely convert value to float with Persian number support.

    Args:
        value: Value to convert (str, int, float, or None)
        default: Default value if conversion fails (default: None)

    Returns:
        Float value or default

    Examples:
        >>> safe_float("123.45")
        123.45
        >>> safe_float("۱۲۳.۴۵")
        123.45
        >>> safe_float("abc", 0.0)
        0.0
    """
    if value is None or value == "":
        return default

    try:
        # Convert Persian numbers first if it's a string
        if isinstance(value, str):
            value = persian_to_english_numbers(value.strip())

        return float(value)
    except (ValueError, TypeError):
        return default


def safe_date(
    value: Any,
    default: date | None = None,
    format: str = "%Y%m%d",
    is_jalali: bool = False,
) -> date | None:
    """
    Safely convert value to date object.

    Args:
        value: Value to convert (str, int, date, datetime, or None)
        default: Default value if conversion fails (default: None)
        format: Expected date format (default: "%Y%m%d")
        is_jalali: If True, treat as Jalali (Persian) date (default: False)

    Returns:
        date object or default

    Examples:
        >>> safe_date("20260216")
        datetime.date(2026, 2, 16)
        >>> safe_date(20260216)
        datetime.date(2026, 2, 16)
        >>> safe_date("invalid", None)
        None
    """
    if value is None or value == "":
        return default

    try:
        # Already a date object
        if isinstance(value, date):
            return value

        # datetime to date
        if isinstance(value, datetime):
            return value.date()

        # String or int to date
        date_str = str(value).strip()

        # Remove non-digit characters if format is digit-only
        if format == "%Y%m%d" or format == "%Y-%m-%d":
            date_str = re.sub(r"\D", "", date_str)

        # Parse as Jalali date
        if is_jalali:
            year = int(date_str[:4])
            month = int(date_str[4:6])
            day = int(date_str[6:8])
            jd = jdatetime.date(year, month, day)
            return jd.togregorian()

        # Parse as Gregorian date
        if len(date_str) == 8:  # YYYYMMDD
            year = int(date_str[:4])
            month = int(date_str[4:6])
            day = int(date_str[6:8])
            return date(year, month, day)
        else:
            # Try parsing with given format
            dt = datetime.strptime(date_str, format)
            return dt.date()

    except (ValueError, TypeError, IndexError) as e:
        logger.debug(f"Failed to parse date '{value}': {e}")
        return default


def safe_bool(value: Any, default: bool = False) -> bool:
    """
    Safely convert value to boolean.

    Args:
        value: Value to convert
        default: Default value if conversion fails (default: False)

    Returns:
        Boolean value

    Examples:
        >>> safe_bool(1)
        True
        >>> safe_bool("true")
        True
        >>> safe_bool("yes")
        True
        >>> safe_bool(0)
        False
        >>> safe_bool(None)
        False
    """
    if value is None:
        return default

    # Already boolean
    if isinstance(value, bool):
        return value

    # Numeric
    if isinstance(value, (int, float)):
        return bool(value)

    # String
    if isinstance(value, str):
        value_lower = value.lower().strip()
        if value_lower in ("true", "yes", "1", "on"):
            return True
        if value_lower in ("false", "no", "0", "off", ""):
            return False

    return default


def clean_text(text: Any) -> str | None:
    """
    Clean and normalize text.
    - Removes extra whitespace
    - Converts Persian numbers to English
    - Strips leading/trailing whitespace

    Args:
        text: Text to clean

    Returns:
        Cleaned text or None

    Examples:
        >>> clean_text("  hello   world  ")
        'hello world'
        >>> clean_text("  ۱۲۳  ")
        '123'
        >>> clean_text(None)
        None
    """
    if text is None:
        return None

    if not isinstance(text, str):
        text = str(text)

    # Remove extra whitespace
    text = " ".join(text.split())

    # Convert Persian numbers
    text = persian_to_english_numbers(text)

    return text.strip() if text else None
