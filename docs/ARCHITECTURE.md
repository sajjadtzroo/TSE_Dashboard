# TSE Dashboard — Architecture & Capacity Analysis

**Date**: 2026-02-19
**Environment**: GitHub Codespace — 4 vCPU, 15 GB RAM, Docker 28.5.1
**Benchmark source**: [`BENCHMARK.md`](../BENCHMARK.md) (Apache Bench, 50 concurrent)

---

## 1. Software Architecture

```
                        Internet
                           │
                     ┌─────▼─────┐
                     │   Nginx   │  :80  (256 MB RAM)
                     │  (proxy)  │  worker_processes: auto
                     └─────┬─────┘  worker_connections: 4096
                           │
              ┌────────────┼────────────┐
              │            │            │
        Static Assets   API Routes   WebSocket
        (1yr cache)        │         (3600s timeout)
                           │
                     ┌─────▼─────┐
                     │ Gunicorn  │  :8000  (2 GB RAM)
                     │ 4 Uvicorn │  async event-loop workers
                     │  workers  │  max-requests: 1000
                     └─────┬─────┘
                           │
              ┌────────────┼────────────┐
              │                         │
        ┌─────▼─────┐            ┌─────▼─────┐
        │   Redis   │            │ PgBouncer │  :6432  (256 MB)
        │  (cache)  │            │pool=transaction│
        │  512 MB   │            │max_client=2000│
        └───────────┘            └─────┬─────┘
                                       │
                                 ┌─────▼─────┐
                                 │PostgreSQL16│  :5432  (6 GB RAM)
                                 │ max_conn=300│
                                 │shared_buf=3G│
                                 └───────────┘

  Separate container:
        ┌───────────┐
        │ Scheduler │  (2 GB RAM) — APScheduler + Scrapy spiders
        └───────────┘
```

### Memory Footprint

| Service    | Limit  |
|------------|--------|
| Nginx      | 256 MB |
| App (API)  | 2 GB   |
| Scheduler  | 2 GB   |
| PostgreSQL | 6 GB   |
| PgBouncer  | 256 MB |
| Redis      | 512 MB |
| **Total**  | **~11.0 GB** |

---

## 2. Request Flow & Bottleneck Chain

```
Request → Nginx (30 req/s per IP, burst 50)
       → Gunicorn (4 async workers)
       → Redis cache check (96.8% hit rate)
          ├─ HIT  → return cached response (< 1ms)
          └─ MISS → SQLAlchemy pool → PgBouncer → PostgreSQL
```

### Rate Limiting (dual-layer)

| Layer | Zone | Limit | Scope |
|-------|------|-------|-------|
| **Nginx** | api | 30 req/s per IP | All `/api/` |
| **Nginx** | scraper | 2 req/min per IP | `/api/scraper/` |
| **App** | default | 300 req/min per IP | General endpoints |
| **App** | heavy | 60 req/min per IP | market-overview, client-type |
| **App** | auth | 10 req/min per IP | login, register, refresh |
| **App** | scraper | 5 req/min per IP | scraper triggers, RAG upload |

---

## 3. Measured Performance (Apache Bench, 50 concurrent)

### Static Assets (Nginx direct)

| Asset | RPS | p50 | p99 |
|-------|-----|-----|-----|
| index.html (519 B) | **7,429** | 6 ms | 14 ms |
| JS bundle (749 KB) | **2,212** | 22 ms | 31 ms |
| CSS bundle (238 KB) | **3,988** | 13 ms | 26 ms |

### API Endpoints (cached)

| Endpoint | Payload | RPS | p50 | p99 |
|----------|---------|-----|-----|-----|
| `/api/market/indices` | 2.9 KB | **769** | 11 ms | 35 ms |
| `/api/stocks/{symbol}` | 981 B | **783** | 6 ms | 12 ms |
| `/api/sectors` | 2.2 KB | **673** | 13 ms | 23 ms |
| `/api/market/etf-nav` | 72 KB | **460** | 10 ms | — |
| `/api/stocks/{symbol}/history` | 720 B | **400** | 9 ms | 25 ms |
| `/api/stats` | 155 B | **327** | 19 ms | 104 ms |
| `/api/market-overview` | 520 KB | **98** | 42 ms | 77 ms |
| `/api/market/prices` | 760 KB | **84** | 50 ms | — |
| `/api/client-type` | 762 KB | **80** | 51 ms | 100 ms |
| `/api/companies` | 1.7 MB | **47** | 194 ms | 515 ms |

### Cache Performance

| Metric | Value |
|--------|-------|
| Hit rate | **96.8%** |
| Memory used | 7.6 / 512 MB |
| Cache keys | 60 |

---

## 4. Concurrent User Capacity Estimate

### Assumptions for a typical user session

- **Page load**: 1 HTML + 1 JS + 1 CSS = 3 static requests
- **Initial API calls**: market-overview + indices + sectors + stats = 4 API requests
- **Sustained polling/navigation**: ~2 API requests every 30 seconds
- **Some users open WebSocket** for live market data

### Per-user throughput requirement

| Phase | Requests |
|-------|----------|
| Page load burst | ~7 requests in first 2 seconds |
| Sustained | ~4 req/min (polling + navigation) |

### Capacity by layer

| Layer | Limit | Concurrent Users Supported |
|-------|-------|---------------------------|
| **Nginx connections** | 4 cores × 4096 = ~16K connections | ~8,000 (with keep-alive) |
| **Nginx rate limit** | 30 req/s per IP (shared behind NAT) | N/A (per-IP) |
| **Gunicorn workers** | 4 async workers | ~200–400 concurrent requests |
| **Redis cache** (96.8% hit) | 327–783 RPS (cached endpoints) | Cache absorbs ~97% of load |
| **Database** (cache miss) | 47–783 RPS depending on endpoint | ~50–100 concurrent DB queries |
| **PgBouncer** | 150 upstream connections | ~150 simultaneous DB operations |
| **WebSocket** | ~1,000+ per replica (async I/O) | ~1,000 live connections |

### Final Estimate

| Scenario | Users | Reasoning |
|----------|-------|-----------|
| **Comfortable** (< 100ms p50) | **200–300** | All endpoints respond fast, cache warm |
| **Moderate load** (< 300ms p50) | **500–800** | Heavy endpoints slow down, cache still effective |
| **Maximum** (degraded UX) | **1,500–2,000** | PgBouncer saturates on cache misses, queuing begins |
| **With 2× app replicas** | **2,000–3,000** | `APP_REPLICAS=2` doubles worker capacity |

### Why it scales well despite modest hardware

With a 96.8% cache hit rate, only ~3.2% of requests ever reach the database:

| Concurrent Users | Total req/min | DB req/min | PgBouncer Load |
|------------------|---------------|------------|----------------|
| 300 | 1,200 | ~38 | Idle |
| 500 | 2,000 | ~64 | Light |
| 1,000 | 4,000 | ~128 | Moderate |
| 1,500 | 6,000 | ~192 | Near capacity |

**Key bottleneck**: database connection pool through PgBouncer (150 connections). Breaking point occurs when the cache is cold or heavy endpoints (`/api/companies`, `/api/market-overview`) are hammered directly.

---

## 5. Scaling Knobs (no code changes needed)

| Change | Effect | How |
|--------|--------|-----|
| `APP_REPLICAS=2` | 2× API capacity | `docker-compose.yml` env |
| `GUNICORN_WORKERS=8` | 2× workers per replica | `docker-compose.yml` env |
| Redis maxmemory → 1 GB | More cache headroom | `docker-compose.yml` command |
| `PGBOUNCER_MAX_DB_CONN` | Tune DB connections (default: 150) | `docker-compose.yml` env |
| `PGBOUNCER_POOL_SIZE` | Tune pool size (default: 80) | `docker-compose.yml` env |
| `POSTGRES_MEM_LIMIT` | Tune DB memory (default: 6G) | `docker-compose.yml` env |

---

## 6. Architecture Strengths

1. **96.8% cache hit rate** — Redis absorbs almost all read traffic
2. **PgBouncer transaction pooling** — multiplexes 2,000 client connections into 150 DB connections
3. **Async workers** — Uvicorn event loops handle many concurrent I/O operations per worker
4. **Dual-layer rate limiting** — Nginx + application-level protection against abuse
5. **Dynamic cache TTL** — shorter during trading hours (Sat–Wed 09:00–12:30 Tehran), longer off-hours
6. **Small database (17 MB)** — fits entirely in shared_buffers (3 GB), so queries are memory-only

---

## 7. Weaknesses / Risks

1. **No HTTPS** — Nginx serves plain HTTP only (no TLS termination configured)
2. **`/api/companies` (1.7 MB, 47 RPS)** — unpaginated; largest single-response bottleneck
3. **Single PostgreSQL instance** — no read replicas for horizontal read scaling
4. **Cold cache scenario** — all users hit the DB simultaneously after a restart or Redis flush
5. **`/api/stats` anomaly** — 327 RPS for a 155 B payload suggests multiple aggregation queries under the hood

---

## 8. Verification Commands

Run these to validate capacity numbers in your own environment:

```bash
# Static asset throughput
ab -n 2000 -c 100 http://localhost/index.html

# Cached API endpoint (100 concurrent)
ab -n 1000 -c 100 -l http://localhost:8000/api/market/indices

# Heavy endpoint (200 concurrent)
ab -n 2000 -c 200 -l http://localhost:8000/api/stats

# Monitor during test
docker stats                                              # Resource usage
docker exec redis redis-cli INFO stats                    # Cache hit rate
docker exec db psql -U user -c "SELECT count(*) FROM pg_stat_activity"  # DB connections
```
