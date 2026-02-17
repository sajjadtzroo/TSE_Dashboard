"""
Cache Decorator for FastAPI Route Handlers

Usage examples:

    # Simple caching with 300s TTL and auto-generated key
    @router.get("/summary")
    @cached(module="analytics", endpoint="summary", ttl=300, tags=["analytics"])
    async def get_summary():
        ...

    # Caching with query params included in key
    @router.get("/")
    @cached(module="banks", endpoint="get_all", ttl=300, tags=["banks"])
    async def get_all_banks(category: str = None, type: str = None):
        ...

    # Invalidate caches on mutations
    @router.post("/")
    @invalidate_cache(tags=["banks", "analytics"])
    async def create_bank(bank: BankCreate):
        ...
"""

import functools
import inspect
from typing import Any, Callable, Dict, List, Optional

from app.core.cache import cache_manager
from app.core.logger import get_logger

logger = get_logger(__name__)


def _extract_cache_params(func: Callable, args: tuple, kwargs: dict) -> Dict[str, Any]:
    """Extract cacheable parameters from function arguments.

    Inspects the function signature and pulls out query parameters (skipping
    service dependencies and request objects) to build a cache key.
    """
    sig = inspect.signature(func)
    params = {}

    bound = sig.bind(*args, **kwargs)
    bound.apply_defaults()

    # Skip known non-cacheable parameter names
    skip_names = {"service", "db", "request", "response", "self", "cls"}
    skip_types_str = {
        "BankService",
        "LoanService",
        "AnalyticsService",
        "AsyncIOMotorDatabase",
        "Request",
        "Response",
    }

    for name, value in bound.arguments.items():
        if name in skip_names:
            continue

        # Check type annotation
        param = sig.parameters.get(name)
        if param and param.annotation != inspect.Parameter.empty:
            type_name = getattr(param.annotation, "__name__", str(param.annotation))
            if type_name in skip_types_str:
                continue

        # Only include non-None values in the cache key
        if value is not None:
            params[name] = value

    return params


def cached(
    module: str,
    endpoint: str,
    ttl: Optional[int] = None,
    tags: Optional[List[str]] = None,
    key_builder: Optional[Callable[..., str]] = None,
) -> Callable:
    """Decorator to cache the response of a FastAPI route handler.

    Args:
        module: Module name for key namespace (e.g. "banks", "loans").
        endpoint: Endpoint name for key namespace (e.g. "get_all", "summary").
        ttl: Cache TTL in seconds. None uses the default from settings.
        tags: Tags for grouped invalidation (e.g. ["banks", "analytics"]).
        key_builder: Optional custom function to build the cache key.
                     Receives the same arguments as the decorated function
                     and must return a string key.

    Returns:
        Decorated function that checks cache before executing.
    """

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            # If cache is not available, just call the function
            if not cache_manager.is_available:
                return await func(*args, **kwargs)

            # Build cache key
            if key_builder is not None:
                cache_key = key_builder(*args, **kwargs)
            else:
                params = _extract_cache_params(func, args, kwargs)
                cache_key = cache_manager.build_key(module, endpoint, params)

            # Try to get from cache
            cached_value = await cache_manager.get(cache_key)
            if cached_value is not None:
                logger.debug(f"Cache HIT: {cache_key}")
                return cached_value

            # Cache miss - call the actual function
            logger.debug(f"Cache MISS: {cache_key}")
            result = await func(*args, **kwargs)

            # Serialize the result for caching
            # Pydantic models need to be converted to dicts
            cache_value = _serialize_result(result)

            # Store in cache
            await cache_manager.set(
                key=cache_key,
                value=cache_value,
                ttl=ttl,
                tags=tags,
            )

            return result

        return wrapper

    return decorator


def invalidate_cache(tags: List[str]) -> Callable:
    """Decorator to invalidate cache tags after a mutation endpoint executes.

    Use this on POST, PUT, PATCH, DELETE endpoints to clear related caches.

    Args:
        tags: List of tags to invalidate (e.g. ["banks", "analytics"]).

    Returns:
        Decorated function that invalidates caches after execution.
    """

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            # Execute the mutation first
            result = await func(*args, **kwargs)

            # Invalidate caches after successful mutation
            if cache_manager.is_available:
                count = await cache_manager.invalidate_by_tags(tags)
                logger.info(
                    f"Cache invalidation after {func.__name__}: "
                    f"cleared {count} entries for tags {tags}"
                )

            return result

        return wrapper

    return decorator


def _serialize_result(result: Any) -> Any:
    """Serialize a result for JSON caching.

    Handles Pydantic models, dicts, lists, and primitive types.
    """
    if result is None:
        return None

    # Pydantic v2 model
    if hasattr(result, "model_dump"):
        return result.model_dump(mode="json")

    # Pydantic v1 model
    if hasattr(result, "dict"):
        return result.dict()

    # Dict with potential Pydantic values
    if isinstance(result, dict):
        return {k: _serialize_result(v) for k, v in result.items()}

    # List of results
    if isinstance(result, list):
        return [_serialize_result(item) for item in result]

    # Primitive types pass through
    return result
