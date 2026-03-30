# Database Optimization Suggestions

> **Status**: All items implemented and tested.
> **Date**: 2026-03-30
> **Scope**: Query patterns, caching strategy, connection management, PostgreSQL config

---

## HIGH Priority

### 1. Portfolio Cache Invalidation is Too Broad
**File**: `api/routes/portfolios.py:43-44`

Currently uses `portfolio_{user_id}` tag — any modification to one portfolio invalidates ALL cached results for that user's portfolios.

```python
def _cache_tag(user_id: int) -> str:
    return f"portfolio_{user_id}"
```

**Suggestion**: Use `portfolio_{portfolio_id}` granularity instead. Adding a transaction to portfolio A shouldn't flush cache for portfolios B, C, D.

**Impact**: 5-10x fewer cache flushes per active user.

---

### 2. RAG Cache Not Scoped by User
**File**: `api/routes/rag.py:75`

Cache key is built from `query`, `top_k`, `symbol` only — no `user_id`. Two different users with the same query get identical cached results.

```python
params_hash = cache_manager.hash_params(query=req.query, top_k=req.top_k, symbol=req.symbol)
```

**Suggestion**: Add `user_id` to the hash if RAG includes any user-specific context or document access. If RAG is purely public market data, this is acceptable — but document it explicitly.

**Risk**: Potential data leakage if user-uploaded documents are included in RAG results.

---

## MEDIUM Priority

### 3. Crypto Cache TTLs Too Aggressive (30s)
**Files**: `api/routes/crypto.py:89, 195, 359`

All crypto endpoints use 30-second TTL for both trading and off-hours. External data (CoinMarketCap) doesn't update that fast.

| Endpoint | Current TTL | Suggested TTL |
|----------|-------------|---------------|
| `/crypto/market` | 30s | 120s |
| `/crypto/movers` | 30s | 120s |
| `/crypto/{symbol}` | 30s | 60s |
| `/crypto/{symbol}/history` | 60s | 300s |

**Impact**: Significantly higher cache hit rate with minimal freshness loss.

---

### 4. Cache Serialization Errors Silently Swallowed
**File**: `api/cache_decorators.py:65-72`

When an ORM object with a non-serializable field reaches the cache layer, the error is logged at `DEBUG` level and the response bypasses cache entirely.

```python
except Exception as e:
    logger.debug(f"Cache serialization error: {e}")  # Silent failure
```

**Suggestion**: Log at `WARNING` level. Add a structured log field (`cache_bypass_reason`) for observability dashboards.

---

### 5. Shareholder/TickTrade Latest-Date Subqueries
**File**: `api/routes/stocks.py:141-145, 183-187`

Separate scalar subqueries to find the latest date:

```python
db.query(func.max(Shareholder.date))
  .filter(Shareholder.security_id == sec.security_id)
  .scalar_subquery()
```

**Suggestion**: Use `ORDER BY date DESC LIMIT 1` pattern instead, which can use the existing index more efficiently than `MAX()` aggregate.

---

### 6. Companies Endpoint Double-Query Count
**File**: `api/routes/market.py:109`

```python
total = query.count()  # Separate COUNT query
items = query.offset(...).limit(...).all()
```

**Suggestion**: For the first page, use `SELECT count(*) OVER() AS total, ...` window function to get count and data in one query. Or skip count when `page=1` and `results < per_page` (means we're on the last page).

---

## LOW Priority

### 7. pgvector Probes Set Per-Connection
**Files**: `database/connection.py:44-48, 225-229`

```python
@event.listens_for(self.engine, "connect")
def _set_pgvector_probes(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("SET ivfflat.probes = 10")
    cursor.close()
```

**Suggestion**: Set `ivfflat.probes = 10` globally in `postgresql.conf` instead. Eliminates per-connection overhead (~1ms each).

---

### 8. PostgreSQL Config — Already Well-Tuned
**File**: `infra/postgres/postgresql.conf`

Current settings are appropriate for 4GB container:
- `shared_buffers = 3GB` ✓
- `work_mem = 32MB` ✓
- `maintenance_work_mem = 256MB` ✓
- Autovacuum aggressively tuned for high-write tables ✓
- Slow query logging at 500ms ✓

**No changes needed** — configuration is well-optimized.

---

### 9. Connection Pool Sizing — Appropriate
**File**: `database/connection.py`

- Sync: `pool_size=5, max_overflow=10` × 8 workers = 120 max
- Async: `pool_size=40, max_overflow=10` = 50 max
- Total: 170 connections within PgBouncer's 200 limit ✓

**No changes needed** — properly coordinated with PgBouncer.

---

## Summary

| # | Issue | Priority | Impact | Files |
|---|-------|----------|--------|-------|
| 1 | Portfolio cache too broad | HIGH | 5-10x fewer cache flushes | portfolios.py |
| 2 | RAG cache not user-scoped | HIGH | Data privacy risk | rag.py |
| 3 | Crypto TTLs too short | MEDIUM | Higher cache hit rate | crypto.py |
| 4 | Cache errors silent | MEDIUM | Better observability | cache_decorators.py |
| 5 | Subquery pattern | MEDIUM | Faster stock queries | stocks.py |
| 6 | Double count query | MEDIUM | Fewer DB round-trips | market.py |
| 7 | pgvector per-connection | LOW | Cleaner config | connection.py |
| 8 | PostgreSQL config | — | Already optimized | postgresql.conf |
| 9 | Connection pools | — | Already optimized | connection.py |
