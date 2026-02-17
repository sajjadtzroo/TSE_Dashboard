"""
Correlation ID Middleware

Generates a unique UUID4 correlation ID for every inbound request and
propagates it through:
- request.state.correlation_id  (available to route handlers)
- X-Correlation-ID response header  (returned to the caller)
- Loguru context                     (included in all log messages)

If the caller supplies an X-Correlation-ID header, that value is reused
so that correlation can span multiple services.
"""

import uuid
from typing import Callable

from fastapi import Request, Response
from loguru import logger
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.logger import get_logger

_logger = get_logger(__name__)

HEADER_NAME = "X-Correlation-ID"


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """Middleware that attaches a correlation ID to every request/response."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Reuse an existing correlation ID from the caller, or generate a new one.
        correlation_id = request.headers.get(HEADER_NAME) or str(uuid.uuid4())

        # Store on request state so route handlers can access it.
        request.state.correlation_id = correlation_id

        # Bind to loguru context so every log line emitted during this request
        # includes the correlation ID.
        with logger.contextualize(correlation_id=correlation_id):
            response = await call_next(request)

        # Always echo the correlation ID back in the response headers.
        response.headers[HEADER_NAME] = correlation_id
        return response


def get_correlation_id(request: Request) -> str:
    """Extract the correlation ID from the current request.

    Use as a FastAPI dependency:
        @router.get("/example")
        async def example(cid: str = Depends(get_correlation_id)):
            ...
    """
    return getattr(request.state, "correlation_id", "unknown")
