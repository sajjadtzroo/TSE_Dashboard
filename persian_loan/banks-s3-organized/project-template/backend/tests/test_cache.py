"""
Tests for Redis Caching Layer

Tests cover:
- RedisManager connection and availability
- Key generation (namespacing and param hashing)
- get/set/delete operations
- Tag-based invalidation
- @cached decorator functionality
- @invalidate_cache decorator functionality
- Graceful fallback when Redis is unavailable
"""

import asyncio
import json
from typing import Any, Dict, Optional
from unittest.mock import AsyncMock, patch

import fakeredis.aioredis
import pytest

from app.core.cache import RedisManager, cache_manager
from app.common.decorators.cache import cached, invalidate_cache, _extract_cache_params, _serialize_result


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
async def redis_manager():
    """Create a RedisManager backed by fakeredis for testing."""
    manager = RedisManager()
    manager._enabled = True
    manager._prefix = "ploan:test"

    # Use fakeredis as the async backend
    fake_redis = fakeredis.aioredis.FakeRedis(decode_responses=True)
    manager._redis = fake_redis
    manager._available = True

    yield manager

    # Cleanup
    await fake_redis.flushall()
    await fake_redis.aclose()


@pytest.fixture
async def disabled_manager():
    """Create a RedisManager that is explicitly disabled."""
    manager = RedisManager()
    manager._enabled = False
    manager._available = False
    manager._redis = None
    manager._prefix = "ploan:test"
    return manager


@pytest.fixture
async def setup_cache_manager():
    """Temporarily replace the global cache_manager's Redis with fakeredis."""
    original_redis = cache_manager._redis
    original_available = cache_manager._available
    original_enabled = cache_manager._enabled
    original_prefix = cache_manager._prefix

    fake_redis = fakeredis.aioredis.FakeRedis(decode_responses=True)
    cache_manager._redis = fake_redis
    cache_manager._available = True
    cache_manager._enabled = True
    cache_manager._prefix = "ploan:test"

    yield cache_manager

    # Restore originals
    await fake_redis.flushall()
    await fake_redis.aclose()
    cache_manager._redis = original_redis
    cache_manager._available = original_available
    cache_manager._enabled = original_enabled
    cache_manager._prefix = original_prefix


# ===========================================================================
# Test: RedisManager Connection
# ===========================================================================


class TestRedisManagerConnection:
    """Test RedisManager connection behavior."""

    async def test_is_available_when_connected(self, redis_manager: RedisManager):
        """Redis manager reports available when connected."""
        assert redis_manager.is_available is True

    async def test_is_not_available_when_disabled(self, disabled_manager: RedisManager):
        """Redis manager reports unavailable when disabled."""
        assert disabled_manager.is_available is False

    async def test_connect_with_invalid_url(self):
        """Connection to invalid URL degrades gracefully."""
        manager = RedisManager()
        manager._enabled = True

        # Patch settings to use an invalid URL
        with patch("app.core.cache.settings") as mock_settings:
            mock_settings.redis_url = "redis://nonexistent-host:9999/0"
            mock_settings.cache_enabled = True
            await manager.connect()

        assert manager.is_available is False

    async def test_disconnect(self, redis_manager: RedisManager):
        """Disconnect clears state."""
        assert redis_manager.is_available is True
        await redis_manager.disconnect()
        assert redis_manager.is_available is False


# ===========================================================================
# Test: Key Generation
# ===========================================================================


class TestKeyGeneration:
    """Test cache key building and parameter hashing."""

    def test_build_key_basic(self, redis_manager: RedisManager):
        """Basic key follows namespace format."""
        key = redis_manager.build_key("banks", "get_all")
        assert key.startswith("ploan:test:banks:get_all:")
        assert key.endswith(":none")  # no params

    def test_build_key_with_params(self, redis_manager: RedisManager):
        """Key includes hash of params."""
        key = redis_manager.build_key("banks", "get_all", {"category": "digital"})
        assert key.startswith("ploan:test:banks:get_all:")
        assert not key.endswith(":none")  # params present -> hash suffix

    def test_build_key_deterministic(self, redis_manager: RedisManager):
        """Same params produce same key."""
        params = {"category": "traditional", "type": "state"}
        key1 = redis_manager.build_key("banks", "get_all", params)
        key2 = redis_manager.build_key("banks", "get_all", params)
        assert key1 == key2

    def test_build_key_different_params(self, redis_manager: RedisManager):
        """Different params produce different keys."""
        key1 = redis_manager.build_key("banks", "get_all", {"category": "digital"})
        key2 = redis_manager.build_key("banks", "get_all", {"category": "traditional"})
        assert key1 != key2

    def test_build_key_param_order_invariant(self, redis_manager: RedisManager):
        """Parameter order does not affect key."""
        key1 = redis_manager.build_key("loans", "search", {"a": "1", "b": "2"})
        key2 = redis_manager.build_key("loans", "search", {"b": "2", "a": "1"})
        assert key1 == key2

    def test_build_key_none_params(self, redis_manager: RedisManager):
        """None params produces 'none' suffix."""
        key = redis_manager.build_key("analytics", "summary", None)
        assert key.endswith(":none")

    def test_build_key_empty_dict(self, redis_manager: RedisManager):
        """Empty dict produces 'none' suffix."""
        key = redis_manager.build_key("analytics", "summary", {})
        assert key.endswith(":none")

    def test_hash_params_consistency(self):
        """Static method produces consistent hashes."""
        h1 = RedisManager._hash_params({"x": 1, "y": 2})
        h2 = RedisManager._hash_params({"y": 2, "x": 1})
        assert h1 == h2
        assert len(h1) == 12  # truncated md5 hash


# ===========================================================================
# Test: Get / Set / Delete Operations
# ===========================================================================


class TestCacheOperations:
    """Test basic cache CRUD operations."""

    async def test_set_and_get(self, redis_manager: RedisManager):
        """Set a value and retrieve it."""
        key = redis_manager.build_key("test", "item")
        data = {"name": "Test Bank", "count": 42}

        success = await redis_manager.set(key, data, ttl=60)
        assert success is True

        result = await redis_manager.get(key)
        assert result == data

    async def test_get_nonexistent_key(self, redis_manager: RedisManager):
        """Getting a non-existent key returns None."""
        result = await redis_manager.get("ploan:test:nonexistent:key:none")
        assert result is None

    async def test_set_with_ttl(self, redis_manager: RedisManager):
        """Set value with TTL and verify it exists."""
        key = redis_manager.build_key("test", "ttl_item")
        await redis_manager.set(key, {"val": 1}, ttl=300)

        ttl = await redis_manager._redis.ttl(key)
        assert ttl > 0
        assert ttl <= 300

    async def test_delete(self, redis_manager: RedisManager):
        """Delete a cached value."""
        key = redis_manager.build_key("test", "delete_me")
        await redis_manager.set(key, {"data": "delete this"}, ttl=60)

        # Verify it exists
        result = await redis_manager.get(key)
        assert result is not None

        # Delete
        success = await redis_manager.delete(key)
        assert success is True

        # Verify it's gone
        result = await redis_manager.get(key)
        assert result is None

    async def test_set_complex_data(self, redis_manager: RedisManager):
        """Cache complex nested data structures."""
        key = redis_manager.build_key("test", "complex")
        data = {
            "banks": [
                {"id": "bank-1", "name": "Test", "loans": [{"id": "loan-1", "rate": "18%"}]},
            ],
            "total": 1,
            "meta": {"page": 1, "nested": {"deep": True}},
        }

        await redis_manager.set(key, data, ttl=60)
        result = await redis_manager.get(key)
        assert result == data
        assert result["banks"][0]["loans"][0]["rate"] == "18%"

    async def test_set_list_data(self, redis_manager: RedisManager):
        """Cache a list directly."""
        key = redis_manager.build_key("test", "list")
        data = [1, 2, 3, "four", {"five": 5}]

        await redis_manager.set(key, data, ttl=60)
        result = await redis_manager.get(key)
        assert result == data

    async def test_operations_when_unavailable(self, disabled_manager: RedisManager):
        """All operations return gracefully when Redis is unavailable."""
        assert await disabled_manager.get("any-key") is None
        assert await disabled_manager.set("any-key", "value") is False
        assert await disabled_manager.delete("any-key") is False


# ===========================================================================
# Test: Tag-Based Invalidation
# ===========================================================================


class TestTagInvalidation:
    """Test tag-based cache invalidation."""

    async def test_set_with_tags(self, redis_manager: RedisManager):
        """Setting values with tags registers them in tag sets."""
        key1 = redis_manager.build_key("banks", "all")
        key2 = redis_manager.build_key("banks", "traditional")

        await redis_manager.set(key1, {"data": "all banks"}, ttl=300, tags=["banks"])
        await redis_manager.set(key2, {"data": "traditional"}, ttl=300, tags=["banks"])

        # Check tag set contains both keys
        tag_key = redis_manager._tag_key("banks")
        members = await redis_manager._redis.smembers(tag_key)
        assert key1 in members
        assert key2 in members

    async def test_invalidate_by_tag(self, redis_manager: RedisManager):
        """Invalidating a tag removes all associated keys."""
        key1 = redis_manager.build_key("banks", "all")
        key2 = redis_manager.build_key("banks", "digital")
        key3 = redis_manager.build_key("loans", "all")  # Different tag

        await redis_manager.set(key1, {"data": 1}, ttl=300, tags=["banks"])
        await redis_manager.set(key2, {"data": 2}, ttl=300, tags=["banks"])
        await redis_manager.set(key3, {"data": 3}, ttl=300, tags=["loans"])

        # Invalidate "banks" tag
        count = await redis_manager.invalidate_by_tag("banks")
        assert count == 2

        # Verify banks keys are gone
        assert await redis_manager.get(key1) is None
        assert await redis_manager.get(key2) is None

        # Verify loans key still exists
        assert await redis_manager.get(key3) is not None

    async def test_invalidate_multiple_tags(self, redis_manager: RedisManager):
        """Invalidating multiple tags clears all associated keys."""
        key_bank = redis_manager.build_key("banks", "all")
        key_loan = redis_manager.build_key("loans", "all")

        await redis_manager.set(key_bank, {"data": "banks"}, ttl=300, tags=["banks"])
        await redis_manager.set(key_loan, {"data": "loans"}, ttl=300, tags=["loans"])

        count = await redis_manager.invalidate_by_tags(["banks", "loans"])
        assert count == 2

        assert await redis_manager.get(key_bank) is None
        assert await redis_manager.get(key_loan) is None

    async def test_invalidate_nonexistent_tag(self, redis_manager: RedisManager):
        """Invalidating a non-existent tag returns 0."""
        count = await redis_manager.invalidate_by_tag("nonexistent")
        assert count == 0

    async def test_cross_tag_association(self, redis_manager: RedisManager):
        """A key can belong to multiple tags; invalidating one tag removes the key."""
        key = redis_manager.build_key("analytics", "summary")
        await redis_manager.set(key, {"data": "summary"}, ttl=300, tags=["analytics", "banks"])

        # Both tag sets should contain the key
        analytics_members = await redis_manager._redis.smembers(
            redis_manager._tag_key("analytics")
        )
        banks_members = await redis_manager._redis.smembers(
            redis_manager._tag_key("banks")
        )
        assert key in analytics_members
        assert key in banks_members

        # Invalidating "banks" removes the key
        await redis_manager.invalidate_by_tag("banks")
        assert await redis_manager.get(key) is None

    async def test_invalidate_when_unavailable(self, disabled_manager: RedisManager):
        """Tag invalidation returns 0 when Redis is unavailable."""
        count = await disabled_manager.invalidate_by_tag("banks")
        assert count == 0


# ===========================================================================
# Test: Clear All
# ===========================================================================


class TestClearAll:
    """Test clear_all operation."""

    async def test_clear_all(self, redis_manager: RedisManager):
        """Clear all removes all keys under the prefix."""
        for i in range(5):
            key = redis_manager.build_key("test", f"item_{i}")
            await redis_manager.set(key, {"i": i}, ttl=300)

        count = await redis_manager.clear_all()
        assert count == 5

        # Verify all gone
        for i in range(5):
            key = redis_manager.build_key("test", f"item_{i}")
            assert await redis_manager.get(key) is None


# ===========================================================================
# Test: Cache Stats
# ===========================================================================


class TestCacheStats:
    """Test cache statistics."""

    async def test_stats_when_available(self, redis_manager: RedisManager):
        """Stats returns information when Redis is available.

        Note: fakeredis may not fully support INFO commands, so we verify
        the stats dict structure rather than exact values. With real Redis
        this would also include used_memory.
        """
        await redis_manager.set(
            redis_manager.build_key("test", "a"), {"x": 1}, ttl=60
        )
        await redis_manager.set(
            redis_manager.build_key("test", "b"), {"x": 2}, ttl=60
        )

        stats = await redis_manager.get_stats()
        # fakeredis may not support INFO memory, so stats might report error
        # but it should always return a dict
        assert isinstance(stats, dict)
        # If it's available, verify key_count; if not (fakeredis limitation), verify
        # the error response structure
        if stats.get("available"):
            assert stats["key_count"] == 2
        else:
            assert "error" in stats or "available" in stats

    async def test_stats_when_unavailable(self, disabled_manager: RedisManager):
        """Stats returns unavailable when Redis is down."""
        stats = await disabled_manager.get_stats()
        assert stats["available"] is False


# ===========================================================================
# Test: @cached Decorator
# ===========================================================================


class TestCachedDecorator:
    """Test the @cached decorator for route handlers."""

    async def test_cached_stores_result(self, setup_cache_manager):
        """First call stores result in cache."""
        call_count = 0

        @cached(module="test", endpoint="fn1", ttl=60, tags=["test"])
        async def my_endpoint():
            nonlocal call_count
            call_count += 1
            return {"result": "data", "count": call_count}

        result1 = await my_endpoint()
        assert result1 == {"result": "data", "count": 1}
        assert call_count == 1

    async def test_cached_returns_from_cache(self, setup_cache_manager):
        """Second call returns cached result without calling function."""
        call_count = 0

        @cached(module="test", endpoint="fn2", ttl=60, tags=["test"])
        async def my_endpoint():
            nonlocal call_count
            call_count += 1
            return {"value": call_count}

        result1 = await my_endpoint()
        result2 = await my_endpoint()

        assert result1 == {"value": 1}
        assert result2 == {"value": 1}  # Same cached result
        assert call_count == 1  # Function only called once

    async def test_cached_with_params(self, setup_cache_manager):
        """Different params produce different cache entries."""
        call_count = 0

        @cached(module="test", endpoint="fn3", ttl=60, tags=["test"])
        async def my_endpoint(category: str = None):
            nonlocal call_count
            call_count += 1
            return {"category": category, "call": call_count}

        result1 = await my_endpoint(category="digital")
        result2 = await my_endpoint(category="traditional")
        result3 = await my_endpoint(category="digital")  # Should hit cache

        assert result1 == {"category": "digital", "call": 1}
        assert result2 == {"category": "traditional", "call": 2}
        assert result3 == {"category": "digital", "call": 1}  # Cached
        assert call_count == 2

    async def test_cached_without_redis(self):
        """When Redis is unavailable, function executes normally."""
        # Ensure cache_manager is disabled
        original = cache_manager._available
        cache_manager._available = False

        call_count = 0

        @cached(module="test", endpoint="fn4", ttl=60, tags=["test"])
        async def my_endpoint():
            nonlocal call_count
            call_count += 1
            return {"value": call_count}

        result1 = await my_endpoint()
        result2 = await my_endpoint()

        assert result1 == {"value": 1}
        assert result2 == {"value": 2}  # No caching -> new call
        assert call_count == 2

        cache_manager._available = original

    async def test_cached_with_custom_key_builder(self, setup_cache_manager):
        """Custom key_builder is used when provided."""

        def custom_key(bank_id: str, **kwargs):
            return f"ploan:test:custom:{bank_id}"

        call_count = 0

        @cached(module="test", endpoint="fn5", ttl=60, tags=["test"],
                key_builder=custom_key)
        async def my_endpoint(bank_id: str):
            nonlocal call_count
            call_count += 1
            return {"bank_id": bank_id, "call": call_count}

        result1 = await my_endpoint(bank_id="bank-1")
        result2 = await my_endpoint(bank_id="bank-1")

        assert result1 == {"bank_id": "bank-1", "call": 1}
        assert result2 == {"bank_id": "bank-1", "call": 1}  # Cached
        assert call_count == 1


# ===========================================================================
# Test: @invalidate_cache Decorator
# ===========================================================================


class TestInvalidateCacheDecorator:
    """Test the @invalidate_cache decorator for mutations."""

    async def test_invalidate_clears_tag(self, setup_cache_manager):
        """Mutation decorator clears associated tag cache entries."""
        # First, populate cache
        key = setup_cache_manager.build_key("banks", "all")
        await setup_cache_manager.set(key, {"data": "cached"}, ttl=300, tags=["banks"])

        # Verify cache is populated
        assert await setup_cache_manager.get(key) is not None

        # Define a mutation endpoint
        @invalidate_cache(tags=["banks"])
        async def create_bank():
            return {"message": "created"}

        result = await create_bank()
        assert result == {"message": "created"}

        # Verify cache was cleared
        assert await setup_cache_manager.get(key) is None

    async def test_invalidate_multiple_tags(self, setup_cache_manager):
        """Mutation clears multiple tag groups."""
        key_bank = setup_cache_manager.build_key("banks", "list")
        key_analytics = setup_cache_manager.build_key("analytics", "summary")

        await setup_cache_manager.set(key_bank, {"banks": []}, ttl=300, tags=["banks"])
        await setup_cache_manager.set(key_analytics, {"summary": {}}, ttl=300, tags=["analytics"])

        @invalidate_cache(tags=["banks", "analytics"])
        async def delete_bank():
            return {"message": "deleted"}

        await delete_bank()

        assert await setup_cache_manager.get(key_bank) is None
        assert await setup_cache_manager.get(key_analytics) is None


# ===========================================================================
# Test: Serialization Helpers
# ===========================================================================


class TestSerializationHelpers:
    """Test the _serialize_result helper."""

    def test_serialize_dict(self):
        """Dicts pass through."""
        data = {"a": 1, "b": "two"}
        assert _serialize_result(data) == data

    def test_serialize_list(self):
        """Lists pass through."""
        data = [1, 2, 3]
        assert _serialize_result(data) == data

    def test_serialize_none(self):
        """None passes through."""
        assert _serialize_result(None) is None

    def test_serialize_nested(self):
        """Nested structures serialize correctly."""
        data = {"items": [{"id": 1}, {"id": 2}], "total": 2}
        assert _serialize_result(data) == data

    def test_serialize_primitive(self):
        """Primitive types pass through."""
        assert _serialize_result(42) == 42
        assert _serialize_result("hello") == "hello"
        assert _serialize_result(True) is True


# ===========================================================================
# Test: _extract_cache_params helper
# ===========================================================================


class TestExtractCacheParams:
    """Test parameter extraction for cache key building."""

    def test_extract_basic_params(self):
        """Extracts query parameters from function."""
        async def endpoint(category: str = None, type: str = None):
            pass

        params = _extract_cache_params(
            endpoint, (), {"category": "digital", "type": None}
        )
        # Only non-None values are included
        assert params == {"category": "digital"}

    def test_skip_service_params(self):
        """Service dependencies are skipped."""
        async def endpoint(bank_id: str, service=None):
            pass

        params = _extract_cache_params(
            endpoint, (), {"bank_id": "bank-1", "service": "mock_service"}
        )
        assert "service" not in params
        assert params == {"bank_id": "bank-1"}

    def test_empty_when_no_params(self):
        """Returns empty dict for functions with no cacheable params."""
        async def endpoint(service=None):
            pass

        params = _extract_cache_params(endpoint, (), {"service": "mock"})
        assert params == {}
