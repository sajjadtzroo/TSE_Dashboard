# Performance Scoring & Code Review — TSE Dashboard

**Date**: 2026-02-17
**Reviewer**: Automated + manual analysis
**Scope**: Backend infrastructure, API layer, caching, rate limiting, observability, Nginx, PostgreSQL

---

## 1. Performance Summary Scorecard

Derived from Apache Bench results across all tested endpoints.

| Category                 | Score  | RPS Range    | p50 Range  | Notes                                              |
|--------------------------|--------|--------------|------------|----------------------------------------------------|
| Static Asset Serving     | **A**  | 2,212–7,429  | 6–22 ms    | Nginx serves at near wire-speed; gzip active       |
| Lightweight API          | **A-** | 327–769      | 6–19 ms    | Redis cache absorbs ~97% of reads                  |
| Heavy API (large payload)| **B+** | 47–460       | 10–194 ms  | `/api/companies` is the clear bottleneck           |
| Database (PostgreSQL)    | **A**  | —            | 1–35 ms    | 17 MB DB fits in shared_buffers entirely           |
| Cache (Redis)            | **A+** | —            | < 1 ms     | 96.8% hit rate; 7.6 MB footprint for 60 keys       |
| Connection Pooling       | **A**  | —            | ~5 ms      | PgBouncer prevents connection exhaustion           |
| Rate Limiting            | **A**  | —            | —          | Dual-layer (Nginx + FastAPI middleware)             |

### Overall Performance Grade: **A-**

---

## 2. Code Review Scores

### 2.1 `api/cache.py` — Redis Cache Manager

**Score: 7.5 / 10**

| Aspect           | Assessment                                                             |
|------------------|------------------------------------------------------------------------|
| Architecture     | Singleton with tag-based invalidation — correct pattern for this use case |
| Error handling   | Graceful fallback when Redis unavailable ✓                             |
| TTL strategy     | Dynamic TTL based on trading hours — well-designed ✓                  |
| Connection pool  | 100 max connections, 5s timeout — appropriate ✓                       |
| Atomicity        | Redis pipeline for multi-op atomicity ✓                               |

**Issues**:

| Severity | Issue                                     | Location               | Fix                                      |
|----------|-------------------------------------------|------------------------|------------------------------------------|
| Medium   | MD5 truncated to 12 chars — collision risk | `_make_key()` method   | Use full 32-char MD5 or switch to SHA-256 |
| Low      | Tag sets not cleaned up after key expiry  | `invalidate_tag()`     | Use TTL on tag sets or a background cleaner |
| Low      | Tag expiry hardcoded at 24h               | `_add_key_to_tag()`    | Tie tag TTL to max TTL of its members    |
| Info     | No retry logic on Redis connection loss   | `__init__`             | Add exponential backoff for startup      |

---

### 2.2 `api/rate_limit.py` — Sliding Window Rate Limiter

**Score: 8.0 / 10**

| Aspect           | Assessment                                                             |
|------------------|------------------------------------------------------------------------|
| Algorithm        | Sorted-set sliding window — correct and O(log n) ✓                    |
| IP extraction    | Handles `X-Forwarded-For` comma-separated IPs correctly ✓              |
| HTTP compliance  | Returns `Retry-After`, `X-RateLimit-Remaining` headers ✓               |
| Tier system      | Well-defined tiers (scraper/heavy/default) ✓                           |
| Fallback         | Allows requests when Redis unavailable ✓                               |

**Issues**:

| Severity | Issue                                               | Location              | Fix                                         |
|----------|-----------------------------------------------------|-----------------------|---------------------------------------------|
| Medium   | Rate count checked *after* incrementing (off-by-one)| `check_rate_limit()`  | Check before ZADD, or use MULTI/EXEC with watch |
| Low      | `transaction=True` adds unneeded overhead           | `pipeline()`          | Use `pipeline(transaction=False)` for sorted-set ops |
| Low      | Score stored as both member and score (redundant)   | `zadd({str(now): now})`| Use UUID member with float score            |
| Info     | No distributed clock sync for multi-server setups   | Architecture          | Accept NTP sync as a requirement in docs    |

---

### 2.3 `api/monitoring.py` — Prometheus + Structured Logging

**Score: 6.5 / 10**

| Aspect           | Assessment                                                              |
|------------------|-------------------------------------------------------------------------|
| Metrics          | Prometheus auto-instrumentation with status grouping ✓                  |
| Logging          | JSON structured logs with ISO 8601 timestamps ✓                         |
| Request tracing  | Request ID generated and propagated ✓                                   |
| Exclusions       | `/health` and `/metrics` excluded from instrumentation ✓                |

**Issues**:

| Severity | Issue                                          | Location              | Fix                                              |
|----------|------------------------------------------------|-----------------------|--------------------------------------------------|
| High     | Root logger handlers replaced (`root.handlers = [handler]`) | `setup_logging()` | Use `logger.addHandler()` on named logger only   |
| Medium   | No response time in JSON logs                  | Log middleware        | Add `duration_ms` field to every log entry       |
| Medium   | 8-char request ID — collision risk at scale    | `RequestIDMiddleware` | Use full `uuid4()` or 16-char prefix             |
| Low      | No W3C Trace Context propagation               | Middleware            | Add `traceparent` header support for distributed tracing |
| Info     | No OpenTelemetry support                       | Architecture          | Consider OTEL SDK for vendor-neutral tracing     |

---

### 2.4 `infra/nginx/nginx.conf` — Reverse Proxy Configuration

**Score: 7.0 / 10**

| Aspect             | Assessment                                                          |
|--------------------|---------------------------------------------------------------------|
| Gzip               | Level 6, min 256 bytes, correct MIME types ✓                       |
| Security headers   | HSTS, X-Content-Type-Options, X-Frame-Options set ✓                |
| Static caching     | 1-year immutable for hashed assets ✓                               |
| index.html         | Correctly uncached (`no-cache`) ✓                                  |
| WebSocket          | Proper Upgrade/Connection headers ✓                                |
| Keepalive          | 64 upstream keepalives configured ✓                                |

**Issues**:

| Severity | Issue                                              | Fix                                                  |
|----------|----------------------------------------------------|------------------------------------------------------|
| High     | No HTTPS/TLS configuration                         | Add SSL certificate, redirect HTTP → HTTPS           |
| Medium   | Nginx rate limits (30 req/s) don't match app limits (100 req/min) | Document the two-layer model clearly or unify limits |
| Medium   | `client_max_body_size 50m` — DoS risk on upload    | Reduce to 10m for most endpoints; 50m only on `/upload` |
| Low      | No API `Cache-Control` / `ETag` headers            | Delegate to FastAPI or add `proxy_cache` for read endpoints |
| Low      | Default Nginx error pages (502, 503)               | Add custom error pages that don't leak server info   |
| Info     | HSTS missing `includeSubDomains; preload`           | Add for full HSTS compliance                         |

---

### 2.5 `infra/postgres/postgresql.conf` — PostgreSQL Tuning

**Score: 7.0 / 10**

| Aspect             | Assessment                                                          |
|--------------------|---------------------------------------------------------------------|
| Buffer sizing      | 2 GB shared_buffers for 4 GB container — correct 50% rule ✓       |
| SSD optimization   | `random_page_cost = 1.1` ✓                                         |
| Autovacuum         | Aggressively tuned for high-churn market data ✓                    |
| Query logging      | 500ms threshold avoids spam while catching slow queries ✓           |
| Parallel queries   | Enabled (`max_parallel_workers_per_gather = 2`) ✓                  |

**Issues**:

| Severity | Issue                                               | Fix                                                     |
|----------|-----------------------------------------------------|---------------------------------------------------------|
| High     | `listen_addresses = '*'` — exposed to all interfaces | Restrict to `127.0.0.1` or Docker network subnet        |
| Medium   | No SSL/TLS encryption for DB connections            | Set `ssl = on`, provide certificate                     |
| Medium   | pgvector loaded but not tuned (`ivfflat.probes` unset) | Add `SET ivfflat.probes = 10` for vector similarity queries |
| Medium   | `work_mem = 64MB` × parallel workers can OOM       | Lower to `32MB` or set per-session for heavy queries    |
| Low      | Missing `idle_in_transaction_session_timeout`       | Add `idle_in_transaction_session_timeout = 30s`         |
| Low      | `pg_stat_statements track = all` — 1-2% CPU overhead | Use `track = top` for production                       |
| Info     | `checkpoint_completion_target = 0.9` defers I/O late | Monitor for checkpoint stall in high-write scenarios   |

---

### 2.6 `api/main.py` — FastAPI Application Setup

**Score: 7.5 / 10**

| Aspect             | Assessment                                                          |
|--------------------|---------------------------------------------------------------------|
| Startup/shutdown   | Lifespan context manager — correct pattern ✓                       |
| Feature flags      | `ENABLE_LOANS`, `ENABLE_CRYPTO` for modular deployment ✓           |
| Migration check    | Alembic version verified on startup ✓                              |
| SPA fallback       | Path traversal check with `resolved_path.startswith()` ✓           |
| Exception handlers | Include `request_id` for correlation ✓                             |
| GZip               | Minimum 500 bytes — sensible threshold ✓                           |

**Issues**:

| Severity | Issue                                                | Fix                                                     |
|----------|------------------------------------------------------|---------------------------------------------------------|
| Medium   | Security headers middleware added after CORS — CORS responses may miss CSP | Move security headers middleware before CORS  |
| Medium   | Cache warming on startup is synchronous (blocks start) | Move to `asyncio.create_task()` background task        |
| Medium   | Unhandled exceptions logged with `exc_info=True` — may expose stack traces | Sanitize before logging in production               |
| Low      | `sys.path.insert(0, ...)` anti-pattern               | Use proper package structure with `pyproject.toml`      |
| Low      | No rate limit on `/health` or `/cache/` endpoints    | Add token-based auth or IP allowlist for cache admin    |
| Info     | Scheduler conditioned on `SCHEDULER_ENABLED` — harder to test | Use a test fixture that always provides a mock scheduler |

---

## 3. Security Assessment

| Area                     | Status     | Priority | Action Required                                        |
|--------------------------|------------|----------|--------------------------------------------------------|
| HTTPS / TLS              | ❌ Missing  | High     | Add SSL cert, enforce HTTPS in Nginx                   |
| Database encryption      | ❌ Missing  | High     | Enable PostgreSQL `ssl = on`                           |
| Redis authentication     | ⚠️ Network-only | Medium | Add `requirepass` for defense-in-depth                |
| CORS configuration       | ✓ Set      | —        | Review origin allowlist for production domains         |
| Rate limiting            | ✓ Dual-layer | —      | Document rate limit tiers in API docs                  |
| Security headers         | ✓ Mostly   | Low      | Add HSTS `preload`, remove default error pages         |
| SQL injection            | ✓ ORM      | —        | SQLAlchemy parameterized queries throughout            |
| XSS                      | ✓ CSP-ready| Low      | Finalize Content-Security-Policy header                |
| Path traversal           | ⚠️ Partial  | Medium   | Harden SPA fallback against symlink targets            |

---

## 4. Overall Grades

| Component            | Performance | Code Quality | Security | Weighted Score |
|----------------------|-------------|--------------|----------|----------------|
| Static assets (Nginx)| A           | B+           | B        | **A-**         |
| API (FastAPI)        | A-          | B+           | B+       | **B+**         |
| Cache (Redis)        | A+          | B+           | B        | **A**          |
| Database (PostgreSQL)| A           | B            | C+       | **B+**         |
| Rate limiting        | A           | B+           | A        | **A-**         |
| Observability        | B           | C+           | A        | **B**          |

### Final Grade: **A- (Performance) · B+ (Production Readiness)**

---

## 5. Priority Action Plan

### Immediate (before production traffic)

1. **Add HTTPS** — Nginx SSL + force redirect. No excuses.
2. **Enable PostgreSQL SSL** — Encrypt DB connections.
3. **Paginate `/api/companies`** — Biggest single performance win.

### Short-term (next sprint)

4. **Fix middleware order** in `main.py` — Security headers before CORS.
5. **Add pgvector index parameters** — Required for RAG query performance.
6. **Use full UUID for request IDs** — Prevents collision in distributed logging.
7. **Fix logging handler replacement** — Use named logger in `monitoring.py`.

### Longer-term (production hardening)

8. **Enable Redis persistence** (`appendonly`) — Survives restarts without full cache warm-up.
9. **Add OpenTelemetry** — Replace ad-hoc Prometheus with vendor-neutral tracing.
10. **Brotli compression for Nginx** — 15-20% smaller assets than gzip.
11. **Tune pgvector** (`ivfflat.probes`, HNSW index) — Required for semantic search at scale.
