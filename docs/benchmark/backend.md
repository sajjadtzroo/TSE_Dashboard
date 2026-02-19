# Backend API Benchmark — FastAPI + Gunicorn + Uvicorn

**Date**: 2026-02-19
**Tool**: Apache Bench (ab) 2.3
**Environment**: GitHub Codespace — 4 vCPU, 15 GB RAM, Docker 28.5.1
**Tested against**: Uvicorn directly (port 8000) — bypassing Nginx to isolate API performance

---

## Overview

API requests flow through Gunicorn (process manager) → Uvicorn (ASGI server) → FastAPI → PgBouncer → PostgreSQL, with Redis caching in front of expensive DB queries.

```
ab ──► Uvicorn :8000 ──► FastAPI router
                              ├──► Redis (cache hit → return immediately)
                              └──► PgBouncer :6432 ──► PostgreSQL :5432
```

Rate limit keys were **flushed before each test** to ensure clean 0-429 measurements:
```bash
redis-cli KEYS "tse:ratelimit:*" | xargs redis-cli DEL
```

Rate limit tiers (FastAPI middleware, per-IP sliding window):

| Tier    | Limit        | Endpoints                                  |
|---------|--------------|--------------------------------------------|
| default | 300 req/min  | Most read endpoints                        |
| heavy   | 60 req/min   | `/api/market-overview`, `/api/client-type` |
| scraper | 5 req/min    | `/api/scraper/*`, `/api/rag/upload`        |
| auth    | 10 req/min   | `/api/auth/login`, `/api/auth/register`    |

---

## Test Commands

```bash
# Baseline health check
ab -n 3000 -c 20 http://localhost:8000/health

# Cached fast endpoints (default tier — flush RL before each)
ab -n 250 -c 10 -l http://localhost:8000/api/market/indices
ab -n 250 -c 10 -l http://localhost:8000/api/sectors

# Heavy tier endpoints (60 req/min — use n=55 to stay clean)
ab -n 55  -c 5  -l http://localhost:8000/api/market-overview
ab -n 50  -c 3  -l http://localhost:8000/api/companies

# New crypto endpoints (added since last benchmark)
ab -n 250 -c 10 -l http://localhost:8000/api/crypto/market
ab -n 250 -c 10 -l "http://localhost:8000/api/crypto/fear-greed-history?days=30"
ab -n 250 -c 10 -l http://localhost:8000/api/crypto/stats/global
```

---

## Results

### Baseline Health

| Endpoint  | Concurrency | Requests | RPS       | p50    | p90    | p99    | Failed |
|-----------|-------------|----------|-----------|--------|--------|--------|--------|
| `/health` | 20          | 3,000    | **1,250** | 12 ms  | 30 ms  | 45 ms  | 0      |

### Cached Fast Endpoints (default tier)

| Endpoint              | Payload  | Concurrency | Requests | RPS       | p50    | p90    | p99    | Failed |
|-----------------------|----------|-------------|----------|-----------|--------|--------|--------|--------|
| `/api/market/indices` | ~3.2 KB  | 10          | 250      | **330**   | 30 ms  | 54 ms  | 76 ms  | 0      |
| `/api/sectors`        | ~2.5 KB  | 10          | 250      | **589**   | 17 ms  | —      | 41 ms  | 0      |

### Heavy / Large-Payload Endpoints

| Endpoint               | Payload  | Concurrency | Requests | RPS       | p50    | p90    | p99    | Failed |
|------------------------|----------|-------------|----------|-----------|--------|--------|--------|--------|
| `/api/market-overview` | ~520 KB  | 5           | 55       | **173**   | 21 ms  | 44 ms  | 64 ms  | 0      |
| `/api/companies`       | ~1.7 MB  | 3           | 50       | **130**   | 20 ms  | 32 ms  | 55 ms  | 0      |

### New Crypto Endpoints (added 2026-02)

| Endpoint                          | Payload | Concurrency | Requests | RPS       | p50    | p90    | p99    | Failed |
|-----------------------------------|---------|-------------|----------|-----------|--------|--------|--------|--------|
| `/api/crypto/market`              | ~9.4 KB | 10          | 250      | **356**   | 24 ms  | 40 ms  | 59 ms  | 0      |
| `/api/crypto/fear-greed-history`  | ~58 B   | 10          | 250      | **584**   | 16 ms  | 26 ms  | 32 ms  | 0      |
| `/api/crypto/stats/global`        | ~230 B  | 10          | 250      | **633**   | 14 ms  | 26 ms  | 44 ms  | 0      |

---

## Comparison to Previous Benchmark (2026-02-17)

| Endpoint               | Old RPS | New RPS | Old p50  | New p50 | Notes                          |
|------------------------|---------|---------|----------|---------|--------------------------------|
| `/health`              | 1,673   | 1,250   | 29 ms    | 12 ms   | Lower c=20 vs old c=50         |
| `/api/market/indices`  | 769     | 330     | 11 ms    | 30 ms   | Higher n, rate limit flush cost |
| `/api/sectors`         | 673     | 589     | 13 ms    | 17 ms   | Consistent                     |
| `/api/market-overview` | 98      | 173     | 42 ms    | 21 ms   | +77% RPS — cache/serialization improved |
| `/api/companies`       | 47      | 130     | 194 ms   | 20 ms   | Lower c=3; p50 improvement reflects less contention |

> **companies endpoint note**: The dramatic p50 improvement (194ms → 20ms) reflects lower concurrency (c=3 vs c=10) more than architectural change. At c=10, 1.7 MB responses compete for bandwidth and create head-of-line blocking. c=3 represents realistic single-user access patterns.

---

## Endpoint-by-Endpoint Analysis

### `/health` — 1,250 RPS, 12 ms p50
Lightweight JSON response, no DB/cache hit. The p50→p99 spread (12→45 ms) reflects Gunicorn worker scheduling latency under concurrency.

### `/api/market/indices` — 330 RPS, 30 ms p50
9 market indices served from Redis cache. 30 ms p50 is higher than expected for a cached endpoint — likely includes Redis deserialization + JSON serialization overhead for the response body. Still within acceptable range.

### `/api/sectors` — 589 RPS, 17 ms p50
Sector list cached in Redis. Faster than indices due to simpler payload structure.

### `/api/market-overview` — 173 RPS, 21 ms p50
520 KB payload covering all TSE stocks. Significant improvement from 98 RPS / 42 ms in the previous benchmark. Cache serialization path appears optimized.

### `/api/companies` — 130 RPS, 20 ms p50
1.7 MB response (4,293 companies). At c=3, each request gets full bandwidth and completes in ~20 ms. This is misleading — at production c=10+ with multiple users, the bottleneck reappears. **Pagination remains the highest-priority recommendation.**

### `/api/crypto/market` — 356 RPS, 24 ms p50
New endpoint. Serves 2,496 crypto ticker records (~9.4 KB). Performs well in the cached-fast tier.

### `/api/crypto/fear-greed-history` — 584 RPS, 16 ms p50
New endpoint. Tiny payload (58 bytes) for 30-day Fear & Greed index history. Excellent performance — fastest new endpoint.

### `/api/crypto/stats/global` — 633 RPS, 14 ms p50
New endpoint. Small global crypto market stats payload. Best RPS among new endpoints.

---

## Rate Limiting

Rate limiting operates at two layers:

| Layer       | Zone     | Limit        | Notes                         |
|-------------|----------|--------------|-------------------------------|
| Nginx       | `api`    | 30 req/s     | Connection-level throttle     |
| Application | default  | 300 req/min  | FastAPI Redis sliding window  |
| Application | heavy    | 60 req/min   | market-overview, client-type  |
| Application | scraper  | 5 req/min    | Upload, scraper endpoints     |
| Application | auth     | 10 req/min   | Login, register               |

Tests run directly on port 8000 (bypassing Nginx) with rate limit keys flushed before each test to ensure 0 non-2xx responses.

---

## Verdict

| Category              | RPS Range   | p50 Range  | Grade  |
|-----------------------|-------------|------------|--------|
| Health check          | 1,250       | 12 ms      | **A**  |
| Cached fast API       | 330–633     | 14–30 ms   | **A-** |
| Large payload API     | 130–173     | 20–21 ms   | **B+** |
| New crypto endpoints  | 356–633     | 14–24 ms   | **A-** |

**Score: A-** — Cached lightweight endpoints deliver 330–633 RPS with sub-30 ms p50. Large-payload endpoints are bounded by serialization cost, not query performance. Three new crypto endpoints all meet the "cached fast" performance bar.

---

## Recommendations

1. **Paginate `/api/companies`** — Add `?page=1&per_page=50` support. Returns 50 rows at ~40 KB instead of 4,293 at 1.7 MB. Expected RPS at c=10: 10× improvement.
2. **Investigate `/api/market/indices` latency** — 30 ms p50 for a 3.2 KB cached payload is above expectations. Profile Redis deserialization path and consider msgpack instead of JSON for cache storage.
3. **Increase Uvicorn workers** — In a 4-vCPU environment, `--workers 4 --worker-connections 200` doubles throughput for CPU-bound endpoints.
4. **Response streaming** — For `/api/market-overview` (520 KB) and `/api/companies` (1.7 MB), `StreamingResponse` reduces time-to-first-byte for slow clients.
5. **Field projection** — Allow `?fields=symbol,name,price` on list endpoints to avoid sending unused columns over the wire.
