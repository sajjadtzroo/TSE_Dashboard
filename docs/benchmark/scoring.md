# Performance Scoring & Code Review — TSE Dashboard

**Date**: 2026-02-19
**Reviewer**: Automated + manual analysis
**Scope**: Backend infrastructure, API layer, caching, rate limiting, observability, Nginx, PostgreSQL
**Change since last run (2026-02-17)**: Auth pages, voice calling, crypto watchlist, Fear & Greed history endpoint, XLSX export, Vite manual chunk splitting.

---

## 1. Performance Summary Scorecard

Derived from Apache Bench results across all tested endpoints.

| Category                   | Score  | RPS Range    | p50 Range  | Notes                                               |
|----------------------------|--------|--------------|------------|-----------------------------------------------------|
| Static Asset Serving       | **A**  | 2,307–7,358  | 6–20 ms    | Manual chunks; JS bundle 749KB→439KB                |
| Lightweight API (cached)   | **A-** | 330–633      | 14–30 ms   | Redis at 97.7% hit rate                             |
| Heavy API (large payload)  | **B+** | 130–173      | 20–21 ms   | `/api/companies` still needs pagination             |
| New Crypto Endpoints       | **A-** | 356–633      | 14–24 ms   | All 3 new endpoints within cached-fast tier         |
| Database (PostgreSQL)      | **A**  | —            | 0.5–15 ms  | ~10 MB DB fits in shared_buffers                   |
| Cache (Redis)              | **A+** | —            | < 1 ms     | 97.7% hit rate; 3.65 MB for 143 keys               |
| Connection Pooling         | **A**  | —            | ~5 ms      | PgBouncer transaction mode, no exhaustion          |
| Rate Limiting              | **A**  | —            | —          | Dual-layer: Nginx (30 req/s) + FastAPI (per-IP)     |

### Overall Performance Grade: **A-** (unchanged from previous run)

---

## 2. Rubric

| Component            | Metric          | **A**    | **B**      | **C**   | Result   |
|----------------------|-----------------|----------|------------|---------|----------|
| Frontend (Nginx)     | JS bundle RPS   | >1,500   | 800–1,500  | <800    | **2,307 → A** |
| Backend cached       | p99 latency     | <50 ms   | 50–150 ms  | >150 ms | **32–76 ms → A-** |
| Backend cached       | RPS             | >400     | 150–400    | <150    | **330–633 → A-** |
| Backend heavy        | RPS             | >50      | 20–50      | <20     | **130–173 → A** |
| Redis                | Cache hit rate  | >95%     | 85–95%     | <85%    | **97.7% → A+** |
| PostgreSQL           | Index hit %     | >90%     | 70–90%     | <70%    | **96.1% → A** |

---

## 3. Code Review Scores

### 3.1 `api/cache.py` — Redis Cache Manager

**Score: 7.5 / 10**

| Aspect           | Assessment                                                              |
|------------------|-------------------------------------------------------------------------|
| Architecture     | Singleton with tag-based invalidation — correct pattern for this use case |
| Error handling   | Graceful fallback when Redis unavailable ✓                              |
| TTL strategy     | Dynamic TTL based on trading hours — well-designed ✓                   |
| Connection pool  | 100 max connections, 5s timeout — appropriate ✓                        |
| Atomicity        | Redis pipeline for multi-op atomicity ✓                                |

**Issues**:

| Severity | Issue                                        | Location             | Fix                                          |
|----------|----------------------------------------------|----------------------|----------------------------------------------|
| Medium   | MD5 truncated to 12 chars — collision risk   | `_make_key()`        | Use full 32-char MD5 or switch to SHA-256    |
| Low      | Tag sets not cleaned up after key expiry     | `invalidate_tag()`   | Use TTL on tag sets or a background cleaner  |
| Low      | Tag expiry hardcoded at 24h                  | `_add_key_to_tag()`  | Tie tag TTL to max TTL of its members        |
| Info     | No retry logic on Redis connection loss      | `__init__`           | Add exponential backoff for startup          |

---

### 3.2 `api/rate_limit.py` — Sliding Window Rate Limiter

**Score: 8.0 / 10**

| Aspect           | Assessment                                                              |
|------------------|-------------------------------------------------------------------------|
| Algorithm        | Sorted-set sliding window — correct and O(log n) ✓                     |
| IP extraction    | Handles `X-Forwarded-For` comma-separated IPs correctly ✓               |
| HTTP compliance  | Returns `Retry-After`, `X-RateLimit-Remaining` headers ✓                |
| Tier system      | Well-defined tiers (scraper/heavy/default/auth) ✓                       |
| Fallback         | Allows requests when Redis unavailable ✓                                |

**Issues**:

| Severity | Issue                                                 | Location             | Fix                                             |
|----------|-------------------------------------------------------|----------------------|-------------------------------------------------|
| Medium   | Rate count checked *after* incrementing (off-by-one)  | `check_rate_limit()` | Check before ZADD, or use MULTI/EXEC with watch |
| Low      | `transaction=True` adds unneeded overhead             | `pipeline()`         | Use `pipeline(transaction=False)` for sorted-set ops |
| Low      | Score stored as both member and score (redundant)     | `zadd({str(now): now})` | Use UUID member with float score             |
| Info     | No distributed clock sync for multi-server setups     | Architecture         | Accept NTP sync as a requirement in docs        |

---

### 3.3 `api/monitoring.py` — Prometheus + Structured Logging

**Score: 6.5 / 10**

| Aspect           | Assessment                                                              |
|------------------|-------------------------------------------------------------------------|
| Metrics          | Prometheus auto-instrumentation with status grouping ✓                  |
| Logging          | JSON structured logs with ISO 8601 timestamps ✓                         |
| Request tracing  | Request ID generated and propagated ✓                                   |
| Exclusions       | `/health` and `/metrics` excluded from instrumentation ✓                |

**Issues**:

| Severity | Issue                                            | Location              | Fix                                               |
|----------|--------------------------------------------------|-----------------------|---------------------------------------------------|
| High     | Root logger handlers replaced (`root.handlers = [handler]`) | `setup_logging()` | Use `logger.addHandler()` on named logger only  |
| Medium   | No response time in JSON logs                    | Log middleware        | Add `duration_ms` field to every log entry        |
| Medium   | 8-char request ID — collision risk at scale      | `RequestIDMiddleware` | Use full `uuid4()` or 16-char prefix              |
| Low      | No W3C Trace Context propagation                 | Middleware            | Add `traceparent` header for distributed tracing  |
| Info     | No OpenTelemetry support                         | Architecture          | Consider OTEL SDK for vendor-neutral tracing      |

---

### 3.4 `infra/nginx/nginx.conf` — Reverse Proxy Configuration

**Score: 7.0 / 10**

| Aspect             | Assessment                                                          |
|--------------------|---------------------------------------------------------------------|
| Gzip               | Level 6, min 256 bytes, correct MIME types ✓                       |
| Security headers   | HSTS, X-Content-Type-Options, X-Frame-Options set ✓                |
| Static caching     | 1-year immutable for hashed assets ✓                               |
| index.html         | Correctly uncached (`no-cache`) ✓                                  |
| WebSocket          | Proper Upgrade/Connection headers; voice WS supported ✓            |
| Keepalive          | 64 upstream keepalives configured ✓                                |
| Permissions-Policy | `microphone=(self)` added for voice calling feature ✓              |

**Issues**:

| Severity | Issue                                              | Fix                                                  |
|----------|----------------------------------------------------|------------------------------------------------------|
| High     | No HTTPS/TLS configuration                         | Add SSL certificate, redirect HTTP → HTTPS           |
| Medium   | Nginx limits (30 req/s) don't align with app limits (300/min) | Document the two-layer model or unify |
| Medium   | `client_max_body_size 50m` — DoS risk on upload    | Reduce to 10m for most; 50m only on `/upload`        |
| Low      | No API `Cache-Control` / `ETag` headers            | Delegate to FastAPI or add `proxy_cache`             |
| Low      | Default Nginx error pages (502, 503)               | Add custom error pages                               |
| Info     | HSTS missing `includeSubDomains; preload`           | Add for full HSTS compliance                         |

---

### 3.5 `infra/postgres/postgresql.conf` — PostgreSQL Tuning

**Score: 7.0 / 10**

| Aspect             | Assessment                                                          |
|--------------------|---------------------------------------------------------------------|
| Buffer sizing      | 2 GB shared_buffers for 4 GB container — correct 50% rule ✓       |
| SSD optimization   | `random_page_cost = 1.1` ✓                                         |
| Autovacuum         | Aggressively tuned for high-churn market data ✓                    |
| Query logging      | 500ms threshold avoids spam while catching slow queries ✓           |
| Parallel queries   | Enabled (`max_parallel_workers_per_gather = 2`) ✓                  |

**Issues**:

| Severity | Issue                                                | Fix                                                     |
|----------|------------------------------------------------------|---------------------------------------------------------|
| High     | `listen_addresses = '*'` — exposed to all interfaces | Restrict to Docker network subnet                       |
| Medium   | No SSL/TLS encryption for DB connections             | Set `ssl = on`, provide certificate                     |
| Medium   | pgvector loaded but not tuned (`ivfflat.probes` unset) | Add `SET ivfflat.probes = 10` for similarity queries  |
| Medium   | `work_mem = 64MB` × parallel workers can OOM        | Lower to `32MB` or set per-session for heavy queries    |
| Low      | Missing `idle_in_transaction_session_timeout`        | Add `idle_in_transaction_session_timeout = 30s`         |
| Low      | `pg_stat_statements track = all` — 1-2% CPU overhead | Use `track = top` for production                       |
| Info     | `checkpoint_completion_target = 0.9` defers I/O late | Monitor for checkpoint stall in high-write scenarios   |

---

### 3.6 `api/main.py` — FastAPI Application Setup

**Score: 7.5 / 10**

| Aspect             | Assessment                                                          |
|--------------------|---------------------------------------------------------------------|
| Startup/shutdown   | Lifespan context manager — correct pattern ✓                       |
| Feature flags      | `ENABLE_LOANS`, `ENABLE_CRYPTO`, `ENABLE_VOICE` for modular deploy ✓ |
| Migration check    | Alembic version verified on startup ✓                              |
| SPA fallback       | Path traversal check with `resolved_path.startswith()` ✓           |
| Exception handlers | Include `request_id` for correlation ✓                             |
| GZip               | Minimum 500 bytes — sensible threshold ✓                           |

**Issues**:

| Severity | Issue                                                 | Fix                                                     |
|----------|-------------------------------------------------------|---------------------------------------------------------|
| Medium   | Security headers after CORS — responses may miss CSP  | Move security headers middleware before CORS            |
| Medium   | Cache warming on startup is synchronous               | Move to `asyncio.create_task()` background task         |
| Medium   | Unhandled exceptions logged with `exc_info=True`      | Sanitize before logging in production                   |
| Low      | `sys.path.insert(0, ...)` anti-pattern                | Use proper package structure with `pyproject.toml`      |
| Low      | No rate limit on `/health` or `/cache/` admin routes  | Add token-based auth or IP allowlist for cache admin    |
| Info     | `ENABLE_VOICE=false` by default — add to .env.template | Document alongside other feature flags                 |

---

## 4. Security Assessment

| Area                     | Status          | Priority | Action Required                                        |
|--------------------------|-----------------|----------|--------------------------------------------------------|
| HTTPS / TLS              | ❌ Missing       | High     | Add SSL cert, enforce HTTPS in Nginx                   |
| Database encryption      | ❌ Missing       | High     | Enable PostgreSQL `ssl = on`                           |
| Redis authentication     | ⚠️ Network-only  | Medium   | Add `requirepass` for defense-in-depth                 |
| CORS configuration       | ✓ Set           | —        | Review origin allowlist for production domains         |
| Rate limiting            | ✓ Dual-layer    | —        | Auth tier (10/min) added for login/register            |
| Security headers         | ✓ Mostly        | Low      | Add HSTS `preload`, remove default error pages         |
| SQL injection            | ✓ ORM           | —        | SQLAlchemy parameterized queries throughout            |
| XSS                      | ✓ CSP-ready     | Low      | Finalize Content-Security-Policy header                |
| Path traversal           | ⚠️ Partial       | Medium   | Harden SPA fallback against symlink targets            |
| Voice WS auth            | ✓ JWT query param | Low    | JWT in query param — consider WS protocol header      |

---

## 5. Overall Grades

| Component            | Performance | Code Quality | Security | Weighted Score |
|----------------------|-------------|--------------|----------|----------------|
| Static assets (Nginx)| A           | B+           | B        | **A-**         |
| API (FastAPI)        | A-          | B+           | B+       | **B+**         |
| Cache (Redis)        | A+          | B+           | B        | **A**          |
| Database (PostgreSQL)| A           | B            | C+       | **B+**         |
| Rate limiting        | A           | B+           | A        | **A-**         |
| Observability        | B           | C+           | A        | **B**          |
| Voice calling        | —           | B            | B        | **B+** (new)   |

### Final Grade: **A- (Performance) · B+ (Production Readiness)**

No regression from previous benchmark. New features (voice, crypto endpoints, auth) integrate without degrading existing endpoint performance.

---

## 6. Top 3 Bottlenecks

1. **`/api/companies` at c=10+** — 1.7 MB response causes head-of-line blocking under concurrency. 47 RPS at c=10 (from prior benchmarks). Fix: add pagination.
2. **`/api/market/indices` p50 = 30 ms** — Above expectations for a 3.2 KB cached payload. Likely Redis deserialization or Uvicorn worker scheduling. Fix: profile Redis client path.
3. **No HTTPS** — Blocks production deployment. Fix: Nginx SSL + Let's Encrypt.

## 7. Top 3 Quick Wins

1. **Paginate `/api/companies`** — Expected 10× RPS improvement at production concurrency levels.
2. **Split `market_overview` cache key by request params** — If any filtering/sorting is added, ensure cache keys include all query params.
3. **Enable `gzip_static on` in Nginx** — Ship pre-gzipped assets from Vite build; eliminates runtime CPU cost of compression, potentially improving JS bundle RPS by 10–20%.

---

## 8. Priority Action Plan

### Immediate (before production traffic)

1. **Add HTTPS** — Nginx SSL + force redirect.
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
10. **Brotli compression for Nginx** — 15–20% smaller assets than gzip.
11. **Tune pgvector** (`ivfflat.probes`, HNSW index) — Required for semantic search at scale.
12. **Voice WS auth hardening** — Move JWT from query param to WebSocket subprotocol header.
