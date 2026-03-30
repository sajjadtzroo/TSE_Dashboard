"""
Cache decorator for FastAPI route handlers.
Provides @cached() with trading-hours-aware dynamic TTL and tag-based invalidation.
"""

import decimal
import functools
import json
import logging
from datetime import date, datetime

from fastapi.responses import JSONResponse

from api.cache import cache_manager

logger = logging.getLogger(__name__)


def cached(
    module: str,
    endpoint: str,
    trading_ttl: int = 120,
    off_hours_ttl: int = 3600,
    tags: list[str] | None = None,
):
    """
    Decorator for caching FastAPI sync route responses in Redis.

    Args:
        module: Route module name (e.g., 'market', 'stocks')
        endpoint: Endpoint identifier (e.g., 'market-overview')
        trading_ttl: Cache TTL in seconds during trading hours
        off_hours_ttl: Cache TTL in seconds outside trading hours
        tags: Spider tags for invalidation (e.g., ['market_watch'])
    """

    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            if not cache_manager.available:
                response = func(*args, **kwargs)
                return _add_cache_header(response, "BYPASS")

            # Build params hash from all kwargs (excluding db session)
            hashable_params = {
                k: v
                for k, v in kwargs.items()
                if k != "db" and not hasattr(v, "execute")
            }
            params_hash = cache_manager.hash_params(**hashable_params)

            # Try cache hit
            cached_data = cache_manager.get(module, endpoint, params_hash)
            if cached_data is not None:
                try:
                    data = json.loads(cached_data)
                    return _json_response(data, "HIT")
                except (json.JSONDecodeError, TypeError):
                    pass

            # Cache miss - call the actual handler
            result = func(*args, **kwargs)

            # Serialize and store
            try:
                serialized = _serialize_result(result)
                ttl = cache_manager.get_dynamic_ttl(trading_ttl, off_hours_ttl)
                cache_manager.set(module, endpoint, params_hash, serialized, ttl, tags)
            except Exception as e:
                logger.warning(f"Cache serialization error: {e}")

            return _add_cache_header(result, "MISS")

        return wrapper

    return decorator


def _json_default(obj):
    """Custom JSON serializer for types that _prepare doesn't handle."""
    if isinstance(obj, decimal.Decimal):
        return float(obj)
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    # Fail loudly instead of silently converting ORM objects to __repr__ strings.
    # The outer try/except will skip caching; FastAPI's response_model handles it.
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")


def _serialize_result(result) -> str:
    """Serialize a FastAPI response for caching."""
    return json.dumps(_prepare(result), default=_json_default)


def _prepare(obj):
    """Recursively convert ORM/Pydantic objects to dicts for JSON serialization."""
    if isinstance(obj, (str, int, float, bool, type(None))):
        return obj
    if isinstance(obj, decimal.Decimal):
        return float(obj)
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, dict):
        return {k: _prepare(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_prepare(item) for item in obj]
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    if hasattr(obj, "__dict__"):
        return {k: _prepare(v) for k, v in obj.__dict__.items() if not k.startswith("_")}
    return obj



def _json_response(data, cache_status: str) -> JSONResponse:
    """Create a JSONResponse with cache header."""
    return JSONResponse(
        content=data,
        headers={"X-Cache": cache_status},
    )


def _add_cache_header(result, cache_status: str):
    """Add X-Cache header to the response. For non-Response objects, return as-is."""
    # If it's already a Response, add the header
    if hasattr(result, "headers"):
        result.headers["X-Cache"] = cache_status
    return result
