"""
Rate Limiting Middleware

Configures SlowAPI-based rate limiting with tiered limits:
- Default: 100 requests/minute
- Auth endpoints (login/register): 5 requests/minute
- Read endpoints (GET): 200 requests/minute
- Write endpoints (POST/PUT/DELETE): 20 requests/minute

Supports Redis backend with automatic in-memory fallback.
"""

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.requests import Request

from app.core.config import settings
from app.core.logger import get_logger

logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# Rate limit key function
# ---------------------------------------------------------------------------


def _get_client_identifier(request: Request) -> str:
    """Extract client identifier for rate limiting.

    Uses X-Forwarded-For header if behind a proxy, otherwise falls back
    to the direct remote address.
    """
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        # First IP in the chain is the real client
        return forwarded.split(",")[0].strip()
    return get_remote_address(request)


# ---------------------------------------------------------------------------
# Limiter instance
# ---------------------------------------------------------------------------

# Determine storage backend for rate limiter.
# Use in-memory storage as default/fallback; use Redis if available and
# a connection can be established at import time.
_storage_uri = "memory://"

try:
    redis_url = getattr(settings, "redis_url", "")
    if redis_url and settings.cache_enabled:
        # Attempt a quick synchronous TCP check to see if Redis is reachable
        import socket

        _host = redis_url.split("://")[-1].split("/")[0]  # e.g. "localhost:6379"
        _parts = _host.split(":")
        _redis_host = _parts[0] if _parts[0] else "localhost"
        _redis_port = int(_parts[1]) if len(_parts) > 1 else 6379

        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)
        result = sock.connect_ex((_redis_host, _redis_port))
        sock.close()

        if result == 0:
            _storage_uri = redis_url
            logger.info(f"Rate limiter storage: Redis ({redis_url})")
        else:
            logger.info("Rate limiter storage: in-memory (Redis unreachable)")
    else:
        logger.info("Rate limiter storage: in-memory")
except Exception:
    logger.info("Rate limiter storage: in-memory (fallback)")


limiter = Limiter(
    key_func=_get_client_identifier,
    storage_uri=_storage_uri,
    default_limits=["100/minute"],
    strategy="fixed-window",
)


# ---------------------------------------------------------------------------
# Rate limit tier constants
# ---------------------------------------------------------------------------

# These strings are used as arguments to @limiter.limit(...)
RATE_LIMIT_DEFAULT = "100/minute"
RATE_LIMIT_AUTH = "5/minute"
RATE_LIMIT_READ = "200/minute"
RATE_LIMIT_WRITE = "20/minute"


# ---------------------------------------------------------------------------
# Setup helper
# ---------------------------------------------------------------------------


def setup_rate_limiting(app):
    """Attach the SlowAPI limiter to a FastAPI application.

    This must be called during app creation, after all routers are included.

    Args:
        app: The FastAPI application instance.
    """
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    logger.info(
        "Rate limiting enabled | "
        f"default={RATE_LIMIT_DEFAULT} auth={RATE_LIMIT_AUTH} "
        f"read={RATE_LIMIT_READ} write={RATE_LIMIT_WRITE}"
    )
