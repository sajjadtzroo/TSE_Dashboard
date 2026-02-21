# Crypto Section Implementation Plan — KuCoin API

## Context

The landing page has 3 sections: Iran Market (fully built), Persian Loan (separate project), and Global Markets (not built). This plan implements the **crypto** portion of Global Markets as a single tabbed page at `/dashboard/crypto` plus a coin detail page at `/dashboard/crypto/:symbol`, using KuCoin's public API for data. The architecture follows all existing project patterns (Scrapy spider → Items → Pipeline → PostgreSQL → FastAPI → React frontend).

---

## Architecture Overview

**Data strategy — Hybrid (store + proxy):**
- **Stored in PostgreSQL:** Ticker snapshots (every 5 min) + daily OHLCV candles → powers overview table, heatmap, history charts
- **Proxied live from KuCoin:** Intraday candles, order book, recent trades → real-time detail page data
- **Proxy support:** All KuCoin HTTP calls (spider + FastAPI proxy) support an optional `KUCOIN_PROXY_URL` env var for routing through a proxy when direct access is blocked

**KuCoin public endpoints used (no API key needed):**
- `GET /api/v1/market/allTickers` — all ticker prices (1 call = all USDT pairs)
- `GET /api/v1/market/candles` — OHLCV candlesticks
- `GET /api/v1/market/orderbook/level2_20` — order book
- `GET /api/v1/market/histories` — recent trades
- Rate limit: 2,000 weight / 30s per IP (ample for our usage)

---

## Phase 1: Backend — Database & Data Collection

### 1.1 Database Models (3 tables, normalized registry design)
**Modify:** `database/models.py`

**Table 1: `crypto_coins`** — Coin registry (like `securities` but for global crypto)
- `id` (PK, autoincrement)
- `symbol` (String(20), unique, e.g. `BTC-USDT`)
- `base_currency` (String(10), indexed, e.g. `BTC`)
- `quote_currency` (String(10), default `USDT`)
- `name_en` (String(100), e.g. `Bitcoin`)
- `icon_url` (Text)
- `is_active` (Boolean, default True)
- `created_at`, `updated_at`
- Relationships: `tickers`, `ohlcv` (cascade delete-orphan)

**Table 2: `crypto_tickers`** — Periodic snapshots, FK to `crypto_coins`
- `id` (PK), `coin_id` (FK → crypto_coins.id, indexed)
- `snapshot_time` (DateTime, indexed)
- Price fields: `last`, `high`, `low`, `buy`, `sell`, `average_price`, `change_rate`, `change_price` — all `Numeric(24, 8)`
- Volume fields: `vol` (base), `vol_value` (quote) — `Numeric(30, 8)`
- Unique: `(coin_id, snapshot_time)`
- Numeric precision: `Numeric(24, 8)` for prices (handles sub-penny SHIB to 5-digit BTC)

**Table 3: `crypto_ohlcv`** — Daily candles, FK to `crypto_coins`
- `id` (PK), `coin_id` (FK → crypto_coins.id, indexed)
- `date` (Date, indexed)
- `open`, `high`, `low`, `close` — `Numeric(24, 8)`
- `volume`, `turnover` — `Numeric(30, 8)`
- Unique: `(coin_id, date)`

### 1.2 Scrapy Items
**Modify:** `tsetmc_scraper/items.py`

Add `CryptoTickerItem` and `CryptoOHLCVItem` following existing item patterns with `item_type` field. Both include `symbol` and `base_currency` for coin resolution in the pipeline.

### 1.3 Spiders
**Create:** `tsetmc_scraper/spiders/kucoin_tickers.py`
- Fetches `GET /api/v1/market/allTickers`, filters to `-USDT` pairs only
- Yields `CryptoTickerItem` per pair (~200-300 items per run)
- Supports optional HTTP proxy via `KUCOIN_PROXY_URL` env var
- Custom settings: `CONCURRENT_REQUESTS=1`, `RETRY_TIMES=3`

**Create:** `tsetmc_scraper/spiders/kucoin_ohlcv.py`
- Iterates top 30 USDT pairs, fetches `GET /api/v1/market/candles?type=1day` (last 30 days)
- Yields `CryptoOHLCVItem` per candle
- `CONCURRENT_REQUESTS=2`, `DOWNLOAD_DELAY=1.0` (conservative for rate limits)

### 1.4 Pipeline Handlers
**Modify:** `tsetmc_scraper/pipelines.py`

Add handlers in each pipeline stage following the exact existing pattern:
- **ValidationPipeline:** Require `symbol` for both types, `date` for OHLCV
- **DataCleaningPipeline:** `safe_float()` on all numeric fields, `clean_text()` on strings
- **DatabasePipeline:**
  - Add `_crypto_coin_cache` dict (like existing `_sec_cache`) for `symbol → coin_id` resolution
  - Add `_resolve_crypto_coin_id(symbol, base_currency, name_en)` method — looks up or creates a `CryptoCoin` row, caches the ID
  - Flush methods resolve `coin_id` from cache before upserting
  - Bulk upsert via `insert().on_conflict_do_update()` on respective unique constraints; add to `flush_map`

### 1.5 Scheduler
**Modify:** `scheduler/jobs.py` — add `run_kucoin_tickers()` and `run_kucoin_ohlcv()`
**Modify:** `scheduler/scheduler.py` — schedule:
- Tickers: every 5 minutes, 24/7 (crypto never closes)
- OHLCV: daily at 04:00 Tehran time

### 1.6 Ticker Cleanup Job
**Modify:** `scheduler/jobs.py` — add `cleanup_old_crypto_tickers()` to delete snapshots older than 7 days (prevents unbounded growth: ~200 pairs × 288 snapshots/day = 57K rows/day)
**Modify:** `scheduler/scheduler.py` — schedule daily at 03:00

---

## Phase 2: Backend — API Endpoints

### 2.1 Schemas
**Modify:** `api/schemas.py`

Add `CryptoCoinSchema`, `CryptoTickerSchema`, `CryptoOHLCVSchema`, `CryptoOverviewSchema` (Pydantic models with `from_attributes=True`). Overview schema JOINs coin metadata (name_en, icon_url) from `crypto_coins` with ticker data.

### 2.2 Route Module
**Create:** `api/routes/crypto.py`

| Endpoint | Source | Purpose |
|---|---|---|
| `GET /api/crypto/tickers` | DB (latest snapshot) | Overview table — sortable, searchable, paginated |
| `GET /api/crypto/stats` | DB (latest snapshot) | KPI aggregates — total coins, gainers, losers, volume |
| `GET /api/crypto/top-movers` | DB (latest snapshot) | Top 10 gainers & losers |
| `GET /api/crypto/coin/{symbol}` | DB | Single coin 24h stats |
| `GET /api/crypto/coin/{symbol}/history` | DB | Daily OHLCV (stored, up to 365 days) |
| `GET /api/crypto/coin/{symbol}/candles` | **KuCoin proxy** | Intraday candles (1min–1day intervals) |
| `GET /api/crypto/coin/{symbol}/orderbook` | **KuCoin proxy** | Top 20 bid/ask levels |
| `GET /api/crypto/coin/{symbol}/trades` | **KuCoin proxy** | Recent executed trades |

Proxy endpoints use `httpx.AsyncClient` with optional proxy from `KUCOIN_PROXY_URL` env var.

### 2.3 Register Router
**Modify:** `api/main.py` — import and include `crypto_router`

### 2.4 Dependency
**Modify:** `requirements.txt` — add `httpx>=0.27.0`

### 2.5 Environment
**Modify:** `.env.example` — add `KUCOIN_PROXY_URL=` (empty = direct access)

---

## Phase 3: Frontend — Crypto Page with Tabs

### 3.1 Main Crypto Page (Tabbed)
**Create:** `frontend/src/pages/CryptoOverview.jsx`

Single page at `/dashboard/crypto` with Mantine `Tabs` (following Codal.jsx pattern):

**Tab 1: نمای بازار (Market Overview)**
- KPI cards row (`RallyKPICard`): total coins, 24h total volume, top gainer badge, top loser badge
- Search input + sort dropdown
- `RallyDataTable` with columns: #, symbol/name, price, 24h change%, 24h high, 24h low, 24h volume
- `PercentChangeCell` for change column, `usePagination` for table
- Row click → navigate to `/dashboard/crypto/{symbol}`
- Data: `useApiData('/api/crypto/tickers')` + `useApiData('/api/crypto/stats')`

**Tab 2: نقشه بازار (Heatmap)**
- `RallyTreemap` component (already exists in project)
- Size = `vol_value` (24h volume), Color = `change_rate` (24h change)
- Cell click → navigate to `/dashboard/crypto/{symbol}`
- Data: same tickers endpoint

**Tab 3: بیشترین تغییرات (Top Movers)**
- Two side-by-side `RallyListCard` components: Gainers (green) and Losers (red)
- Each shows top 10 with symbol, price, change%
- Data: `useApiData('/api/crypto/top-movers')`

### 3.2 Coin Detail Page
**Create:** `frontend/src/pages/CryptoDetail.jsx`

Route: `/dashboard/crypto/:symbol` — follows StockDetail.jsx layout pattern.

- Breadcrumb: Dashboard > Crypto > BTC-USDT
- **Top row:** Price card with 24h stats (last, high, low, volume, change)
- **Chart section:** Candlestick chart using `lightweight-charts` (already in project)
  - Interval selector: 1min, 5min, 15min, 1hour, 4hour, 1day
  - Daily data from `/api/crypto/coin/{symbol}/history` (stored)
  - Intraday data from `/api/crypto/coin/{symbol}/candles` (proxied)
- **Bottom row (Grid):**
  - Left: Order book depth (from `/api/crypto/coin/{symbol}/orderbook`)
  - Right: Recent trades list (from `/api/crypto/coin/{symbol}/trades`)
- Auto-refresh every 10 seconds for live proxy data

### 3.3 Utility Functions
**Create:** `frontend/src/utils/cryptoUtils.js`
- `formatCryptoPrice(price)` — adaptive decimals (2 for BTC, 8 for SHIB)
- `formatVolume(vol)` — $1.2B, $450M, $12K format
- `getCryptoIconUrl(baseCurrency)` — returns CDN icon URL

### 3.4 Routes
**Modify:** `frontend/src/App.jsx`
- Import `CryptoOverview` and `CryptoDetail`
- Add routes: `crypto` and `crypto/:symbol` under `/dashboard`

### 3.5 Sidebar Navigation
**Modify:** `frontend/src/layout/MainLayout.jsx`
- Add new section "بازارهای جهانی" (Global Markets) after "بورس کالا"
- Item: `{ text: 'ارز دیجیتال', icon: IconCurrencyBitcoin, path: '/dashboard/crypto' }`

### 3.6 Landing Page
**Modify:** `frontend/src/pages/LandingPage.jsx`
- Make "بازار جهانی" card clickable → navigates to `/dashboard/crypto`

---

## Implementation Order

| Step | Files | Depends on |
|---|---|---|
| 1. DB models | `database/models.py` | — |
| 2. Create tables | Run app / alembic | Step 1 |
| 3. Items | `tsetmc_scraper/items.py` | — |
| 4. Pipeline handlers | `tsetmc_scraper/pipelines.py` | Steps 1, 3 |
| 5. Spiders | `tsetmc_scraper/spiders/kucoin_tickers.py`, `kucoin_ohlcv.py` | Steps 3, 4 |
| 6. Scheduler | `scheduler/jobs.py`, `scheduler/scheduler.py` | Step 5 |
| 7. API schemas | `api/schemas.py` | Step 1 |
| 8. API routes + register | `api/routes/crypto.py`, `api/main.py` | Steps 1, 7 |
| 9. Frontend utils | `frontend/src/utils/cryptoUtils.js` | — |
| 10. CryptoOverview page | `frontend/src/pages/CryptoOverview.jsx` | Step 8 |
| 11. CryptoDetail page | `frontend/src/pages/CryptoDetail.jsx` | Step 8 |
| 12. Navigation & routes | `App.jsx`, `MainLayout.jsx`, `LandingPage.jsx` | Steps 10, 11 |
| 13. Cleanup job | `scheduler/jobs.py`, `scheduler/scheduler.py` | Step 1 |

---

## Verification Plan

1. **Spider test:** Run `scrapy crawl kucoin_tickers` and `scrapy crawl kucoin_ohlcv` manually, verify rows in `crypto_tickers` and `crypto_ohlcv` tables
2. **API test:** `curl localhost:8001/api/crypto/tickers` — should return ticker data; `curl localhost:8001/api/crypto/coin/BTC-USDT/candles` — should proxy KuCoin
3. **Frontend test:** Navigate to `/dashboard/crypto`, verify table loads, tabs switch, click a coin to reach detail page with chart
4. **Landing page:** Click "بازار جهانی" card → should navigate to crypto page

---

## Key Files Summary

**New files (6):**
- `tsetmc_scraper/spiders/kucoin_tickers.py`
- `tsetmc_scraper/spiders/kucoin_ohlcv.py`
- `api/routes/crypto.py`
- `frontend/src/pages/CryptoOverview.jsx`
- `frontend/src/pages/CryptoDetail.jsx`
- `frontend/src/utils/cryptoUtils.js`

**Modified files (10):**
- `database/models.py` — add CryptoCoin, CryptoTicker, CryptoOHLCV models (3 tables)
- `tsetmc_scraper/items.py` — add CryptoTickerItem, CryptoOHLCVItem
- `tsetmc_scraper/pipelines.py` — add validation, cleaning, flush handlers
- `scheduler/jobs.py` — add kucoin jobs + ticker cleanup
- `scheduler/scheduler.py` — schedule kucoin jobs
- `api/schemas.py` — add crypto schemas
- `api/main.py` — register crypto router
- `frontend/src/App.jsx` — add crypto routes
- `frontend/src/layout/MainLayout.jsx` — add sidebar section
- `frontend/src/pages/LandingPage.jsx` — make global markets card clickable
