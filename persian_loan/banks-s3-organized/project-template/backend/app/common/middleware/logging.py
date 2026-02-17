"""
Logging Middleware

Logs every request/response with timing information and the correlation ID
(when the CorrelationIdMiddleware is active upstream).
"""

import time
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.logger import get_logger

logger = get_logger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for logging requests and responses."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()

        # Grab the correlation ID set by CorrelationIdMiddleware (if present)
        correlation_id = getattr(request.state, "correlation_id", "-")

        # Log request
        logger.debug(
            f"[{correlation_id}] Request: {request.method} {request.url.path}"
        )

        # Process request
        response = await call_next(request)

        # Calculate duration
        duration = time.time() - start_time

        # Log response with correlation ID
        logger.info(
            f"[{correlation_id}] {request.method} {request.url.path} - "
            f"Status: {response.status_code} - "
            f"Duration: {duration:.3f}s"
        )

        return response
