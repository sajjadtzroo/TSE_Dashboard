"""
Parser utilities for TSETMC scraper.
Centralized parsers to eliminate code duplication across spiders.
"""

from .json_parser import BrsApiResponse, unwrap_brsapi_envelope
from .order_book_parser import extract_client_type_data, extract_order_book_levels
from .type_converters import (
    clean_text,
    persian_to_english_numbers,
    safe_bool,
    safe_date,
    safe_float,
    safe_int,
)

__all__ = [
    # JSON parsing
    "unwrap_brsapi_envelope",
    "BrsApiResponse",
    # Order book parsing
    "extract_order_book_levels",
    "extract_client_type_data",
    # Type converters
    "safe_int",
    "safe_float",
    "safe_date",
    "safe_bool",
    "persian_to_english_numbers",
    "clean_text",
]
