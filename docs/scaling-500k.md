# Scaling Beyond 100,000 Users (500K+)

> Prerequisite: complete everything in `docs/scaling-100k.md` first.
> This tier requires infrastructure changes that go beyond Docker Compose.

---

## Load Estimate

| Metric | Value |
|--------|-------|
| Registered users | 500,000+ |
| Peak concurrent sessions | ~60,000–100,000 |
| DB queries at peak | ~1,000,000+ / min |
| Redis ops at peak | ~2,000,000+ / min |

At this scale, the bottleneck shifts from query optimization to **data architecture** and **infrastructure automation**.

---

## What Breaks at 500K

| Component | Why it breaks |
|-----------|--------------|
| Single PostgreSQL primary | Write throughput limit (~5,000 TPS sustained) |
| 2 read replicas | CPU saturation under 1M+ reads/min |
| Redis Cluster (6 nodes) | Insufficient memory for hot data set |
| Docker Compose | No auto-scaling, no zero-downtime rolling deploys |
| Gunicorn workers | Python GIL limits per-process concurrency |
| `daily_ohlcv` as one table | Even compressed, range scans become slow |

---

## 1. Move to Kubernetes

Docker Compose cannot auto-scale or self-heal. Kubernetes is the minimum viable platform at 500K.

```yaml
# k8s/api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tse-api
spec:
  replicas: 10          # start here; HPA scales up/down
  selector:
    matchLabels:
      app: tse-api
  template:
    spec:
      containers:
        - name: api
          image: tse_dashboard-app:latest
          resources:
            requests: { cpu: "500m", memory: "512Mi" }
            limits:   { cpu: "2",    memory: "2Gi" }
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: tse-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: tse-api
  minReplicas: 5
  maxReplicas: 30
  metrics:
    - type: Resource
      resource:
        name: cpu
        target: { type: Utilization, averageUtilization: 60 }
```

**Recommended managed platforms:**
- AWS EKS (Elastic Kubernetes Service)
- Google GKE (Google Kubernetes Engine)
- Hetzner + k3s (cost-effective for EU/MENA)

---

## 2. Managed PostgreSQL (AWS RDS Aurora or Neon)

Self-managed PostgreSQL replication becomes operationally expensive at 500K. Use a managed service with:

| Feature | Benefit |
|---------|---------|
| Multi-AZ automatic failover | Primary failure → replica promotion in <30s |
| Auto-scaling storage | No manual `pg_resize` operations |
| Read endpoint (Aurora) | Automatic load balancing across N replicas |
| Point-in-time recovery | Compliance + disaster recovery |

**AWS RDS Aurora PostgreSQL (recommended):**

```hcl
# terraform/rds.tf
resource "aws_rds_cluster" "tse" {
  cluster_identifier      = "tse-aurora"
  engine                  = "aurora-postgresql"
  engine_version          = "16.2"
  database_name           = "tsetmc"
  master_username         = var.db_user
  master_password         = var.db_password
  storage_encrypted       = true
  backup_retention_period = 7

  serverlessv2_scaling_configuration {
    min_capacity = 2     # ACU
    max_capacity = 64    # ACU — auto-scales with traffic
  }
}

resource "aws_rds_cluster_instance" "reader" {
  count              = 3
  cluster_identifier = aws_rds_cluster.tse.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.tse.engine
}
```

The Aurora Reader Endpoint automatically distributes reads across all 3 reader instances.

---

## 3. Shard `daily_ohlcv` by Security Range

At 500K users querying historical data, even TimescaleDB time partitioning isn't enough. Add range sharding by `security_id`.

**Option A: TimescaleDB multi-node (open-source)**
```sql
-- Access node
SELECT add_data_node('dn1', host => 'timescale-dn1');
SELECT add_data_node('dn2', host => 'timescale-dn2');

-- Distribute the hypertable across data nodes
SELECT create_distributed_hypertable(
  'daily_ohlcv',
  'date',
  'security_id',
  data_nodes => ARRAY['dn1', 'dn2']
);
```

**Option B: ClickHouse for analytics (OLAP separation)**

Move historical OHLCV queries (> 30 days old) to ClickHouse. PostgreSQL handles only recent/live data.

```sql
-- ClickHouse table (MergeTree, column-store, compressed)
CREATE TABLE daily_ohlcv (
  security_id   UInt32,
  date          Date,
  open          Float64,
  close         Float64,
  volume        UInt64,
  ...
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (security_id, date);
```

ClickHouse serves range queries (OHLCV for past N months) 10–100× faster than PostgreSQL for analytical patterns. PostgreSQL serves transactional/recent data only.

---

## 4. Event Streaming with Kafka / Redpanda

Replace direct scraper → Redis publish with a durable event stream.

```
Scraper ──► Kafka topic: market.raw ──► Consumer: DB writer
                                    ──► Consumer: Cache invalidator
                                    ──► Consumer: WebSocket broadcaster
                                    ──► Consumer: Analytics aggregator
```

Benefits:
- Scrapers don't block on slow DB writes
- Consumer lag is observable and alertable
- Replay events on crash recovery
- Multiple consumers can independently process the same event

```yaml
# docker-compose.yml / k8s
redpanda:
  image: vectorized/redpanda:latest
  command: redpanda start --overprovisioned --smp 2 --memory 2G
  ports:
    - "9092:9092"   # Kafka-compatible API
    - "9644:9644"   # Admin API
```

```python
# scraper publishes to Kafka instead of Redis directly
from aiokafka import AIOKafkaProducer

producer = AIOKafkaProducer(bootstrap_servers="redpanda:9092")
await producer.send("market.raw", json.dumps(market_data).encode())
```

---

## 5. CQRS — Separate Read and Write Models

At 500K, the same data model cannot efficiently serve both:
- Fast writes (scraper inserts, 1M+ rows/day)
- Fast reads (user queries, complex aggregations)

Introduce read-optimized materialized views updated by the consumer:

```sql
-- Materialized view: latest price per security (refreshed by consumer)
CREATE MATERIALIZED VIEW mv_latest_prices AS
SELECT DISTINCT ON (security_id)
  security_id, date, close, volume, close_change_pct
FROM daily_ohlcv
ORDER BY security_id, date DESC;

CREATE UNIQUE INDEX ON mv_latest_prices(security_id);

-- Refresh triggered by Kafka consumer on new data
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_latest_prices;
```

API reads from `mv_latest_prices` for the market watch endpoint — O(1) lookup, no aggregation at query time.

---

## 6. Edge Caching with Cloudflare Workers

At 500K users, even CDN for static assets isn't enough. Cache API responses at the edge.

```js
// cloudflare-worker.js
export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Cache market-watch for 30s at edge
    if (url.pathname.startsWith('/api/market/watch')) {
      const cache = caches.default;
      const cached = await cache.match(request);
      if (cached) return cached;

      const response = await fetch(request);
      const toCache = response.clone();
      // Cache at edge for 30s
      const headers = new Headers(toCache.headers);
      headers.set('Cache-Control', 's-maxage=30');
      await cache.put(request, new Response(toCache.body, { headers }));
      return response;
    }

    return fetch(request);
  }
};
```

This absorbs market data reads at Cloudflare PoPs — the origin never sees the majority of traffic.

---

## 7. WebSocket at Scale — Centrifugo

Redis Pub/Sub works to ~20K concurrent WebSocket connections. Beyond that, use Centrifugo — a dedicated WebSocket/SSE server.

```yaml
# docker-compose.yml / k8s
centrifugo:
  image: centrifugo/centrifugo:v5
  ports:
    - "8001:8001"
  environment:
    CENTRIFUGO_TOKEN_HMAC_SECRET_KEY: ${CENTRIFUGO_SECRET}
    CENTRIFUGO_API_KEY: ${CENTRIFUGO_API_KEY}
    CENTRIFUGO_BROKER: redis
    CENTRIFUGO_REDIS_ADDRESS: redis-cluster:7001
  command: centrifugo --config=config.json
```

Centrifugo:
- Handles 1M+ concurrent WebSocket connections per cluster
- Integrates directly with Redis Cluster as broker
- FastAPI publishes market updates to Centrifugo API → Centrifugo fans out to all subscribers
- Removes all WS logic from FastAPI entirely

---

## Architecture Summary

| Layer | 10K | 100K | 500K+ |
|-------|-----|------|-------|
| API servers | 1 (Docker) | 3–5 (Docker) | 10–30 (Kubernetes + HPA) |
| PostgreSQL | 1 primary + 1 replica | 1 primary + 2 replicas | Aurora Serverless v2 (multi-reader) |
| Analytics DB | PostgreSQL | PostgreSQL | ClickHouse (OHLCV analytics) |
| Redis | Single (2 GB) | Cluster 6-node (12 GB) | Cluster 12-node (48 GB) |
| WebSocket | FastAPI direct | Redis Pub/Sub | Centrifugo cluster |
| Static assets | Nginx | CDN | CDN + Edge Workers |
| Event stream | Direct Redis | Direct Redis | Kafka / Redpanda |
| Deployment | Docker Compose | Docker Compose | Kubernetes |
| DB management | Self-managed | Self-managed | Managed (RDS Aurora / Neon) |

---

## Cost Estimate (AWS, monthly)

| Component | 100K tier | 500K tier |
|-----------|-----------|-----------|
| API nodes (EC2 c6i.xlarge × N) | $300 (3 nodes) | $1,000 (10 nodes) |
| Aurora PostgreSQL | $400 | $1,200 (serverless, scales) |
| ElastiCache Redis Cluster | $300 | $800 |
| Cloudflare R2 + Workers | $50 | $150 |
| Centrifugo | — | $200 |
| Redpanda Cloud | — | $400 |
| Monitoring (Grafana Cloud) | $50 | $100 |
| **Total** | **~$1,100/mo** | **~$3,850/mo** |

Hetzner (EU/MENA-friendly) reduces costs by ~60% vs. AWS at the cost of less managed services.

---

## When to Trigger This Tier

Move to the 500K architecture when **any** of these are true:
- Primary PostgreSQL CPU > 70% sustained during trading hours
- Read replica replication lag > 10 seconds
- Redis memory > 80% on any cluster shard
- API p99 response time > 1,000ms
- WebSocket connections > 15,000 concurrent
- Scraper write latency > 500ms
