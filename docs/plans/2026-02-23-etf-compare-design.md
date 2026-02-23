# ETF Compare — All Metrics Screener & Comparison Panel

**Date**: 2026-02-23
**Status**: Approved

---

## Overview

Add a new page at `/dashboard/etf-nav/compare` that lets users:
1. View **all ETFs ranked** by any CFA-grade risk/performance metric (sortable screener)
2. **Select 2–5 ETFs** and expand an in-page comparison panel with 4 charts

No backend changes required. All metrics are computed client-side using the existing
`frontend/src/utils/riskMetrics/` library.

---

## User Requirements

- **Screener**: sortable table with Beta, Jensen's Alpha, Sortino, Sharpe, M², IR,
  Calmar, Omega, VaR 95%, CVaR 95%, MaxDD, Skewness, Kurtosis, Treynor, Annualised
  Return, Volatility, Bubble %
- **Period toggle**: 3M / 6M / 1Y / 3Y — metrics recompute on change
- **Benchmark selector**: TEDPIX (default) | Fara Bourse | فرابورس (user-selectable)
- **Load trigger**: "محاسبه متریک‌ها" button — fetches all histories in parallel then
  computes. Shows progress bar while loading.
- **Selection**: checkboxes per row, max 5; "مقایسه (N)" button appears when ≥2 selected
- **Comparison panel**: slides in below screener, no navigation required
- **Charts in comparison panel**: 4 tabs (normalized returns, radar, bubble history,
  rolling metrics)

---

## Route & File Structure

### New route (App.jsx)
```jsx
// Add BEFORE /dashboard/etf-nav/:symbol
<Route path="/dashboard/etf-nav/compare" element={<ETFComparePage />} />
```

### New files

| Path | Purpose |
|------|---------|
| `frontend/src/pages/etf/ETFComparePage.jsx` | Page shell — period toggle, benchmark select, orchestrates screener + panel |
| `frontend/src/pages/etf/ETFMetricsTable.jsx` | Sortable screener table with checkboxes and load trigger |
| `frontend/src/pages/etf/ETFComparePanel.jsx` | Expandable comparison panel with metric cards + 4-tab charts |
| `frontend/src/pages/etf/ETFRadarChart.jsx` | Recharts RadarChart wrapper (6 axes) |
| `frontend/src/hooks/useETFAllMetrics.js` | Fetches all ETF histories + benchmark, runs computeAllMetrics per ETF |

### Modified files

| Path | Change |
|------|--------|
| `frontend/src/App.jsx` | Add new route before `:symbol` catch-all |
| `frontend/src/pages/ETFNav.jsx` | Add "مقایسه ETFها" button in header linking to new route |

---

## Data Flow

```
ETFComparePage
  ├── useETFNav()                    → API: /api/market/etf-nav (snapshot list)
  └── useETFAllMetrics(etfs, period, benchmark)
        ├── useQueries([etfs])       → API: /api/market/etf-nav/{symbol}/history
        ├── useMarketIndexHistory()  → API: /api/market/indices/{bench}/history
        └── computeAllMetrics()     → client-side computation per ETF
              ↓
        { [symbol]: { sharpe, sortino, beta, alpha, ... } }
```

All data is cached by TanStack Query (staleTime: 5 min). Recomputation is triggered
only when period or benchmark changes.

---

## Metrics Screener Table (`ETFMetricsTable.jsx`)

### Columns

| Accessor | Title | Notes |
|----------|-------|-------|
| `symbol` | نماد | Link to /dashboard/etf-nav/:symbol |
| `name_fa` | نام | |
| `fund_type` | نوع صندوق | Filter chip |
| `bubble_pct` | حباب٪ | From snapshot, color-coded ± |
| `annualizedReturn` | بازده سالانه | % |
| `volatility` | نوسان | % annualised |
| `sharpe` | شارپ | |
| `sortino` | سورتینو | |
| `beta` | بتا | vs selected benchmark |
| `alpha` | آلفای جنسن | % annualised |
| `treynor` | ترینور | |
| `mSquared` | M² | % |
| `informationRatio` | IR | |
| `maxDrawdown` | حداکثر افت | % |
| `calmar` | کالمار | |
| `omega` | امگا | |
| `var95` | VaR ۹۵٪ | % |
| `cvar95` | CVaR ۹۵٪ | % |
| `skewness` | چولگی | |
| `kurtosis` | کشیدگی | Excess |

### UI controls
- Period toggle: `SegmentedControl` with `3M | 6M | 1Y | 3Y`
- Benchmark selector: `Select` with `شاخص کل (TEDPIX) | فرابورس`
- Load button: `Button` — "محاسبه متریک‌ها" with progress `Progress` bar below (shows
  X of N ETFs loaded)
- Checkbox column (left-pinned) for row selection
- When ≥2 selected: sticky "مقایسه (N)" `Button` in table header

---

## Comparison Panel (`ETFComparePanel.jsx`)

### Metric cards row
One `Card` per selected ETF showing: Sharpe, Sortino, Beta, Jensen α, MaxDD.
Best value in each metric highlighted.

### 4 Tabs

**Tab: بازده (Normalized Returns)**
- Recharts `LineChart`
- Series: one line per ETF, `close = nav_redemption`, normalized to 100 at period start
- Period matches screener period selector

**Tab: رادار (Radar Chart)**
- Recharts `RadarChart` / `PolarGrid`
- 6 axes (normalized 0–1 within the selected set):
  - Sharpe, Sortino, Jensen Alpha, Calmar, Hit Rate, (1 − MaxDD%)
- One `Radar` polygon per ETF, color-coded

**Tab: حباب (Bubble % History)**
- Recharts `LineChart`
- One line per ETF: `bubble_pct` over time
- `ReferenceLine` at y=0

**Tab: رولینگ (Rolling Metrics)**
- Toggle: `SegmentedControl` → Rolling Sharpe | Rolling Beta | Rolling Volatility
- 60-day rolling window computed via existing `rolling.js` utilities
- One `Line` per ETF

---

## Benchmarks Available

| Label | Index name for API |
|-------|--------------------|
| شاخص کل (TEDPIX) | `شاخص کل` |
| فرابورس | `فرابورس` |

Fetched via `useMarketIndexHistory(name, { days })`. History shape: `[{ date, close }]`.

---

## Performance Considerations

- Histories are fetched lazily (only when "محاسبه متریک‌ها" is clicked)
- `useQueries` with `enabled: metricsRequested` gate
- All computation in a `useMemo` after all queries settle
- Progress: `loadedCount / totalCount` derived from query statuses
- Column visibility toggle to hide less-important metrics on small screens

---

## CFA Coverage

| CFA Topic | Metric | Level |
|-----------|--------|-------|
| Portfolio risk | Volatility, MaxDD, VaR 95%, CVaR 95% | L1 |
| Return distributions | Skewness, Excess Kurtosis | L1 |
| Risk-adjusted performance | Sharpe, Sortino, Calmar, Omega | L1/L2 |
| CAPM / factor models | Beta, Jensen's Alpha, R² | L2 |
| Portfolio evaluation | Treynor, M², Information Ratio | L2 |
| Tail risk | CVaR, Cornish-Fisher VaR | L2 |
| Rolling analysis | Rolling beta/Sharpe/vol | L2 |
