"""
Core Utility Functions

Common helper functions used throughout the application.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional, Union


def convert_to_datetime(dt: Union[date, datetime, None]) -> Optional[datetime]:
    """
    Convert date to datetime for MongoDB storage.

    MongoDB stores dates as datetime, so we need to convert
    date objects to datetime at midnight.

    Args:
        dt: Date or datetime object

    Returns:
        Datetime object or None
    """
    if dt is None:
        return None
    if isinstance(dt, datetime):
        return dt
    if isinstance(dt, date):
        return datetime.combine(dt, datetime.min.time())
    return None


def convert_to_date(dt: Union[date, datetime, None]) -> Optional[date]:
    """
    Convert datetime to date.

    Args:
        dt: Date or datetime object

    Returns:
        Date object or None
    """
    if dt is None:
        return None
    if isinstance(dt, date) and not isinstance(dt, datetime):
        return dt
    if isinstance(dt, datetime):
        return dt.date()
    return None


def safe_decimal(value: Any, default: str = "0") -> Decimal:
    """
    Safely convert value to Decimal.

    Args:
        value: Value to convert
        default: Default value if conversion fails

    Returns:
        Decimal value
    """
    try:
        if value is None:
            return Decimal(default)
        if isinstance(value, Decimal):
            return value
        return Decimal(str(value))
    except Exception:
        return Decimal(default)


def safe_int(value: Any, default: int = 0) -> int:
    """
    Safely convert value to int.

    Args:
        value: Value to convert
        default: Default value if conversion fails

    Returns:
        Integer value
    """
    try:
        if value is None:
            return default
        return int(value)
    except Exception:
        return default


def safe_float(value: Any, default: float = 0.0) -> float:
    """
    Safely convert value to float.

    Args:
        value: Value to convert
        default: Default value if conversion fails

    Returns:
        Float value
    """
    try:
        if value is None:
            return default
        return float(value)
    except Exception:
        return default


def format_currency(amount: Union[int, float, Decimal, str], currency: str = "IRR") -> str:
    """
    Format amount as currency string.

    Args:
        amount: Amount to format
        currency: Currency code (default: IRR for Iranian Rial)

    Returns:
        Formatted currency string
    """
    try:
        value = float(amount)
        if currency == "IRR":
            # Iranian Rial formatting (no decimals)
            return f"{int(value):,} ریال"
        return f"{value:,.2f} {currency}"
    except Exception:
        return str(amount)


def chunk_list(items: List[Any], chunk_size: int) -> List[List[Any]]:
    """
    Split list into chunks of specified size.

    Useful for batch processing to avoid memory issues.

    Args:
        items: List to chunk
        chunk_size: Size of each chunk

    Returns:
        List of chunked lists
    """
    if chunk_size <= 0:
        return [items]

    return [items[i:i + chunk_size] for i in range(0, len(items), chunk_size)]


def flatten_dict(d: Dict[str, Any], parent_key: str = "", sep: str = ".") -> Dict[str, Any]:
    """
    Flatten nested dictionary.

    Example:
        {"a": {"b": 1}} -> {"a.b": 1}

    Args:
        d: Dictionary to flatten
        parent_key: Parent key prefix
        sep: Separator character

    Returns:
        Flattened dictionary
    """
    items: List[tuple] = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        else:
            items.append((new_key, v))
    return dict(items)


def get_nested_value(d: Dict[str, Any], path: str, default: Any = None) -> Any:
    """
    Get value from nested dictionary using dot notation.

    Example:
        get_nested_value({"a": {"b": 1}}, "a.b") -> 1

    Args:
        d: Dictionary to search
        path: Dot-separated path
        default: Default value if path not found

    Returns:
        Value at path or default
    """
    keys = path.split(".")
    value = d
    for key in keys:
        if isinstance(value, dict):
            value = value.get(key)
            if value is None:
                return default
        else:
            return default
    return value


def remove_none_values(d: Dict[str, Any]) -> Dict[str, Any]:
    """
    Remove keys with None values from dictionary.

    Args:
        d: Dictionary to clean

    Returns:
        Dictionary without None values
    """
    return {k: v for k, v in d.items() if v is not None}


def merge_dicts(base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
    """
    Merge two dictionaries, with override taking precedence.

    Args:
        base: Base dictionary
        override: Override dictionary

    Returns:
        Merged dictionary
    """
    result = base.copy()
    result.update(remove_none_values(override))
    return result
