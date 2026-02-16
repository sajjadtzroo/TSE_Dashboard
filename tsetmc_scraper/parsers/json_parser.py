"""
JSON parser utilities for BrsApi.ir API responses.
Replaces 13 duplicate JSON envelope unwrapping blocks across spiders.
"""
import json
import logging
from typing import Tuple, List, Dict, Any, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class BrsApiResponse:
    """
    Structured response from BrsApi.ir API.

    Attributes:
        success: Whether the API call was successful
        data: List of data records (empty list if failed)
        error_message: Error message if failed (None if successful)
        http_code: HTTP response code
    """
    success: bool
    data: List[Dict[str, Any]]
    error_message: Optional[str] = None
    http_code: Optional[int] = None


def unwrap_brsapi_envelope(response_text: str) -> BrsApiResponse:
    """
    Unwrap BrsApi.ir JSON envelope and return structured response.

    BrsApi.ir returns responses in this format:
    {
        "code_http": 200,
        "successful": true,
        "data": [...],
        "message_error": "..."  (optional, if error)
    }

    Or sometimes just a plain list: [...]

    Args:
        response_text: Raw response text from BrsApi.ir

    Returns:
        BrsApiResponse with success status, data, and error message

    Examples:
        >>> response = '{"successful": true, "data": [{"symbol": "TEST"}]}'
        >>> result = unwrap_brsapi_envelope(response)
        >>> result.success
        True
        >>> result.data
        [{'symbol': 'TEST'}]

        >>> error_response = '{"successful": false, "message_error": "Invalid key"}'
        >>> result = unwrap_brsapi_envelope(error_response)
        >>> result.success
        False
        >>> result.error_message
        'Invalid key'
    """
    # Parse JSON
    try:
        raw = json.loads(response_text)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON response: {e}")
        return BrsApiResponse(
            success=False,
            data=[],
            error_message=f"JSON decode error: {str(e)}"
        )

    # Handle dict envelope
    if isinstance(raw, dict):
        success = raw.get('successful', False)
        http_code = raw.get('code_http')
        error_msg = raw.get('message_error')
        data = raw.get('data', [])

        # Ensure data is a list
        if not isinstance(data, list):
            if data is None:
                data = []
            else:
                logger.warning(f"Expected list in 'data' field, got {type(data)}")
                data = [data]  # Wrap single item in list

        if not success:
            logger.error(f"BrsApi returned unsuccessful: {error_msg}")
            return BrsApiResponse(
                success=False,
                data=[],
                error_message=error_msg,
                http_code=http_code
            )

        return BrsApiResponse(
            success=True,
            data=data,
            http_code=http_code
        )

    # Handle plain list response
    elif isinstance(raw, list):
        logger.debug("Received plain list response (no envelope)")
        return BrsApiResponse(
            success=True,
            data=raw
        )

    # Unexpected response type
    else:
        logger.error(f"Unexpected response type: {type(raw)}")
        return BrsApiResponse(
            success=False,
            data=[],
            error_message=f"Unexpected response type: {type(raw)}"
        )


def parse_brsapi_record(
    record: Dict[str, Any],
    field_mapping: Dict[str, str],
    converters: Optional[Dict[str, callable]] = None
) -> Dict[str, Any]:
    """
    Parse a single BrsApi record with field mapping and type conversion.

    Args:
        record: Raw record from BrsApi
        field_mapping: Map of {output_key: input_key}
        converters: Optional map of {output_key: converter_function}

    Returns:
        Parsed record with mapped fields and converted types

    Examples:
        >>> record = {"Name": "Test", "Price": "1000.5"}
        >>> mapping = {"name": "Name", "price": "Price"}
        >>> from .type_converters import safe_float
        >>> converters = {"price": safe_float}
        >>> parse_brsapi_record(record, mapping, converters)
        {'name': 'Test', 'price': 1000.5}
    """
    result = {}
    converters = converters or {}

    for out_key, in_key in field_mapping.items():
        value = record.get(in_key)

        # Apply converter if specified
        if out_key in converters:
            converter = converters[out_key]
            value = converter(value)

        result[out_key] = value

    return result
