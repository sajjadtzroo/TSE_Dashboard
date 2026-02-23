# Scaling to 100,000 Users

> Prerequisite: complete everything in `docs/scaling-10k.md` first.
> Goal: support ~8,000–15,000 concurrent active sessions at TSE peak hours.

---

## Load Estimate

| Metric | Value |
|--------|-------|
| Registered users | 100,000 |
| Peak concurrent sessions | ~12,000 |
| DB queries at peak | ~80,000–120,000 / min |
| Redis ops at peak | ~200,000+ / min |

A single PostgreSQL node cannot serve this load regardless of tuning. This tier requires **horizontal scaling at every layer**.

---

## Target Architecture

```
                    ┌──────────────────────────────┐
                    │   CDN (Cloudflare / CF R2)   │
                    │   serves all static assets   │
                    └────────────────┬─────────────┘
                                     │ API only
                    ┌────────────────▼─────────────┐
                    │       Load Balancer           │
                    │  Nginx upstream (least_conn)  │
                    └────┬──────────┬──────────┬───┘
                         │          │          │
                    API Node 1  API Node 2  API Node N
                    (Gunicorn)  (Gunicorn)  (Gunicorn)
                         │          │          │
                    ┌────┴──────────┴──────────┴───┐
                    │       PgBouncer Tier           │
                    │  (dedicated service, not app) │
                    └────────────────┬──────────────┘
                         │                     │
               ┌─────────▼──────┐   ┌──────────▼──────────┐
               │  PG Primary    │   │   Redis Cluster      │
               │  (writes only) │   │  3 primary + 3 rep   │
               └────────────────┘   └─────────────────────┘
               ┌────────────────┐
               │  PG Replica 1  │  ← market data, OHLCV
               └────────────────┘
               ┌────────────────┐
               │  PG Replica 2  │  ← codal, options, analytics
               └────────────────┘
```

---

## 1. Horizontal API Scaling

Run 3–5 Gunicorn/Uvicorn processes as separate Docker containers (or pods) behind Nginx.

```nginx
# infra/nginx/nginx.conf
upstream api {
    least_conn;
    server app1:8000 weight=1;
    server app2:8000 weight=1;
    server app3:8000 weight=1;
    keepalive 128;
}
```

Each API node is stateless — session state lives in Redis, not in-process. No sticky sessions needed.

**Gunicorn workers per node:**
```
workers = (2 × CPU cores) + 1
# On a 4-core node: 9 Uvicorn workers
```

---

## 2. PostgreSQL — Primary + 2 Read Replicas

| Node | Role | Handles |
|------|------|---------|
| `db-primary` | Writes only | Scraper inserts, auth, uploads |
| `db-read-1` | Read traffic A | `daily_ohlcv`, `market_watch`, `securities` |
| `db-read-2` | Read traffic B | `codal_announcements`, `options`, analytics |

```yaml
# docker-compose.yml (or separate servers)
db-read-1:
  image: postgres:16
  environment:
    POSTGRES_REPLICATION_MODE: slave
    POSTGRES_MASTER_HOST: db-primary
  command: >
    postgres
    -c hot_standby=on
    -c shared_buffers=4GB
    -c max_connections=300

db-read-2:
  image: postgres:16
  environment:
    POSTGRES_REPLICATION_MODE: slave
    POSTGRES_MASTER_HOST: db-primary
  command: >
    postgres
    -c hot_standby=on
    -c shared_buffers=4GB
    -c max_connections=300
```

### Read routing in `database/connection.py`

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

write_engine = create_async_engine(settings.DATABASE_URL, pool_size=20, max_overflow=5)
read_engine  = create_async_engine(settings.DATABASE_READ_URL, pool_size=40, max_overflow=10)

WriteSession = sessionmaker(write_engine, class_=AsyncSession, expire_on_commit=False)
ReadSession  = sessionmaker(read_engine,  class_=AsyncSession, expire_on_commit=False)
```

Add a `get_read_db` dependency for all GET-routed handlers. Scraper routes and auth mutations keep `get_db` (write engine).

### PostgreSQL config per node

```ini
# infra/postgres/postgresql.conf (primary)
max_connections               = 300
shared_buffers                = 4GB
work_mem                      = 8MB      # further reduced; more connections
effective_cache_size          = 12GB
wal_level                     = replica
max_wal_senders               = 5
max_replication_slots         = 5

# Replicas: same settings, plus:
# hot_standby                 = on
# hot_standby_feedback        = on
```

---

## 3. Redis Cluster

Single Redis fails under the write churn of 100K users. Switch to a 6-node cluster (3 primary shards, 3 replicas).

```yaml
# docker-compose.yml
redis-1: { command: "redis-server --cluster-enabled yes --port 7001 --maxmemory 4gb --maxmemory-policy allkeys-lru" }
redis-2: { command: "redis-server --cluster-enabled yes --port 7002 --maxmemory 4gb --maxmemory-policy allkeys-lru" }
redis-3: { command: "redis-server --cluster-enabled yes --port 7003 --maxmemory 4gb --maxmemory-policy allkeys-lru" }
redis-4: { command: "redis-server --cluster-enabled yes --port 7004 --maxmemory 4gb --maxmemory-policy allkeys-lru" }  # replica of 1
redis-5: { command: "redis-server --cluster-enabled yes --port 7005 --maxmemory 4gb --maxmemory-policy allkeys-lru" }  # replica of 2
redis-6: { command: "redis-server --cluster-enabled yes --port 7006 --maxmemory 4gb --maxmemory-policy allkeys-lru" }  # replica of 3
```

**Bootstrap cluster:**
```bash
redis-cli --cluster create \
  127.0.0.1:7001 127.0.0.1:7002 127.0.0.1:7003 \
  127.0.0.1:7004 127.0.0.1:7005 127.0.0.1:7006 \
  --cluster-replicas 1
```

**Update `api/cache.py`:**
```python
from redis.asyncio.cluster import RedisCluster

redis_client = RedisCluster.from_url(
    settings.REDIS_CLUSTER_URL,   # redis://node1:7001,node2:7002,node3:7003
    decode_responses=True,
    skip_full_coverage_check=True,
)
```

Total capacity: **12 GB across cluster** (3 shards × 4 GB each).

---

## 4. Dedicated PgBouncer Tier

Move PgBouncer out of the app container into its own service accessible by all API nodes.

```yaml
# docker-compose.yml
pgbouncer:
  image: pgbouncer/pgbouncer:latest
  ports:
    - "6432:6432"
  environment:
    DATABASES_HOST: db-primary
    DATABASES_PORT: 5432
    PGBOUNCER_POOL_MODE: transaction
    PGBOUNCER_MAX_CLIENT_CONN: 20000
    PGBOUNCER_DEFAULT_POOL_SIZE: 25
    PGBOUNCER_MAX_DB_CONNECTIONS: 250
    PGBOUNCER_RESERVE_POOL_SIZE: 10
    PGBOUNCER_RESERVE_POOL_TIMEOUT: 3
```

All API nodes connect to PgBouncer at `pgbouncer:6432`. PgBouncer manages a fixed 250-connection pool to PostgreSQL regardless of how many API nodes exist.

---

## 5. WebSocket Pub/Sub Fan-Out

The current `routes/ws.py` broadcasts from a single process. With 3+ API nodes, a message from one node doesn't reach clients connected to other nodes. Fix with Redis Pub/Sub.

```python
# api/routes/ws.py — pub/sub pattern
import asyncio
import json
from redis.asyncio import Redis

async def market_broadcaster(websocket: WebSocket, channel: str, redis: Redis):
    pubsub = redis.pubsub()
    await pubsub.subscribe(channel)
    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                await websocket.send_text(message["data"])
    finally:
        await pubsub.unsubscribe(channel)
        await pubsub.close()
```

Scrapers publish updates to Redis channels (`market_watch`, `options`, `crypto`). All API nodes receive and forward to their connected WebSocket clients. No direct WS connection between API nodes needed.

---

## 6. CDN for Static Assets

At 100K users, static file traffic (JS bundles, fonts, images) overwhelms Nginx. Move all static assets to CDN.

**Cloudflare R2 + Workers (recommended for this stack):**

```bash
# Upload dist/ to R2 after each build
wrangler r2 object put tse-dashboard-assets --file dist/ --recursive

# Set cache headers
Cache-Control: public, max-age=31536000, immutable   # hashed assets
Cache-Control: public, max-age=3600                   # index.html
```

Update Nginx to proxy only `/api/` and `/ws/` to the upstream. All other routes return 301 to CDN.

This removes **~80% of origin traffic** entirely.

---

## 7. TimescaleDB Compression

`daily_ohlcv` is 604 MB and grows ~50 MB/month. Enable compression on chunks older than 30 days.

```sql
-- Enable compression
ALTER TABLE daily_ohlcv SET (
  timescaledb.compress,
  timescaledb.compress_orderby       = 'date DESC',
  timescaledb.compress_segmentby     = 'security_id'
);

-- Auto-compress chunks older than 30 days
SELECT add_compression_policy('daily_ohlcv', INTERVAL '30 days');

-- Manual check
SELECT show_chunks('daily_ohlcv', older_than => INTERVAL '30 days');
```

Compression ratio for financial OHLCV data is typically 8–12×. Expected result: 604 MB → ~60–80 MB for compressed chunks. Active (recent 30 days) chunks remain uncompressed for fast writes.

---

## 8. Database Indexes for 100K Scale

```sql
-- Covering index: eliminates heap fetches for the most common OHLCV pattern
CREATE INDEX CONCURRENTLY idx_ohlcv_covering
  ON daily_ohlcv(security_id, date DESC)
  INCLUDE (close, volume, close_change_pct, last);

-- Partial index: active securities only (reduces index size ~60%)
CREATE INDEX CONCURRENTLY idx_securities_active
  ON securities(symbol, isin)
  WHERE is_active = true;

-- Partial index: recent codal announcements (last 6 months)
CREATE INDEX CONCURRENTLY idx_codal_recent
  ON codal_announcements(created_at DESC, symbol)
  WHERE created_at > NOW() - INTERVAL '6 months';
```

---

## 9. Rate Limiting at Scale

Current rate limiter uses Redis sliding window and already works across multiple API nodes (all nodes share Redis). No code change needed.

Tighten limits to protect the read replicas:

```python
# api/rate_limit.py — tiered limits
RATE_LIMITS = {
    "default": (200, 60),   # 200 req/min (up from 100 for better UX)
    "heavy":   (30, 60),    # 30 req/min (unchanged)
    "scraper": (5, 60),     # 5 req/min (unchanged)
    "ws":      (5, 10),     # 5 WS connections per 10s (new)
}
```

---

## Monitoring at This Scale

`api/monitoring.py` already scaffolds Prometheus metrics. Add these dashboards in Grafana:

| Dashboard | Key metrics |
|-----------|-------------|
| PostgreSQL | `pg_stat_activity` connections, replication lag, cache hit rate per node |
| Redis Cluster | Memory per shard, hit rate, replication offset |
| PgBouncer | `cl_active`, `sv_active`, `avg_query` latency |
| API nodes | p95/p99 response time per endpoint, error rate |
| WebSocket | Connected clients per node, message rate |

Set alerts on:
- Replication lag > 5 seconds
- Redis memory > 80% on any shard
- PgBouncer `sv_active` > 200 (pool saturation)
- API p99 > 500ms

---

## Checklist

- [ ] All items from `scaling-10k.md` completed
- [ ] 3+ API nodes deployed behind Nginx load balancer
- [ ] PostgreSQL primary + 2 read replicas configured
- [ ] `get_read_db` dependency added to `connection.py`
- [ ] All GET route handlers switched to `read_engine`
- [ ] Dedicated PgBouncer service (not co-located with app)
- [ ] Redis Cluster (6 nodes) deployed and `cache.py` updated to `RedisCluster`
- [ ] Redis Pub/Sub fan-out implemented in `routes/ws.py`
- [ ] CDN deployed for static assets (`/dist`)
- [ ] TimescaleDB compression policy enabled on `daily_ohlcv`
- [ ] Covering index `idx_ohlcv_covering` created
- [ ] Grafana dashboards for all layers
- [ ] Alerts configured for replication lag, Redis memory, pool saturation

---

## Expected Result

| Metric | 10K tier | 100K tier |
|--------|----------|-----------|
| Concurrent users | ~10,000 | **80,000–120,000** |
| Peak DB queries / min | ~12,000 | ~100,000 (across replicas) |
| API throughput | ~500 req/s | ~5,000 req/s |
| Redis capacity | 2 GB | 12 GB cluster |
| WebSocket connections | ~2,000 | 15,000–20,000+ |
| Static traffic to origin | 100% | ~5% (CDN handles rest) |
| Single point of failure | DB, Redis | None (replicated at every layer) |
