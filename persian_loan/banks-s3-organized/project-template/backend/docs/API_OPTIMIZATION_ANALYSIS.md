# API Optimization Analysis

## Preparation for Task #6 (API Response Standardization) and Task #7 (Redis Caching)

**Date:** 2026-02-05
**Author:** Automated Analysis
**Backend:** FastAPI + MongoDB (Motor async driver)
**Architecture:** Modular (`app/modules/{banks,loans,analytics,auth,import_data,reminders}`)

---

## Section 1: API Response Audit

### 1.1 Complete Endpoint Inventory

The application registers routers in `app/main.py` under `{api_prefix}` (default: `/api`).
There are also **legacy routers** in `app/routers/` that appear to be an older version of the API (not mounted in the current `main.py`).

#### Banks Module (`/api/banks`)

| Endpoint | Method | Response Model | Actual Response Shape |
|----------|--------|---------------|----------------------|
| `GET /api/banks/` | GET | `ListResponse[BankSummary]` | `{ items: [...], total: int }` |
| `GET /api/banks/traditional` | GET | `ListResponse[BankSummary]` | `{ items: [...], total: int }` |
| `GET /api/banks/digital` | GET | `ListResponse[BankSummary]` | `{ items: [...], total: int }` |
| `GET /api/banks/{bank_id}` | GET | **None (untyped)** | Raw dict from MongoDB |
| `GET /api/banks/{bank_id}/loans` | GET | **None (untyped)** | `{ bankId, bankNameFA, bankNameEN, loans: [...], loansCount }` |
| `POST /api/banks/` | POST | `dict` | `{ message: "..." }` |
| `DELETE /api/banks/{bank_id}` | DELETE | **None (untyped)** | `{ message: "..." }` |

#### Loans Module (`/api/loans`)

| Endpoint | Method | Response Model | Actual Response Shape |
|----------|--------|---------------|----------------------|
| `GET /api/loans/` | GET | `LoanListResponse` | `{ total: int, items: List[Dict] }` |
| `GET /api/loans/no-guarantor/` | GET | `LoanListResponse` | `{ total: int, items: List[Dict] }` |
| `GET /api/loans/by-method/{method}/` | GET | `LoanListResponse` | `{ total: int, items: List[Dict] }` |
| `GET /api/loans/compare/` | GET | `LoanCompareResponse` | `{ comparison: [...], totalCompared: int }` |

#### Analytics Module (`/api/analytics`)

| Endpoint | Method | Response Model | Actual Response Shape |
|----------|--------|---------------|----------------------|
| `GET /api/analytics/summary/` | GET | `SummaryResponse` | `{ totalBanks, traditionalBanks, digitalBanks, totalLoans, noGuarantorLoans, calculationMethods }` |
| `GET /api/analytics/by-category/` | GET | `ByCategoryResponse` | `{ traditional-banks: [...], digital-banks: [...] }` |
| `GET /api/analytics/interest-rates/` | GET | `InterestRatesResponse` | `{ distribution: [...], avgRate, minRate, maxRate }` |
| `GET /api/analytics/loan-amounts/` | GET | `LoanAmountsResponse` | `{ banks: [...], totalBanks: int }` |
| `GET /api/analytics/requirements-matrix/` | GET | `RequirementsMatrixResponse` | `{ matrix: [...], totalBanks: int }` |

#### Auth Module (`/api/auth`)

| Endpoint | Method | Response Model | Actual Response Shape |
|----------|--------|---------------|----------------------|
| `POST /api/auth/register` | POST | `UserResponse` | `{ _id, username, email, role, is_active, created_at }` |
| `POST /api/auth/login` | POST | `Token` | `{ access_token, refresh_token, token_type, expires_in }` |
| `POST /api/auth/refresh` | POST | `Token` | `{ access_token, refresh_token, token_type, expires_in }` |
| `POST /api/auth/logout` | POST | **204 No Content** | `null` |
| `GET /api/auth/me` | GET | `UserResponse` | `{ _id, username, email, role, is_active, created_at }` |
| `POST /api/auth/cleanup-tokens` | POST | **None (untyped)** | `{ message: "Deleted N expired tokens" }` |

#### Import Module (`/api/import`)

| Endpoint | Method | Response Model | Actual Response Shape |
|----------|--------|---------------|----------------------|
| `POST /api/import/upload` | POST | **None (untyped)** | `{ file_id, filename, content_type, size }` |
| `POST /api/import/ocr/{file_id}` | POST | **None (untyped)** | `{ file_id, language, text, confidence, page_count }` |
| `POST /api/import/web` | POST | **None (untyped)** | `{ import_id, results: [...] }` |
| `GET /api/import/status/{import_id}` | GET | **None (untyped)** | Raw MongoDB doc or 404 |
| `GET /api/import/list` | GET | **None (untyped)** | `{ total, imports: [...] }` |
| `GET /api/import/stats` | GET | **None (untyped)** | Aggregated stats dict |

#### Reminders Module (`/api/reminders`)

| Endpoint | Method | Response Model | Actual Response Shape |
|----------|--------|---------------|----------------------|
| `POST /api/reminders/loans` | POST | `UserLoanWithSchedule` | Typed Pydantic model |
| `GET /api/reminders/loans` | GET | `LoanListResponse` | `{ total, active, completed, loans: [...] }` |
| `GET /api/reminders/loans/{loan_id}` | GET | `UserLoanWithSchedule` | Typed Pydantic model |
| `PUT /api/reminders/loans/{loan_id}` | PUT | `UserLoanResponse` | Typed Pydantic model |
| `DELETE /api/reminders/loans/{loan_id}` | DELETE | **None (untyped)** | `{ success: bool, message: str }` |
| `POST /api/reminders/loans/{loan_id}/payments/{n}/pay` | POST | **None (untyped)** | `{ success: bool, message: str }` |
| `GET /api/reminders/alerts` | GET | `AlertsListResponse` | `{ total, urgent, upcoming, overdue, alerts: [...] }` |
| `POST /api/reminders/calculate` | POST | `PaymentCalculationResponse` | Typed Pydantic model |

#### Root & Health Endpoints

| Endpoint | Method | Response Shape |
|----------|--------|---------------|
| `GET /` | GET | `{ name, version, docs, api }` |
| `GET /health` | GET | `{ status, database }` or `{ status, database, error }` |

### 1.2 Identified Inconsistencies

#### CRITICAL: Inconsistency #1 -- No Unified Envelope

The most significant inconsistency is the **absence of a standard response envelope**. Different modules return completely different top-level structures:

- **Banks list**: `{ items: [...], total }` (via `ListResponse`)
- **Loans list**: `{ total, items: [...] }` (via `LoanListResponse` -- same keys, different schema)
- **Loans by-method**: `{ method, total, loans: [...] }` (includes `method` field, uses `loans` key instead of `items`)
- **Loan compare**: `{ comparison: [...], totalCompared }` (unique structure)
- **Analytics summary**: Flat object with domain fields
- **Analytics by-category**: `{ traditional-banks: [...], digital-banks: [...] }` (hyphenated keys)
- **Import list**: `{ total, imports: [...] }` (uses `imports` key)
- **Reminders loans**: `{ total, active, completed, loans: [...] }` (uses `loans` key + extra summary fields)
- **Reminders alerts**: `{ total, urgent, upcoming, overdue, alerts: [...] }` (uses `alerts` key + extra summary fields)

**Impact:** Frontend must handle each endpoint response shape individually. The `listResponseSchema` in the frontend expects `{ items, total }` but many endpoints use different list keys (`loans`, `imports`, `alerts`, `comparison`).

#### CRITICAL: Inconsistency #2 -- Untyped Endpoints

**12 out of 30 endpoints** have no `response_model` declared, returning raw dictionaries. These endpoints are:

1. `GET /api/banks/{bank_id}` -- Returns raw MongoDB document
2. `GET /api/banks/{bank_id}/loans` -- Returns ad-hoc dict
3. `DELETE /api/banks/{bank_id}` -- Returns `{ message }`
4. `POST /api/import/upload` -- Returns ad-hoc dict
5. `POST /api/import/ocr/{file_id}` -- Returns manually constructed dict
6. `POST /api/import/web` -- Returns ad-hoc dict
7. `GET /api/import/status/{import_id}` -- Returns raw MongoDB doc
8. `GET /api/import/list` -- Returns ad-hoc dict
9. `GET /api/import/stats` -- Returns ad-hoc dict
10. `DELETE /api/reminders/loans/{loan_id}` -- Returns `{ success, message }`
11. `POST /api/reminders/loans/{loan_id}/payments/{n}/pay` -- Returns `{ success, message }`
12. `POST /api/auth/cleanup-tokens` -- Returns `{ message }`

**Impact:** No OpenAPI schema validation, no contract guarantee, potential data leaks from raw MongoDB docs (e.g., internal fields).

#### Inconsistency #3 -- List Key Naming

Collection endpoints use **four different keys** for the list of items:

| Key | Used By |
|-----|---------|
| `items` | Banks (via `ListResponse`), Loans (via `LoanListResponse`) |
| `loans` | Loans by-method, Reminders loans list |
| `imports` | Import list |
| `alerts` | Reminders alerts |
| `comparison` | Loan compare |
| `banks` | Analytics loan-amounts |
| `matrix` | Analytics requirements-matrix |
| `distribution` | Analytics interest-rates |

**Impact:** Frontend cannot use a generic list parser. Each service module needs bespoke response handling.

#### Inconsistency #4 -- Error Response Formats

Three different error response patterns exist:

1. **Custom AppException** (via `app_exception_handler`):
   ```json
   { "error": true, "message": "...", "details": {} }
   ```

2. **FastAPI HTTPException** (used by auth, import modules):
   ```json
   { "detail": "..." }
   ```

3. **Pydantic Validation Errors** (automatic):
   ```json
   { "detail": [{ "loc": [...], "msg": "...", "type": "..." }] }
   ```

**Impact:** Frontend error handling must check for multiple error shapes. No consistent `error.code` field for programmatic error handling.

#### Inconsistency #5 -- Pagination Approaches

Three different pagination patterns exist:

1. **`ListResponse`** (`core/schemas.py`): `{ items, total }` -- No skip/limit metadata
2. **`PaginatedListResponse`** (`core/schemas.py`): `{ items, total, skip, limit, has_more }` -- **Never used by any endpoint**
3. **`PaginatedResponse`** (`common/responses.py`): `{ items, pagination: { total, page, page_size, total_pages, has_next, has_prev } }` -- **Never used by any endpoint**
4. **No pagination**: Analytics endpoints return all data, import list uses `limit` param but no offset

**Impact:** Two sophisticated pagination schemas (`PaginatedListResponse`, `PaginatedResponse`) were designed but never adopted. The `ListResponse` used in production provides no pagination metadata, making infinite scroll or proper pagination impossible.

#### Inconsistency #6 -- camelCase vs snake_case

Response fields use mixed naming:

- **camelCase** (via Pydantic `alias`): `totalBanks`, `bankNameFA`, `loansCount`, `interestRate`
- **snake_case**: `file_id`, `content_type`, `page_count` (in import module)
- **Mixed in same response**: Import endpoints return `file_id` (snake) alongside `content_type` (snake), but analytics returns `avgRate` (camel)

**Impact:** Frontend must handle both conventions. Some endpoints need `by_alias=True` serialization while others do not.

#### Inconsistency #7 -- Success Action Responses

Mutating operations return inconsistent success indicators:

- **Banks create/delete**: `{ "message": "Bank X created/deleted successfully" }`
- **Reminders delete**: `{ "success": true, "message": "Loan deleted successfully" }`
- **Reminders mark paid**: `{ "success": true, "message": "Payment N marked as paid" }`
- **Auth cleanup**: `{ "message": "Deleted N expired tokens" }`
- **Auth logout**: `null` (204 No Content)

**Impact:** No reliable way to check success programmatically across modules.

### 1.3 Legacy vs Modular Router Divergence

The codebase contains **two sets of routers**:

| Layer | Location | Status |
|-------|----------|--------|
| Legacy | `app/routers/{banks,loans,analytics,health}.py` | Not mounted in `main.py`, appears to be dead code |
| Modular | `app/modules/{banks,loans,analytics,...}/router.py` | Active, mounted in `main.py` |

Key differences in legacy code:
- Legacy banks list returned `List[BankSummary]` (bare list) instead of `ListResponse[BankSummary]`
- Legacy loans returned `{ total, loans }` with `loans` key
- Legacy analytics `loan-amounts` returned a bare list instead of `{ banks, totalBanks }`
- Legacy analytics `requirements-matrix` returned a bare list instead of `{ matrix, totalBanks }`
- Legacy `compare` used `total` while modular uses `totalCompared`

**Impact:** Legacy routers are dead code but demonstrate the evolution that created current inconsistencies.

### 1.4 Recommended Standardized Response Format

Based on the analysis, we recommend a **standard API envelope** that wraps all responses:

```python
# Proposed: app/common/schemas/response.py

class ApiResponse(BaseModel, Generic[T]):
    """Standard API response envelope."""
    success: bool = True
    data: T
    meta: Optional[dict] = None  # For pagination, timing, etc.
    errors: Optional[List[ApiError]] = None

class ApiError(BaseModel):
    """Standardized error detail."""
    code: str           # Machine-readable: "BANK_NOT_FOUND"
    message: str        # Human-readable: "Bank with id 'xyz' not found"
    field: Optional[str] = None  # For validation: "interest_rate"
    details: Optional[dict] = None

class PaginationMeta(BaseModel):
    """Pagination metadata."""
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_prev: bool

class PaginatedApiResponse(ApiResponse[List[T]], Generic[T]):
    """Paginated response with standard envelope."""
    meta: PaginationMeta
```

**Example successful list response:**
```json
{
  "success": true,
  "data": [
    { "id": "bank-melli", "nameFA": "...", ... }
  ],
  "meta": {
    "total": 25,
    "page": 1,
    "page_size": 20,
    "total_pages": 2,
    "has_next": true,
    "has_prev": false
  },
  "errors": null
}
```

**Example error response:**
```json
{
  "success": false,
  "data": null,
  "meta": null,
  "errors": [
    {
      "code": "BANK_NOT_FOUND",
      "message": "Bank with id 'xyz' not found",
      "field": null,
      "details": null
    }
  ]
}
```

---

## Section 2: Caching Strategy

### 2.1 Endpoint Caching Analysis & Rankings

Endpoints are ranked by caching benefit based on: (1) request frequency, (2) data volatility, (3) computational cost, and (4) data size.

#### Tier 1: HIGH Benefit (Cache Immediately)

| Rank | Endpoint | Est. Hit Rate | Reasoning |
|------|----------|--------------|-----------|
| 1 | `GET /api/analytics/summary/` | 95%+ | Most-viewed dashboard data. Reads all banks from DB + computes aggregates every call. Data changes only when bank records are updated (rare). |
| 2 | `GET /api/analytics/by-category/` | 95%+ | Same as summary -- reads all banks, groups them. Static until bank data changes. |
| 3 | `GET /api/analytics/interest-rates/` | 90%+ | Iterates all banks + all loan types, parses rates. Expensive computation, rarely changes. |
| 4 | `GET /api/analytics/loan-amounts/` | 90%+ | Iterates all banks + all loan types for amounts. |
| 5 | `GET /api/analytics/requirements-matrix/` | 90%+ | Iterates all banks for requirements data. |
| 6 | `GET /api/banks/` | 85%+ | Core listing endpoint, called on every page load. Bank list rarely changes. |
| 7 | `GET /api/banks/traditional` | 85%+ | Subset of banks list. |
| 8 | `GET /api/banks/digital` | 85%+ | Subset of banks list. |

#### Tier 2: MEDIUM Benefit (Cache with Shorter TTL)

| Rank | Endpoint | Est. Hit Rate | Reasoning |
|------|----------|--------------|-----------|
| 9 | `GET /api/loans/` | 75% | Loans are derived from bank data. Pagination params reduce hit rate. |
| 10 | `GET /api/loans/no-guarantor/` | 80% | Fixed filter, high repeatability. |
| 11 | `GET /api/loans/by-method/{method}/` | 70% | 7 possible methods = 7 cache entries. Good for frequently queried methods. |
| 12 | `GET /api/banks/{bank_id}` | 60% | Individual bank lookups. ~25 banks = bounded key space. Popular banks get repeated hits. |
| 13 | `GET /api/banks/{bank_id}/loans` | 60% | Individual bank loans. Same bounded key space as above. |

#### Tier 3: LOW Benefit (Cache Selectively or Not At All)

| Rank | Endpoint | Est. Hit Rate | Reasoning |
|------|----------|--------------|-----------|
| 14 | `GET /api/loans/compare/` | 30% | Dynamic query params (comma-separated IDs). Very low cache hit rate. |
| 15 | `GET /api/reminders/loans` | N/A | User-specific, changes frequently. Do NOT cache. |
| 16 | `GET /api/reminders/alerts` | N/A | User-specific, time-sensitive. Do NOT cache. |
| 17 | `POST /api/reminders/calculate` | 40% | Same inputs give same outputs, but POST bodies are rarely identical. |
| 18 | `GET /api/import/list` | 20% | Admin feature, low traffic, frequently changing data. |
| 19 | All auth endpoints | N/A | Security-sensitive. Must NEVER cache. |
| 20 | All mutation endpoints (POST/PUT/DELETE) | N/A | Mutations must not be cached. |

### 2.2 Recommended TTL Strategy

| Cache Category | TTL | Endpoints | Justification |
|---------------|-----|-----------|---------------|
| **Static Reference Data** | 300s (5 min) | All analytics endpoints, bank lists | Bank/loan product data is updated by admin imports, not by end users. 5-minute staleness is acceptable. |
| **Individual Resources** | 120s (2 min) | `GET /banks/{id}`, `GET /banks/{id}/loans` | Individual bank lookups. Shorter TTL for slightly fresher data. |
| **Filtered Lists** | 180s (3 min) | `GET /loans/`, `GET /loans/no-guarantor/`, `GET /loans/by-method/{method}/` | Derived from bank data. Moderate TTL balances freshness and performance. |
| **Comparison Queries** | 60s (1 min) | `GET /loans/compare/` | Dynamic params reduce hit rate, but caching even briefly helps with repeated comparisons. |
| **User-Specific Data** | 0 (No Cache) | All `/reminders/*`, `/auth/*` | User data changes frequently and must be real-time. |
| **Admin/Import Data** | 0 (No Cache) | All `/import/*` | Administrative, low traffic, stale data is confusing. |

### 2.3 Cache Key Structure Design

```
Prefix:    ploan:cache:{module}:{endpoint}:{params_hash}
```

**Key format examples:**

| Endpoint | Cache Key |
|----------|-----------|
| `GET /api/banks/` | `ploan:cache:banks:list:all` |
| `GET /api/banks/?category=digital-banks` | `ploan:cache:banks:list:cat=digital-banks` |
| `GET /api/banks/traditional` | `ploan:cache:banks:list:traditional` |
| `GET /api/banks/digital` | `ploan:cache:banks:list:digital` |
| `GET /api/banks/{bank_id}` | `ploan:cache:banks:detail:{bank_id}` |
| `GET /api/banks/{bank_id}/loans` | `ploan:cache:banks:loans:{bank_id}` |
| `GET /api/loans/?skip=0&limit=100` | `ploan:cache:loans:list:skip=0:lim=100` |
| `GET /api/loans/?no_guarantor=true` | `ploan:cache:loans:list:ng=true:skip=0:lim=100` |
| `GET /api/loans/no-guarantor/` | `ploan:cache:loans:no-guarantor` |
| `GET /api/loans/by-method/{method}/` | `ploan:cache:loans:method:{method}` |
| `GET /api/loans/compare/?loan_ids=...` | `ploan:cache:loans:compare:{sha256(loan_ids)[:12]}` |
| `GET /api/analytics/summary/` | `ploan:cache:analytics:summary` |
| `GET /api/analytics/by-category/` | `ploan:cache:analytics:by-category` |
| `GET /api/analytics/interest-rates/` | `ploan:cache:analytics:interest-rates` |
| `GET /api/analytics/loan-amounts/` | `ploan:cache:analytics:loan-amounts` |
| `GET /api/analytics/requirements-matrix/` | `ploan:cache:analytics:requirements-matrix` |

**Key design principles:**
1. **Prefix** (`ploan:cache:`) prevents collisions with other Redis data (sessions, rate limits).
2. **Module segment** allows pattern-based invalidation (`ploan:cache:banks:*`).
3. **Params hash** for complex query params (compare endpoint uses SHA256 truncation).
4. **Total estimated keys**: ~50-100 at any given time (bounded by 25 banks x few filters).

### 2.4 Cache Invalidation Strategy

#### Strategy: **Tag-Based Invalidation with Event Triggers**

Since bank/loan data is the source for most cached endpoints, we use a hierarchical invalidation model:

```
Bank Data Changed (create/update/delete)
  |
  +-- Invalidate: ploan:cache:banks:*        (all bank caches)
  +-- Invalidate: ploan:cache:loans:*        (all loan caches -- derived from banks)
  +-- Invalidate: ploan:cache:analytics:*    (all analytics caches -- derived from banks)
```

#### Invalidation Triggers

| Trigger Event | Invalidation Scope |
|--------------|-------------------|
| `POST /api/banks/` (create bank) | `ploan:cache:banks:*`, `ploan:cache:loans:*`, `ploan:cache:analytics:*` |
| `DELETE /api/banks/{id}` (delete bank) | Same as create |
| `POST /api/import/upload` + OCR completes | Same as create (new data imported) |
| `POST /api/import/web` + scrape completes | Same as create |
| Manual admin update | Same as create |

#### Implementation Pattern

```python
# Proposed: app/common/cache.py

class CacheService:
    def __init__(self, redis: Redis):
        self.redis = redis

    async def get(self, key: str) -> Optional[str]:
        """Get cached value."""
        return await self.redis.get(key)

    async def set(self, key: str, value: str, ttl: int) -> None:
        """Set cached value with TTL."""
        await self.redis.setex(key, ttl, value)

    async def invalidate_pattern(self, pattern: str) -> int:
        """Invalidate all keys matching pattern."""
        keys = []
        async for key in self.redis.scan_iter(match=pattern):
            keys.append(key)
        if keys:
            return await self.redis.delete(*keys)
        return 0

    async def invalidate_bank_data(self) -> None:
        """Invalidate all caches derived from bank data."""
        await self.invalidate_pattern("ploan:cache:banks:*")
        await self.invalidate_pattern("ploan:cache:loans:*")
        await self.invalidate_pattern("ploan:cache:analytics:*")
```

#### Cache-Aside Pattern (Recommended)

```python
# Decorator approach for router endpoints
from functools import wraps

def cached(key_template: str, ttl: int = 300):
    """Cache decorator for FastAPI endpoints."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, cache: CacheService = Depends(get_cache), **kwargs):
            # Build cache key from template and kwargs
            cache_key = key_template.format(**kwargs)

            # Try cache first
            cached_data = await cache.get(cache_key)
            if cached_data:
                return json.loads(cached_data)

            # Execute handler
            result = await func(*args, **kwargs)

            # Cache result
            await cache.set(cache_key, json.dumps(result), ttl)
            return result
        return wrapper
    return decorator
```

---

## Section 3: Implementation Recommendations

### 3.1 Proposed Standardized Response Model

File: `app/common/schemas/response.py`

```python
"""
Standardized API Response Models

All API endpoints MUST use these models to ensure consistent response format.
"""

from typing import Generic, List, Optional, TypeVar
from pydantic import BaseModel, Field
from datetime import datetime

T = TypeVar("T")


class ApiError(BaseModel):
    """Individual error detail."""
    code: str = Field(..., description="Machine-readable error code (e.g. BANK_NOT_FOUND)")
    message: str = Field(..., description="Human-readable error message")
    field: Optional[str] = Field(None, description="Field name for validation errors")
    details: Optional[dict] = Field(None, description="Additional error context")


class PaginationMeta(BaseModel):
    """Pagination metadata for list endpoints."""
    total: int = Field(..., description="Total number of items across all pages")
    page: int = Field(..., ge=1, description="Current page number (1-indexed)")
    page_size: int = Field(..., ge=1, le=100, description="Items per page")
    total_pages: int = Field(..., ge=0, description="Total number of pages")
    has_next: bool = Field(..., description="Whether there is a next page")
    has_prev: bool = Field(..., description="Whether there is a previous page")

    @classmethod
    def create(cls, total: int, page: int, page_size: int) -> "PaginationMeta":
        total_pages = (total + page_size - 1) // page_size if page_size > 0 else 0
        return cls(
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_prev=page > 1,
        )


class ResponseMeta(BaseModel):
    """Response metadata."""
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    pagination: Optional[PaginationMeta] = None
    cached: bool = False
    cache_ttl: Optional[int] = None  # seconds remaining


class ApiResponse(BaseModel, Generic[T]):
    """
    Standard API response envelope.

    All endpoints should return this format.
    """
    success: bool = True
    data: Optional[T] = None
    meta: ResponseMeta = Field(default_factory=ResponseMeta)
    errors: Optional[List[ApiError]] = None


# Convenience constructors
def ok(data: T, **meta_kwargs) -> ApiResponse[T]:
    """Create successful response."""
    return ApiResponse(success=True, data=data, meta=ResponseMeta(**meta_kwargs))


def paginated(items: List[T], total: int, page: int, page_size: int, **kwargs) -> ApiResponse[List[T]]:
    """Create paginated successful response."""
    pagination = PaginationMeta.create(total, page, page_size)
    return ApiResponse(
        success=True,
        data=items,
        meta=ResponseMeta(pagination=pagination, **kwargs),
    )


def error(code: str, message: str, status_code: int = 400, **kwargs) -> ApiResponse:
    """Create error response."""
    return ApiResponse(
        success=False,
        data=None,
        errors=[ApiError(code=code, message=message, **kwargs)],
    )
```

### 3.2 Redis Configuration Needs

#### Required Dependencies

```
# requirements.txt additions
redis[hiredis]>=5.0.0    # Async Redis client with C parser for performance
```

#### Configuration

```python
# app/core/config.py additions

class Settings(BaseSettings):
    # ... existing fields ...

    # Redis
    redis_url: str = "redis://localhost:6379/0"
    redis_password: Optional[str] = None
    redis_ssl: bool = False
    redis_max_connections: int = 20

    # Cache settings
    cache_enabled: bool = True
    cache_default_ttl: int = 300  # 5 minutes
    cache_prefix: str = "ploan:cache"
```

#### Redis Connection Manager

```python
# app/core/redis.py

import redis.asyncio as redis
from app.core.config import settings

class RedisManager:
    _pool: Optional[redis.ConnectionPool] = None
    _client: Optional[redis.Redis] = None

    @classmethod
    async def connect(cls):
        cls._pool = redis.ConnectionPool.from_url(
            settings.redis_url,
            password=settings.redis_password,
            max_connections=settings.redis_max_connections,
            decode_responses=True,
        )
        cls._client = redis.Redis(connection_pool=cls._pool)
        await cls._client.ping()

    @classmethod
    async def disconnect(cls):
        if cls._client:
            await cls._client.close()
        if cls._pool:
            await cls._pool.disconnect()

    @classmethod
    def get_client(cls) -> redis.Redis:
        if not cls._client:
            raise RuntimeError("Redis not connected")
        return cls._client
```

#### Infrastructure Requirements

- **Redis Server**: v7.0+ recommended (for improved memory efficiency)
- **Memory**: ~10-50 MB for this application's cache (small dataset of ~25 banks)
- **Docker Compose** addition:
  ```yaml
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --maxmemory 100mb --maxmemory-policy allkeys-lru
  ```

### 3.3 Migration Strategy (v1 -> v2 API)

#### Phase 1: Add Response Wrapper (Non-Breaking)

**Goal:** Introduce the standardized envelope without breaking existing clients.

1. Create the `ApiResponse` models in `app/common/schemas/response.py`.
2. Add a **response middleware** that wraps existing responses in the envelope:

```python
# app/common/middleware/response_wrapper.py

class ResponseWrapperMiddleware:
    """Wraps API responses in standard envelope."""

    async def __call__(self, request, call_next):
        response = await call_next(request)

        # Only wrap API endpoints
        if not request.url.path.startswith("/api"):
            return response

        # Don't wrap if already wrapped (check for 'success' key)
        # Don't wrap 204 No Content responses
        # Implementation details...
```

**Alternative approach (preferred):** Use FastAPI's `response_model` with the new envelope:

```python
# Phase 1: Dual-format endpoints
@router.get("/", response_model=ApiResponse[List[BankSummary]])
async def get_all_banks(...):
    banks = await service.get_all_banks(...)
    return paginated(items=banks, total=len(banks), page=1, page_size=limit)
```

#### Phase 2: Add Pagination to All List Endpoints

**Goal:** Convert skip/limit to page/page_size across all list endpoints.

1. Change query parameter convention:
   - Current: `skip: int, limit: int`
   - Target: `page: int = 1, page_size: int = 20`
2. Update all list endpoints to return `PaginationMeta`.
3. Ensure total counts come from MongoDB `$count` (already done for loans, needs for banks).

#### Phase 3: Standardize Error Responses

**Goal:** All errors use the same envelope.

1. Update `AppException` handler to return `ApiResponse` format.
2. Add global exception handler for `HTTPException` to match format.
3. Add Pydantic validation error handler to match format.

```python
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content=ApiResponse(
            success=False,
            errors=[ApiError(
                code=f"HTTP_{exc.status_code}",
                message=exc.detail,
            )]
        ).model_dump()
    )
```

#### Phase 4: Integrate Redis Caching

**Goal:** Add cache layer to Tier 1 and Tier 2 endpoints.

1. Add Redis connection to application lifespan.
2. Implement `CacheService` with get/set/invalidate.
3. Add `@cached` decorator to analytics endpoints first (highest impact).
4. Add cache invalidation to bank mutation endpoints.
5. Add `X-Cache: HIT/MISS` response header for observability.

### 3.4 Backward Compatibility Approach

#### Option A: API Versioning (Recommended)

```python
# Mount v1 (existing) and v2 (new standard) routers
app.include_router(banks_router_v1, prefix="/api/banks", tags=["Banks v1"])
app.include_router(banks_router_v2, prefix="/api/v2/banks", tags=["Banks v2"])
```

- **v1 endpoints** remain unchanged for existing frontend.
- **v2 endpoints** use standardized envelope.
- Frontend migrates module by module.
- v1 deprecated after full frontend migration.

#### Option B: Content Negotiation

```python
# Client sends Accept header to choose format
# Accept: application/json           -> v1 format (default)
# Accept: application/vnd.ploan.v2+json -> v2 format
```

#### Option C: Wrapper Middleware (Quickest)

Add a middleware that wraps ALL existing responses in the new envelope. Existing `data` becomes `data` field. Add `meta.timestamp` and `success` fields. This is transparent to the frontend if it reads `response.data.data` or `response.data.items`.

**Recommended approach:** **Option A** (versioned routes) because:
- No risk of breaking existing frontend
- Clear migration path
- Can run both versions in parallel
- Easy to remove v1 once migration is complete

### 3.5 Implementation Priority Order

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| P0 | Create `ApiResponse` / `ApiError` / `PaginationMeta` models | 1 day | Foundation for all other work |
| P1 | Add response_model to all 12 untyped endpoints | 1 day | Eliminates data leaks, improves OpenAPI docs |
| P2 | Standardize error handling (unified error envelope) | 1 day | Frontend can use single error parser |
| P3 | Convert all list endpoints to use `PaginationMeta` | 2 days | Enables proper pagination in frontend |
| P4 | Add Redis connection + CacheService | 1 day | Infrastructure for caching |
| P5 | Cache Tier 1 endpoints (analytics + bank lists) | 1 day | Biggest performance win |
| P6 | Cache Tier 2 endpoints (filtered loans, individual banks) | 1 day | Additional performance gains |
| P7 | Add cache invalidation to mutation endpoints | 0.5 days | Ensures cache correctness |
| P8 | Add cache headers (`X-Cache`, `Cache-Control`) | 0.5 days | Observability + browser caching |
| P9 | Standardize field naming to camelCase everywhere | 1 day | Consistent frontend consumption |
| P10 | Deprecation warnings for v1 endpoints | 0.5 days | Migration communication |

**Total estimated effort:** ~10-11 developer days

### 3.6 Metrics to Track Post-Implementation

| Metric | Tool | Target |
|--------|------|--------|
| Cache hit rate | Redis INFO stats | >80% for Tier 1 endpoints |
| P95 response time (analytics) | Application logging | <50ms (from ~200ms uncached) |
| P95 response time (bank lists) | Application logging | <30ms (from ~100ms uncached) |
| Cache memory usage | Redis INFO memory | <50 MB |
| Error rate by error code | Application logging | Trackable per code |
| API response size | Middleware | Baseline + compare after envelope |

---

## Appendix A: Existing Code Assets (Unused but Relevant)

The following models already exist in the codebase but are **not used by any endpoint**:

| Model | Location | Purpose |
|-------|----------|---------|
| `PaginatedListResponse` | `app/core/schemas.py` | Skip/limit pagination wrapper |
| `PaginatedResponse` | `app/common/responses.py` | Full page-based pagination with `create()` classmethod |
| `SuccessResponse` | `app/common/responses.py` | `{ success, message, data }` wrapper |
| `ErrorResponse` | `app/common/responses.py` | `{ error, message, details }` wrapper |
| `CountResponse` | `app/common/responses.py` | `{ count, category }` wrapper |
| `HealthCheckResponse` | `app/common/responses.py` | Typed health check response |
| `BankListResponse` | `app/modules/banks/schemas.py` | `{ total, banks }` -- never used |
| `BankResponse` | `app/modules/banks/schemas.py` | Full bank detail schema -- never used as `response_model` |
| `FileUploadResponse` | `app/modules/import_data/schemas.py` | Typed upload response -- never used |
| `ImportStatusResponse` | `app/modules/import_data/schemas.py` | Typed status response -- never used |
| `ImportListResponse` | `app/modules/import_data/schemas.py` | Typed list response -- never used |

**Recommendation:** These models represent previous standardization attempts. The new implementation should consolidate them into the single `ApiResponse` envelope rather than adding yet another layer.

## Appendix B: Frontend Impact Assessment

The frontend (`/frontend/src/services/`) currently handles responses as follows:

| Service | Expected Format | Adaptation Needed for v2 |
|---------|----------------|--------------------------|
| `banks.service.ts` | `{ items, total }` | Change to `response.data.data` (unwrap envelope) |
| `loans.service.ts` | `{ items, total }` via validation | Same as banks |
| `analytics.service.ts` | Direct `response.data` | Wrap with `response.data.data` |
| `reminders.service.ts` | Direct `response.data` | Wrap with `response.data.data` |
| `import.service.ts` | Direct `response.data` | Wrap with `response.data.data` |

**Migration approach:** Add a response interceptor in `api.ts` that unwraps the envelope:

```typescript
// Temporary adapter during migration
api.interceptors.response.use((response) => {
  if (response.data?.success !== undefined) {
    // v2 envelope detected -- unwrap
    response.data = response.data.data;
  }
  return response;
});
```

This allows the frontend to migrate gradually without breaking existing service code.
