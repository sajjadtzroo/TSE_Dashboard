"""
Prometheus metrics and structured logging setup for TSE Dashboard.
"""
import logging
import uuid

from fastapi import FastAPI, Request
from starlette.middleware.base import BaseHTTPMiddleware


def setup_prometheus(app: FastAPI):
    """Attach Prometheus metrics instrumentation to the FastAPI app."""
    try:
        from prometheus_fastapi_instrumentator import Instrumentator

        instrumentator = Instrumentator(
            should_group_status_codes=True,
            should_ignore_untemplated=True,
            excluded_handlers=["/health", "/metrics"],
        )

        instrumentator.instrument(app).expose(
            app,
            endpoint="/metrics",
            include_in_schema=False,
        )
        logging.getLogger(__name__).info("Prometheus metrics enabled at /metrics")
    except ImportError:
        logging.getLogger(__name__).info(
            "prometheus-fastapi-instrumentator not installed, metrics disabled"
        )


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Add X-Request-ID header to all requests for correlation."""

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:8])
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


def setup_structured_logging():
    """Configure JSON structured logging if python-json-logger is available."""
    try:
        from pythonjsonlogger import jsonlogger

        handler = logging.StreamHandler()
        formatter = jsonlogger.JsonFormatter(
            fmt="%(asctime)s %(name)s %(levelname)s %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%S",
        )
        handler.setFormatter(formatter)

        root = logging.getLogger()
        root.handlers = [handler]
        root.setLevel(logging.INFO)

        logging.getLogger(__name__).info("Structured JSON logging enabled")
    except ImportError:
        logging.getLogger(__name__).info(
            "python-json-logger not installed, using standard logging"
        )
