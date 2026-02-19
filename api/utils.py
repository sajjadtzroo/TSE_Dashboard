"""
Shared utility helpers used across API routes and middleware.
"""

from datetime import UTC, datetime

from fastapi.responses import JSONResponse


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
