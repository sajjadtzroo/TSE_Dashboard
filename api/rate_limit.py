"""
Rate limiting middleware using Redis sliding window algorithm.
Provides per-IP rate limiting with configurable tiers.
"""

import logging
import time

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from api.cache import cache_manager
from config.settings import REDIS_ENABLED, REDIS_KEY_PREFIX

logger = logging.getLogger(__name__)

# Rate limit tiers: (requests, window_seconds)
RATE_LIMITS = {
    "default": (300, 60),  # 300 req/min per client IP
    "heavy": (60, 60),   # 60 req/min (market-overview, client-type)
    "scraper": (5, 60),   # 5 req/min (scraper control)
    "auth": (10, 60),     # 10 req/min (login, register — brute-force protection)
}

# Map normalized endpoint prefixes to tiers (without /api/ or /api/v1/ prefix)
_TIER_RULES = {
    "auth/login": "auth",
    "auth/register": "auth",
    "auth/refresh": "auth",
    "scraper/": "scraper",
    "rag/process": "scraper",
    "rag/upload": "scraper",
    "market-overview": "heavy",
    "client-type": "heavy",
}


def _get_tier(path: str) -> str:
    """Determine rate limit tier from request path.

    Strips /api/ and /api/v1/ prefixes before matching so tier rules
    don't need to be duplicated for versioned endpoints.
    """
    for prefix in ("/api/v1/", "/api/"):
        if path.startswith(prefix):
            normalized = path[len(prefix):]
            break
    else:
        return "default"

    for rule, tier in _TIER_RULES.items():
        if normalized.startswith(rule):
            return tier
    return "default"


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Sliding window rate limiter backed by Redis sorted sets."""

    async def dispatch(self, request: Request, call_next):
        if not REDIS_ENABLED or not cache_manager.available:
            return await call_next(request)

        # Skip rate limiting for health checks
        if request.url.path.startswith("/health"):
            return await call_next(request)

        # Use real client IP from nginx-forwarded headers, not the nginx container IP
        client_ip = (
            request.headers.get("x-real-ip")
            or (request.headers.get("x-forwarded-for") or "").split(",")[0].strip()
            or (request.client.host if request.client else "unknown")
        )
        tier = _get_tier(request.url.path)
        max_requests, window = RATE_LIMITS[tier]

        key = f"{REDIS_KEY_PREFIX}ratelimit:{tier}:{client_ip}"
        now = time.time()
        window_start = now - window

        try:
            pipe = cache_manager._client.pipeline(transaction=True)
            # Remove expired entries
            pipe.zremrangebyscore(key, 0, window_start)
            # Count current requests in window
            pipe.zcard(key)
            # Add current request
            pipe.zadd(key, {str(now): now})
            # Set key expiry
            pipe.expire(key, window)
            results = pipe.execute()

            current_count = results[1]

            if current_count >= max_requests:
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Rate limit exceeded. Try again later."},
                    headers={
                        "X-RateLimit-Limit": str(max_requests),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": str(int(now + window)),
                        "Retry-After": str(window),
                    },
                )

            response: Response = await call_next(request)
            response.headers["X-RateLimit-Limit"] = str(max_requests)
            response.headers["X-RateLimit-Remaining"] = str(
                max(0, max_requests - current_count - 1)
            )
            return response

        except Exception as e:
            logger.debug(f"Rate limit check failed, allowing request: {e}")
            return await call_next(request)
