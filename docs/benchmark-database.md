# Database Benchmark

> **Date**: 2026-02-23 | **Environment**: iMac (Docker Desktop) | **Stack**: PostgreSQL 16 + TimescaleDB + pgvector | PgBouncer | Redis 7

---

## Overview

Live metrics collected from running Docker containers. PostgreSQL serves as the primary datastore with TimescaleDB for time-series and pgvector for embeddings. PgBouncer handles connection pooling in transaction mode. Redis provides caching and rate limiting.

---

## Database Size

| Metric | Value |
|--------|-------|
| **Total database size** | **764 MB** |
| Largest table | `daily_ohlcv` — 604 MB |
| Second largest | `codal_announcements` — 110 MB |
| Remaining tables | ~50 MB combined |

---

## Table Inventory (Top 15 by Size)

| Table | Total Size | Data Size | Index Size | Row Count |
|-------|-----------|-----------|------------|-----------|
| `daily_ohlcv` | 604 MB | 443 MB | 161 MB | 1,366* |
| `codal_announcements` | 110 MB | 67 MB | 42 MB | 107,421 |
| `market_indices` | 11 MB | 6.6 MB | 5.0 MB | 0** |
| `order_book` | 11 MB | 7.7 MB | 3.2 MB | 27,485 |
| `shareholders` | 3.5 MB | 1.6 MB | 1.9 MB | 0** |
| `securities` | 2.1 MB | 840 KB | 1.2 MB | 4,501 |
| `financial_statements` | 1.3 MB | 1.0 MB | 224 KB | 0** |
| `market_prices` | 1.1 MB | 472 KB | 624 KB | 0** |
| `options` | 664 KB | 304 KB | 328 KB | 790 |
| `ime_options` | 400 KB | 256 KB | 112 KB | 0** |
| `etf_nav` | 328 KB | 112 KB | 184 KB | 851 |
| `crypto_tickers` | 152 KB | 56 KB | 72 KB | 400 |
| `pdf_documents` | 208 KB | 32 KB | 144 KB | 20 |
| `users` | 112 KB | 8 KB | 96 KB | 1 |
| `loan_products` | 80 KB | 0 B | 72 KB | 0 |

*\* `daily_ohlcv` is a TimescaleDB hypertable — `n_live_tup` reports chunk-level counts, not total rows. Actual data is ~443 MB.*
*\*\* Tables with 0 rows may have data in TimescaleDB chunks or were recently truncated/vacuumed.*

---

## Index Analysis

### Top Indexes by Size

| Index | Size | Scans | Assessment |
|-------|------|-------|------------|
| `daily_ohlcv_pkey` | 69 MB | 0 | Unused PK (queries use composite index) |
| `uq_daily_ohlcv_sec_date` | 69 MB | 49,126 | **Hot** — primary query path |
| `idx_daily_ohlcv_date` | 22 MB | 74 | Low use — consider dropping |
| `idx_codal_title_trgm` | 16 MB | 0 | **Unused** trigram index |
| `idx_codal_company_name_trgm` | 9.6 MB | 0 | **Unused** trigram index |
| `idx_codal_symbol_date_publish` | 4.9 MB | 4 | Very low use |
| `uq_market_indices_name_date` | 2.9 MB | 101 | Active |
| `codal_announcements_code_key` | 2.7 MB | 11,487 | **Hot** — primary dedup key |
| `uq_order_book_sec_time` | 1.1 MB | 18,135 | **Hot** |

### Index Hit Rate

| Table | Index Scans | Seq Scans | Index Hit % |
|-------|------------|-----------|-------------|
| `securities` | 63,399 | 91 | **99.9%** |
| `daily_ohlcv` | 49,200 | 0 | **100%** |
| `order_book` | 18,140 | 0 | **100%** |
| `codal_announcements` | 11,561 | 9 | **99.9%** |
| `crypto_ohlcv` | 5,862 | 0 | **100%** |
| `etf_nav` | 2,295 | 0 | **100%** |
| `options` | 1,943 | 6 | **99.7%** |

### Buffer Cache Hit Rate

| Metric | Value |
|--------|-------|
| Heap reads (disk) | 45,163 |
| Heap hits (cache) | 746,218 |
| **Cache hit rate** | **94.29%** |

---

## Query Performance (EXPLAIN ANALYZE)

| Query Pattern | Planning | Execution | Method |
|---------------|----------|-----------|--------|
| Securities lookup by ISIN | 1.7ms | **2.1ms** | Index Scan (securities_isin_key) |
| Options ORDER BY date LIMIT 50 | 1.0ms | **0.06ms** | Index Scan Backward (ix_options_date) |
| Codal recent ORDER BY created_at LIMIT 20 | 1.3ms | **133.6ms** | Parallel Seq Scan (no index on created_at) |
| Crypto tickers ORDER BY market_cap LIMIT 100 | 0.4ms | **0.15ms** | Seq Scan + top-N heapsort (400 rows, fast) |
| ETF NAV ORDER BY id LIMIT 20 | 3.6ms | **2.2ms** | Index Scan Backward (PK) |

### Notable Findings

- **Codal announcements**: 133ms for a `LIMIT 20` query is slow. The table has 107K rows with no index on `created_at`. A Parallel Seq Scan with 2 workers is used. **Recommendation**: Add `CREATE INDEX idx_codal_created_at ON codal_announcements(created_at DESC NULLS LAST)`.
- **Unused trigram indexes**: `idx_codal_title_trgm` (16 MB) and `idx_codal_company_name_trgm` (9.6 MB) have zero scans. Either the search uses a different path or these should be dropped.
- **Options query**: Extremely fast (0.06ms) thanks to the `ix_options_date` index.

---

## PostgreSQL Configuration

| Setting | Value | Assessment |
|---------|-------|------------|
| `max_connections` | 300 | Oversized (PgBouncer limits to 200) |
| `shared_buffers` | 3 GB | Aggressive for 4 GB container |
| `effective_cache_size` | 4 GB | Correct for total system memory |
| `work_mem` | 64 MB | High — risk of memory exhaustion on parallel queries |
| `maintenance_work_mem` | 256 MB | Good for index creation |
| `random_page_cost` | 1.1 | Correct for SSD |
| `effective_io_concurrency` | 200 | Correct for SSD |
| `max_worker_processes` | 8 | Matches available CPUs |
| `max_parallel_workers_per_gather` | 4 | Good for analytical queries |
| `wal_buffers` | 64 MB | Adequate |

---

## PgBouncer Configuration

| Setting | Value |
|---------|-------|
| Pool mode | **transaction** |
| `max_client_conn` | 2,000 |
| `default_pool_size` | 120 |
| `max_db_connections` | 200 |
| Listen port | 5432 (internal) |
| Auth type | md5 |

### Connection State

| State | Count |
|-------|-------|
| idle | 22 |
| active | 1 |
| background workers | 6 |
| **Total** | **29** |

Connections are well within limits (29 of 300 max). PgBouncer is effectively pooling.

---

## Redis Statistics

| Metric | Value |
|--------|-------|
| **Connected clients** | 14 |
| Max clients | 10,000 |
| Blocked clients | 0 |
| Used memory | 27.86 MB |
| Peak memory | 35.89 MB |
| Max memory | 512 MB |
| Memory fragmentation ratio | 1.40 |
| Eviction policy | allkeys-lru |
| Total keys | 174 |
| Total commands processed | 33,721 |

### Cache Performance

| Metric | Value |
|--------|-------|
| Keyspace hits | 6,377 |
| Keyspace misses | 568 |
| **Hit rate** | **91.82%** |
| Expired keys | 378 |
| Evicted keys | 0 |

Redis is operating well within capacity (28 MB of 512 MB). Hit rate of 91.8% indicates effective caching with appropriate TTLs.

---

## Scoring Rubric

| Criteria | Score | Notes |
|----------|-------|-------|
| Buffer cache hit rate | A | 94.3% — excellent for mixed workload |
| Index usage | A- | 99.7%+ on hot tables; some unused indexes |
| Query performance | B+ | Most queries sub-3ms; codal_announcements slow (133ms) |
| Connection management | A | PgBouncer + 29/300 connections |
| Redis hit rate | A | 91.8% — good cache effectiveness |
| Redis memory usage | A+ | 5.4% utilization (28 MB / 512 MB) |
| Configuration tuning | B+ | SSD-optimized; work_mem and shared_buffers slightly aggressive |

### Overall Database Grade: **A-**

Database layer is well-tuned for the workload. Primary concern is the codal announcements query (133ms seq scan) which needs a targeted index. Unused trigram indexes waste 25.6 MB and should be audited. PgBouncer and Redis are operating efficiently with ample headroom.

---

## Recommendations

1. **Add index**: `CREATE INDEX idx_codal_created_at ON codal_announcements(created_at DESC NULLS LAST)` — would reduce 133ms query to ~2ms
2. **Audit trigram indexes**: `idx_codal_title_trgm` and `idx_codal_company_name_trgm` have zero scans — drop or verify usage
3. **Reduce work_mem**: From 64 MB to 32 MB to prevent memory exhaustion under parallel queries
4. **Reduce shared_buffers**: From 3 GB to 2 GB to leave more room for OS filesystem cache
5. **Monitor `daily_ohlcv_pkey`**: Zero scans despite 69 MB size — may be unnecessary if composite index handles all queries

---

## Collection Commands

```bash
# Table sizes and row counts
docker exec tse_dashboard-db-1 psql -U postgres -d tsetmc -c "
SELECT schemaname || '.' || relname, pg_size_pretty(pg_total_relation_size(relid)),
       n_live_tup FROM pg_stat_user_tables ORDER BY pg_total_relation_size(relid) DESC LIMIT 20;"

# Index hit rates
docker exec tse_dashboard-db-1 psql -U postgres -d tsetmc -c "
SELECT relname, idx_scan, seq_scan,
       round(idx_scan::numeric / (idx_scan + seq_scan) * 100, 1) AS idx_pct
FROM pg_stat_user_tables WHERE (idx_scan + seq_scan) > 0
ORDER BY (idx_scan + seq_scan) DESC LIMIT 15;"

# Buffer cache hit rate
docker exec tse_dashboard-db-1 psql -U postgres -d tsetmc -c "
SELECT sum(heap_blks_read), sum(heap_blks_hit),
       round(sum(heap_blks_hit)::numeric / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100, 2)
FROM pg_statio_user_tables;"

# Redis stats
docker exec tse_dashboard-redis-1 redis-cli INFO stats
docker exec tse_dashboard-redis-1 redis-cli INFO memory
docker exec tse_dashboard-redis-1 redis-cli INFO clients
```
