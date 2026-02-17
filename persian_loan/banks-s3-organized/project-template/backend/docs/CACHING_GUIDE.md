# Caching Guide

**Iranian Banks Loan Dashboard -- Redis Caching Layer**

---

## Table of Contents

1. [Overview](#overview)
2. [Redis Configuration](#redis-configuration)
3. [Cache Tiers](#cache-tiers)
4. [Cache Key Structure](#cache-key-structure)
5. [Tag-Based Invalidation](#tag-based-invalidation)
6. [The `@cached` Decorator](#the-cached-decorator)
7. [The `@invalidate_cache` Decorator](#the-invalidate_cache-decorator)
8. [Graceful Degradation](#graceful-degradation)
9. [Cache Monitoring and Stats](#cache-monitoring-and-stats)
10. [Cache Warming Strategies](#cache-warming-strategies)
11. [Implementation Details](#implementation-details)
12. [Configuration Reference](#configuration-reference)
13. [Troubleshooting](#troubleshooting)

---

## Overview

The caching layer provides Redis-backed response caching with:

- **Automatic cache key generation** from endpoint parameters.
- **Tag-based invalidation** for grouped cache clearing on mutations.
- **Graceful degradation** when Redis is unavailable (application continues without caching).
- **Three cache tiers** with different TTLs based on data volatility.

### Architecture

```
Client Request
      |
      v
  Rate Limiter
      |
      v
  @cached decorator
      |
      +-- Cache HIT  --> Return cached response (skip DB)
      |
      +-- Cache MISS --> Execute route handler
                              |
                              v
                         Service Layer
                              |
                              v
                         MongoDB Query
                              |
                              v
                         Store in Redis (with TTL and tags)
                              |
                              v
                         Return response
```

---

## Redis Configuration

### Environment Variables

| Variable           | Default                    | Description                       |
|--------------------|----------------------------|-----------------------------------|
| `REDIS_URL`        | `redis://localhost:6379/0`  | Redis connection URL              |
| `CACHE_ENABLED`    | `true`                     | Enable/disable caching            |
| `CACHE_DEFAULT_TTL`| `300`                      | Default TTL in seconds (5 min)    |
| `CACHE_KEY_PREFIX` | `ploan:cache`              | Prefix for all cache keys         |

### .env Example

```bash
# Redis Cache
REDIS_URL=redis://localhost:6379/0
CACHE_ENABLED=true
CACHE_DEFAULT_TTL=300
CACHE_KEY_PREFIX=ploan:cache
```

### Connection Settings

The Redis client is configured with:

```python
redis.asyncio.from_url(
    settings.redis_url,
    decode_responses=True,        # Return strings, not bytes
    socket_connect_timeout=5,     # 5-second connection timeout
    socket_timeout=5,             # 5-second operation timeout
    retry_on_timeout=True,        # Auto-retry on timeout
)
```

### Redis Version Requirements

- Redis 6.0 or later is recommended.
- The caching layer uses basic Redis commands (GET, SET, SADD, DEL, SCAN) and is compatible with Redis 5.x+.

---

## Cache Tiers

The caching strategy uses three tiers based on data characteristics:

### Tier 1: High-value, Rarely Mutated (300s / 5 minutes)

These endpoints serve aggregated data that is expensive to compute and changes infrequently.

| Endpoint                              | Tags                    |
|---------------------------------------|-------------------------|
| `GET /api/banks/`                     | `banks`                 |
| `GET /api/banks/traditional`          | `banks`                 |
| `GET /api/banks/digital`              | `banks`                 |
| `GET /api/analytics/summary/`         | `analytics`, `banks`    |
| `GET /api/analytics/by-category/`     | `analytics`, `banks`    |
| `GET /api/analytics/interest-rates/`  | `analytics`, `loans`    |
| `GET /api/analytics/loan-amounts/`    | `analytics`, `loans`    |
| `GET /api/analytics/requirements-matrix/` | `analytics`, `banks` |

### Tier 2: Moderately Volatile (180s / 3 minutes)

Individual resource lookups and filtered queries that may change more frequently.

| Endpoint                              | Tags                    |
|---------------------------------------|-------------------------|
| `GET /api/banks/{bank_id}`            | `banks`                 |
| `GET /api/banks/{bank_id}/loans`      | `banks`, `loans`        |
| `GET /api/loans/`                     | `loans`                 |
| `GET /api/loans/no-guarantor/`        | `loans`                 |
| `GET /api/loans/by-method/{method}/`  | `loans`                 |

### Tier 3: Short-lived (120s / 2 minutes)

Parameterized queries that produce unique combinations.

| Endpoint                              | Tags                    |
|---------------------------------------|-------------------------|
| `GET /api/loans/compare/`             | `loans`                 |

### No Cache

These endpoints are never cached:

- All `POST`, `PUT`, `DELETE` mutation endpoints
- All authentication endpoints (`/api/auth/*`)
- All reminders endpoints (`/api/reminders/*`)
- Import endpoints (`/api/import/*`)
- Health check (`/health`)

---

## Cache Key Structure

Cache keys follow a consistent namespace format:

```
{prefix}:{module}:{endpoint}:{params_hash}
```

### Components

| Component     | Example          | Description                                    |
|---------------|------------------|------------------------------------------------|
| `prefix`      | `ploan:cache`    | Application-level prefix (configurable)         |
| `module`      | `banks`          | Module name (banks, loans, analytics)           |
| `endpoint`    | `get_all`        | Endpoint identifier                             |
| `params_hash` | `a1b2c3d4e5f6`   | MD5 hash of query parameters (first 12 chars)  |

### Examples

```
ploan:cache:banks:get_all:none                  # GET /api/banks/ (no filters)
ploan:cache:banks:get_all:a1b2c3d4e5f6          # GET /api/banks/?category=digital
ploan:cache:banks:by_id:b3c4d5e6f7g8            # GET /api/banks/melli
ploan:cache:loans:get_all:c5d6e7f8g9h0          # GET /api/loans/?no_guarantor=true
ploan:cache:analytics:summary:none              # GET /api/analytics/summary/
```

### Parameter Hashing

Query parameters are hashed deterministically:

1. Parameters are collected from the function signature.
2. Non-cacheable parameters are excluded (service dependencies, request objects).
3. `None` values are excluded.
4. Remaining parameters are serialized to JSON with sorted keys.
5. An MD5 hash is computed, truncated to 12 characters.

This ensures that different query parameter combinations produce different cache keys, while identical parameters always produce the same key.

---

## Tag-Based Invalidation

Tags allow grouped cache invalidation when data is mutated.

### How Tags Work

1. When a response is cached, it is associated with one or more tags.
2. Each tag is stored as a Redis Set containing all cache keys with that tag.
3. When a mutation occurs, all keys in the relevant tag sets are deleted.

### Tag Storage

```
ploan:cache:tag:banks    -> Set{key1, key2, key3}
ploan:cache:tag:loans    -> Set{key4, key5}
ploan:cache:tag:analytics -> Set{key6, key7}
```

Tag sets have a TTL of **2x the cached data TTL** to ensure they outlive the data.

### Invalidation Matrix

| Mutation                  | Invalidated Tags           | Effect                                |
|---------------------------|----------------------------|---------------------------------------|
| `POST /api/banks/`        | `banks`, `analytics`       | Clears all bank and analytics caches  |
| `DELETE /api/banks/{id}`  | `banks`, `analytics`       | Clears all bank and analytics caches  |

### Example Flow

```
1. GET /api/banks/ -> Cache MISS -> Store with tags=["banks"]
   Key: ploan:cache:banks:get_all:none
   Tag set ploan:cache:tag:banks -> {ploan:cache:banks:get_all:none}

2. GET /api/analytics/summary/ -> Cache MISS -> Store with tags=["analytics", "banks"]
   Key: ploan:cache:analytics:summary:none
   Tag set ploan:cache:tag:banks -> {ploan:cache:banks:get_all:none, ploan:cache:analytics:summary:none}
   Tag set ploan:cache:tag:analytics -> {ploan:cache:analytics:summary:none}

3. POST /api/banks/ -> Create bank -> Invalidate tags ["banks", "analytics"]
   - Delete all keys in ploan:cache:tag:banks
   - Delete all keys in ploan:cache:tag:analytics
   - Delete the tag sets themselves
   Result: Both cached responses are cleared
```

---

## The `@cached` Decorator

The `@cached` decorator wraps FastAPI route handlers to add transparent caching.

### Usage

```python
from app.common.decorators.cache import cached

@router.get("/")
@limiter.limit(RATE_LIMIT_READ)
@cached(module="banks", endpoint="get_all", ttl=300, tags=["banks"])
async def get_all_banks(
    request: Request,
    category: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    service: BankService = Depends(get_bank_service),
):
    ...
```

### Parameters

| Parameter     | Type                | Required | Description                           |
|---------------|---------------------|----------|---------------------------------------|
| `module`      | `str`               | Yes      | Module name for key namespace          |
| `endpoint`    | `str`               | Yes      | Endpoint name for key namespace        |
| `ttl`         | `int \| None`       | No       | Cache TTL in seconds (default: 300)    |
| `tags`        | `list[str] \| None` | No       | Tags for grouped invalidation          |
| `key_builder` | `Callable \| None`  | No       | Custom key builder function            |

### Behavior

1. If Redis is unavailable, the decorator is a no-op (calls the handler directly).
2. A cache key is built from the module, endpoint, and query parameters.
3. Redis is checked for a cached value.
4. On HIT: Return the cached value immediately (no DB query).
5. On MISS: Execute the handler, serialize the result, store in Redis with TTL and tags.

### Decorator Order

The `@cached` decorator must come **after** `@limiter.limit()`:

```python
@router.get("/")           # 1. Route registration
@limiter.limit(...)        # 2. Rate limiting (outermost middleware)
@cached(...)               # 3. Caching (innermost, closest to handler)
async def handler():
    ...
```

### Serialization

Results are serialized for caching using `_serialize_result()`:

- Pydantic v2 models: `.model_dump(mode="json")`
- Pydantic v1 models: `.dict()`
- Dicts: Recursively serialized
- Lists: Each item recursively serialized
- Primitives: Passed through directly

---

## The `@invalidate_cache` Decorator

The `@invalidate_cache` decorator clears related caches after mutation endpoints execute.

### Usage

```python
from app.common.decorators.cache import invalidate_cache

@router.post("/")
@limiter.limit(RATE_LIMIT_WRITE)
@invalidate_cache(tags=["banks", "analytics"])
async def create_bank(request: Request, bank: BankCreate, ...):
    ...
```

### Parameters

| Parameter | Type         | Required | Description                        |
|-----------|--------------|----------|------------------------------------|
| `tags`    | `list[str]`  | Yes      | Tags to invalidate after execution |

### Behavior

1. The mutation handler executes first.
2. If Redis is available, all cache keys associated with the specified tags are deleted.
3. The handler result is returned.

---

## Graceful Degradation

The caching layer is designed to degrade gracefully when Redis is unavailable.

### Startup Behavior

During application startup, the `RedisManager.connect()` method attempts to connect to Redis:

- **Success**: Caching is enabled. A log message confirms the connection.
- **Failure**: Caching is disabled. A warning is logged. The application continues without caching.

```
WARNING  Redis unavailable (Connection refused). Caching disabled;
         application will continue without cache.
```

### Runtime Behavior

If Redis becomes unavailable after startup:

- **Cache GET**: Returns `None` (cache miss). The handler executes normally.
- **Cache SET**: Silently fails. The response is returned but not cached.
- **Cache DELETE**: Silently fails. No invalidation occurs.
- **Cache INVALIDATE**: Silently fails. Returns 0.

All Redis errors are caught and logged at `DEBUG` level to avoid log spam.

### Disabling Cache

Set `CACHE_ENABLED=false` in the environment to disable caching entirely, even if Redis is available.

---

## Cache Monitoring and Stats

### Health Check

The `/health` endpoint includes cache status:

```json
{
  "components": {
    "cache": {
      "status": "connected",
      "type": "redis",
      "keys": 42,
      "memory": "1.5M"
    }
  }
}
```

### Cache Stats API

The `cache_manager.get_stats()` method returns:

```python
{
    "available": True,
    "key_count": 42,          # Number of cache keys under the app prefix
    "used_memory": "1.5M",    # Redis memory usage (human-readable)
    "prefix": "ploan:cache",  # Key prefix in use
}
```

### Log Messages

The caching system produces the following log entries:

| Level   | Message                                        | When                              |
|---------|------------------------------------------------|-----------------------------------|
| INFO    | `Redis connected: redis://localhost:6379/0`    | Successful connection at startup  |
| WARNING | `Redis unavailable (...). Caching disabled`    | Connection failed at startup      |
| INFO    | `Redis connection closed`                      | Clean shutdown                    |
| DEBUG   | `Cache HIT: ploan:cache:banks:get_all:none`    | Cached response served            |
| DEBUG   | `Cache MISS: ploan:cache:banks:get_all:none`   | Cache miss, executing handler     |
| INFO    | `Invalidated 5 cache entries for tag 'banks'`  | Tag invalidation after mutation   |
| INFO    | `Cleared 42 cache entries`                     | Full cache clear                  |

### Monitoring with Redis CLI

```bash
# Check if Redis is running
redis-cli ping

# Count all application cache keys
redis-cli --scan --pattern "ploan:cache:*" | wc -l

# View all cache keys
redis-cli --scan --pattern "ploan:cache:*"

# View tag members
redis-cli smembers "ploan:cache:tag:banks"

# Check TTL on a specific key
redis-cli ttl "ploan:cache:banks:get_all:none"

# Get Redis memory usage
redis-cli info memory | grep used_memory_human

# Flush all application cache keys (caution!)
redis-cli --scan --pattern "ploan:cache:*" | xargs redis-cli del
```

---

## Cache Warming Strategies

Cache warming pre-populates the cache with frequently accessed data to eliminate cold-start latency.

### Strategy 1: Startup Warming

Make requests to high-traffic endpoints immediately after deployment:

```bash
#!/bin/bash
# cache-warm.sh - Run after deployment
BASE_URL="http://localhost:8000/api"

echo "Warming cache..."
curl -s "$BASE_URL/banks/" > /dev/null
curl -s "$BASE_URL/banks/traditional" > /dev/null
curl -s "$BASE_URL/banks/digital" > /dev/null
curl -s "$BASE_URL/analytics/summary/" > /dev/null
curl -s "$BASE_URL/analytics/by-category/" > /dev/null
curl -s "$BASE_URL/analytics/interest-rates/" > /dev/null
curl -s "$BASE_URL/analytics/loan-amounts/" > /dev/null
curl -s "$BASE_URL/analytics/requirements-matrix/" > /dev/null
curl -s "$BASE_URL/loans/" > /dev/null
echo "Cache warming complete."
```

### Strategy 2: Periodic Refresh

Use a cron job or background task to refresh caches before they expire:

```bash
# Refresh every 4 minutes (before 5-minute TTL expires for Tier 1)
*/4 * * * * /path/to/cache-warm.sh
```

### Strategy 3: On-Demand after Mutation

The `@invalidate_cache` decorator already handles this: after a bank is created or deleted, caches are invalidated and the next request rebuilds them.

For eager warming after mutations, add a background task:

```python
from fastapi import BackgroundTasks

@router.post("/")
@invalidate_cache(tags=["banks", "analytics"])
async def create_bank(
    request: Request,
    bank: BankCreate,
    background_tasks: BackgroundTasks,
    service: BankService = Depends(get_bank_service),
):
    result = await service.create_bank(bank)
    # Warm the most critical caches in the background
    background_tasks.add_task(warm_bank_caches, service)
    return result
```

---

## Implementation Details

### RedisManager Class

The singleton `RedisManager` (at `app.core.cache`) provides:

| Method                  | Description                                        |
|-------------------------|----------------------------------------------------|
| `connect()`             | Initialize Redis connection pool                   |
| `disconnect()`          | Close Redis connection pool                        |
| `is_available`          | Property: whether Redis is connected               |
| `build_key()`           | Generate a namespaced cache key                    |
| `get(key)`              | Get a cached value                                 |
| `set(key, value, ttl, tags)` | Store a value with TTL and tags               |
| `delete(key)`           | Delete a single cache entry                        |
| `invalidate_by_tag(tag)` | Delete all entries for a tag                      |
| `invalidate_by_tags(tags)` | Delete all entries for multiple tags            |
| `clear_all()`           | Delete all cache entries under the app prefix      |
| `get_stats()`           | Get cache statistics                               |

### Pipeline Usage

Tag registration and multi-key deletion use Redis pipelines for atomicity:

```python
# Registering tags (SET + EXPIRE batched in a pipeline)
pipe = self._redis.pipeline()
for tag in tags:
    tag_key = self._tag_key(tag)
    pipe.sadd(tag_key, key)
    pipe.expire(tag_key, ttl * 2)
await pipe.execute()
```

---

## Configuration Reference

### Environment Variables

| Variable           | Type     | Default                    | Description                       |
|--------------------|----------|----------------------------|-----------------------------------|
| `REDIS_URL`        | `string` | `redis://localhost:6379/0`  | Redis connection URL              |
| `CACHE_ENABLED`    | `bool`   | `true`                     | Enable/disable the cache layer    |
| `CACHE_DEFAULT_TTL`| `int`    | `300`                      | Default TTL in seconds            |
| `CACHE_KEY_PREFIX` | `string` | `ploan:cache`              | Prefix for all cache keys         |

### Tier TTL Summary

| Tier   | TTL (seconds) | TTL (human) | Use Case                        |
|--------|---------------|-------------|----------------------------------|
| Tier 1 | 300           | 5 minutes   | Aggregate data, bank lists       |
| Tier 2 | 180           | 3 minutes   | Individual lookups, filtered data|
| Tier 3 | 120           | 2 minutes   | Parameterized comparisons        |

---

## Troubleshooting

### Redis Not Connecting

**Symptom**: `WARNING Redis unavailable` in logs at startup.

**Checks**:
1. Is Redis running? `redis-cli ping` should return `PONG`.
2. Is the URL correct? Check `REDIS_URL` in `.env`.
3. Is the port accessible? `telnet localhost 6379`.
4. If using Docker, is the Redis container on the same network?

### Cache Not Being Used

**Symptom**: Every request hits the database, no cache HITs in debug logs.

**Checks**:
1. Is `CACHE_ENABLED=true`?
2. Is Redis connected? Check `/health` endpoint.
3. Is the endpoint decorated with `@cached`?
4. Are debug logs enabled? Set `DEBUG=true` to see cache HIT/MISS messages.

### Stale Data After Update

**Symptom**: Updated data not reflected in API responses.

**Checks**:
1. Is the mutation endpoint decorated with `@invalidate_cache`?
2. Are the correct tags being invalidated?
3. Check that the invalidation ran: look for `Invalidated N cache entries` in logs.
4. As a last resort, clear all caches: `redis-cli --scan --pattern "ploan:cache:*" | xargs redis-cli del`.

### High Memory Usage

**Symptom**: Redis using more memory than expected.

**Actions**:
1. Check key count: `redis-cli --scan --pattern "ploan:cache:*" | wc -l`.
2. Check memory: `redis-cli info memory`.
3. Lower TTLs for Tier 1/2 endpoints.
4. Add `maxmemory` and `maxmemory-policy allkeys-lru` to Redis config.
