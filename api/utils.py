"""
Shared utility helpers used across API routes and middleware.
"""

import functools
import logging

from datetime import UTC, datetime

from fastapi import HTTPException
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


def handle_api_errors(detail_message: str):
    """Decorator that wraps a route handler with a standard try/except.

    Re-raises ``HTTPException`` as-is; converts all other exceptions into a
    500 response with the given *detail_message*.
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"{detail_message}: {e}", exc_info=True)
                raise HTTPException(status_code=500, detail=detail_message) from e
        return wrapper
    return decorator


def to_float(val):
    """Convert a value to float, returning None if the input is None."""
    return float(val) if val is not None else None


def wrap_response(data):
    """Wrap response data in the ApiEnvelope format expected by the frontend."""
    return {
        "success": True,
        "data": data,
        "meta": {"timestamp": datetime.now(UTC).isoformat()},
        "errors": None,
    }


def build_error_response(code: int, message: str, request_id: str, details=None):
    """Build a standardized JSON error response for exception handlers."""
    error = {"code": code, "message": message, "request_id": request_id}
    if details is not None:
        error["details"] = details
    return JSONResponse(status_code=code, content={"error": error})
