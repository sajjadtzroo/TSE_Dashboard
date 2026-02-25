# Database Layer — Code Review & Scoring

**Date**: 2026-02-24
**Scope**: ORM models, connection management, migrations, PostgreSQL config, Redis cache layer, pgvector / RAG storage
**Files reviewed**: `database/models.py`, `database/connection.py`, `config/settings.py`, `alembic/` (15 migrations), `infra/postgres/postgresql.conf`, `api/cache.py`, `docker-compose.yml` (db/redis/pgbouncer sections)

---

## 1. Executive Summary

The database layer is large, ambitious, and largely well-engineered. The schema covers a genuinely complex domain — TSE equities, IME derivatives, crypto, RAG embeddings, loans, chat, voice, and risk profiling — across ~35 tables. Maturity shows in index design (covering indexes, partial indexes, BRIN, GIN trgm, HNSW), TimescaleDB integration (hypertable, compression, retention, continuous aggregates), and the Redis caching layer (trading-hours TTL, tag invalidation, graceful degradation).

Several real issues require attention: an unprotected async singleton with a race condition, a PgBouncer bypass routing app traffic directly to PostgreSQL, a tag-set eviction policy conflict with AOF persistence, and a dangerous `allkeys-lru` policy that can evict tag tracking keys.

**Overall Grade: B+ (77/100)**

---

## 2. Schema Design — `database/models.py`

### Score: 8.1/10

| Aspect | Score | Notes |
|---|---|---|
| Normalization | 8/10 | Good 3NF throughout; deliberate denormalization in `DailyOHLCV` |
| Index coverage | 8/10 | Covering indexes, partial indexes, BRIN, GIN trgm, HNSW — well-chosen |
| Foreign keys | 6/10 | `DailyPrices` FK on partitioned table unsupported in PostgreSQL |
| Constraints | 7/10 | `CheckConstraint` on `period_months`; `User.role` has no CHECK/enum |
| Type choices | 8/10 | `Numeric` precision appropriate; `BigInteger` for IRR prices (correct) |
| Timestamps | 9/10 | `DateTime(timezone=True)` throughout; `datetime.now(UTC)` correct |

**Issues:**

| Severity | Issue | Location | Fix |
|----------|-------|----------|-----|
| **High** | `DailyPrices` has `ForeignKey("securities.security_id")` but PostgreSQL does not support FK constraints on partitioned tables. SQLAlchemy's `create_all()` will be rejected with `ERROR: foreign key constraints on partitioned tables are not supported` | `models.py:296` | Remove `ForeignKey()` from `DailyPrices.security_id`; enforce referential integrity at application layer or via trigger |
| **High** | `TickTrade.tick_time` is `nullable=True` but TimescaleDB requires `NOT NULL` on the time dimension column. Rows with `tick_time=None` fail at the DB level, not ORM level. The unique index including `tick_time` also breaks for NULL rows (dedup protection lost) | `models.py:719` | Set `nullable=False` on `tick_time` in ORM model; add `NOT NULL` constraint in migration 007 after backfill |
| Medium | `DailyOHLCV` (line 196) is structurally redundant with the three split tables (`DailyPrices`, `DailyFundamentals`, `DailyClientType`, lines 284+). Both sets of relationships exist on `Security` — data may be written to both | `models.py:196, 284` | Commit to one design; write a migration to remove the unused table |
| Medium | `User.role` is `String(20)` with no `CheckConstraint` or PostgreSQL enum — any string value passes DB validation silently | `models.py:56` | Add `CheckConstraint("role IN ('viewer', 'analyst', 'admin')", name='ck_users_role')` |
| Medium | `CodalAnnouncement.date_publish` stored as `String(20)` (Shamsi date string like `"1404/09/30"`) — date-range queries use string comparison, wrong if any row is non-zero-padded | `models.py:793` | Add a parallel `Date` column for the Gregorian equivalent, or enforce zero-padded Shamsi format at the application layer |
| Low | `DocumentChunk` missing `UniqueConstraint("document_id", "chunk_index")` — reprocessing a document inserts duplicate chunks with no DB guard | `models.py:1192` | Add `UniqueConstraint("document_id", "chunk_index", name="uq_doc_chunk_idx")` |
| Info | Massive column-per-level repetition in `OrderBook` / IME tables (5-level bid/ask = 30 columns × 6 tables = 180 repeated columns) | `models.py` | Consider JSONB for order book levels or a normalized `OrderBookLevel` child table (design observation) |

---

## 3. Connection & Session Management — `database/connection.py`

### Score: 7.0/10

| Aspect | Score | Notes |
|---|---|---|
| Async pattern | 6/10 | Async manager missing concurrency guard on init |
| Session lifecycle | 8/10 | Correct try/yield/rollback/close in both sync and async |
| Connection pool | 8/10 | `pool_pre_ping`, `pool_recycle`, reasonable sizes |
| Error handling | 7/10 | Retry logic well-structured; only catches `OperationalError` in sync |
| Thread safety | 5/10 | Global async singleton has a race condition under concurrent startup |

**Issues:**

| Severity | Issue | Location | Fix |
|----------|-------|----------|-----|
| **Critical** | `get_async_db_manager()` race condition: between `_async_db_manager = AsyncDatabaseManager(url)` and `await _async_db_manager.initialize()`, the event loop yields. A second concurrent coroutine sees a non-`None` but uninitialized manager and calls `.get_session()` — `SessionFactory` is still `None`, raising `AttributeError` | `connection.py:239–247` | Use `asyncio.Lock` around initialization, or initialize in FastAPI `lifespan` before the first request |
| **High** | `app` service `DATABASE_URL` points to `db:5432` (direct PostgreSQL), bypassing PgBouncer entirely. 8 Gunicorn workers × 80 connections each = 640 potential connections against PostgreSQL's `max_connections=300` — guaranteed exhaustion under load | `docker-compose.yml:37,95`, `connection.py:33–34` | Route `DATABASE_URL` through `pgbouncer:6432`; add `statement_cache_size=0` to async engine for PgBouncer transaction mode |

---

## 4. Migration Strategy

### Score: 7.5/10

| Aspect | Score | Notes |
|---|---|---|
| Chain integrity | 9/10 | Clean linear 15-revision chain; all `down_revision` correct |
| Idempotency | 8/10 | `IF NOT EXISTS` / `IF EXISTS` used throughout |
| Downgrade coverage | 7/10 | All 15 migrations have `downgrade()`; migration 007 downgrade is incomplete |
| Schema-model parity | 5/10 | Baseline migration is a no-op; `DailyPrices` has no migration coverage |
| DML safety | 7/10 | Migrations 009/015 run `UPDATE` without row count checks |

**Issues:**

| Severity | Issue | Location | Fix |
|----------|-------|----------|-----|
| **High** | Migration 001 (`upgrade()`) is a no-op: `pass`. Running `alembic upgrade head` on an empty database stamps all 15 revisions without creating any tables — no error, no schema | `001_initial_baseline.py:21–24` | Either put full DDL in 001's `upgrade()`, or document the exact init sequence (`create_all()` then `alembic stamp`) in CLAUDE.md with a `make db-init` target |
| **High** | `DailyPrices`, `DailyFundamentals`, `DailyClientType` have no migration coverage — they exist only via `Base.metadata.create_all()` which the baseline no-op skips. Schema drift is permanent | `alembic/versions/` (all 15 files) | Write migrations for these three tables |
| Medium | Migration 007 downgrade explicitly skips converting the hypertable back to a plain table. Intermediate state after downgrade has TimescaleDB hypertable with policies removed — subsequent DDL migrations on `tick_trades` will fail | `007_timescaledb_tick_hypertable.py:224–260` | Document the broken intermediate state in the migration header; add guards in subsequent migrations |

---

## 5. PostgreSQL Configuration

### Score: 8.5/10

| Aspect | Score | Notes |
|---|---|---|
| Memory tuning | 9/10 | `shared_buffers=2GB` on 4GB — correct 50% rule |
| SSD optimization | 9/10 | `random_page_cost=1.1`, `effective_io_concurrency=200` (NVMe-level) |
| Autovacuum | 9/10 | Aggressively tuned for high-churn market data |
| Query planner | 9/10 | `seq_page_cost=1.0`, `effective_cache_size=3GB` conservative but correct |
| Parallelism | 8/10 | Well-matched to 8-worker TimescaleDB config |
| Logging | 7/10 | 500ms slow-query threshold appropriate; `log_connections=off` masks exhaustion |
| Security | 6/10 | `listen_addresses='*'` with no SSL |

**Issues:**

| Severity | Issue | Location | Fix |
|----------|-------|----------|-----|
| **High** | `listen_addresses = '*'` with no `ssl = on` — PostgreSQL accepts plaintext connections on all interfaces. Combined with host port `5432:5432` exposed in Compose, traffic is unencrypted | `postgresql.conf` | Set `ssl = on`; provide cert/key; restrict to internal Docker subnet |
| Medium | `work_mem = 32MB` may be undersized for TimescaleDB continuous aggregate materialization (`ohlcv_1min` refreshes every minute over 1h window × high-cardinality securities) | `postgresql.conf` | Increase to `work_mem = 64MB`; run `EXPLAIN (ANALYZE, BUFFERS)` on CA refresh to verify |
| Low | `pg_stat_statements track = all` adds 1–2% CPU overhead; `track = top` suffices for production slow-query analysis | `postgresql.conf` | Change to `pg_stat_statements.track = top` in production |

---

## 6. Redis / Cache Layer

### Score: 7.5/10

| Aspect | Score | Notes |
|---|---|---|
| Connection pool | 8/10 | `max_connections=100`; pipeline use; good |
| Tag invalidation | 7/10 | SMEMBERS + pipeline delete pattern correct; has a TOCTOU race |
| Error resilience | 9/10 | All operations wrapped; falls back to no-cache gracefully |
| Key naming | 9/10 | Consistent `tse:` prefix; `cache:`, `tag:`, `meta:` namespaces clean |
| Eviction policy | 5/10 | `allkeys-lru` + AOF persistence is a dangerous combination |

**Issues:**

| Severity | Issue | Location | Fix |
|----------|-------|----------|-----|
| **High** | `allkeys-lru` + `appendonly yes` is contradictory: `allkeys-lru` can evict tag-set keys (which track which cache keys belong to a tag). If a tag set key is evicted, `invalidate_tag()` finds an empty SMEMBERS and stale cache entries are never deleted | `docker-compose.yml:240–248` | Switch to `--maxmemory-policy volatile-lru` (only evict TTL-keyed entries); disable AOF (`--appendonly no`) for a pure cache; if rate-limit counters need durability, run a separate Redis instance |
| **High** | Tag invalidation TOCTOU race: between `SMEMBERS` (step 1) and `EXECUTE` (step 4), a concurrent writer can add a new key to the tag set. That key survives invalidation | `api/cache.py:137–152` | Replace SMEMBERS + pipeline with a Lua script that atomically reads and deletes in one operation |
| Medium | Tag set TTL is hardcoded at 86400s (24h) but cache keys have TTLs as short as 30s. Stale member references accumulate throughout the day (e.g., `market_watch` tag set accumulates 576 stale members over 24h) | `api/cache.py:132` | Use shorter tag set TTL matching the maximum cache key TTL, or use a sorted set with score=expiry |
| Low | MD5 12-char hash prefix for cache key — 64-bit collision space is acceptable for this scale but inconsistent with security best practices | `api/cache.py` | Use full 32-char MD5 or SHA-256 for better collision resistance |

---

## 7. pgvector / Vector Storage

### Score: 8.5/10

| Aspect | Score | Notes |
|---|---|---|
| Index type | 9/10 | HNSW with `m=16, ef_construction=64` — standard well-tuned parameters |
| Fallback | 9/10 | `Vector = None` → `Text` fallback when pgvector not installed |
| Dimension | 8/10 | 1536 matches `text-embedding-3-small` — consistent with settings |
| Hybrid search | 8/10 | BM25 GIN + HNSW vector — RRF fusion is industry-standard |

**Issues:**

| Severity | Issue | Location | Fix |
|----------|-------|----------|-----|
| **High** | HNSW index is defined in both `DocumentChunk.__table_args__` and migration 002 — two sources of truth. If parameters diverge, the index will be wrong on one path | `models.py:1207–1215`, `002_add_indexes.py:45–50` | Remove HNSW index from `DocumentChunk.__table_args__`; manage exclusively through migration 002 |
| Medium | `embedding` falls back to `Text` when pgvector is absent — all vector similarity queries fail silently at query time rather than at startup | `models.py:1201` | Raise `ValueError` at startup if pgvector is required but unavailable |

---

## 8. Security Assessment

| Area | Status | Severity | Finding |
|------|--------|----------|---------|
| SQL injection | ✅ Clean | — | 100% ORM/parameterized queries |
| PostgreSQL SSL | ❌ Missing | High | No `ssl = on`; plaintext connections |
| Redis auth | ❌ Missing | High | No `--requirepass`; port 6379 exposed on host |
| Credential separation | ❌ Missing | High | All services use PostgreSQL superuser `postgres` |
| Hard-coded defaults | ⚠️ Risk | High | `POSTGRES_PASSWORD` defaults to `postgres` |
| Role enforcement | ⚠️ Weak | Medium | `User.role` is unconstrained `String(20)` |
| API key handling | ✅ Good | — | `api_key` hashed in DB; `JWT_SECRET_KEY` required in Compose |
| Path traversal | ✅ Good | — | `is_relative_to(DATA_DIR)` guard in RAG tools |

**Issues:**

| Severity | Issue | Location | Fix |
|----------|-------|----------|-----|
| **High** | Redis has no `--requirepass`; port `6379:6379` exposed on host — unauthenticated access to cache | `docker-compose.yml:236–265` | Add `--requirepass ${REDIS_PASSWORD}`; remove host port mapping in production |
| **High** | All services connect as `POSTGRES_USER` (defaults to `postgres` superuser) — no least-privilege separation | `docker-compose.yml:37,95,138,207,271` | Create `app_writer` (DML only) and `app_reader` (SELECT only) roles; reserve `postgres` for migrations |
| **High** | `POSTGRES_PASSWORD` defaults to `postgres` in Compose — trivially guessable | `docker-compose.yml:175–177` | Use `:?` syntax: `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?must be set}` |

---

## 9. Performance Assessment

| Area | Finding | Grade |
|------|---------|-------|
| `idx_daily_ohlcv_date_covering` | Covering index with `postgresql_include` for all hot columns — market-watch queries are index-only scans | **A+** |
| TimescaleDB pipeline | Hypertable + 1-day chunks + compression after 7 days + retention at 90 days + hierarchical CAs | **A** |
| PgBouncer | Dual primary/replica setup with transaction pooling — production-ready | **A** |
| PgBouncer bypass | App goes direct to PostgreSQL (not PgBouncer) — pool size math overflows `max_connections` | **D** |
| Async singleton race | Uninitialized `SessionFactory` can be returned to concurrent callers on startup | **F** |
| Connection pool sizing | 8 workers × 80 conn = 640 > `max_connections=300` | **D** |
| `lazy="raise"` usage | Applied on heavy relationship chains — prevents accidental N+1 | **A** |
| Cache hit-rate design | Trading-hours TTL + tag invalidation = minimal stale-data window | **A** |

---

## 10. Overall Grades

| Component | Grade | Score | Key Strength | Key Weakness |
|-----------|-------|-------|--------------|--------------|
| ORM Models (`models.py`) | B+ | 8.1 | Rich index design; `lazy="raise"` guards | Redundant `DailyOHLCV`; unconstrained role; partitioned table FK |
| Connection Management | B | 7.0 | Correct session lifecycle; retry logic | Async singleton race condition |
| Migration Strategy | B | 7.5 | Clean linear chain; idempotent | No-op baseline; `DailyPrices` untracked |
| PostgreSQL Config | A- | 8.5 | Aggressive autovacuum; SSD-tuned planner | No SSL; `listen_addresses='*'` |
| Redis / Cache Layer | B | 7.5 | Graceful fallback; trading-hours TTL | `allkeys-lru` + AOF mismatch; TOCTOU race |
| pgvector / Vector Storage | A- | 8.5 | HNSW + BM25 hybrid; correct dimensions | Duplicate index definition |
| Security | C+ | 6.5 | No hardcoded creds in code; SQL injection safe | No SSL anywhere; superuser for all; no Redis auth |
| Performance | B+ | 8.0 | Covering indexes; TimescaleDB pipeline | PgBouncer bypass; pool overflow |
| **Overall** | **B+** | **77/100** | | |

---

## 11. Top Issues Summary

| # | Severity | Confidence | File | Issue |
|---|----------|------------|------|-------|
| 1 | **Critical** | 88 | `database/connection.py:239–247` | Async singleton race — uninitialized `SessionFactory` returned under concurrent startup |
| 2 | **Critical** | 85 | `docker-compose.yml:37,95` | App bypasses PgBouncer; 8 workers × 80 conn overflows `max_connections=300` |
| 3 | **High** | 88 | `docker-compose.yml:240–248` | `allkeys-lru` + AOF: tag tracking keys can be evicted, causing stale cache |
| 4 | **High** | 88 | `docker-compose.yml:236–265` | Redis exposed on host port 6379 with no authentication |
| 5 | **High** | 88 | `database/models.py:296` | `DailyPrices` FK on partitioned table — PostgreSQL will reject |
| 6 | **High** | 85 | `alembic/versions/001_initial_baseline.py` | No-op baseline: `alembic upgrade head` creates no tables on empty DB |
| 7 | **High** | 85 | `database/models.py` + `002_add_indexes.py` | HNSW index in both ORM model and migration — two sources of truth |
| 8 | **High** | 85 | `alembic/versions/` | `DailyPrices`/`DailyFundamentals`/`DailyClientType` have no migration coverage |
| 9 | **High** | 85 | `docker-compose.yml:175–177` | `POSTGRES_PASSWORD` defaults to `postgres` |
| 10 | **High** | 82 | `api/cache.py:137–152` | Tag invalidation TOCTOU race — newly-written entries survive invalidation |
| 11 | **High** | 82 | `database/models.py:719` | `tick_time` nullable in ORM; TimescaleDB requires `NOT NULL`; unique index dedup broken for NULL rows |
| 12 | **High** | 82 | `alembic/versions/001_initial_baseline.py` | No-op baseline creates no tables on fresh DB |

---

## 12. Recommendations

**Immediate (before production)**

1. **Fix async singleton race (C-1)**: Initialize `AsyncDatabaseManager` inside the FastAPI `lifespan` function, protected by `asyncio.Lock`, before the first request is served.

2. **Route app through PgBouncer (C-2)**: Change `DATABASE_URL` for `app` and `scheduler` to `pgbouncer:6432`. Add `statement_cache_size=0` to asyncpg for transaction-mode compatibility. Reduce `pool_size=5, max_overflow=10` (8 workers × 15 = 120 connections, within PgBouncer's limit).

3. **Secure Redis**: Add `--requirepass ${REDIS_PASSWORD}`; remove host port `6379:6379` binding; switch to `--maxmemory-policy volatile-lru` and disable AOF.

4. **Enforce strong secrets**: Add `:?` to `POSTGRES_PASSWORD` and `REDIS_PASSWORD` in Compose.

**Short-term (next sprint)**

5. **Fix `DailyPrices` FK**: Remove `ForeignKey()` from `DailyPrices.security_id`; add app-layer integrity check.

6. **Fix `tick_time` nullability**: Set `nullable=False` in ORM model; add `NOT NULL` in migration 007 post-backfill.

7. **Add role check constraint**: `CheckConstraint("role IN ('viewer', 'analyst', 'admin')")` on `User` with migration.

8. **Fix tag invalidation race**: Replace SMEMBERS + pipeline with a Lua script for atomic read-and-delete.

9. **Fix migration 001**: Add full DDL to `upgrade()`, or document `create_all() + stamp` precisely in CLAUDE.md with a `make db-init` target.

10. **Consolidate HNSW index**: Remove from `DocumentChunk.__table_args__`; rely exclusively on migration 002.

**Medium-term**

11. **Least-privilege PostgreSQL roles**: Create `app_writer` (DML on app tables) and `app_reader` (SELECT for replica). Reserve `postgres` for migrations only.

12. **Eliminate `DailyOHLCV` vs split-table ambiguity**: Commit to one schema path; write migration to remove the unused table.

13. **Enable PostgreSQL SSL**: Set `ssl = on`; restrict `listen_addresses` to Docker internal subnet.

14. **Increase `work_mem` to 64MB** for TimescaleDB continuous aggregate performance; validate with `EXPLAIN (ANALYZE, BUFFERS)`.
