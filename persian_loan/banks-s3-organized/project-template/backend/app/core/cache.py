"""
Redis Cache Manager

Provides a Redis-backed caching layer with:
- Connection pooling
- Namespaced key generation: ploan:cache:{module}:{endpoint}:{params_hash}
- Tag-based invalidation for grouped cache clearing
- Graceful fallback when Redis is unavailable
"""

import hashlib
import json
import time
from typing import Any, Dict, List, Optional, Set

from app.core.config import settings
from app.core.logger import get_logger

logger = get_logger(__name__)


class RedisManager:
    """Redis cache manager with tag-based invalidation.

    Design:
    - Each cached value is stored as a JSON string under a namespaced key.
    - Tags are stored as Redis Sets: each tag set contains the keys associated
      with that tag. When a tag is invalidated, all keys in the set are deleted.
    - If Redis is unavailable, all operations silently degrade (return None for
      gets, skip for sets/deletes) so the application continues to function.
    """

    def __init__(self) -> None:
        self._redis = None
        self._available = False
        self._prefix = settings.cache_key_prefix
        self._enabled = settings.cache_enabled

    async def connect(self) -> None:
        """Initialize the Redis connection pool.

        Called during application startup. If Redis is unavailable, the manager
        enters a degraded mode where all operations are no-ops.
        """
        if not self._enabled:
            logger.info("Cache is disabled via CACHE_ENABLED=false")
            return

        try:
            import redis.asyncio as aioredis

            self._redis = aioredis.from_url(
                settings.redis_url,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True,
            )
            # Test connection
            await self._redis.ping()
            self._available = True
            logger.info(f"Redis connected: {settings.redis_url}")
        except Exception as e:
            self._available = False
            self._redis = None
            logger.warning(
                f"Redis unavailable ({e}). Caching disabled; "
                "application will continue without cache."
            )

    async def disconnect(self) -> None:
        """Close the Redis connection pool."""
        if self._redis is not None:
            try:
                await self._redis.aclose()
            except Exception:
                pass
            self._redis = None
            self._available = False
            logger.info("Redis connection closed")

    @property
    def is_available(self) -> bool:
        """Check if Redis is connected and operational."""
        return self._available and self._redis is not None

    # -------------------------------------------------------------------------
    # Key generation
    # -------------------------------------------------------------------------

    @staticmethod
    def _hash_params(params: Optional[Dict[str, Any]] = None) -> str:
        """Create a deterministic hash of query parameters."""
        if not params:
            return "none"
        # Sort keys for determinism, serialize, and hash
        serialized = json.dumps(params, sort_keys=True, default=str)
        return hashlib.md5(serialized.encode()).hexdigest()[:12]

    def build_key(
        self,
        module: str,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Build a namespaced cache key.

        Format: ploan:cache:{module}:{endpoint}:{params_hash}

        Args:
            module: Module name (e.g. "banks", "loans", "analytics").
            endpoint: Endpoint name (e.g. "get_all", "summary").
            params: Optional query parameters to include in the key.

        Returns:
            A fully-qualified cache key string.
        """
        params_hash = self._hash_params(params)
        return f"{self._prefix}:{module}:{endpoint}:{params_hash}"

    def _tag_key(self, tag: str) -> str:
        """Build the Redis key for a tag set."""
        return f"{self._prefix}:tag:{tag}"

    # -------------------------------------------------------------------------
    # Core operations
    # -------------------------------------------------------------------------

    async def get(self, key: str) -> Optional[Any]:
        """Get a cached value by key.

        Args:
            key: The cache key.

        Returns:
            The deserialized cached value, or None if not found / Redis unavailable.
        """
        if not self.is_available:
            return None
        try:
            raw = await self._redis.get(key)
            if raw is None:
                return None
            return json.loads(raw)
        except Exception as e:
            logger.debug(f"Cache GET failed for {key}: {e}")
            return None

    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None,
        tags: Optional[List[str]] = None,
    ) -> bool:
        """Store a value in the cache.

        Args:
            key: The cache key.
            value: The value to cache (must be JSON-serializable).
            ttl: Time-to-live in seconds. Defaults to settings.cache_default_ttl.
            tags: Optional list of tags for grouped invalidation.

        Returns:
            True if the value was stored successfully, False otherwise.
        """
        if not self.is_available:
            return False
        try:
            ttl = ttl if ttl is not None else settings.cache_default_ttl
            serialized = json.dumps(value, default=str)
            await self._redis.set(key, serialized, ex=ttl)

            # Register key with tags
            if tags:
                pipe = self._redis.pipeline()
                for tag in tags:
                    tag_key = self._tag_key(tag)
                    pipe.sadd(tag_key, key)
                    # Tag sets also expire (TTL * 2 to outlive the cached data)
                    pipe.expire(tag_key, ttl * 2)
                await pipe.execute()

            return True
        except Exception as e:
            logger.debug(f"Cache SET failed for {key}: {e}")
            return False

    async def delete(self, key: str) -> bool:
        """Delete a cached value by key.

        Args:
            key: The cache key.

        Returns:
            True if the key was deleted, False otherwise.
        """
        if not self.is_available:
            return False
        try:
            await self._redis.delete(key)
            return True
        except Exception as e:
            logger.debug(f"Cache DELETE failed for {key}: {e}")
            return False

    async def invalidate_by_tag(self, tag: str) -> int:
        """Invalidate all cache entries associated with a tag.

        This is the primary mechanism for cache busting on mutations:
        when a bank is created/updated/deleted, invalidate the "banks" tag
        to clear all bank-related caches.

        Args:
            tag: The tag name (e.g. "banks", "loans", "analytics").

        Returns:
            The number of keys invalidated.
        """
        if not self.is_available:
            return 0
        try:
            tag_key = self._tag_key(tag)
            keys: Set[str] = await self._redis.smembers(tag_key)
            if not keys:
                return 0

            pipe = self._redis.pipeline()
            for key in keys:
                pipe.delete(key)
            pipe.delete(tag_key)
            await pipe.execute()

            count = len(keys)
            logger.info(f"Invalidated {count} cache entries for tag '{tag}'")
            return count
        except Exception as e:
            logger.debug(f"Cache INVALIDATE_BY_TAG failed for '{tag}': {e}")
            return 0

    async def invalidate_by_tags(self, tags: List[str]) -> int:
        """Invalidate all cache entries for multiple tags.

        Args:
            tags: List of tag names.

        Returns:
            Total number of keys invalidated.
        """
        total = 0
        for tag in tags:
            total += await self.invalidate_by_tag(tag)
        return total

    async def clear_all(self) -> int:
        """Clear all cache entries under the application prefix.

        Returns:
            The number of keys deleted.
        """
        if not self.is_available:
            return 0
        try:
            pattern = f"{self._prefix}:*"
            keys = []
            async for key in self._redis.scan_iter(match=pattern, count=100):
                keys.append(key)

            if not keys:
                return 0

            await self._redis.delete(*keys)
            logger.info(f"Cleared {len(keys)} cache entries")
            return len(keys)
        except Exception as e:
            logger.debug(f"Cache CLEAR_ALL failed: {e}")
            return 0

    async def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics.

        Returns:
            Dictionary with cache info (hit count, key count, memory, etc.)
        """
        if not self.is_available:
            return {"available": False, "message": "Redis unavailable"}
        try:
            info = await self._redis.info("memory")
            key_count = 0
            async for _ in self._redis.scan_iter(
                match=f"{self._prefix}:*", count=100
            ):
                key_count += 1

            return {
                "available": True,
                "key_count": key_count,
                "used_memory": info.get("used_memory_human", "N/A"),
                "prefix": self._prefix,
            }
        except Exception as e:
            return {"available": False, "error": str(e)}


# ---------------------------------------------------------------------------
# Global singleton
# ---------------------------------------------------------------------------
cache_manager = RedisManager()


async def get_cache() -> RedisManager:
    """Dependency to get the cache manager."""
    return cache_manager
