# Software Architecture Scoring

> **Date**: 2026-02-23 | **Type**: Code review & design analysis | **No load tests** — analysis-based scoring

---

## Overview

Architecture review of 8 core components covering caching, rate limiting, monitoring, application factory, reverse proxy, database tuning, connection pooling, and service orchestration.

---

## Architecture Diagram

```
                         ┌─────────────┐
                         │   Client    │
                         └──────┬──────┘
                                │
                         ┌──────▼──────┐
                         │  Nginx :80  │  Rate limits, gzip, static assets, security headers
                         │  (1.25.5)   │  Cache: immutable hashed assets (1yr), no-cache HTML
                         └──────┬──────┘
                                │
                    ┌───────────▼───────────┐
                    │  Gunicorn + Uvicorn   │  8 workers, async ASGI
                    │  FastAPI :8000        │  Middleware: GZip → CORS → RateLimit → Security
                    └─────┬─────────┬───────┘
                          │         │
               ┌──────────▼──┐  ┌──▼──────────┐
               │ PgBouncer   │  │   Redis      │  Cache (tag-based), rate limits,
               │ :5432       │  │   :6379      │  router cache, embedding cache
               │ txn mode    │  │   512 MB max │
               └──────┬──────┘  └──────────────┘
                      │
               ┌──────▼──────┐
               │ PostgreSQL  │  300 max_conn, 3 GB shared_buffers
               │ 16 + pgvec  │  TimescaleDB, pg_trgm, pg_stat_statements
               │ :5432       │
               └─────────────┘
```

### Middleware Stack Order (api/main.py)

```
Request → GZipMiddleware (min 500B)
        → CORSMiddleware (allow_origins=*)
        → RateLimitMiddleware (Redis sliding window)
        → SecurityMiddleware (X-Request-ID)
        → FastAPI router
        → Response
```

---

## Component Scoring

### 1. Cache Manager (`api/cache.py`) — **8/10**

| Aspect | Score | Detail |
|--------|-------|--------|
| Pattern | 9 | Tag-based invalidation with Redis sorted sets; clean key namespace |
| Fallback | 8 | Graceful degradation when Redis unavailable (fail-open) |
| Collision risk | 7 | MD5 hash truncated to 12 chars — acceptable for current scale, not ideal |
| TTL strategy | 9 | Trading-hours-aware dynamic TTL (shorter during market open) |
| Pipeline usage | 8 | Non-transactional pipelines for speed; small race window on tag sets |

**Strengths**: Spider-driven cache busting aligns perfectly with the data pipeline. Trading-hours awareness is a unique, domain-specific optimization.

**Concerns**: Fail-open means silent cache misses during Redis outages. MD5 truncation (12 chars) has theoretical collision risk at very high key counts.

---

### 2. Rate Limiter (`api/rate_limit.py`) — **8.5/10**

| Aspect | Score | Detail |
|--------|-------|--------|
| Algorithm | 9 | Sliding window via Redis sorted sets — accurate, no burst gaps |
| Headers | 9 | Standard X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After |
| Tier system | 8 | 4 tiers (default/heavy/scraper/auth) with prefix-based matching |
| IP extraction | 8 | Reads X-Real-IP and X-Forwarded-For from Nginx |
| Fail behavior | 8 | Fail-open on Redis error — allows request through |

**Strengths**: Distributed rate limiting (Redis-backed) works correctly across multiple Uvicorn workers. Proper header compliance enables client-side backoff.

**Concerns**: Default tier is 300 req/min (not 100 as CLAUDE.md states). Prefix-based matching could accidentally capture similar routes.

---

### 3. Monitoring (`api/monitoring.py`) — **7/10**

| Aspect | Score | Detail |
|--------|-------|--------|
| Metrics | 7 | Prometheus auto-instrumentation via `prometheus-fastapi-instrumentator` |
| Logging | 6 | JSON structured logging but replaces all root handlers |
| Correlation | 7 | X-Request-ID header (8-char UUID prefix) |
| Tracing | 5 | No OpenTelemetry / W3C Trace Context support |
| Extensibility | 6 | Hardcoded log level; no per-module verbosity control |

**Strengths**: Prometheus integration is zero-config. Request ID provides basic correlation across logs.

**Concerns**: 8-char request ID has collision risk under load. No distributed tracing support. JSON logger replaces all handlers, potentially breaking third-party logging.

---

### 4. App Factory (`api/main.py`) — **8.5/10**

| Aspect | Score | Detail |
|--------|-------|--------|
| Lifespan | 9 | Clean async setup/teardown for Redis, DB, scheduler, cache warming |
| Security | 8 | SPA fallback with path traversal guard (`.resolve()` + `startswith()`) |
| Feature flags | 9 | ENABLE_LOANS, ENABLE_CRYPTO, ENABLE_VOICE toggles |
| Error handling | 8 | Custom error format `{error: {code, message, request_id}}` |
| Middleware order | 9 | GZip → CORS → RateLimit → Security — correct ordering |

**Strengths**: Feature flags allow selective deployment. Cache warming is intelligent (only when Redis is available). Alembic migration check at startup warns about schema drift.

**Concerns**: Scheduler single-instance assumption lacks enforcement. Validation errors expose Pydantic internals. CORS `allow_methods=["*"]` may not behave as expected per HTTP spec.

---

### 5. Nginx Configuration (`infra/nginx/nginx.conf`) — **8.5/10**

| Aspect | Score | Detail |
|--------|-------|--------|
| Proxy setup | 9 | Upstream least_conn, keepalive, proper headers |
| Compression | 8 | Gzip level 6, type whitelist, min length 1KB |
| Caching | 9 | Immutable assets (1yr), no-cache HTML, proper ETag |
| Security | 8 | HSTS, CSP, X-Content-Type-Options, Permissions-Policy |
| WebSocket | 9 | Proper upgrade headers, 1h timeout for WS connections |

**Strengths**: Comprehensive security header set. Correct WebSocket proxy configuration. Rate limiting with burst allowance.

**Concerns**: CSP allows `unsafe-inline` for scripts (XSS risk). HTTP/1.1 only (no HTTP/2). Nginx rate limits (30r/s = 1800 rpm) are looser than app-level limits (300 rpm), making Nginx limits ineffective.

---

### 6. PostgreSQL Configuration (`infra/postgres/postgresql.conf`) — **8/10**

| Aspect | Score | Detail |
|--------|-------|--------|
| Memory allocation | 7 | 3 GB shared_buffers in 4 GB container — aggressive |
| SSD tuning | 9 | random_page_cost=1.1, effective_io_concurrency=200 |
| Parallelism | 8 | max_parallel_workers_per_gather=4 (good for analytics) |
| Autovacuum | 9 | Aggressive thresholds (50 rows, 5% scale) for high-write tables |
| WAL | 8 | 512 MB min, 2 GB max — appropriate for stock tick ingestion |

**Strengths**: SSD-optimized settings. Aggressive autovacuum prevents bloat on frequently-updated tables. TimescaleDB and pgvector extensions loaded.

**Concerns**: shared_buffers=3 GB leaves only 1 GB for OS cache in a 4 GB container. work_mem=64 MB can exhaust memory under concurrent parallel queries (4 workers × 64 MB × N queries).

---

### 7. Connection Manager (`database/connection.py`) — **8.5/10**

| Aspect | Score | Detail |
|--------|-------|--------|
| Pool tuning | 8 | pool_size=30, max_overflow=50 (80 total) for sync; 20+40 for async |
| Retry logic | 9 | Exponential backoff (1s, 2s, 4s) with 3 attempts |
| Security | 9 | URL masking prevents password leaks in logs |
| Dual mode | 8 | Separate sync (SQLAlchemy) and async (asyncpg) managers |
| Pre-ping | 9 | pool_pre_ping=True detects stale connections before use |

**Strengths**: Robust retry logic. Password masking in logs. Proper pool recycling (3600s). Pre-ping ensures connection health.

**Concerns**: Sync pool (80 connections) + async pool (60 connections) = 140 potential connections — aligned with PgBouncer's 200 limit. Scoped sessions (thread-local) should not be used in async routes.

---

### 8. Docker Compose (`docker-compose.yml`) — **8/10**

| Aspect | Score | Detail |
|--------|-------|--------|
| Health checks | 9 | All critical services have health checks with dependencies |
| Resource limits | 8 | CPU and memory limits on all services |
| Logging | 8 | JSON logging with rotation (10 MB, 5 files) |
| Observability | 8 | Prometheus + Grafana included |
| Secrets | 5 | JWT_SECRET_KEY and API keys in environment variables — not using Docker Secrets |

**Strengths**: Service dependency chains prevent cascading failures. Scheduler separated from API workers. Prometheus + Grafana for monitoring.

**Concerns**: Secrets in environment variables (should use Docker Secrets or external vault). No network policies — all services can reach all others.

---

## Security Assessment

| Area | Status | Notes |
|------|--------|-------|
| Authentication | JWT + bcrypt | Proper token rotation, role-based access |
| Rate limiting | Dual (Nginx + Redis) | App-level is stricter and effective |
| Path traversal | Protected | `.resolve()` + `startswith()` guard on SPA fallback |
| CSP | Partially | `unsafe-inline` allowed — should use nonce-based CSP |
| CORS | Permissive | `allow_origins=*` — restrict in production |
| Secrets | Exposed | API keys in docker-compose env — needs vault |
| Headers | Good | HSTS, X-Content-Type-Options, Permissions-Policy present |

---

## Weighted Overall Score

| Component | Weight | Score | Weighted |
|-----------|--------|-------|----------|
| Cache Manager | 15% | 8.0 | 1.20 |
| Rate Limiter | 10% | 8.5 | 0.85 |
| Monitoring | 10% | 7.0 | 0.70 |
| App Factory | 15% | 8.5 | 1.28 |
| Nginx | 15% | 8.5 | 1.28 |
| PostgreSQL | 10% | 8.0 | 0.80 |
| Connection Manager | 10% | 8.5 | 0.85 |
| Docker Compose | 15% | 8.0 | 1.20 |
| **Total** | **100%** | | **8.16** |

### Overall Architecture Grade: **B+ (8.2/10)**

The architecture is solid, production-ready, and well-designed for the TSE Dashboard's workload. Primary improvement areas: secrets management, CSP hardening, and memory configuration tuning.

---

## Top 5 Recommendations

1. **Secrets management**: Move JWT_SECRET_KEY, API keys to Docker Secrets or HashiCorp Vault
2. **CSP hardening**: Replace `unsafe-inline` with nonce-based CSP for script-src
3. **Memory tuning**: Reduce shared_buffers to 2 GB and work_mem to 32 MB
4. **Monitoring**: Add OpenTelemetry for distributed tracing; extend request ID to 12+ chars
5. **HTTP/2**: Enable HTTP/2 in Nginx for multiplexed connections
