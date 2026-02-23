# Scaling to 10,000 Users

> Based on benchmark data from `docs/benchmark-database.md` (2026-02-23).
> Goal: support ~800–1,500 concurrent active sessions at TSE peak hours (09:00–12:30 Tehran time).

---

## Load Estimate

| Metric | Value |
|--------|-------|
| Registered users | 10,000 |
| Peak concurrent sessions | ~1,200 |
| DB queries at peak | ~8,000–12,000 / min |
| Redis ops at peak | ~15,000–25,000 / min |

---

## Current Bottlenecks (must fix before scaling)

### 1. Slow Codal Query — 133ms

The most critical issue. `codal_announcements` has 107K rows and no index on `created_at`. Under concurrent load this seq scan blocks the connection pool.

```sql
CREATE INDEX CONCURRENTLY idx_codal_created_at
  ON codal_announcements(created_at DESC NULLS LAST);
```

Result: 133ms → ~2ms. **Do this first.**

### 2. work_mem = 64 MB is dangerously high

With `max_parallel_workers_per_gather = 4`, a single parallel query can consume 256 MB. Under 1,200 concurrent sessions this causes OOM kills.

```ini
# infra/postgres/postgresql.conf
work_mem = 16MB
```

### 3. Unused indexes consuming 48 MB

Three indexes have zero or near-zero scans. They add write overhead on every scraper insert.

```sql
DROP INDEX CONCURRENTLY idx_codal_title_trgm;        -- 16 MB, 0 scans
DROP INDEX CONCURRENTLY idx_codal_company_name_trgm; -- 9.6 MB, 0 scans
DROP INDEX CONCURRENTLY idx_daily_ohlcv_date;        -- 22 MB, 74 scans
```

---

## PostgreSQL Tuning

```ini
# infra/postgres/postgresql.conf
shared_buffers          = 2GB     # down from 3GB — leave room for OS page cache
work_mem                = 16MB    # down from 64MB — safe under parallel load
effective_cache_size    = 6GB     # raise if host has 8+ GB RAM
checkpoint_completion_target = 0.9
max_wal_size            = 2GB
```

No hardware change needed. The current single-node PostgreSQL handles this load if the slow query is fixed and memory is tuned.

---

## PgBouncer Tuning

```ini
# infra/pgbouncer/pgbouncer.ini
default_pool_size     = 40        # per user-db pair
max_client_conn       = 5000      # up from 2000
reserve_pool_size     = 10        # spare slots for bursts
reserve_pool_timeout  = 3         # seconds before using reserve
server_idle_timeout   = 30        # reclaim idle server connections faster
```

PgBouncer's transaction-mode pooling means 5,000 client connections map to only ~200 PostgreSQL server connections. No PostgreSQL change needed.

---

## Redis Tuning

```yaml
# docker-compose.yml — redis service
command: >
  redis-server
  --maxmemory 2gb
  --maxmemory-policy allkeys-lru
  --save 60 1000
  --appendonly yes
  --appendfsync everysec
```

| Setting | Before | After |
|---------|--------|-------|
| Max memory | 512 MB | 2 GB |
| Persistence | None | AOF (everysec) |
| Eviction | allkeys-lru | allkeys-lru (unchanged) |

At 10K users, cache churn grows 6–8× vs. baseline. 2 GB gives comfortable headroom.

---

## Add a Read Replica (Recommended)

A single read replica routes all `SELECT` traffic off the primary, cutting primary read load by ~70%.

```yaml
# docker-compose.yml
db-replica:
  image: postgres:16
  environment:
    POSTGRES_REPLICATION_MODE: slave
    POSTGRES_MASTER_HOST: db
    POSTGRES_REPLICATION_USER: replicator
    POSTGRES_REPLICATION_PASSWORD: ${REPLICATION_PASSWORD}
  volumes:
    - replica_data:/var/lib/postgresql/data
```

In `database/connection.py`, add a second engine:

```python
read_engine = create_async_engine(
    settings.DATABASE_READ_URL,  # points to replica
    pool_size=20,
    max_overflow=10,
)
```

Route all read-only route handlers to `read_engine`. Writes (scraper inserts, auth mutations, uploads) stay on the primary engine.

---

## Cache TTL Strategy

Enforce strict TTLs. Stale cache reads eliminate the vast majority of DB hits.

| Cache tag | Market closed | Market open |
|-----------|--------------|-------------|
| `market_watch` | 300s | 30s |
| `market_prices` | 600s | 60s |
| `options` | 600s | 60s |
| `codal_announcements` | 1800s | 1800s |
| `sectors` / `companies` | 3600s | 3600s |
| `crypto_*` | 120s | 120s |

The `_is_trading_hours()` helper in `api/cache.py` already switches TTLs. Verify it is called on every `@cached()` decorator.

---

## Nginx Rate Limiting (verify active)

`infra/nginx/nginx.conf` already defines rate limit zones. Confirm they are applied to the API `location` blocks:

```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
limit_req_zone $binary_remote_addr zone=heavy:10m rate=30r/m;
limit_req_zone $binary_remote_addr zone=scraper:10m rate=5r/m;

location /api/ {
    limit_req zone=api burst=20 nodelay;
}
```

This prevents a single client from saturating the pool.

---

## Checklist

- [ ] `CREATE INDEX CONCURRENTLY idx_codal_created_at`
- [ ] Drop `idx_codal_title_trgm`, `idx_codal_company_name_trgm`, `idx_daily_ohlcv_date`
- [ ] Set `work_mem = 16MB` in `postgresql.conf`
- [ ] Set `shared_buffers = 2GB` in `postgresql.conf`
- [ ] Raise Redis `maxmemory` to 2 GB
- [ ] Enable Redis AOF persistence (`appendonly yes`)
- [ ] Raise PgBouncer `max_client_conn` to 5,000
- [ ] Deploy read replica and add `read_engine` to `connection.py`
- [ ] Verify Nginx rate limiting is applied to `/api/` location
- [ ] Verify `_is_trading_hours()` TTL switching is active

---

## Expected Result

| Metric | Before | After |
|--------|--------|-------|
| Codal query latency | 133ms | ~2ms |
| Peak DB connections | ~300 | ~200 (pooled) |
| Redis memory headroom | 94.5% free | ~70% free |
| Max concurrent users | ~200 | **8,000–12,000** |
| Server changes needed | — | None (same hardware) |
