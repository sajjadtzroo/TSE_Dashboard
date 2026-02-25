# USD/Rial + Gold Cards Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a second row of 3 `IndexMiniCard` cards to `DashboardEqualWeightSection` showing USD spot, USD forward, and Gold 18K with real 7-day area charts.

**Architecture:** Two new backend history endpoints (`/api/dollar/history`, `/api/gold/history`) feed new frontend hooks, which are composed in a new `useDashboardCurrency` sub-hook, spread into `useDashboardData`, and passed as props down to `DashboardEqualWeightSection` which renders a second `SimpleGrid` row using the existing `IndexMiniCard` component unchanged.

**Tech Stack:** FastAPI · SQLAlchemy (sync) · PostgreSQL `date_trunc` · TanStack Query · React 18 · Mantine v7 · motion/react

---

## Task 1: Backend — `/api/dollar/history` endpoint

**Files:**
- Modify: `api/routes/market.py` (after line 589, after the existing `get_dollar_latest`)
- Test: `tests/unit/test_dollar_history.py` (new file)

### Step 1: Write the failing test

Create `tests/unit/test_dollar_history.py`:

```python
"""Unit tests for GET /api/dollar/history."""
import datetime as _dt
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from api.main import app
from api.deps import get_db


@pytest.fixture
def client_with_mock_db():
    mock_db = MagicMock()
    app.dependency_overrides[get_db] = lambda: mock_db
    yield TestClient(app), mock_db
    app.dependency_overrides.clear()


def _make_bucket_row(posted_at_iso: str, price: int):
    """Returns a 2-tuple (bucket_datetime, max_price) matching query result."""
    row = MagicMock()
    row.bucket = _dt.datetime.fromisoformat(posted_at_iso)
    row.max_price = price
    return row


class TestDollarHistory:
    def test_returns_spot_and_forward_lists(self, client_with_mock_db):
        client, mock_db = client_with_mock_db

        # Security lookup
        sec_mock = MagicMock()
        sec_mock.__getitem__ = lambda self, i: 42
        mock_db.query.return_value.filter.return_value.first.return_value = sec_mock

        # Bucket rows for spot
        spot_rows = [
            _make_bucket_row("2026-02-18T08:00:00+00:00", 163000),
            _make_bucket_row("2026-02-18T12:00:00+00:00", 163500),
        ]
        # Bucket rows for forward
        fwd_rows = [
            _make_bucket_row("2026-02-18T08:00:00+00:00", 164000),
            _make_bucket_row("2026-02-18T12:00:00+00:00", 164500),
        ]

        # The endpoint calls .all() twice (once per rate_type)
        mock_db.query.return_value.filter.return_value.group_by.return_value \
            .order_by.return_value.all.side_effect = [spot_rows, fwd_rows]

        resp = client.get("/api/dollar/history?days=7")
        assert resp.status_code == 200
        data = resp.json()
        assert "spot" in data
        assert "forward" in data
        assert len(data["spot"]) == 2
        assert data["spot"][0]["y"] == 163000
        assert "x" in data["spot"][0]

    def test_returns_empty_when_no_usd_security(self, client_with_mock_db):
        client, mock_db = client_with_mock_db
        mock_db.query.return_value.filter.return_value.first.return_value = None
        resp = client.get("/api/dollar/history?days=7")
        assert resp.status_code == 200
        assert resp.json() == {"spot": [], "forward": []}

    def test_days_param_validated(self, client_with_mock_db):
        client, _ = client_with_mock_db
        resp = client.get("/api/dollar/history?days=0")
        assert resp.status_code == 422  # FastAPI validation

    def test_days_max_validated(self, client_with_mock_db):
        client, _ = client_with_mock_db
        resp = client.get("/api/dollar/history?days=91")
        assert resp.status_code == 422
```

### Step 2: Run test to verify it fails

```bash
docker run --rm \
  -v /Users/cjd/TSE_Dashboard:/app \
  -e PYTHONPATH=/app \
  -w /app \
  -e DATABASE_URL="postgresql://user:pass@localhost/testdb" \
  -e JWT_SECRET_KEY="test-jwt-secret-key-for-testing" \
  -e REDIS_URL="redis://localhost:6379" \
  tse_dashboard-test pytest tests/unit/test_dollar_history.py -v \
  --override-ini="addopts=-v -ra --strict-markers --strict-config --no-cov" \
  --tb=short -q
```
Expected: FAIL — `404 Not Found` (endpoint doesn't exist yet)

### Step 3: Implement the endpoint

Add this block to `api/routes/market.py` immediately after `get_dollar_latest` (after line 589):

```python
@router.get("/dollar/history", tags=["market"])
@cached(module="market", endpoint="dollar-history", trading_ttl=60, off_hours_ttl=300, tags=["currency_rates"])
@handle_api_errors("dollar_history")
def get_dollar_history(
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
):
    """7-day hourly USD/IRR history for spot and forward rates.

    Buckets currency_rates into 1-hour intervals using date_trunc,
    returns ascending [{x: iso_timestamp, y: toman_price}] lists.
    """
    usd_sec = db.query(Security.security_id).filter(Security.symbol == "USD").first()
    if not usd_sec:
        return {"spot": [], "forward": []}
    usd_id = usd_sec[0]

    cutoff = _dt.datetime.now(_dt.timezone.utc) - _dt.timedelta(days=days)

    def _history(rate_type: str):
        bucket_col = func.date_trunc("hour", CurrencyRate.posted_at).label("bucket")
        rows = (
            db.query(bucket_col, func.max(CurrencyRate.price).label("max_price"))
            .filter(
                CurrencyRate.security_id == usd_id,
                CurrencyRate.rate_type == rate_type,
                CurrencyRate.posted_at >= cutoff,
            )
            .group_by(bucket_col)
            .order_by(bucket_col)
            .all()
        )
        return [{"x": r.bucket.isoformat(), "y": r.max_price} for r in rows]

    return {
        "spot":    _history("spot"),
        "forward": _history("forward"),
    }
```

**Important:** `func` and `CurrencyRate` are already imported at the top of `market.py`. `Query` is imported from `fastapi` — verify it's in the import block at the top:
```python
from fastapi import APIRouter, Depends, HTTPException, Query
```
If `Query` is missing, add it to that import line.

### Step 4: Run tests to verify they pass

```bash
docker run --rm \
  -v /Users/cjd/TSE_Dashboard:/app \
  -e PYTHONPATH=/app \
  -w /app \
  -e DATABASE_URL="postgresql://user:pass@localhost/testdb" \
  -e JWT_SECRET_KEY="test-jwt-secret-key-for-testing" \
  -e REDIS_URL="redis://localhost:6379" \
  tse_dashboard-test pytest tests/unit/test_dollar_history.py -v \
  --override-ini="addopts=-v -ra --strict-markers --strict-config --no-cov" \
  --tb=short -q
```
Expected: 4 PASSED

### Step 5: Commit

```bash
git add api/routes/market.py tests/unit/test_dollar_history.py
git commit -m "feat(api): add /api/dollar/history endpoint with hourly bucketing"
```

---

## Task 2: Backend — `/api/gold/history` endpoint

**Files:**
- Modify: `api/routes/market.py` (after `get_gold_latest`, after line 698)
- Test: `tests/unit/test_gold_history.py` (new file)

### Step 1: Write the failing test

Create `tests/unit/test_gold_history.py`:

```python
"""Unit tests for GET /api/gold/history."""
import datetime as _dt
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from api.main import app
from api.deps import get_db


@pytest.fixture
def client_with_mock_db():
    mock_db = MagicMock()
    app.dependency_overrides[get_db] = lambda: mock_db
    yield TestClient(app), mock_db
    app.dependency_overrides.clear()


class TestGoldHistory:
    def test_returns_list_of_xy_points(self, client_with_mock_db):
        client, mock_db = client_with_mock_db

        # Security lookup for GOLD_18K
        sec_mock = MagicMock()
        sec_mock.__getitem__ = lambda self, i: 99
        mock_db.query.return_value.filter.return_value.first.return_value = sec_mock

        rows = []
        for i in range(3):
            r = MagicMock()
            r.bucket = _dt.datetime(2026, 2, 18, i * 4, 0, 0,
                                    tzinfo=_dt.timezone.utc)
            r.max_price = 42_000_000 + i * 100_000
            rows.append(r)

        mock_db.query.return_value.filter.return_value \
            .group_by.return_value.order_by.return_value.all.return_value = rows

        resp = client.get("/api/gold/history?days=7")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 3
        assert data[0]["y"] == 42_000_000
        assert "x" in data[0]

    def test_returns_empty_when_no_gold_security(self, client_with_mock_db):
        client, mock_db = client_with_mock_db
        mock_db.query.return_value.filter.return_value.first.return_value = None
        resp = client.get("/api/gold/history?days=7")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_days_param_validated(self, client_with_mock_db):
        client, _ = client_with_mock_db
        assert client.get("/api/gold/history?days=0").status_code == 422
        assert client.get("/api/gold/history?days=91").status_code == 422
```

### Step 2: Run test to verify it fails

```bash
docker run --rm \
  -v /Users/cjd/TSE_Dashboard:/app \
  -e PYTHONPATH=/app -w /app \
  -e DATABASE_URL="postgresql://user:pass@localhost/testdb" \
  -e JWT_SECRET_KEY="test-jwt-secret-key-for-testing" \
  -e REDIS_URL="redis://localhost:6379" \
  tse_dashboard-test pytest tests/unit/test_gold_history.py -v \
  --override-ini="addopts=-v -ra --strict-markers --strict-config --no-cov" \
  --tb=short -q
```
Expected: FAIL — `404 Not Found`

### Step 3: Implement the endpoint

Add immediately after `get_gold_latest` (after line 698) in `api/routes/market.py`:

```python
@router.get("/gold/history", tags=["market"])
@cached(module="market", endpoint="gold-history", trading_ttl=60, off_hours_ttl=300, tags=["gold_prices"])
@handle_api_errors("gold_history")
def get_gold_history(
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
):
    """7-day hourly GOLD_18K price history in Iranian Toman.

    Buckets gold_prices into 1-hour intervals, returns ascending
    [{x: iso_timestamp, y: toman_price}] list.
    """
    gold_sec = (
        db.query(Security.security_id)
        .filter(Security.symbol == "GOLD_18K")
        .first()
    )
    if not gold_sec:
        return []
    gold_id = gold_sec[0]

    cutoff = _dt.datetime.now(_dt.timezone.utc) - _dt.timedelta(days=days)
    bucket_col = func.date_trunc("hour", GoldPrice.scraped_at).label("bucket")
    rows = (
        db.query(bucket_col, func.max(GoldPrice.price_irr).label("max_price"))
        .filter(
            GoldPrice.security_id == gold_id,
            GoldPrice.scraped_at >= cutoff,
            GoldPrice.price_irr.isnot(None),
        )
        .group_by(bucket_col)
        .order_by(bucket_col)
        .all()
    )
    return [{"x": r.bucket.isoformat(), "y": int(r.max_price)} for r in rows]
```

### Step 4: Run tests to verify they pass

```bash
docker run --rm \
  -v /Users/cjd/TSE_Dashboard:/app \
  -e PYTHONPATH=/app -w /app \
  -e DATABASE_URL="postgresql://user:pass@localhost/testdb" \
  -e JWT_SECRET_KEY="test-jwt-secret-key-for-testing" \
  -e REDIS_URL="redis://localhost:6379" \
  tse_dashboard-test pytest tests/unit/test_gold_history.py -v \
  --override-ini="addopts=-v -ra --strict-markers --strict-config --no-cov" \
  --tb=short -q
```
Expected: 3 PASSED

### Step 5: Commit

```bash
git add api/routes/market.py tests/unit/test_gold_history.py
git commit -m "feat(api): add /api/gold/history endpoint for GOLD_18K hourly history"
```

---

## Task 3: Frontend hooks — `useDollarHistory` + `useGoldHistory`

**Files:**
- Modify: `frontend/src/hooks/useMarketData.js` (append at end of file)

### Step 1: Append two hooks at the end of `useMarketData.js`

```js
export function useDollarHistory(days = 7, options = {}) {
  return useQuery({
    queryKey: ['dollar', 'history', days],
    queryFn: () => axios.get(`/api/dollar/history?days=${days}`).then(r => r.data),
    staleTime: 60_000,
    refetchInterval: 120_000,
    ...options,
  });
}

export function useGoldHistory(days = 7, options = {}) {
  return useQuery({
    queryKey: ['gold', 'history', days],
    queryFn: () => axios.get(`/api/gold/history?days=${days}`).then(r => r.data),
    staleTime: 60_000,
    refetchInterval: 120_000,
    ...options,
  });
}
```

### Step 2: Verify the build passes

```bash
cd /Users/cjd/TSE_Dashboard/frontend && npm run build 2>&1 | tail -5
```
Expected: `✓ built in X.XXs`

### Step 3: Commit

```bash
git add frontend/src/hooks/useMarketData.js
git commit -m "feat(hooks): add useDollarHistory and useGoldHistory TanStack Query hooks"
```

---

## Task 4: `useDashboardData.js` — add `useDashboardCurrency` sub-hook

**Files:**
- Modify: `frontend/src/hooks/useDashboardData.js`

### Step 1: Add import and new sub-hook

**Add to the import line at the top of the file** (line 3, modify existing import):

```js
// Before:
import { useMarketStats, useMarketOverview, useMarketIndexHistory } from './useMarketData';

// After:
import {
  useMarketStats, useMarketOverview, useMarketIndexHistory,
  useDollarHistory, useDollarRate, useGoldHistory, useGoldLatest,
} from './useMarketData';
```

**Add the new sub-hook** after `useDashboardFilters` (after line 248), before the `useDashboardData` composition wrapper:

```js
// ── Sub-hook 4: Currency & gold chart data ───────────────────────────────────
export function useDashboardCurrency() {
  const { data: dollarHistory, isLoading: dollarHistLoading } = useDollarHistory(7);
  const { data: dollarRate }  = useDollarRate({ staleTime: 15_000 });
  const { data: goldHistory,  isLoading: goldHistLoading }  = useGoldHistory(7);
  const { data: goldLatest }  = useGoldLatest({ staleTime: 15_000 });

  return {
    dollarSpotChartData:  dollarHistory?.spot    ?? [],
    dollarSpotTrend:      dollarRate?.spot?.change_pct    ?? 0,
    dollarSpotLoading:    dollarHistLoading,

    dollarFwdChartData:   dollarHistory?.forward ?? [],
    dollarFwdTrend:       dollarRate?.forward?.change_pct ?? 0,
    dollarFwdLoading:     dollarHistLoading,

    goldChartData:        goldHistory ?? [],
    goldTrend:            goldLatest?.GOLD_18K?.change_pct_1h ?? 0,
    goldLoading:          goldHistLoading,
  };
}
```

**Wire it into the composition wrapper** — update `useDashboardData` (starting at line 251):

```js
export default function useDashboardData() {
  const statsHook    = useDashboardStats();
  const chartsHook   = useDashboardCharts(
    statsHook.stats,
    statsHook.recentData,
    statsHook.sortedByChange,
    statsHook.tedpixHistory,
    statsHook.equalWeightTotalHistory,
    statsHook.equalWeightPriceHistory,
  );
  const filtersHook  = useDashboardFilters(
    statsHook.recentData, statsHook.advancers, statsHook.decliners,
  );
  const currencyHook = useDashboardCurrency();   // ← add this line

  return {
    ...statsHook,
    ...chartsHook,
    ...filtersHook,
    ...currencyHook,                             // ← add this line
  };
}
```

### Step 2: Verify the build passes

```bash
cd /Users/cjd/TSE_Dashboard/frontend && npm run build 2>&1 | tail -5
```
Expected: `✓ built in X.XXs`

### Step 3: Commit

```bash
git add frontend/src/hooks/useDashboardData.js
git commit -m "feat(hooks): add useDashboardCurrency sub-hook for dollar and gold chart data"
```

---

## Task 5: `Dashboard.jsx` — pass 9 new props

**Files:**
- Modify: `frontend/src/pages/Dashboard.jsx`

### Step 1: Add the 9 new props

Find the `<DashboardEqualWeightSection` JSX block (around line 111) and add the new props:

```jsx
<DashboardEqualWeightSection
  tedpixChartData={d.tedpixChartData}
  tedpixTrend={d.tedpixTrend}
  tedpixLoading={d.tedpixLoading}
  ewTotalChartData={d.ewTotalChartData}
  ewTotalTrend={d.ewTotalTrend}
  ewTotalLoading={d.ewTotalLoading}
  ewPriceChartData={d.ewPriceChartData}
  ewPriceTrend={d.ewPriceTrend}
  ewPriceLoading={d.ewPriceLoading}
  dollarSpotChartData={d.dollarSpotChartData}
  dollarSpotTrend={d.dollarSpotTrend}
  dollarSpotLoading={d.dollarSpotLoading}
  dollarFwdChartData={d.dollarFwdChartData}
  dollarFwdTrend={d.dollarFwdTrend}
  dollarFwdLoading={d.dollarFwdLoading}
  goldChartData={d.goldChartData}
  goldTrend={d.goldTrend}
  goldLoading={d.goldLoading}
/>
```

### Step 2: Verify the build passes

```bash
cd /Users/cjd/TSE_Dashboard/frontend && npm run build 2>&1 | tail -5
```
Expected: `✓ built in X.XXs`

### Step 3: Commit

```bash
git add frontend/src/pages/Dashboard.jsx
git commit -m "feat(dashboard): pass currency/gold chart props to DashboardEqualWeightSection"
```

---

## Task 6: `DashboardEqualWeightSection.jsx` — add second row

**Files:**
- Modify: `frontend/src/pages/dashboard/DashboardEqualWeightSection.jsx`

### Step 1: Add 9 new props to the component signature and render second row

The full updated `DashboardEqualWeightSection` default export (replace the existing one starting at line 116):

```jsx
export default function DashboardEqualWeightSection({
  // Existing props
  tedpixChartData = [],
  tedpixTrend = 0,
  tedpixLoading = false,
  ewTotalChartData = [],
  ewTotalTrend = 0,
  ewTotalLoading = false,
  ewPriceChartData = [],
  ewPriceTrend = 0,
  ewPriceLoading = false,
  // New currency/gold props
  dollarSpotChartData = [],
  dollarSpotTrend = 0,
  dollarSpotLoading = false,
  dollarFwdChartData = [],
  dollarFwdTrend = 0,
  dollarFwdLoading = false,
  goldChartData = [],
  goldTrend = 0,
  goldLoading = false,
}) {
  return (
    <>
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="md">
        <IndexMiniCard
          title="شاخص کل (TEDPIX)"
          trend={tedpixTrend}
          chartData={tedpixChartData}
          loading={tedpixLoading}
          fillColor={rallyColors.primary}
        />
        <IndexMiniCard
          title="شاخص کل (هم‌وزن)"
          trend={ewTotalTrend}
          chartData={ewTotalChartData}
          loading={ewTotalLoading}
          fillColor={rallyColors.green}
        />
        <IndexMiniCard
          title="شاخص قیمت (هم‌وزن)"
          trend={ewPriceTrend}
          chartData={ewPriceChartData}
          loading={ewPriceLoading}
          fillColor={rallyColors.purple}
        />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="md">
        <IndexMiniCard
          title="دلار (نقدی)"
          trend={dollarSpotTrend}
          chartData={dollarSpotChartData}
          loading={dollarSpotLoading}
          fillColor={rallyColors.primary}
        />
        <IndexMiniCard
          title="دلار (فردایی)"
          trend={dollarFwdTrend}
          chartData={dollarFwdChartData}
          loading={dollarFwdLoading}
          fillColor={rallyColors.blue}
        />
        <IndexMiniCard
          title="طلای ۱۸ عیار"
          trend={goldTrend}
          chartData={goldChartData}
          loading={goldLoading}
          fillColor={rallyColors.yellow}
        />
      </SimpleGrid>
    </>
  );
}
```

Note: The outer `<SimpleGrid>` is replaced with a React Fragment `<>` wrapping two grids. `IndexMiniCard` and all imports are unchanged.

### Step 2: Verify the build passes

```bash
cd /Users/cjd/TSE_Dashboard/frontend && npm run build 2>&1 | tail -5
```
Expected: `✓ built in X.XXs`

### Step 3: Commit

```bash
git add frontend/src/pages/dashboard/DashboardEqualWeightSection.jsx
git commit -m "feat(dashboard): add USD spot, USD forward, Gold 18K cards as second row"
```

---

## Task 7: Visual verification in browser

### Step 1: Start the dev server (if not already running)

```bash
cd /Users/cjd/TSE_Dashboard/frontend && npm run dev -- --open
```

### Step 2: Navigate to the dashboard

Open `http://localhost:<port>/dashboard` (port shown in terminal output).

**Checklist:**
- [ ] Row 1: TEDPIX, EW Total, EW Price cards visible with charts
- [ ] Row 2: دلار (نقدی), دلار (فردایی), طلای ۱۸ عیار cards visible
- [ ] Each card shows `RallyChartSkeleton` while loading, then an area chart (or "داده موجود نیست" if no data in DB)
- [ ] Delta pills are green/red depending on sign
- [ ] Hover lifts all 6 cards with spring animation
- [ ] All 6 cards share the same glassmorphic `glassBg` style

### Step 3: Final commit if any tweaks needed

```bash
git add -p  # stage only what changed
git commit -m "fix(dashboard): <describe tweak>"
```
