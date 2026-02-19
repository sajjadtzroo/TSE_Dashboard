"""
Utility functions for TSETMC scraper
"""

import logging
import re
from datetime import datetime

import jdatetime

logger = logging.getLogger(__name__)

# Common browser User-Agent shared across all spiders
BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"


def num(val, default=None):
    """Convert value to float. Returns *default* on failure."""
    try:
        if isinstance(val, str):
            val = val.strip()
        return float(val) if val is not None else default
    except (ValueError, TypeError):
        return default


def to_int(val, default=None):
    """Convert value to int (via float to handle '123.0' strings)."""
    try:
        if isinstance(val, str):
            val = val.strip()
        return int(float(val)) if val is not None else default
    except (ValueError, TypeError):
        return default


def persian_to_english_numbers(text):
    """
    Convert Persian/Arabic numerals to English numerals

    Args:
        text: String containing Persian numerals

    Returns:
        String with English numerals
    """
    if not text:
        return text

    if not isinstance(text, str):
        return text

    persian_nums = "۰۱۲۳۴۵۶۷۸۹"
    english_nums = "0123456789"

    translation_table = str.maketrans(persian_nums, english_nums)
    return text.translate(translation_table)


def convert_date_to_int(date_input):
    """
    Convert various date formats to YYYYMMDD integer

    Args:
        date_input: Can be int, string, datetime, or jdatetime

    Returns:
        Integer in YYYYMMDD format
    """
    if isinstance(date_input, int):
        return date_input

    if isinstance(date_input, str):
        # Remove any non-digit characters
        cleaned = re.sub(r"\D", "", date_input)
        return int(cleaned) if cleaned else None

    if isinstance(date_input, datetime):
        return int(date_input.strftime("%Y%m%d"))

    if isinstance(date_input, jdatetime.datetime):
        return int(date_input.strftime("%Y%m%d"))

    return None


def convert_date_to_datetime(d_even):
    """
    Convert YYYYMMDD integer to datetime object

    Args:
        d_even: Date as YYYYMMDD integer

    Returns:
        datetime object
    """
    if not d_even:
        return None

    try:
        date_str = str(d_even)
        year = int(date_str[:4])
        month = int(date_str[4:6])
        day = int(date_str[6:8])
        return datetime(year, month, day)
    except (ValueError, IndexError):
        return None


def jalali_to_gregorian(jalali_date):
    """
    Convert Jalali (Persian) date to Gregorian datetime

    Args:
        jalali_date: Date in YYYYMMDD format (Jalali calendar)

    Returns:
        datetime object (Gregorian calendar)
    """
    try:
        date_str = str(jalali_date)
        year = int(date_str[:4])
        month = int(date_str[4:6])
        day = int(date_str[6:8])

        jd = jdatetime.date(year, month, day)
        gd = jd.togregorian()

        return datetime(gd.year, gd.month, gd.day)
    except (ValueError, IndexError) as e:
        logger.error(f"Error converting Jalali date {jalali_date}: {e}")
        return None


def safe_float(value, default=None):
    """
    Safely convert value to float

    Args:
        value: Value to convert
        default: Default value if conversion fails

    Returns:
        Float value or default
    """
    if value is None or value == "":
        return default

    try:
        # Convert Persian numbers first if it's a string
        if isinstance(value, str):
            value = persian_to_english_numbers(value)
        return float(value)
    except (ValueError, TypeError):
        return default


def safe_int(value, default=None):
    """
    Safely convert value to integer

    Args:
        value: Value to convert
        default: Default value if conversion fails

    Returns:
        Integer value or default
    """
    if value is None or value == "":
        return default

    try:
        # Convert Persian numbers first if it's a string
        if isinstance(value, str):
            value = persian_to_english_numbers(value)
        return int(float(value))  # Convert through float to handle "123.0"
    except (ValueError, TypeError):
        return default


def clean_text(text):
    """
    Clean and normalize text

    Args:
        text: Text to clean

    Returns:
        Cleaned text
    """
    if not text:
        return None

    if not isinstance(text, str):
        return text

    # Remove extra whitespace
    text = " ".join(text.split())

    # Convert Persian numbers
    text = persian_to_english_numbers(text)

    return text.strip() if text else None


def validate_ins_code(ins_code):
    """
    Validate instrument code

    Args:
        ins_code: Instrument code to validate

    Returns:
        True if valid, False otherwise
    """
    if not ins_code:
        return False

    try:
        code = int(ins_code)
        # InsCode is typically 14-18 digits (options can be 14-15 digits)
        return 10000000000000 <= code <= 9999999999999999999
    except (ValueError, TypeError):
        return False


def format_price(price, decimals=2):
    """
    Format price for display

    Args:
        price: Price value
        decimals: Number of decimal places

    Returns:
        Formatted price string
    """
    if price is None:
        return "N/A"

    try:
        return f"{float(price):,.{decimals}f}"
    except (ValueError, TypeError):
        return "N/A"


def calculate_percentage_change(current, previous):
    """
    Calculate percentage change between two values

    Args:
        current: Current value
        previous: Previous value

    Returns:
        Percentage change
    """
    if not previous or previous == 0:
        return 0

    try:
        return ((current - previous) / previous) * 100
    except (TypeError, ZeroDivisionError):
        return 0
