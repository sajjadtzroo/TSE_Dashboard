# Scaling Guide — TSE Dashboard

> Based on benchmark data collected 2026-02-23.
> Current baseline: single-node Docker stack, 29 active DB connections, 764 MB data.

---

## Current Baseline (Dev / Single Server)

| Layer | Current State | Headroom |
|-------|--------------|----------|
| PostgreSQL connections | 29 / 300 | **Large** |
| PgBouncer client slots | 23 / 2,000 | **Large** |
| Redis memory | 28 MB / 512 MB | **Large** |
| DB cache hit rate | 94.3% | Healthy |
| Redis hit rate | 91.8% | Healthy |
| Codal query latency | 133ms (seq scan) | **Problem** |

This baseline comfortably handles ~50–200 concurrent users with the current hardware. Everything beyond that requires deliberate action.

---

## Tier 1 — 10,000 Users

### What changes at this scale

At 10K registered users, expect ~800–1,500 concurrent active sessions at peak (TSE trading hours 09:00–12:30). Each session generates 3–8 DB queries per minute via polling/WebSocket. That's **~6,000–12,000 DB queries/min** at peak.

### Bottlenecks that will break first

| Issue | Why | Impact |
|-------|-----|--------|
| Codal 133ms seq scan | 107K-row table, no index on `created_at` | Cascades under concurrent load |
| `work_mem = 64 MB` | 4 parallel workers × 64 MB = 256 MB per query | OOM risk with dozens of parallel queries |
| Single Redis instance | No persistence, no replica | Single point of failure |
| Single PostgreSQL node | All reads hit one disk | CPU/IO saturation |

### Required changes

#### 1. Fix the slow query (do this first, costs nothing)

```sql
CREATE INDEX CONCURRENTLY idx_codal_created_at
  ON codal_announcements(created_at DESC NULLS LAST);
```

This drops the 133ms query to ~2ms. Most impactful change possible.

#### 2. Drop unused indexes

```sql
DROP INDEX CONCURRENTLY idx_codal_title_trgm;        -- 16 MB, 0 scans
DROP INDEX CONCURRENTLY idx_codal_company_name_trgm; -- 9.6 MB, 0 scans
DROP INDEX CONCURRENTLY idx_daily_ohlcv_date;        -- 22 MB, 74 scans (low)
```

Frees ~48 MB, reduces write overhead on every insert.

#### 3. Tune PostgreSQL memory

```ini
# postgresql.conf
shared_buffers        = 2GB      # down from 3GB — leave room for OS cache
work_mem              = 16MB     # down from 64MB — safe under parallel load
effective_cache_size  = 6GB      # raise if server has 8+ GB RAM
```

#### 4. Tune PgBouncer

```ini
# pgbouncer.ini
default_pool_size     = 40       # per-user pool; 5 users × 40 = 200 server conn
max_client_conn       = 5000     # up from 2000
reserve_pool_size     = 10       # spare slots for bursts
reserve_pool_timeout  = 3        # seconds before using reserve
```

#### 5. Redis — add persistence + increase memory

```yaml
# docker-compose.yml — redis service
command: redis-server
  --maxmemory 2gb
  --maxmemory-policy allkeys-lru
  --save 60 1000           # RDB snapshot every 60s if 1000 keys changed
  --appendonly yes         # AOF for durability
```

Bump Redis memory to 2 GB. At 10K users, cache churn will grow rapidly.

#### 6. Add a read replica (optional but recommended)

Route all `SELECT` queries from the API to a hot-standby replica. The primary handles only writes (scraper inserts, user mutations). This halves read load on the primary.

```yaml
# docker-compose.yml
db-replica:
  image: postgres:16
  environment:
    POSTGRES_REPLICATION_MODE: slave
    POSTGRES_MASTER_HOST: db
  volumes:
    - replica_data:/var/lib/postgresql/data
```

In `database/connection.py`, use separate `read_engine` / `write_engine` async engines and route accordingly.

#### 7. Cache TTL strategy

Current TTLs are already tiered. At 10K users, enforce them strictly:

| Cache tag | TTL (closed) | TTL (open market) |
|-----------|-------------|------------------|
| `market_watch` | 300s | 30s |
| `market_prices` | 600s | 60s |
| `options` | 600s | 60s |
| `codal_announcements` | 1800s | 1800s |
| `sectors` | 3600s | 3600s |

### 10K Checklist

- [ ] `CREATE INDEX idx_codal_created_at`
- [ ] Drop 3 unused indexes
- [ ] Reduce `work_mem` to 16 MB
- [ ] Reduce `shared_buffers` to 2 GB
- [ ] Raise Redis maxmemory to 2 GB
- [ ] Enable Redis AOF persistence
- [ ] Raise PgBouncer `max_client_conn` to 5,000
- [ ] Deploy read replica (strongly recommended)
- [ ] Enable Nginx rate limiting (already in `nginx.conf` — verify it's active)

### Expected outcome

| Metric | Before | After |
|--------|--------|-------|
| Codal query | 133ms | ~2ms |
| Peak DB connections | ~300 | ~200 (pooled) |
| Redis memory headroom | 94.5% free | ~70% free |
| Estimated concurrent users | 200 | **8,000–12,000** |

---

## Tier 2 — 100,000 Users

### What changes at this scale

At 100K users, peak concurrency is **8,000–15,000 active sessions**. A single PostgreSQL node — regardless of tuning — will saturate. This tier requires horizontal scaling across every layer.

Expect **60,000–120,000 DB queries/min** at peak. Redis becomes the primary data source, not a cache.

### Architecture shift

```
                          ┌─────────────────────────────┐
                          │        Load Balancer         │
                          │    (Nginx / AWS ALB / CF)    │
                          └──────────┬──────────────────┘
                                     │
               ┌─────────────────────┼─────────────────────┐
               │                     │                      │
          API Node 1            API Node 2             API Node N
          (Gunicorn)            (Gunicorn)              (Gunicorn)
               │                     │                      │
               └──────────┬──────────┘──────────┬──────────┘
                           │                     │
                    ┌──────▼──────┐      ┌───────▼──────┐
                    │  PgBouncer  │      │  Redis Cluster│
                    │  (pooler)   │      │  (3 primary + │
                    └──────┬──────┘      │   3 replica)  │
                           │             └───────────────┘
               ┌───────────┼───────────┐
               │           │           │
          PG Primary   PG Read     PG Read
          (writes)    Replica 1   Replica 2
```

### Required changes

#### 1. Horizontal API scaling

Run 3–5 Gunicorn/Uvicorn instances behind Nginx upstream with least-connections balancing.

```nginx
# nginx.conf
upstream api {
    least_conn;
    server app1:8000;
    server app2:8000;
    server app3:8000;
    keepalive 64;
}
```

Each API node needs its own PgBouncer sidecar or connect through a shared PgBouncer tier.

#### 2. PostgreSQL — 1 primary + 2 read replicas (minimum)

| Node | Role | Config |
|------|------|--------|
| `db-primary` | All writes | `shared_buffers=4GB`, `max_connections=300` |
| `db-read-1` | Read traffic (market data, OHLCV) | `shared_buffers=4GB`, `hot_standby=on` |
| `db-read-2` | Read traffic (codal, options, analytics) | `shared_buffers=4GB`, `hot_standby=on` |

In `database/connection.py`:

```python
# Route by query type
write_engine = create_async_engine(settings.DATABASE_URL)
read_engine  = create_async_engine(settings.DATABASE_READ_URL)

# Use read_engine for all GET-routed handlers
# Use write_engine for scrapers, auth mutations, uploads
```

#### 3. Redis Cluster (3 primary shards + 3 replicas)

Single Redis fails at ~50K keys under high write churn. Switch to Redis Cluster:

```yaml
# docker-compose.yml (or Kubernetes)
redis-node-1: { command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf --port 7001 }
redis-node-2: { command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf --port 7002 }
redis-node-3: { command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf --port 7003 }
# + 3 replicas on ports 7004–7006
```

Update `cache.py` to use `redis.asyncio.RedisCluster`.

Each shard: 4 GB memory, `maxmemory-policy allkeys-lru`.
Total Redis capacity: ~12 GB across cluster.

#### 4. PgBouncer — dedicated pooler tier

Move PgBouncer out of the app container into its own service (or use `pgpool-II`):

```ini
# pgbouncer.ini
default_pool_size     = 25       # per user-db pair
max_client_conn       = 20000    # handles all API nodes
max_db_connections    = 250      # stays under PG max_connections
pool_mode             = transaction
```

#### 5. TimescaleDB partitioning for `daily_ohlcv`

At 100K users querying historical data heavily, ensure chunk intervals are tuned:

```sql
-- Check current chunk interval (should be 7 days for active trading)
SELECT h.table_name, c.interval_length
FROM timescaledb_information.hypertables h
JOIN timescaledb_information.chunks c USING (hypertable_name);

-- Re-tune if needed
SELECT set_chunk_time_interval('daily_ohlcv', INTERVAL '7 days');

-- Enable compression on old chunks (>30 days)
ALTER TABLE daily_ohlcv SET (
  timescaledb.compress,
  timescaledb.compress_orderby = 'date DESC',
  timescaledb.compress_segmentby = 'security_id'
);
SELECT add_compression_policy('daily_ohlcv', INTERVAL '30 days');
```

This can cut `daily_ohlcv` from 604 MB → ~120 MB for chunks older than 30 days.

#### 6. CDN for static assets

All React bundles, fonts, and static files must be served from CDN, not Nginx:

- Move `/dist` to Cloudflare R2 or AWS S3 + CloudFront
- Set `Cache-Control: public, max-age=31536000, immutable` on hashed assets
- This removes 100% of static traffic from the origin

#### 7. WebSocket / SSE at scale

The current `ws.py` uses a single FastAPI process for WebSocket connections. At 100K users, this breaks. Options:

| Option | When to use |
|--------|-------------|
| **Redis Pub/Sub** (current stack) | Up to ~20K concurrent WS connections |
| **Centrifugo** (dedicated WS server) | 20K–500K connections, drop-in |
| **Ably / Pusher** (managed) | When ops cost > infra cost |

For Redis Pub/Sub approach in `routes/ws.py`:

```python
# Each API node subscribes to Redis channels
# Scrapers publish market updates to channels
# WS handler forwards to connected clients
pubsub = redis.pubsub()
await pubsub.subscribe("market_watch", "options", "crypto")
```

#### 8. Rate limiting — distributed

Current rate limiter in `rate_limit.py` uses Redis sliding window. This already works across multiple API nodes as long as they share the same Redis. No code change needed — just ensure all nodes point to the same Redis cluster.

#### 9. Database maintenance at scale

```sql
-- Partition codal_announcements by year (107K rows, growing fast)
-- (requires migration — plan for downtime or use pg_partman)

-- Partial index for active securities only
CREATE INDEX CONCURRENTLY idx_securities_active
  ON securities(symbol) WHERE is_active = true;

-- Covering index for the most common OHLCV query pattern
CREATE INDEX CONCURRENTLY idx_ohlcv_covering
  ON daily_ohlcv(security_id, date DESC)
  INCLUDE (close, volume, close_change_pct);
```

### 100K Checklist

- [ ] Horizontal API scaling (3+ nodes) behind load balancer
- [ ] PostgreSQL primary + 2 read replicas with read routing in `connection.py`
- [ ] Redis Cluster (6 nodes: 3 primary + 3 replica)
- [ ] Dedicated PgBouncer tier (not co-located with app)
- [ ] CDN for all static assets (S3/R2 + CloudFront/CF)
- [ ] Redis Pub/Sub for WebSocket fan-out across nodes
- [ ] TimescaleDB compression policy for `daily_ohlcv` chunks > 30 days
- [ ] `codal_announcements` partitioning by year
- [ ] Covering index on `daily_ohlcv`
- [ ] Monitoring: Prometheus + Grafana dashboards (already scaffolded in `monitoring.py`)
- [ ] Auto-scaling policy based on CPU/connection metrics

### Expected outcome

| Metric | Single node | 100K-ready |
|--------|-------------|-----------|
| Concurrent users | ~200 | **80,000–120,000** |
| Peak DB queries/min | ~10K | ~100K (distributed across replicas) |
| API throughput | ~500 req/s | ~5,000 req/s |
| Redis capacity | 512 MB | 12 GB cluster |
| WS connections | ~500 (single process) | 20K+ (pub/sub) |
| Static traffic to origin | 100% | ~0% (CDN) |

---

## Beyond 100K — What Would Change

At 500K+ users the architecture shifts again:

- **Sharding**: Split `daily_ohlcv` across multiple PG instances by `security_id` range
- **CQRS**: Separate read models (materialized views / ClickHouse for analytics)
- **Kafka**: Replace scraper → Redis direct push with event stream (Kafka/Redpanda)
- **Kubernetes**: Replace Docker Compose for auto-scaling, rolling deploys, pod autoscaler
- **Managed DB**: Move to AWS RDS Aurora (multi-AZ, auto-scaling storage) or Neon

These are out of scope until the 100K tier is stable and profiled.

---

## Priority Order (Cheapest → Most Impactful First)

| Priority | Action | Cost | Impact |
|----------|--------|------|--------|
| 1 | Add `idx_codal_created_at` index | Free | Fixes 133ms query today |
| 2 | Drop 3 unused indexes | Free | Frees 48 MB, faster writes |
| 3 | Reduce `work_mem` to 16 MB | Free | Prevents OOM under load |
| 4 | Raise Redis maxmemory + enable AOF | Free | Durability + more cache |
| 5 | Read replica (same host) | Low | Halves read load on primary |
| 6 | Horizontal API nodes | Medium | Required at 10K+ |
| 7 | Redis Cluster | Medium | Required at 50K+ |
| 8 | CDN for static assets | Low | Removes 80% of origin traffic |
| 9 | TimescaleDB compression | Free | Reduces `daily_ohlcv` by 80% |
| 10 | Full horizontal DB tier | High | Required at 100K+ |
