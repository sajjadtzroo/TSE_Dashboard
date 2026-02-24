# TSE Dashboard — Load Test

Locust-based performance test that runs 5 phases automatically (27 minutes total).

## Setup

```bash
pip install "locust>=2.24"
```

## Running

### Web UI (recommended for first run)
```bash
locust -f scripts/load_test/locustfile.py --host http://localhost:8001
# Open http://localhost:8089 to watch live dashboard
# Click Start without changing user count — TSELoadShape controls it automatically
```

### Fully headless (CI / unattended)
```bash
locust -f scripts/load_test/locustfile.py --host http://localhost:8001 --headless
```

### Against Docker stack
```bash
locust -f scripts/load_test/locustfile.py --host http://localhost
```

### Quick smoke test (50 users, 2 minutes)
```bash
locust -f scripts/load_test/locustfile.py --host http://localhost:8001 \
       --headless -u 50 -r 5 -t 2m --skip-log
```

## Phases

| Phase | Duration | Users | Purpose |
|-------|----------|-------|---------|
| 1 — Warm-up | 0–2 min | 5 | Prime DB pool + Redis cache |
| 2 — Ramp-up | 2–7 min | 5→50 | Approach realistic load |
| 3 — Steady | 7–12 min | 50 | Measure sustained throughput |
| 4 — Stress | 12–22 min | 50→500 | Find breaking point |
| 5 — Cool-down | 22–27 min | 20 | Per-endpoint isolation |

## User Classes

| Class | Weight | Wait | Simulates |
|-------|--------|------|-----------|
| `MarketWatcher` | 70% | 1–3s | Auto-refresh polling (indices, prices, overview) |
| `StockAnalyst` | 20% | 5–15s | Deep research (history, codal, financials) |
| `Authenticator` | 10% | 30–60s | Login + auth-protected endpoints |

## Rate Limit Strategy

Each Locust user sends a unique `X-Forwarded-For` IP header (`10.x.x.x`), so all 500 concurrent users appear as distinct IPs to the Redis rate limiter. This tests realistic per-user limits, not a single-IP limit bucket.

**Tiers:**
- `default` — 300 req/min per IP (most endpoints)
- `heavy` — 60 req/min per IP (`/market-overview`, `/client-type`)
- `auth` — 10 req/min per IP (login/register)

## Expected Baselines

| Endpoint | p95 | Min RPS |
|----------|-----|---------|
| `/api/market/indices` | < 20ms | 800 |
| `/api/market-overview` | < 200ms | 100 |
| `/api/codal` | < 300ms | 50 |
| `/api/stocks/[s]/history` | < 500ms | 30 |

## Red Flags

- p95 > 2 seconds on any endpoint
- Error rate > 5% under 200 users
- `503 Service Unavailable` from PgBouncer (pool exhausted)
- `429 Too Many Requests` appearing even with unique IPs (indicates Redis misconfiguration)

## Output

At the end of a headless run, a summary table is printed:

```
======================================================================
  FINAL RESULTS SUMMARY
======================================================================
  Endpoint                                      RPS    p50    p95    p99  Fail%
  --------------------------------------------------------------------
  /api/market/indices                         923.4    8ms   15ms   22ms   0.0%
  /api/market/prices                          412.1   12ms   28ms   55ms   0.1%
  ...
  TOTAL                                                                    0.4%
  Total requests: 1,234,567   Total failures: 4,938

  ASSESSMENT:
    [PASS] Overall error rate < 5%
    [PASS] Overall p95 latency < 2000ms
    [PASS] Total requests > 10,000
```
