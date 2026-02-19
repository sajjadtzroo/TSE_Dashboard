# Database Benchmark — PostgreSQL + PgBouncer + Redis

**Date**: 2026-02-19
**Environment**: GitHub Codespace — 4 vCPU, 15 GB RAM, Docker 28.5.1
**PostgreSQL**: 16 with pgvector extension
**Redis**: 7.4.7

---

## Overview

The data layer is a three-component stack:

```
API ──► PgBouncer :6432 (connection pool) ──► PostgreSQL :5432
  └──► Redis :6379 (cache-aside, tag-based invalidation)
```

Query latencies are derived from API benchmark end-to-end times minus ~5 ms network/serialization overhead. Direct `EXPLAIN ANALYZE` results would show slightly lower pure query times.

---

## PostgreSQL Stats

### Database Size (`tsetmc`)

| Table                  | Total Size | Data Size | Rows    | Notes                                  |
|------------------------|------------|-----------|---------|----------------------------------------|
| `order_book`           | 1.6 MB     | 1.1 MB    | ~4,002  | Intraday bid/ask snapshots             |
| `securities`           | 1.5 MB     | 600 KB    | 4,293   | All listed symbols + metadata          |
| `crypto_tickers`       | 632 KB     | 352 KB    | 2,496   | Crypto market data (new since last run)|
| `market_prices`        | 640 KB     | 240 KB    | ~2,928  | Daily closing data                     |
| `pg_proc`              | 1.3 MB     | 840 KB    | —       | System catalog                         |
| `pg_attribute`         | 1.3 MB     | 720 KB    | —       | System catalog                         |
| Other user tables      | ~5 MB      | —         | —       | options, daily_ohlcv, users, etc.      |
| **Total (user tables)**| **~10 MB** | —         | —       | Fits entirely in shared_buffers        |

### Index Hit Rate by Table

| Table                 | idx_scan | seq_scan | idx_hit_pct | Notes                                   |
|-----------------------|----------|----------|-------------|-----------------------------------------|
| `securities`          | 2,641    | 9        | **99.7%**   | Symbol index heavily used               |
| `crypto_tickers`      | 2,525    | 97       | **96.3%**   | Good — some full scans for list queries |
| `daily_ohlcv`         | 134      | 7        | **95.0%**   | History queries use date range index    |
| `codal_announcements` | 112      | 7        | **94.1%**   | Symbol-filtered lookups                 |
| `users`               | 63       | 2        | **96.9%**   | Auth lookups via email index            |
| `market_prices`       | 6        | 2        | **75.0%**   | Low traffic; mixed scans                |
| `options`             | 4        | 5        | **44.4%**   | Small table, planner may prefer seq     |
| `market_indices`      | 8        | 79       | **9.2%**    | 9-row table — seq scan is correct here  |
| `financial_statements`| 0        | 8        | **0.0%**    | Sparse data, not yet indexed            |
| `voice_call_logs`     | 0        | 4        | **0.0%**    | New table, no queries yet               |

**Overall index hit rate** (all user tables): **96.1%** (5,493 idx / 5,713 total scans)

> `market_indices` shows 9.2% index usage because PostgreSQL correctly chooses a sequential scan for a 9-row table — this is not an issue.

### Configuration (`infra/postgres/postgresql.conf`)

| Parameter                       | Value   | Rationale                                             |
|---------------------------------|---------|-------------------------------------------------------|
| `shared_buffers`                | 2 GB    | 50% of container RAM — entire DB fits in buffer       |
| `effective_cache_size`          | 3 GB    | Hints planner that OS + PG cache covers most queries  |
| `work_mem`                      | 64 MB   | Sorts and hash joins before spilling to disk          |
| `max_connections`               | 200     | Upper bound; PgBouncer keeps active sessions low      |
| `random_page_cost`              | 1.1     | SSD-optimized (vs default 4.0 for HDD)               |
| `checkpoint_completion_target`  | 0.9     | Spreads checkpoint I/O over 90% of interval           |
| `autovacuum_vacuum_scale_factor`| 0.05    | Vacuum at 5% dead tuples (vs 20% default)             |
| `autovacuum_naptime`            | 30s     | Frequent scans for high-churn market data             |
| `log_min_duration_statement`    | 500ms   | Captures slow queries without log spam                |

### Query Timing Samples (direct psql)

| Query                            | Time    | Notes                          |
|----------------------------------|---------|--------------------------------|
| `SELECT symbol, close FROM securities LIMIT 100` | 0.52 ms | Seq scan, warm cache |
| `SELECT * FROM market_indices LIMIT 1`           | 1.35 ms | Tiny table seq scan  |

---

## Redis Cache Stats

Stats captured live after benchmark runs:

| Metric              | Value                |
|---------------------|----------------------|
| Redis version       | 7.4.7                |
| Memory used         | 3.65 MB / 512 MB max |
| Peak memory         | 8.09 MB              |
| Cache keys          | 143 (all with TTLs)  |
| Avg TTL             | ~18,609 s (~5.2 hrs) |
| Cache hits          | 5,389                |
| Cache misses        | 126                  |
| **Hit rate**        | **97.7%**            |
| Uptime              | ~67 min              |

> Improvement from previous benchmark: **96.8% → 97.7%** hit rate. More cache keys (143 vs 60) due to new crypto endpoints and auth pages.

### Cache Key Distribution

| Tag / Namespace         | TTL Strategy                                  |
|-------------------------|-----------------------------------------------|
| `market_watch`          | 5 min during trading hours, 30 min off-hours  |
| `market_overview`       | 3 min during trading hours                    |
| `client_type`           | 5 min during trading hours                    |
| `options`               | 5 min                                         |
| `ime_*`                 | 10 min                                        |
| `sectors`, `companies`  | 30 min (low churn)                            |
| `stocks:history`        | 1 hour (historical data)                      |
| `crypto:*`              | 5 min (new — live market data)                |
| `fear_greed`            | 1 hour (new — index data)                     |

Trading hours: **Sat–Wed 09:00–12:30 Tehran time** — shorter TTLs during active sessions.

---

## PgBouncer Analysis

PgBouncer runs in **transaction pooling** mode:

| Parameter           | Value       | Effect                                              |
|---------------------|-------------|-----------------------------------------------------|
| `pool_mode`         | transaction | Connection released after each transaction          |
| `pool_size`         | 80          | Max 80 server connections per database/user pair    |
| `max_client_conn`   | 2000        | Accepts up to 2000 app connections                  |
| `max_db_connections`| 150         | Total backend connections cap                       |

Pool stats at benchmark time: idle (no active load), 1 client connection (admin query). All benchmark traffic routed via PgBouncer transparently — no connection exhaustion observed during any test run.

---

## Query Performance (derived from API benchmarks)

| Query Pattern                         | API p50 | Est. Query | RPS   | Notes                                |
|---------------------------------------|---------|------------|-------|--------------------------------------|
| Market indices (8 rows, cached)       | 30 ms   | ~1 ms      | 330   | Redis deserialization dominates      |
| Sectors (aggregation, cached)         | 17 ms   | ~1 ms      | 589   | DISTINCT on indexed column, cached   |
| Crypto global stats (small, cached)   | 14 ms   | ~1 ms      | 633   | Fastest new endpoint                 |
| Fear & Greed history (tiny, cached)   | 16 ms   | ~1 ms      | 584   | Historical data, long TTL            |
| Crypto market (2,496 rows, cached)    | 24 ms   | ~5 ms      | 356   | Full crypto list, JSON serialization |
| Market overview (4,293 stocks)        | 21 ms   | ~15 ms     | 173   | Large payload, cached                |
| Companies (4,293 records)             | 20 ms   | ~15 ms     | 130   | At c=3; contention worsens at c=10   |

---

## Cache Effectiveness

### Hit Rate: 97.7%

Out of 5,515 total cache lookups (5,389 hits + 126 misses), only 2.3% went to the database. This means:

- **Redis absorbs ~98% of read load**.
- Cold cache requests (startup, tag invalidation) pay full DB cost — reflected in p90/p99 spread in API benchmarks.
- 126 misses during benchmarks: primarily first requests per test after rate-limit flush, plus TTL expiry.

### Memory Efficiency

At 3.65 MB for 143 keys, average cached payload is ~26 KB. The largest entries (market-overview at ~520 KB, companies at ~1.7 MB) dominate footprint but remain well within the 512 MB cap.

---

## Verdict

| Component           | Score  | Key Metric                                      |
|---------------------|--------|-------------------------------------------------|
| PostgreSQL queries  | **A**  | 0.5–30 ms for indexed + cached queries          |
| Redis cache         | **A+** | 97.7% hit rate, 3.65 MB footprint, 143 keys     |
| Index efficiency    | **A**  | 96.1% overall; 99.7% on primary `securities`    |
| PgBouncer pooling   | **A**  | Transaction mode, no connection exhaustion      |
| Large table queries | **B**  | `companies` (1.7 MB) still needs pagination     |

**Score: A** — The ~10 MB user database fits entirely in `shared_buffers`. Redis at 97.7% hit rate makes PostgreSQL invisible for 98% of requests. New crypto endpoints and auth tables integrated cleanly with no index regressions.

---

## Recommendations

1. **Add index on `market_indices(symbol)`** — 79 sequential scans on a tiny table is fine now but an index prevents table growth surprises; remove if planner never uses it.
2. **Paginate `companies` table** — The single biggest performance win at production concurrency. 50-row pages at ~40 KB vs 4,293 rows at 1.7 MB.
3. **Configure pgvector** — `shared_preload_libraries = 'vector'` is set but `ivfflat.probes` and HNSW index parameters are unconfigured. RAG embedding queries need tuning.
4. **Add `idle_in_transaction_session_timeout = 30s`** — Prevents hung transactions blocking autovacuum.
5. **Enable Redis persistence** (`appendonly yes`) — A Redis restart currently forces full cache warm-up with elevated DB load.
6. **Monitor `financial_statements` index coverage** — Currently 0 index scans / 8 seq scans; add an index when queries pick up.
