"""
Redis cache manager for TSE Dashboard API.
Provides connection management, key-value caching with TTL,
and tag-based invalidation for spider-driven cache busting.
"""
import hashlib
import json
import logging
import time
from typing import Any, Optional

import redis

from config.settings import (
    REDIS_URL, REDIS_ENABLED, REDIS_KEY_PREFIX,
    TIMEZONE, MARKET_OPEN_HOUR, MARKET_OPEN_MINUTE,
    MARKET_CLOSE_HOUR, MARKET_CLOSE_MINUTE,
)

logger = logging.getLogger(__name__)


def _is_trading_hours() -> bool:
    """Check if currently within Tehran Stock Exchange trading hours."""
    import pytz
    from datetime import datetime
    tz = pytz.timezone(TIMEZONE)
    now = datetime.now(tz)
    market_open = now.replace(hour=MARKET_OPEN_HOUR, minute=MARKET_OPEN_MINUTE, second=0)
    market_close = now.replace(hour=MARKET_CLOSE_HOUR, minute=MARKET_CLOSE_MINUTE, second=0)
    is_trading_day = now.weekday() in (5, 6, 0, 1, 2)
    return is_trading_day and market_open <= now <= market_close


class RedisCacheManager:
    """Redis-backed cache with tag-based invalidation and trading-hours-aware TTL."""

    def __init__(self):
        self._client: Optional[redis.Redis] = None
        self._available = False

    def connect(self):
        """Initialize Redis connection pool."""
        if not REDIS_ENABLED:
            logger.info("Redis caching is disabled")
            return

        try:
            self._client = redis.Redis.from_url(
                REDIS_URL,
                max_connections=20,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True,
            )
            self._client.ping()
            self._available = True
            logger.info(f"Redis connected: {REDIS_URL}")
        except Exception as e:
            self._available = False
            logger.warning(f"Redis unavailable, falling back to no-cache: {e}")

    def disconnect(self):
        """Close Redis connections."""
        if self._client:
            try:
                self._client.close()
            except Exception:
                pass
            self._client = None
            self._available = False

    @property
    def available(self) -> bool:
        return self._available and self._client is not None

    def _make_key(self, module: str, endpoint: str, params_hash: str) -> str:
        return f"{REDIS_KEY_PREFIX}cache:{module}:{endpoint}:{params_hash}"

    def _tag_key(self, tag: str) -> str:
        return f"{REDIS_KEY_PREFIX}tag:{tag}"

    @staticmethod
    def hash_params(**kwargs) -> str:
        """Create a stable hash from endpoint parameters."""
        filtered = {k: v for k, v in sorted(kwargs.items()) if v is not None}
        raw = json.dumps(filtered, default=str, sort_keys=True)
        return hashlib.md5(raw.encode()).hexdigest()[:12]

    def get(self, module: str, endpoint: str, params_hash: str) -> Optional[str]:
        """Retrieve a cached value. Returns None on miss or if Redis unavailable."""
        if not self.available:
            return None
        try:
            key = self._make_key(module, endpoint, params_hash)
            return self._client.get(key)
        except Exception as e:
            logger.debug(f"Redis GET error: {e}")
            return None

    def set(
        self,
        module: str,
        endpoint: str,
        params_hash: str,
        value: str,
        ttl: int,
        tags: Optional[list[str]] = None,
    ):
        """Store a value with TTL and optional tag association for invalidation."""
        if not self.available:
            return
        try:
            key = self._make_key(module, endpoint, params_hash)
            self._client.setex(key, ttl, value)
            if tags:
                pipe = self._client.pipeline(transaction=False)
                for tag in tags:
                    tag_key = self._tag_key(tag)
                    pipe.sadd(tag_key, key)
                    pipe.expire(tag_key, 86400)  # tag sets expire in 24h
                pipe.execute()
        except Exception as e:
            logger.debug(f"Redis SET error: {e}")

    def invalidate_tag(self, tag: str):
        """Delete all cache keys associated with a tag (called after spider completes)."""
        if not self.available:
            return
        try:
            tag_key = self._tag_key(tag)
            keys = self._client.smembers(tag_key)
            if keys:
                pipe = self._client.pipeline(transaction=False)
                for key in keys:
                    pipe.delete(key)
                pipe.delete(tag_key)
                pipe.execute()
                logger.info(f"Invalidated {len(keys)} cache keys for tag '{tag}'")
        except Exception as e:
            logger.warning(f"Cache invalidation error for tag '{tag}': {e}")

    def get_dynamic_ttl(self, trading_ttl: int, off_hours_ttl: int) -> int:
        """Return TTL based on whether market is currently open."""
        return trading_ttl if _is_trading_hours() else off_hours_ttl

    def set_meta(self, key_suffix: str, value: str, ttl: int = 120):
        """Store a metadata value (e.g., latest_date)."""
        if not self.available:
            return
        try:
            key = f"{REDIS_KEY_PREFIX}meta:{key_suffix}"
            self._client.setex(key, ttl, value)
        except Exception as e:
            logger.debug(f"Redis meta SET error: {e}")

    def get_meta(self, key_suffix: str) -> Optional[str]:
        """Retrieve a metadata value."""
        if not self.available:
            return None
        try:
            key = f"{REDIS_KEY_PREFIX}meta:{key_suffix}"
            return self._client.get(key)
        except Exception as e:
            logger.debug(f"Redis meta GET error: {e}")
            return None

    def get_stats(self) -> dict:
        """Return cache statistics for monitoring."""
        if not self.available:
            return {"available": False}
        try:
            info = self._client.info("stats")
            memory = self._client.info("memory")
            return {
                "available": True,
                "hits": info.get("keyspace_hits", 0),
                "misses": info.get("keyspace_misses", 0),
                "hit_rate": round(
                    info.get("keyspace_hits", 0)
                    / max(info.get("keyspace_hits", 0) + info.get("keyspace_misses", 0), 1)
                    * 100,
                    2,
                ),
                "used_memory_human": memory.get("used_memory_human", "N/A"),
                "connected_clients": self._client.info("clients").get("connected_clients", 0),
                "keys": self._client.dbsize(),
            }
        except Exception as e:
            return {"available": True, "error": str(e)}


# Global singleton
cache_manager = RedisCacheManager()
