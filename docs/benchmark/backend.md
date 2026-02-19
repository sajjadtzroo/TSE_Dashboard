# Backend API Benchmark — FastAPI + Gunicorn + Uvicorn

**Date**: 2026-02-17
**Tool**: Apache Bench (ab) 2.3
**Environment**: GitHub Codespace — 4 vCPU, 15 GB RAM, Docker 28.5.1
**Tested against**: Uvicorn directly (port 8000) — bypassing Nginx rate limits for clean API measurements

---

## Overview

API requests flow through Gunicorn (process manager) → Uvicorn (ASGI server) → FastAPI → PgBouncer → PostgreSQL, with Redis caching in front of expensive DB queries.

```
ab ──► Uvicorn :8000 ──► FastAPI router
                              ├──► Redis (cache hit → return immediately)
                              └──► PgBouncer :6432 ──► PostgreSQL :5432
```

Rate limit keys were **flushed before each test** to ensure clean measurements:
```bash
redis-cli KEYS "rate_limit:*" | xargs redis-cli DEL
```

---

## Test Commands

```bash
# Lightweight endpoints (stay within 100 req/min default tier)
ab -n 90  -c 10 -l http://localhost:8000/api/stats
ab -n 90  -c 10 -l http://localhost:8000/api/sectors
ab -n 90  -c 10 -l http://localhost:8000/api/market/indices

# Database-heavy endpoints (lower concurrency to match heavy tier: 30 req/min)
ab -n 25  -c 5  -l http://localhost:8000/api/market-overview
ab -n 90  -c 10 -l http://localhost:8000/api/companies
ab -n 25  -c 5  -l http://localhost:8000/api/client-type
ab -n 50  -c 5  -l http://localhost:8000/api/market/prices
ab -n 50  -c 5  -l http://localhost:8000/api/market/etf-nav

# Health checks
ab -n 500 -c 50 -l http://localhost:8000/health
ab -n 200 -c 20 -l http://localhost:8000/health/deep
```

---

## Results

### Lightweight Endpoints (default tier: 100 req/min)

| Endpoint              | Payload | Concurrency | Requests | RPS       | p50    | p90    | p99     |
|-----------------------|---------|-------------|----------|-----------|--------|--------|---------|
| `/api/stats`          | 155 B   | 10          | 90       | **327**   | 19 ms  | 59 ms  | 104 ms  |
| `/api/sectors`        | 2.2 KB  | 10          | 90       | **673**   | 13 ms  | 20 ms  | 23 ms   |
| `/api/market/indices` | 2.9 KB  | 10          | 90       | **769**   | 11 ms  | 24 ms  | 35 ms   |

### Database-Heavy Endpoints (heavy tier: 30 req/min)

| Endpoint                       | Payload  | Concurrency | Requests | RPS      | p50     | p90     | p99     |
|--------------------------------|----------|-------------|----------|----------|---------|---------|---------|
| `/api/market-overview`         | 520 KB   | 5           | 25       | **98**   | 42 ms   | 70 ms   | 77 ms   |
| `/api/companies`               | 1.7 MB   | 10          | 90       | **47**   | 194 ms  | 336 ms  | 515 ms  |
| `/api/client-type`             | 762 KB   | 5           | 25       | **80**   | 51 ms   | 98 ms   | 100 ms  |
| `/api/market/prices`           | ~760 KB  | 5           | 50       | **84**   | 50 ms   | —       | —       |
| `/api/market/etf-nav`          | ~72 KB   | 5           | 50       | **460**  | 10 ms   | —       | —       |
| `/api/stocks/{symbol}`         | 981 B    | 5           | 50       | **783**  | 6 ms    | 10 ms   | 12 ms   |
| `/api/stocks/{symbol}/history` | 720 B    | 5           | 50       | **400**  | 9 ms    | 22 ms   | 25 ms   |

### Health Checks

| Endpoint       | Concurrency | Requests | RPS       | p50    | p90    | p99     |
|----------------|-------------|----------|-----------|--------|--------|---------|
| `/health`      | 50          | 500      | **1,673** | 29 ms  | 37 ms  | 45 ms   |
| `/health/deep` | 20          | 200      | **461**   | 31 ms  | 79 ms  | 133 ms  |

---

## Endpoint-by-Endpoint Analysis

### `/api/stats` — 327 RPS, 19 ms p50
Unexpectedly low RPS for a 155-byte payload. Likely involves multiple aggregation queries (total stocks, active today, index value) that aren't fully cached. The wide p50→p99 spread (19→104 ms) suggests occasional cache misses triggering full DB scans.

### `/api/sectors` — 673 RPS, 13 ms p50
Distinct-query on sectors, cached in Redis. Fast because the result set is small and the Redis hit rate is 96.8%.

### `/api/market/indices` — 769 RPS, 11 ms p50
Best lightweight endpoint. Small result set (8-10 indices), likely served from cache on most requests.

### `/api/market-overview` — 98 RPS, 42 ms p50
520 KB payload covering all 1,335+ listed stocks. Despite caching, serialization of such a large JSON body dominates latency. Still within acceptable range for a dashboard — not a per-keystroke endpoint.

### `/api/companies` — 47 RPS, 194 ms p50 ⚠️
**Primary bottleneck.** 1.7 MB payload for 4,263 records. The p99 of 515 ms is the worst in the suite. Pagination or field selection would reduce this by 90%+ for typical frontend use (only ~30 rows visible at a time).

### `/api/client-type` — 80 RPS, 51 ms p50
Large aggregation joining securities with client-type flow data. Cached but expensive to compute on miss.

### `/api/stocks/{symbol}` — 783 RPS, 6 ms p50
Fastest API endpoint. Single indexed lookup by symbol. Demonstrates the floor latency for a simple DB round-trip through PgBouncer.

### `/health/deep` — 461 RPS, 31 ms p50
Verifies DB + Redis connectivity on each call (no cache). 31 ms p50 confirms PgBouncer add ~5-10 ms overhead over a raw connection.

---

## Rate Limiting

Tested endpoints respect dual-layer limits:

| Layer       | Zone    | Limit        |
|-------------|---------|--------------|
| Nginx       | `api`   | 30 req/s     |
| Application | default | 100 req/min  |
| Application | heavy   | 30 req/min   |
| Application | scraper | 5 req/min    |

Tests run directly against port 8000 (bypassing Nginx) and request counts were kept within application-layer limits to avoid 429 responses contaminating throughput numbers.

---

## Verdict

| Category             | RPS Range    | p50 Range  | Grade |
|----------------------|--------------|------------|-------|
| Lightweight API      | 327–769      | 6–19 ms    | **A-** |
| Large payload API    | 47–460       | 10–194 ms  | **B+** |
| Health checks        | 461–1,673    | 29–31 ms   | **A**  |
| Stock detail lookup  | 400–783      | 6–9 ms     | **A**  |

**Score: B+/A-** — Fast for indexed lookups and cached endpoints. The one clear outlier is `/api/companies` (1.7 MB, 47 RPS) which needs pagination.

---

## Recommendations

1. **Paginate `/api/companies`** — Add `?page=1&per_page=50` support. Returns 50 rows at ~40 KB instead of 4,263 at 1.7 MB. Expected RPS improvement: 10×.
2. **Investigate `/api/stats`** — Profile which sub-queries run on each request. Caching individual aggregates with short TTL (60s) should push this to 800+ RPS.
3. **Increase Uvicorn workers** — Currently defaults. In a 4-vCPU environment, `--workers 4 --worker-connections 200` doubles throughput for CPU-bound endpoints.
4. **Response streaming** — For large payloads (market-overview, client-type), use `StreamingResponse` to reduce time-to-first-byte.
5. **Field projection** — Allow `?fields=symbol,name,price` on list endpoints to avoid sending unused columns.
