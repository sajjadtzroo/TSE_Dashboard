"""
Cache decorator for FastAPI route handlers.
Provides @cached() with trading-hours-aware dynamic TTL and tag-based invalidation.
"""
import decimal
import functools
import json
import logging
from datetime import date, datetime
from typing import Optional

from fastapi import Request, Response
from fastapi.responses import JSONResponse

from api.cache import cache_manager

logger = logging.getLogger(__name__)


def cached(
    module: str,
    endpoint: str,
    trading_ttl: int = 120,
    off_hours_ttl: int = 3600,
    tags: Optional[list[str]] = None,
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
                k: v for k, v in kwargs.items()
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
                logger.debug(f"Cache serialization error: {e}")

            return _add_cache_header(result, "MISS")

        return wrapper
    return decorator


def _json_default(obj):
    """Custom JSON serializer that preserves numeric types."""
    if isinstance(obj, decimal.Decimal):
        return float(obj)
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    return str(obj)


def _serialize_result(result) -> str:
    """Serialize a FastAPI response for caching."""
    if isinstance(result, list):
        return json.dumps([_to_dict(item) for item in result], default=_json_default)
    elif isinstance(result, dict):
        return json.dumps(result, default=_json_default)
    elif hasattr(result, "model_dump"):
        return json.dumps(result.model_dump(), default=_json_default)
    elif hasattr(result, "__dict__"):
        return json.dumps(_to_dict(result), default=_json_default)
    return json.dumps(result, default=_json_default)


def _to_dict(obj) -> dict:
    """Convert a Pydantic model or SQLAlchemy instance to dict."""
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    if hasattr(obj, "__dict__"):
        return {k: v for k, v in obj.__dict__.items() if not k.startswith("_")}
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
