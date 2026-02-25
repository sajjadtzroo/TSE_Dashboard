# Software Architecture — Code Review & Scoring

**Date**: 2026-02-24
**Scope**: Full-stack system architecture — Docker, services, backend, frontend, security, observability, scalability, testing
**Branch**: `feature/ds3-color-migration` (merged to develop)

---

## 1. Executive Summary

The TSE Dashboard is a thoughtfully engineered production-ready monorepo with an impressive level of architectural sophistication for a single-team project. It demonstrates strong fundamentals: a properly layered Docker service graph with health-check-ordered startup, a dual-layer rate limiting system (Nginx + Redis sliding window), trading-hours-aware cache TTLs, TimescaleDB for tick data, a PostgreSQL streaming replica, Prometheus/Grafana observability stack, and a multi-agent RAG pipeline with SSE streaming.

The architecture earns high marks for Reliability, Developer Experience, and Observability. The principal gaps are Security (no TLS, credentials exposed, DB ports public), Scalability (sync ORM in async workers creates a threading ceiling; Redis is a SPOF), and Testing (no real integration tests; broken `db_session` conftest fixture).

**Overall Grade: B+ (79/100)**

---

## 2. Architecture Overview

The system is a 13-service Docker Compose stack:

```
Browser → Nginx:80 → Gunicorn+Uvicorn:8000 → PgBouncer:6432 → PostgreSQL:5432
                              │
                              ├─► Redis:6379 (cache + rate limiting + pub/sub)
                              └─► OpenRouter API (LLM)

Scheduler container  → PostgreSQL (direct scrape writes)
TickIngestor         → TimescaleDB hypertable (real-time tick data)
Replica              → PostgreSQL streaming replica → PgBouncer-replica:6433
Prometheus           → app:8000/metrics, postgres-exporter:9187, redis-exporter:9121
Grafana              → Prometheus (4 pre-provisioned dashboards)
```

Frontend: Vite-bundled React 18 SPA, served by the Nginx container. TanStack Query for server state. Multi-agent RAG pipeline (13 specialized agents + router) using OpenRouter as LLM proxy with streaming SSE.

---

## 3. Docker / Container Architecture

### Score: 8/10

| Aspect | Rating | Notes |
|--------|--------|-------|
| Service dependency ordering | Excellent | All services use `condition: service_healthy` with meaningful health checks |
| Multi-stage Dockerfile | Excellent | 6 stages; non-root user; frontend built in isolation |
| Health checks | Very Good | Scheduler heartbeat file pattern is creative and correct |
| Resource limits | Very Good | All services have CPU + memory caps |
| Log rotation | Good | `json-file` driver with `max-size` on every service |
| Restart policy | Good | `unless-stopped` appropriate for non-Swarm Compose |
| Networking | Poor | Single flat default network; no segment isolation |
| Volume strategy | Good | Named volumes for stateful data; bind mounts for logs |

**Issues:**

| Severity | Issue | Location | Fix |
|----------|-------|----------|-----|
| **Critical** | No HTTPS/TLS. Nginx serves HTTP only (port 80). The `Strict-Transport-Security` header is set but browsers ignore HSTS on non-HTTPS origins. JWTs and credentials transit in plaintext | `infra/nginx/nginx.conf` | Add `:443` server block with TLS (Let's Encrypt or cert mount); redirect HTTP → HTTPS |
| **High** | PostgreSQL (5432), Redis (6379), PgBouncer (6432/6433) all have host port mappings — directly reachable from the host without auth | `docker-compose.yml:179,249,212,416` | Remove host port mappings for all internal-only services; only Nginx `:80`/`:443` should be public |
| **High** | `app` service exposes port 8000 on the host — API reachable without Nginx (no rate limiting, no security headers) | `docker-compose.yml:29` | Remove `"${API_PORT:-8000}:8000"` in production; use a Compose override file for dev |
| **High** | Grafana `admin/admin` default credentials with host port `:3002` exposed | `docker-compose.yml:347` | Require `GRAFANA_PASSWORD` via `:?`; remove host port mapping or proxy behind Nginx with auth |
| **High** | Prometheus `:9090` and exporters exposed on host with no authentication — leaks internal metrics | `docker-compose.yml:314,281,295,148` | Restrict to Docker internal network; proxy behind Nginx Basic Auth or move to management VLAN |
| Medium | `tick_ingestor` references `socks5h://gost:1080` proxy but no `gost` service is defined in Compose — service fails silently in environments that need the proxy | `docker-compose.yml:142` | Add the `gost` sidecar service or document it as externally provided |
| Low | No explicit Docker network segments. All 13 services share a single flat network | `docker-compose.yml` | Define named networks (`internal`, `monitoring`, `public`) and assign services accordingly |

---

## 4. Backend Architecture

### Score: 8/10

| Aspect | Rating | Notes |
|--------|--------|-------|
| FastAPI app factory | Excellent | Clean lifespan context; feature flags; exception handlers |
| Middleware stack | Very Good | Prometheus → RequestID → GZip → CORS → RateLimit → Security headers |
| Route organization | Very Good | Feature-gated routers; clean `all_routers` registry |
| Cache design | Excellent | Tag-based invalidation; trading-hours TTL; graceful degradation |
| Auth design | Good | Role hierarchy; refresh token type checking; WebSocket auth |
| Scheduler design | Good | Separated container; heartbeat health check; `max_instances=1` |
| ORM / DB design | Mixed | Both sync and async managers exist; sync used in routes — blocks event loop |
| RAG pipeline | Very Good | Multi-agent; tool-call caching; error sanitization; streaming |

**Issues:**

| Severity | Issue | Location | Fix |
|----------|-------|----------|-----|
| **High** | `api/deps.py:17` — `db_manager = get_db_manager(DATABASE_URL)` executes at module import time. Each Gunicorn worker creates its own `DatabaseManager` with `pool_size=30, max_overflow=50`. 8 workers × 80 connections = 640 theoretical connections against PgBouncer's 200-connection limit and PostgreSQL's `max_connections=300` | `api/deps.py:17`, `database/connection.py` | Reduce `pool_size=5, max_overflow=10` per worker; or migrate routes to `AsyncSession` (infrastructure already built in `AsyncDatabaseManager`) |
| **High** | All `async def` route handlers use sync SQLAlchemy `Session`. Sync DB calls block the Uvicorn event loop. FastAPI correctly moves synchronous `def` routes to a thread pool — but `async def` routes that call sync DB code block the event loop directly | `api/routes/*.py` | Either: (a) use `async def` routes with `AsyncSession`, or (b) use regular `def` (not `async def`) for sync-DB routes so Starlette moves them to the thread pool |
| **High** | `rag/agents/base.py:71,88` — `cache_manager.redis` attribute does not exist (`RedisCacheManager` stores client as `_client`). Tool-result caching silently fails 100% of the time | `rag/agents/base.py:71,88,93` | Change `cache_manager.redis` to `cache_manager._client`; or add a `redis` property to `RedisCacheManager` |
| Medium | `api/main.py` lifespan calls `get_db_manager().create_tables()` on every startup. In multi-worker Gunicorn, 8 workers race to call `Base.metadata.create_all()` simultaneously — concurrent schema reflection causes startup lock contention | `api/main.py:43–44` | Remove `create_tables()` from lifespan; rely on Alembic for schema management |
| Medium | No JWT token revocation. Password change does not invalidate existing access/refresh tokens (7-day validity) | `api/routes/auth.py:168` | Store JTI in Redis deny-list; check on every token validation |
| Medium | `api/deps.py:35–37` — `require_api_key` allows all requests when `API_SECRET_KEY` is empty ("dev mode"). If accidentally omitted from production env, all scraper trigger endpoints become publicly accessible | `api/deps.py:35–37` | Invert the default: require `API_AUTH_DISABLED=true` env var to bypass; or combine with `require_role("admin")` |
| Medium | Alembic migration check in `lifespan` uses synchronous `engine.connect()` inside an `async` context manager, blocking the event loop during startup | `api/main.py:54–57` | Wrap in `asyncio.to_thread()` or run as a pre-startup script |
| Low | `api/rate_limit.py:83` — `cache_manager._client.pipeline()` accesses private attribute directly, bypassing the `available` guard | `api/rate_limit.py:83` | Add a public `pipeline()` method to `RedisCacheManager` |

---

## 5. Frontend Architecture

### Score: 7.5/10

| Aspect | Rating | Notes |
|--------|--------|-------|
| Routing strategy | Very Good | `lazyRetry` for deployment updates; `PageBoundary` error isolation per section |
| State management | Very Good | TanStack Query for all server state; `staleTime` values domain-appropriate |
| Bundle splitting | Good | 4 vendor chunks; per-route lazy loading; chunks up to 655KB |
| Design system | Good | Single `rallyColors.js` token file; Mantine v7 `createTheme` |
| API client | Mixed | Single `apiClient.js` with JWT interceptor; error format mismatch vs backend |
| Error handling | Good | `RouteErrorBoundary` per section; `lazyRetry` handles chunk failures |

**Issues:**

| Severity | Issue | Location | Fix |
|----------|-------|----------|-----|
| **High** | JWT tokens stored in `localStorage` — vulnerable to XSS. Combined with `'unsafe-inline'` in CSP (required by Mantine), any injected script can exfiltrate tokens | `frontend/src/services/apiClient.js:15` | Migrate access token to memory store; keep refresh token in `HttpOnly` cookie |
| **High** | `apiClient.js` error interceptor reads `data?.detail` but backend returns `{"error": {"code": ..., "message": ...}}`. All HTTP exception messages silently discarded | `frontend/src/services/apiClient.js:31` | Change to `data?.error?.message \|\| data?.detail \|\| error.message` |
| Medium | No automatic token refresh interceptor — expired access token returns 401 with no silent retry | `frontend/src/services/apiClient.js` | Add response interceptor: detect 401, call `POST /api/auth/refresh`, retry original request |
| Medium | Unknown routes redirect silently to `/dashboard` — no 404 page | `frontend/src/App.jsx:229` | Render `NotFoundPage` component for `path="*"` |
| Medium | `@mantine/charts` bundled with core Mantine into `vendor-mantine` (~500KB+). Landing-page users load the full chart library unnecessarily | `frontend/vite.config.js:37–41` | Split `@mantine/charts` into a separate chunk loaded only within dashboard routes |

---

## 6. Security Architecture

### Score: 6/10 (largest gap in the system)

| Area | Status | Notes |
|------|--------|-------|
| HTTPS / TLS | ❌ Missing | HTTP only; HSTS header set but ineffective |
| Database encryption | ❌ Missing | PostgreSQL no SSL; plaintext connections |
| Redis authentication | ❌ Missing | No `--requirepass`; port exposed on host |
| JWT storage | ❌ Vulnerable | `localStorage` + `unsafe-inline` CSP = concrete XSS risk |
| Network isolation | ❌ Missing | All service ports exposed on host |
| Default credentials | ⚠️ Risky | `postgres/postgres` and `admin/admin` Grafana as defaults |
| Supply chain | ⚠️ Risk | `wget --no-check-certificate` for TimescaleDB GPG key |
| Auth design | ✅ Good | Role hierarchy; bcrypt passwords; token type checking |
| Error sanitization | ✅ Good | RAG agent has comprehensive pattern-based error scrubbing |
| Telegram auth | ✅ Excellent | HMAC verification + 24h replay protection |
| SQL injection | ✅ Clean | 100% ORM; no raw SQL string concatenation |

**Issues:**

| Severity | Issue | Location | Fix |
|----------|-------|----------|-----|
| **Critical** | No TLS — JWTs, user credentials, and financial data transit in plaintext | `infra/nginx/nginx.conf` | Add SSL server block on `:443`; force redirect from `:80` |
| **High** | PostgreSQL default credentials (`postgres/postgres`) — enforced with `:?` in Compose but only if `.env` is present | `docker-compose.yml:175–177` | Use `:?` syntax to fail startup if not set: `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?must be set}` |
| **High** | Replication password defaults to `replicapass` in `replica-entrypoint.sh` | `infra/postgres/replica-entrypoint.sh:4` | Require via environment variable with no default |
| **High** | `config/settings.py:115` — `JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")` returns `None` if unset; `python-jose` accepts `None` as signing key, making all tokens forgeable | `config/settings.py:115` | Add: `if not JWT_SECRET_KEY: raise ValueError("JWT_SECRET_KEY is required")` |
| Medium | `infra/postgres/Dockerfile:8` — `wget --no-check-certificate` for TimescaleDB GPG key — MITM supply-chain risk | `infra/postgres/Dockerfile:8` | Remove `--no-check-certificate`; ensure CA bundle is current before fetch |
| Medium | CSP allows `'unsafe-inline'` for both `script-src` and `style-src` (Mantine requirement). Weakens XSS protection significantly when combined with JWT in `localStorage` | `infra/nginx/nginx.conf:71` | Evaluate nonce-based CSP with Vite nonce plugin; document current risk |
| Low | All services use `POSTGRES_USER` (defaults to `postgres` superuser) — no least-privilege role separation | `docker-compose.yml` | Create `app_writer`, `app_reader`, `replicator` roles; reserve `postgres` for migrations |

---

## 7. Observability & Monitoring

### Score: 8.5/10

| Aspect | Rating | Notes |
|--------|--------|-------|
| Metrics | Excellent | Prometheus + FastAPI instrumentator + postgres-exporter + redis-exporter + custom tick metrics |
| Dashboards | Very Good | 4 pre-provisioned Grafana dashboards (API, PostgreSQL, Redis, Tick Ingestor) |
| Structured logging | Good | JSON logging via `python-json-logger`; graceful plain-text fallback |
| Request correlation | Good | `X-Request-ID` middleware generates and propagates IDs |
| Scheduler health | Creative | Heartbeat file approach works correctly for Docker health check |
| Distributed tracing | ❌ Missing | No OpenTelemetry / Jaeger / Zipkin |
| Alerting | ❌ Missing | Prometheus has no `alerting` section; no Alertmanager configured |
| Business metrics | ❌ Missing | No custom metrics for cache hit rates by endpoint, RAG latency by model |

**Issues:**

| Severity | Issue | Location | Fix |
|----------|-------|----------|-----|
| Medium | `monitoring.py:59` — `root.handlers = [handler]` replaces root logger handlers destructively; removes Gunicorn's handlers on startup, suppressing early startup errors | `api/monitoring.py:59` | Use `root.handlers.clear()` + `root.addHandler(handler)`, or use `logging.config.dictConfig()` |
| Medium | No Prometheus alert rules — stack collects data but has zero configured alerts for critical conditions (error rate, replication lag, Redis evictions, scheduler staleness) | `infra/prometheus/prometheus.yml` | Add a `rules/prometheus.rules.yml` with at minimum: error rate >5%, replication lag >30s, Redis eviction rate >0, scheduler heartbeat >120s stale |
| Low | `monitoring.py:39` — `X-Request-ID` truncated to 8 characters (`str(uuid4())[:8]`) — birthday-paradox collision within ~50k requests at 50% probability | `api/monitoring.py:39` | Use full UUID or at least 16 characters |

---

## 8. Scalability & Reliability

### Score: 7/10

| Aspect | Rating | Notes |
|--------|--------|-------|
| Horizontal scaling | Partial | `APP_REPLICAS` env var exists but Nginx has single `server app:8000` upstream |
| Connection pooling | Good | PgBouncer with transaction pooling; 120 server-side connections; 2000 client-side |
| Read replica | Very Good | Streaming replica with hot standby; separate PgBouncer; 90s startup grace |
| Redis HA | Poor | Single Redis instance; Redis is SPOF for cache + rate limiting + pub/sub |
| Cache strategy | Excellent | Trading-hours TTL; tag invalidation; graceful bypass on Redis failure |
| WebSocket scalability | Poor | In-memory `active_connections` list per container — horizontal scaling breaks fan-out |
| Scheduler redundancy | Good | `max_instances=1` prevents double-fire; `replicas: 1` enforced |

**Issues:**

| Severity | Issue | Location | Fix |
|----------|-------|----------|-----|
| **High** | Redis is a single point of failure. When Redis goes down: caching degrades gracefully (OK), but rate limiting is bypassed (by design) AND WebSocket pub/sub stops — all connected clients stop receiving market updates until Redis reconnects | `docker-compose.yml` | Configure Redis Sentinel (3-node minimum) for HA. Document the known failure mode and add a runbook. |
| **High** | `ws.py:ConnectionManager.active_connections` is a plain Python list per process. When `APP_REPLICAS > 1`, clients on different containers receive no broadcast from the scheduler's Redis pub/sub — each container's subscriber only broadcasts to its own local connections | `api/routes/ws.py:29,51–60` | Document the `replicas: 1` constraint explicitly, or ensure each API worker independently subscribes to Redis pub/sub (already partially implemented — verify completion) |
| Medium | Connection pool overflow: 8 workers × `pool_size=30, max_overflow=50` = 640 theoretical connections vs PostgreSQL `max_connections=300` — guaranteed wait timeouts under sustained load | `database/connection.py:33–34` | Reduce to `pool_size=5, max_overflow=10` per worker (8 × 15 = 120, within PgBouncer's limit) |
| Medium | Scheduler `market_watch` fires every 2.5 minutes on all days including weekends (Iranian weekend is Thu–Fri). The scraper runs and hits rate limits unnecessarily | `scheduler/scheduler.py:87–91` | Add `day_of_week="sat,sun,mon,tue,wed"` to `IntervalTrigger`, or add a trading-hours guard inside the job function |

---

## 9. Testing Strategy

### Score: 5.5/10

| Aspect | Rating | Notes |
|--------|--------|-------|
| Test structure | Good | `unit/` / `integration/` / `e2e/` directory split; auto-marking via `pytest.ini` |
| Unit test fixtures | Very Good | Role-based mock user fixtures; mock DB; authed/unauthed clients |
| Integration tests | Poor | `db_session` fixture is structurally broken |
| E2E tests | Missing | `tests/e2e/` contains only `__init__.py` |
| Coverage targets | Good | 6 modules in `pytest.ini` coverage config |
| Parallel execution | Configured | `-n auto` in `addopts`; requires `--override-ini` workaround to run without coverage |
| Real DB testing | Missing | Hardcoded `localhost:5433`; no testcontainers |
| Frontend tests | Missing | No Vitest unit tests, no Playwright/Cypress E2E |

**Issues:**

| Severity | Issue | Location | Fix |
|----------|-------|----------|-----|
| **High** | `tests/conftest.py:46–51` — `db_session` fixture calls `db_manager.get_session()` without `with` context manager. `get_session()` returns a generator; `yield session` in the fixture yields the generator object, not a `Session`. All tests using `db_session` or `db_with_test_data` receive a broken object | `tests/conftest.py:46–51` | `with db_manager.get_session() as session: yield session` |
| **High** | No integration tests against a real database. `tests/integration/` has only `__init__.py`. All route tests use `MagicMock(spec=Session)` — cannot validate SQL queries, ORM relationships, or schema constraints | `tests/integration/` | Add integration tests using `testcontainers-python` to spin up PostgreSQL in CI |
| Medium | `pytest.ini addopts` includes `--cov=tsetmc_scraper` but the coverage `source` is `.`. Running without `--override-ini` in environments without the scraper module installed fails the test run | `pytest.ini:22` | Remove `--cov=tsetmc_scraper` from `addopts` or ensure the module exists everywhere tests run |
| Medium | `tests/unit/test_websocket.py` — 2 pre-existing failures documented in MEMORY.md. Mock target `api.routes.ws.decode_token` does not exist (should be `api.auth.decode_token`). Known-broken tests reduce confidence in the test signal | `tests/unit/test_websocket.py` | Fix mock path to `api.auth.decode_token` |
| Low | No frontend tests — no Vitest unit tests, no Playwright E2E. The entire React application is untested | `frontend/` | Add Vitest for `lazyRetry`, `apiClient` interceptors, key hooks; add Playwright smoke tests |

---

## 10. Overall Grades

| Dimension | Grade | Score | Key Strength | Key Gap |
|-----------|-------|-------|--------------|---------|
| Scalability | B | 7/10 | PgBouncer; read replica; Redis pub/sub | Sync ORM in async workers; WebSocket not multi-replica safe; Redis SPOF |
| Reliability | B+ | 8/10 | Health check chaining; heartbeat pattern; cache graceful degradation | No Redis HA; scheduler fires on weekends |
| Security | C+ | 6/10 | Telegram HMAC; error sanitization; role hierarchy | No TLS; JWT in localStorage; DB ports exposed; default credentials |
| Developer Experience | A- | 9/10 | Excellent CLAUDE.md; feature flags; `lazyRetry`; component conventions | Broken `pytest.ini addopts`; broken `db_session` fixture |
| Observability | A- | 8.5/10 | Full Prometheus stack; 4 pre-provisioned dashboards; request correlation | No distributed tracing; no alert rules; 8-char request ID |
| Deployment Readiness | B- | 7/10 | Complete Docker Compose; resource limits; multi-stage builds | No TLS; exposed service ports; no CI/CD pipeline |
| **OVERALL** | **B+** | **79/100** | | |

---

## 11. Top Issues Summary

| # | Severity | Confidence | File | Issue |
|---|----------|------------|------|-------|
| 1 | **Critical** | 100 | `infra/nginx/nginx.conf` | No HTTPS/TLS — all traffic in plaintext; HSTS header ineffective |
| 2 | **High** | 95 | `config/settings.py:115` | `JWT_SECRET_KEY` can be `None` — `python-jose` accepts `None`, making all JWTs forgeable |
| 3 | **High** | 90 | `docker-compose.yml:179,249` | PostgreSQL and Redis ports exposed on host without authentication |
| 4 | **High** | 88 | `rag/agents/base.py:71,88` | `cache_manager.redis` attribute doesn't exist — tool caching silently broken |
| 5 | **High** | 88 | `tests/conftest.py:46–51` | `db_session` fixture structurally broken — yields generator, not `Session` |
| 6 | **High** | 85 | `docker-compose.yml:175–177` | `POSTGRES_PASSWORD` defaults to `postgres` |
| 7 | **High** | 85 | `api/deps.py:17` + `connection.py:33–34` | 8 workers × 80 connections overflows PostgreSQL `max_connections=300` |
| 8 | **High** | 85 | `api/routes/ws.py:29` | WebSocket `active_connections` is in-process list — breaks with `APP_REPLICAS > 1` |
| 9 | **High** | 85 | `docker-compose.yml` | Redis is SPOF — single instance; no Sentinel; failure stops all market data push |
| 10 | **High** | 85 | `tests/integration/` | No real integration tests — all route tests use `MagicMock(spec=Session)` |
| 11 | **High** | 83 | `api/routes/*.py` | `async def` routes use sync SQLAlchemy `Session` — blocks event loop |
| 12 | **High** | 80 | `infra/postgres/Dockerfile:8` | `wget --no-check-certificate` for TimescaleDB GPG key — supply-chain MITM risk |

---

## 12. Recommendations (Prioritized)

**Tier 1 — Before Any Production Traffic**

1. **Add TLS** (`nginx.conf`): Add `:443` server block with Let's Encrypt or cert file mount. Redirect `:80` → `:443`. HSTS becomes effective only after this.

2. **Remove all internal host port mappings** (`docker-compose.yml`): Remove `5432`, `6379`, `6432`, `6433`, `8000`, `9090`, `9187`, `9121`. Only Nginx ports should be public.

3. **Fix connection pool math** (`connection.py`): Reduce `pool_size=5, max_overflow=10`. Route app service through `pgbouncer:6432`.

4. **Fix `cache_manager.redis`** (`rag/agents/base.py:71`): Change to `cache_manager._client`. Single-line fix that immediately enables tool-result caching.

5. **Enforce strong secrets**: Add `:?` to `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `GRAFANA_PASSWORD` in Compose. Add runtime guard for `JWT_SECRET_KEY` in `settings.py`.

**Tier 2 — Within 2 Sprints**

6. **Fix `db_session` conftest fixture**: Use `with db_manager.get_session() as session: yield session`.

7. **Add at least one real integration test** using `testcontainers-python` targeting PostgreSQL.

8. **Fix token refresh flow**: Add response interceptor in `apiClient.js`; implement JWT revocation (JTI deny-list in Redis) triggered on password change/logout.

9. **Remove `wget --no-check-certificate`** from PostgreSQL Dockerfile.

10. **Fix 2 pre-existing websocket test failures**: Change mock target from `api.routes.ws.decode_token` to `api.auth.decode_token`.

**Tier 3 — Architectural Improvements**

11. **Add Redis Sentinel** (3-node) for HA on cache, rate limiting, and pub/sub. Until then, document the failure mode and add a runbook.

12. **Add Prometheus alert rules**: error rate >5%, replication lag >30s, Redis eviction rate >0, scheduler heartbeat >120s stale.

13. **Migrate FastAPI routes to `AsyncSession`**: `AsyncDatabaseManager` is already written. Migrating routes is the remaining step — eliminates the thread-pool bottleneck from async workers.

14. **Add trading-hours guard to scheduler**: `day_of_week="sat,sun,mon,tue,wed"` on the `market_watch` IntervalTrigger.

15. **Add frontend tests**: Vitest for hooks and utilities; Playwright smoke tests for login, dashboard load, and chat flow.
