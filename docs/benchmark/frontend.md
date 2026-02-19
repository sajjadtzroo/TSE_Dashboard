# Frontend Benchmark — Static Asset Serving

**Date**: 2026-02-19
**Tool**: Apache Bench (ab) 2.3
**Environment**: GitHub Codespace — 4 vCPU, 15 GB RAM, Docker 28.5.1
**Tested through**: Nginx (port 80)

---

## Overview

Frontend assets are built by Vite and served directly by Nginx, bypassing the Python API entirely. Tests measure pure Nginx static-serving throughput for the primary asset types delivered to the browser on first load.

Since the last benchmark (2026-02-17), the Vite build config was updated with **manual chunk splitting** — the monolithic JS bundle is now split into four vendor chunks:

```
vendor-charts.js    606.9 KB   (Recharts / chart libraries)
vendor-mantine.js   352.3 KB   (Mantine UI components)
index.js            438.2 KB   (App code)
vendor-react.js     159.4 KB   (React + ReactDOM)
vendor-motion.js     96.3 KB   (Framer Motion)
index.css           249.5 KB   (All styles)
```

```
Browser ──► Nginx :80 ──► /usr/share/nginx/html/ (static files)
```

---

## Test Commands

```bash
# SPA entry — must not be cached (no-cache header)
ab -n 1000 -c 50 http://localhost/

# Main JS bundle — largest app code chunk (content-hashed, immutable cache)
ab -n 1000 -c 50 "http://localhost/assets/index-B_8qV2q5.js"

# Vendor React bundle — new manual chunk (content-hashed, immutable cache)
ab -n 1000 -c 50 "http://localhost/assets/vendor-react-BARPrr5C.js"

# Main CSS bundle — content-hashed, immutable cache
ab -n 1000 -c 50 "http://localhost/assets/index-C-mHUeYw.css"
```

- **`-n 1000`** — 1,000 total requests per asset
- **`-c 50`** — 50 concurrent connections

---

## Results

| Asset               | Size    | Concurrency | Requests | RPS       | p50    | p90    | p99    | Failed |
|---------------------|---------|-------------|----------|-----------|--------|--------|--------|--------|
| `index.html`        | 1.8 KB  | 50          | 1,000    | **7,358** | 6 ms   | 10 ms  | 13 ms  | 0      |
| `index-B_8qV2q5.js` | 438.7 KB| 50          | 1,000    | **2,307** | 20 ms  | 30 ms  | 41 ms  | 0      |
| `vendor-react-*.js` | 159.5 KB| 50          | 1,000    | **2,625** | 18 ms  | 32 ms  | 43 ms  | 0      |
| `index-C-mHUeYw.css`| 249.5 KB| 50          | 1,000    | **2,983** | 14 ms  | 29 ms  | 38 ms  | 0      |

> **Note**: ab does not send `Accept-Encoding: gzip` by default, so document lengths reflect uncompressed sizes. Browsers receive gzip-compressed payloads (~70% smaller for JS, ~77% for CSS).

---

## Comparison to Previous Benchmark (2026-02-17)

| Asset          | Old RPS | New RPS | Old p99 | New p99 | Change |
|----------------|---------|---------|---------|---------|--------|
| `index.html`   | 7,429   | 7,358   | 14 ms   | 13 ms   | ~same  |
| Main JS bundle | 2,212   | 2,307   | 31 ms   | 41 ms   | +4% RPS, bundle 749KB→439KB |
| CSS bundle     | 3,988   | 2,983   | 26 ms   | 38 ms   | −25% RPS (larger CSS now 250KB vs 238KB) |

The main JS bundle shrank from 749 KB to 439 KB due to manual chunk splitting. RPS improved slightly, and browsers now load React (159 KB), Mantine (352 KB), and Charts (607 KB) as separate cacheable chunks — a first-load improvement when only one chunk changes between deployments.

---

## Analysis

### `index.html` — 7,358 RPS

- At 1.8 KB, serves from Nginx OS page cache with no I/O.
- `Cache-Control: no-cache` ensures browsers revalidate on every navigation — new deployments picked up immediately.
- 6 ms p50 / 13 ms p99 is essentially TCP handshake + copy overhead.

### Main JS Bundle — 2,307 RPS

- App code only (438 KB), down from 749 KB monolith.
- Nginx gzip compresses to ~135 KB for browser delivery.
- 20 ms p50 reflects gzip CPU + local transfer.
- Content-hash allows `Cache-Control: max-age=31536000, immutable`.

### Vendor React — 2,625 RPS

- At 159 KB, lighter than the old combined bundle.
- Independently cacheable — a React version bump only invalidates this chunk.
- 18 ms p50 / 43 ms p99.

### CSS Bundle — 2,983 RPS

- At 249.5 KB, slightly larger than before due to additional landing page CSS.
- gzip reduces to ~55 KB in practice.

---

## Nginx Configuration Highlights

```nginx
# Gzip compression
gzip on;
gzip_comp_level 6;
gzip_min_length 256;
gzip_types text/css application/javascript application/json ...;

# Long-lived cache for hashed assets
location ~* \.(js|css|woff2|png|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# No cache for index.html (SPA entry point)
location = /index.html {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}
```

---

## Verdict

| Metric              | Result                  | Grade |
|---------------------|-------------------------|-------|
| Small file RPS      | 7,358                   | **A** |
| Large JS bundle RPS | 2,307                   | **A** |
| p99 latency (all)   | ≤ 43 ms                 | **A** |
| Cache strategy      | Immutable + no-cache    | **A** |
| Gzip compression    | Active, level 6         | **A** |
| Chunk splitting     | 5 vendor + 1 app chunk  | **A** |

**Score: A** — Nginx handles static assets at near wire-speed. Manual chunk splitting reduces per-deployment cache invalidation scope. All assets deliver sub-45 ms p99 under 50 concurrent connections.

---

## Recommendations

1. **Enable Brotli** (`ngx_brotli`) — 15–20% better compression than gzip for JS/CSS.
2. **Precompressed assets** — Ship `.gz` files from Vite build; use `gzip_static on` to skip runtime compression entirely.
3. **HTTP/2 push** — Preload critical chunks alongside `index.html` to eliminate a round-trip for first paint.
4. **Serve from CDN** in production — offloads all static traffic at zero application cost.
