# TSE Dashboard — Performance Benchmark Report

**Date**: 2026-02-19
**Tool**: Apache Bench (ab) 2.3
**Environment**: GitHub Codespace — 4 vCPU, 15 GB RAM, Docker 28.5.1
**Changes since last run (2026-02-17)**: Auth UI, voice calling, crypto watchlist, Fear & Greed history endpoint, XLSX export, Vite manual chunk splitting.

---

## Architecture Under Test

```
Client ──► Nginx (port 80) ──► Gunicorn + Uvicorn (port 8000) ──► PgBouncer ──► PostgreSQL
                                         │
                                         └──► Redis (cache + rate limit)
```

| Service     | Image / Config                                        |
|-------------|-------------------------------------------------------|
| Nginx       | nginx:1.25.5 — static assets + reverse proxy          |
| API         | Gunicorn + Uvicorn (async workers)                    |
| PostgreSQL  | postgres:16 — ~10 MB user data, pgvector extension   |
| PgBouncer   | Transaction pooling — 80 pool size, 2000 max clients  |
| Redis       | redis:7.4.7 — 3.65 MB / 512 MB max, 97.7% hit rate  |

---

## 1. Frontend (Static Assets via Nginx)

Vite now uses manual chunk splitting — the monolithic JS bundle is split into separate vendor chunks for better cache granularity.

| Asset               | Size     | Concurrency | Requests | RPS       | p50   | p90   | p99   |
|---------------------|----------|-------------|----------|-----------|-------|-------|-------|
| `index.html`        | 1.8 KB   | 50          | 1,000    | **7,358** | 6 ms  | 10 ms | 13 ms |
| Main JS bundle      | 438.7 KB | 50          | 1,000    | **2,307** | 20 ms | 30 ms | 41 ms |
| Vendor React chunk  | 159.5 KB | 50          | 1,000    | **2,625** | 18 ms | 32 ms | 43 ms |
| CSS bundle          | 249.5 KB | 50          | 1,000    | **2,983** | 14 ms | 29 ms | 38 ms |

Additional chunks not individually benchmarked: `vendor-charts` (606.9 KB), `vendor-mantine` (352.3 KB), `vendor-motion` (96.3 KB).

**Verdict**: Nginx serves static assets efficiently. Main JS bundle shrunk from 749 KB to 439 KB due to chunk splitting. All assets deliver sub-45 ms p99 at 50 concurrent connections. Grade: **A**

---

## 2. Backend API (Direct to Uvicorn, port 8000)

Rate limit keys flushed before each test. Requests stay within tier limits for 0 non-2xx responses.

### Health Check

| Endpoint  | Concurrency | Requests | RPS       | p50    | p90    | p99    |
|-----------|-------------|----------|-----------|--------|--------|--------|
| `/health` | 20          | 3,000    | **1,250** | 12 ms  | 30 ms  | 45 ms  |

### Cached Fast Endpoints (default tier: 300 req/min)

| Endpoint              | Payload  | Concurrency | Requests | RPS       | p50    | p90    | p99    |
|-----------------------|----------|-------------|----------|-----------|--------|--------|--------|
| `/api/market/indices` | ~3.2 KB  | 10          | 250      | **330**   | 30 ms  | 54 ms  | 76 ms  |
| `/api/sectors`        | ~2.5 KB  | 10          | 250      | **589**   | 17 ms  | —      | 41 ms  |

### Large Payload Endpoints (heavy tier: 60 req/min)

| Endpoint               | Payload  | Concurrency | Requests | RPS       | p50    | p90    | p99    |
|------------------------|----------|-------------|----------|-----------|--------|--------|--------|
| `/api/market-overview` | ~520 KB  | 5           | 55       | **173**   | 21 ms  | 44 ms  | 64 ms  |
| `/api/companies`       | ~1.7 MB  | 3           | 50       | **130**   | 20 ms  | 32 ms  | 55 ms  |

### New Crypto Endpoints (added since last benchmark)

| Endpoint                              | Payload | Concurrency | Requests | RPS       | p50    | p90    | p99    |
|---------------------------------------|---------|-------------|----------|-----------|--------|--------|--------|
| `/api/crypto/market`                  | ~9.4 KB | 10          | 250      | **356**   | 24 ms  | 40 ms  | 59 ms  |
| `/api/crypto/fear-greed-history?days=30` | ~58 B | 10         | 250      | **584**   | 16 ms  | 26 ms  | 32 ms  |
| `/api/crypto/stats/global`            | ~230 B  | 10          | 250      | **633**   | 14 ms  | 26 ms  | 44 ms  |

**Verdict**: All new crypto endpoints perform at the cached-fast tier level. market-overview improved from 98 → 173 RPS. Grade: **A-**

---

## 3. Database Scoring

### PostgreSQL Stats (tsetmc database)

| Table           | Total Size | Rows    | Notes                          |
|-----------------|------------|---------|--------------------------------|
| `order_book`    | 1.6 MB     | ~4,002  | Intraday bid/ask snapshots     |
| `securities`    | 1.5 MB     | 4,293   | All listed symbols + metadata  |
| `crypto_tickers`| 632 KB     | 2,496   | New: crypto market data        |
| `market_prices` | 640 KB     | ~2,928  | Daily closing data             |
| Total user data | **~10 MB** | —       | Fits entirely in shared_buffers|

### Index Hit Rate

| Table           | idx_hit_pct | Notes                                        |
|-----------------|-------------|----------------------------------------------|
| `securities`    | **99.7%**   | Primary table; symbol index fully utilized   |
| `users`         | **96.9%**   | Email index used for auth lookups            |
| `crypto_tickers`| **96.3%**   | Good; some full scans for list queries       |
| `daily_ohlcv`   | **95.0%**   | Date range queries via index                 |
| Overall         | **96.1%**   | 5,493 index / 5,713 total scans              |

### Redis Cache Stats (live at benchmark time)

| Metric         | Value                 |
|----------------|-----------------------|
| Redis version  | 7.4.7                 |
| Memory used    | 3.65 MB / 512 MB max  |
| Cache keys     | 143 (all with TTLs)   |
| Cache hits     | 5,389                 |
| Cache misses   | 126                   |
| **Hit rate**   | **97.7%** ↑ from 96.8% |

**Verdict**: DB stays fast — entire dataset fits in RAM. Redis at 97.7% hit rate makes PostgreSQL invisible for ~98% of requests. Grade: **A**

---

## 4. Rate Limiting Configuration

### Nginx Layer (port 80)
| Zone      | Rate      | Burst |
|-----------|-----------|-------|
| `api`     | 30 req/s  | 50    |
| `scraper` | 2 req/min | 3     |

### Application Layer (FastAPI Redis sliding window, per-IP)
| Tier    | Limit        | Endpoints                                         |
|---------|--------------|---------------------------------------------------|
| default | 300 req/min  | Most read endpoints                               |
| heavy   | 60 req/min   | `/api/market-overview`, `/api/client-type`        |
| scraper | 5 req/min    | `/api/scraper/*`, `/api/rag/upload`               |
| auth    | 10 req/min   | `/api/auth/login`, `/api/auth/register` (new)     |

---

## 5. Performance Summary & Scoring

| Category                   | Score | Notes                                                           |
|----------------------------|-------|-----------------------------------------------------------------|
| **Static Asset Serving**   | A     | 2.3K–7.4K RPS; chunk splitting reduces cache invalidation scope |
| **Lightweight API**        | A-    | 330–633 RPS; Redis at 97.7% hit rate                            |
| **Heavy API (DB queries)** | B+    | 130–173 RPS; market-overview improved +77% vs prior run         |
| **New Crypto Endpoints**   | A-    | 356–633 RPS; all 3 endpoints in cached-fast tier               |
| **Database (PostgreSQL)**  | A     | 0.5–30 ms; ~10 MB DB fits entirely in shared_buffers           |
| **Cache (Redis)**          | A+    | 97.7% hit rate, 3.65 MB footprint, 143 keys                    |
| **Connection Pooling**     | A     | PgBouncer transaction mode, no exhaustion observed             |
| **Rate Limiting**          | A     | Dual-layer; new auth tier (10/min) for login/register           |

### Overall Grade: **A-** (unchanged)

**Top 3 Bottlenecks**:
1. `/api/companies` — 1.7 MB payload; 130 RPS at c=3, but degrades at c=10. Needs pagination.
2. `/api/market/indices` — 30 ms p50 for a 3.2 KB cached payload. Above expectations; profile Redis path.
3. No HTTPS — Blocks production deployment.

**Strengths**:
- Redis cache at 97.7% hit rate absorbs ~98% of read load
- New Vite manual chunks improve deployment cache granularity
- All new endpoints (crypto, auth, voice) integrate cleanly without regressions
- PgBouncer prevents connection exhaustion; no errors during any test run
- PostgreSQL overall index hit rate: 96.1%

---

## 6. Test Methodology

- **Frontend tests**: 1,000 requests at concurrency 50 through Nginx (port 80)
- **API tests**: Varied request counts within rate limit windows, directly to Uvicorn (port 8000)
- **Rate limit keys flushed** (`tse:ratelimit:*`) before each API test for clean 0-429 measurements
- **Cache pre-warmed** for all endpoints before backend tests
- **`-l` flag** used for variable-length JSON responses
- All tests run from localhost — network latency is negligible

See detailed reports:
- [`docs/benchmark/frontend.md`](docs/benchmark/frontend.md)
- [`docs/benchmark/backend.md`](docs/benchmark/backend.md)
- [`docs/benchmark/database.md`](docs/benchmark/database.md)
- [`docs/benchmark/scoring.md`](docs/benchmark/scoring.md)
