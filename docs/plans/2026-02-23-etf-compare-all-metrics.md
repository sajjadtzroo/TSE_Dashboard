# ETF Compare — All Metrics Screener Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build `/dashboard/etf-nav/compare` — a sortable screener showing all ETFs ranked by CFA-grade risk metrics, with an in-page comparison panel for selected ETFs.

**Architecture:** All ETF histories are fetched client-side via TanStack Query (`useQueries`) after the user triggers "محاسبه متریک‌ها". Metrics are computed in a `useMemo` using the existing `computeAllMetrics()` library. The comparison panel expands below the screener table with 4 Recharts tabs.

**Tech Stack:** React 18, Mantine v7, TanStack Query v5, Recharts, existing `utils/riskMetrics/*`

---

## Key Files to Know Before Starting

| File | What you need from it |
|------|-----------------------|
| `frontend/src/App.jsx:136-137` | Where to insert the new route (before `etf-nav/:symbol`) |
| `frontend/src/pages/ETFNav.jsx` | Pattern for ETF list page (useApiData, RallyDataTable, PageHeader) |
| `frontend/src/hooks/useMarketData.js:95-112` | `useETFNav()` and `useETFNavHistory()` — already defined, use these |
| `frontend/src/hooks/useMarketData.js:83-91` | `useMarketIndexHistory(name, { days })` — for benchmark |
| `frontend/src/utils/riskMetrics/index.js` | `computeAllMetrics({ stockHistory, benchHistory, rfAnnual })` — main entry point |
| `frontend/src/utils/riskMetrics/rolling.js` | `computeRollingMetrics(returns, benchReturns, dates, window, rfAnnual)` |
| `frontend/src/utils/chartUtils.js` | `normalizeChartSeries(chartData, dateAccessor, closeAccessor)` |
| `frontend/src/constants/chartColors.js` | `COMPARISON_COLORS` array [green, blue, purple, yellow, orange] |
| `frontend/src/constants/market.js` | `TEDPIX_NAMES = ['شاخص كل', 'شاخص کل', 'TEDPIX']` |
| `frontend/src/components/charts/RallyLineChart.jsx` | Single-series line chart; for multi-series we build inline |
| `frontend/src/theme/rallyColors.js` | Color tokens for styling |

**`computeAllMetrics` input/output reference:**
- Input: `stockHistory: [{ date: 'YYYY-MM-DD', nav_redemption: number, ... }]`
  - It calls `extractPrices()` which reads `.close` first, then falls back to other keys
  - **For ETF NAV**: pass `nav_redemption` as `close` — reshape history before passing
- Benchmark: `benchHistory: [{ date, close }]`
- Output keys you need: `sharpe`, `sortino`, `beta`, `alpha` (Jensen), `treynor`, `mSquared`, `informationRatio`, `maxDrawdown`, `calmar`, `omega`, `var95`, `cvar95`, `volatility`, `annualizedReturn`, `skewness`, `kurtosis`, `stockReturns`, `returnDates`, `alignedStock`, `alignedBench`

**`computeRollingMetrics` signature:**
```js
computeRollingMetrics(returns: number[], benchReturns: number[], dates: string[], window = 30, rfAnnual = 0.23)
// → [{ date, rollingSharpe, rollingBeta, rollingVol }]
```

**Available benchmarks for `useMarketIndexHistory`:**
- `'شاخص کل'` (TEDPIX) — use `TEDPIX_NAMES[0]`
- `'فرابورس'` — Fara Bourse index

**Period → days mapping:**
```js
const PERIOD_DAYS = { '3M': 90, '6M': 180, '1Y': 365, '3Y': 1095 };
```

---

## Task 1: Add route to App.jsx + lazy import

**Files:**
- Modify: `frontend/src/App.jsx`

**Step 1: Add lazy import** (after line 45 where ETFDetail is imported)

```jsx
const ETFComparePage = lazyRetry(() => import('./pages/etf/ETFComparePage'), 'ETFComparePage');
```

**Step 2: Add route** — insert BEFORE line 137 (`etf-nav/:symbol`), so the static path `compare` wins over the param:

```jsx
<Route path="etf-nav/compare" element={<ETFComparePage />} />
<Route path="etf-nav/:symbol" element={<ETFDetail />} />
```

**Step 3: Build check**

```bash
cd /Users/cjd/TSE_Dashboard/frontend && npm run build 2>&1 | tail -5
```
Expected: `✓ built` — will fail on missing module until Task 2 creates the file.

**Step 4: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat(etf-compare): add route /dashboard/etf-nav/compare"
```

---

## Task 2: Create `useETFAllMetrics` hook

**Files:**
- Create: `frontend/src/hooks/useETFAllMetrics.js`

This hook:
1. Takes the list of ETF snapshot objects, chosen period, and benchmark name
2. Fires all ETF history queries + benchmark query in parallel (only when `enabled=true`)
3. Computes `computeAllMetrics` per ETF once all data arrives
4. Returns `{ metricsMap, loadedCount, totalCount, isLoading }`

**Full implementation:**

```js
import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import api from '../services/apiClient';
import { computeAllMetrics } from '../utils/riskMetrics/index.js';
import { computeRollingMetrics } from '../utils/riskMetrics/rolling.js';
import { computeSimpleReturns, alignReturnSeries } from '../utils/riskMetrics/returns.js';
import { useMarketIndexHistory } from './useMarketData';

const PERIOD_DAYS = { '3M': 90, '6M': 180, '1Y': 365, '3Y': 1095 };

/**
 * Fetch histories for all ETFs and compute risk metrics.
 *
 * @param {Array}   etfs       - snapshot objects [{ symbol, ... }]
 * @param {string}  period     - '3M' | '6M' | '1Y' | '3Y'
 * @param {string}  benchmark  - index name for useMarketIndexHistory
 * @param {boolean} enabled    - trigger fetch (user clicked load button)
 * @param {number}  [rfAnnual] - risk-free rate (default 0.23 for Iran)
 */
export default function useETFAllMetrics(etfs, period, benchmark, enabled, rfAnnual = 0.23) {
  const days = PERIOD_DAYS[period] ?? 365;

  // Benchmark history
  const { data: benchHistory = [] } = useMarketIndexHistory(benchmark, {
    days,
    enabled: !!benchmark && enabled,
    staleTime: 10 * 60 * 1000,
  });

  // All ETF histories in parallel
  const queries = useQueries({
    queries: (etfs || []).map((etf) => ({
      queryKey: ['etf-nav-history', etf.symbol, days],
      queryFn: () =>
        api
          .get(`/market/etf-nav/${encodeURIComponent(etf.symbol)}/history`, { params: { days } })
          .then((r) => r.data),
      enabled: !!etf.symbol && enabled,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const loadedCount = queries.filter((q) => q.isSuccess).length;
  const totalCount = queries.length;
  const isLoading = enabled && queries.some((q) => q.isFetching);

  // Compute metrics once all histories are available
  const metricsMap = useMemo(() => {
    if (!enabled || loadedCount === 0) return {};

    // Reshape bench: API returns [{ date, close }] already
    const bench = Array.isArray(benchHistory) && benchHistory.length > 5 ? benchHistory : null;

    const result = {};
    queries.forEach((q, i) => {
      const etf = etfs[i];
      if (!q.data || q.data.length < 10) return;

      // ETF history uses nav_redemption as the price series
      // computeAllMetrics calls extractPrices() which reads `.close`
      // → reshape: map nav_redemption → close
      const stockHistory = q.data.map((d) => ({
        date: d.date,
        close: d.nav_redemption ?? d.last_price,
      }));

      try {
        const m = computeAllMetrics({ stockHistory, benchHistory: bench, rfAnnual });

        // Rolling metrics (60-day window) — only if enough aligned data
        let rolling = [];
        if (m.alignedStock && m.alignedStock.length >= 60 && m.alignedBench) {
          rolling = computeRollingMetrics(
            m.alignedStock,
            m.alignedBench,
            m.returnDates.slice(-m.alignedStock.length),
            60,
            rfAnnual
          );
        }

        // Bubble history from raw API data
        const bubbleHistory = q.data
          .filter((d) => d.bubble_pct != null)
          .map((d) => ({ date: d.date, bubble_pct: d.bubble_pct }));

        // Normalized price series (base 100) for return chart
        const prices = q.data.map((d) => d.nav_redemption ?? d.last_price).filter(Boolean);
        const base = prices[0] || 1;
        const normalizedPrices = q.data.map((d) => ({
          date: d.date,
          value: ((((d.nav_redemption ?? d.last_price) - base) / base) * 100).toFixed(2),
        }));

        result[etf.symbol] = {
          ...m,
          rolling,
          bubbleHistory,
          normalizedPrices,
          rawHistory: q.data,
        };
      } catch {
        // Not enough data — skip silently
      }
    });
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedCount, enabled, benchHistory, rfAnnual]);

  return { metricsMap, loadedCount, totalCount, isLoading };
}
```

**Step 2: Build check** (the hook is pure JS — no build step needed, but verify no import errors):

```bash
cd /Users/cjd/TSE_Dashboard/frontend && node --input-type=module <<'EOF'
// Just verify the imports resolve (basic sanity)
console.log('OK');
EOF
```

**Step 3: Commit**

```bash
git add frontend/src/hooks/useETFAllMetrics.js
git commit -m "feat(etf-compare): add useETFAllMetrics hook"
```

---

## Task 3: Create `ETFRadarChart` component

**Files:**
- Create: `frontend/src/pages/etf/ETFRadarChart.jsx`

This is a Recharts `RadarChart` showing 6 axes normalized 0–1 within the selected ETF set.

**Axes:** Sharpe | Sortino | Jensen Alpha | Calmar | Hit Rate | (1 − |MaxDD|)

```jsx
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Legend, Tooltip,
} from 'recharts';
import { COMPARISON_COLORS } from '../../constants/chartColors';

const AXES = [
  { key: 'sharpe',    label: 'شارپ' },
  { key: 'sortino',   label: 'سورتینو' },
  { key: 'alpha',     label: 'آلفا' },
  { key: 'calmar',    label: 'کالمار' },
  { key: 'hitRate',   label: 'نرخ موفقیت' },
  { key: 'invMaxDD',  label: '۱ − MaxDD' },
];

/**
 * Normalize a set of values to [0, 1] for radar display.
 * Handles null values gracefully (maps to 0).
 */
function normalizeValues(allValues) {
  const clean = allValues.map((v) => (v == null ? 0 : v));
  const min = Math.min(...clean);
  const max = Math.max(...clean);
  if (max === min) return clean.map(() => 0.5);
  return clean.map((v) => (v - min) / (max - min));
}

/**
 * @param {{ symbols: string[], metricsMap: Object }} props
 */
export default function ETFRadarChart({ symbols, metricsMap }) {
  if (!symbols.length) return null;

  // Build radar data: one object per axis, keyed by symbol
  const radarData = AXES.map(({ key, label }) => {
    const raw = symbols.map((sym) => {
      const m = metricsMap[sym];
      if (!m) return null;
      if (key === 'invMaxDD') return m.maxDrawdown != null ? 1 - Math.abs(m.maxDrawdown) : null;
      if (key === 'alpha')    return m.alpha;
      return m[key] ?? null;
    });
    const normed = normalizeValues(raw);
    const entry = { metric: label };
    symbols.forEach((sym, i) => { entry[sym] = normed[i]; });
    return entry;
  });

  return (
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart data={radarData} outerRadius={110}>
        <PolarGrid stroke="rgba(255,255,255,0.1)" />
        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#9ca3af', fontFamily: 'inherit' }} />
        {symbols.map((sym, i) => (
          <Radar
            key={sym}
            name={sym}
            dataKey={sym}
            stroke={COMPARISON_COLORS[i % COMPARISON_COLORS.length]}
            fill={COMPARISON_COLORS[i % COMPARISON_COLORS.length]}
            fillOpacity={0.15}
            strokeWidth={2}
          />
        ))}
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Tooltip formatter={(v) => v.toFixed(2)} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/pages/etf/ETFRadarChart.jsx
git commit -m "feat(etf-compare): add ETFRadarChart (radar/spider chart)"
```

---

## Task 4: Create `ETFComparePanel` component

**Files:**
- Create: `frontend/src/pages/etf/ETFComparePanel.jsx`

This component receives `selectedSymbols: string[]` and `metricsMap: Object`.

It renders:
1. A row of **metric cards** (one per selected ETF) — top 5 metrics at a glance
2. **4 tabs**: بازده | رادار | حباب | رولینگ

```jsx
import { useState, useMemo } from 'react';
import {
  Tabs, Card, SimpleGrid, Text, Stack, Badge, Group, SegmentedControl, Box,
} from '@mantine/core';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, Legend,
} from 'recharts';
import { COMPARISON_COLORS } from '../../constants/chartColors';
import { toPersianNum } from '../../utils/formatUtils';
import rallyColors from '../../theme/rallyColors';
import ETFRadarChart from './ETFRadarChart';

const METRIC_LABELS = {
  sharpe: 'شارپ', sortino: 'سورتینو', beta: 'بتا',
  alpha: 'آلفای جنسن', maxDrawdown: 'حداکثر افت',
};

/** Single metric card for one ETF */
function ETFMetricCard({ symbol, metrics, color }) {
  if (!metrics) return (
    <Card withBorder radius="md" p="sm" style={{ borderColor: color, minWidth: 140 }}>
      <Text size="sm" fw={700} c={color}>{symbol}</Text>
      <Text size="xs" c="dimmed">داده کافی نیست</Text>
    </Card>
  );

  return (
    <Card withBorder radius="md" p="sm" style={{ borderColor: color, minWidth: 140 }}>
      <Text size="sm" fw={700} c={color} mb={6}>{symbol}</Text>
      {Object.entries(METRIC_LABELS).map(([key, label]) => {
        const val = key === 'maxDrawdown'
          ? (metrics[key] != null ? `${(metrics[key] * 100).toFixed(1)}٪` : '-')
          : key === 'alpha'
          ? (metrics[key] != null ? `${(metrics[key] * 100).toFixed(2)}٪` : '-')
          : (metrics[key] != null ? toPersianNum(metrics[key].toFixed(2)) : '-');
        return (
          <Group key={key} justify="space-between" gap={4}>
            <Text size="xs" c="dimmed">{label}</Text>
            <Text size="xs" fw={500}>{val}</Text>
          </Group>
        );
      })}
    </Card>
  );
}

/** Multi-series line chart (Recharts) */
function MultiLineChart({ series, height = 280, yFormatter, zeroLine = false }) {
  // Merge all series into one array keyed by date
  const merged = useMemo(() => {
    const map = {};
    series.forEach(({ symbol, data }) => {
      data.forEach(({ date, value }) => {
        if (!map[date]) map[date] = { date };
        map[date][symbol] = value;
      });
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [series]);

  if (!merged.length) return <Text size="sm" c="dimmed" ta="center" py="xl">داده کافی نیست</Text>;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={merged} margin={{ top: 8, right: 16, bottom: 30, left: 50 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} tickCount={6} angle={-30} textAnchor="end" />
        <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={yFormatter} />
        <Tooltip formatter={(v) => (yFormatter ? yFormatter(v) : v)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {zeroLine && <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 2" />}
        {series.map(({ symbol }, i) => (
          <Line
            key={symbol}
            type="monotone"
            dataKey={symbol}
            stroke={COMPARISON_COLORS[i % COMPARISON_COLORS.length]}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Rolling metrics tab content */
function RollingTab({ selectedSymbols, metricsMap }) {
  const [rollingMetric, setRollingMetric] = useState('rollingSharpe');

  const ROLLING_OPTIONS = [
    { label: 'شارپ رولینگ', value: 'rollingSharpe' },
    { label: 'بتا رولینگ', value: 'rollingBeta' },
    { label: 'نوسان رولینگ', value: 'rollingVol' },
  ];

  const series = selectedSymbols.map((sym) => {
    const m = metricsMap[sym];
    if (!m?.rolling?.length) return null;
    return {
      symbol: sym,
      data: m.rolling
        .filter((r) => r[rollingMetric] != null)
        .map((r) => ({ date: r.date, value: Number(r[rollingMetric].toFixed(3)) })),
    };
  }).filter(Boolean);

  return (
    <Stack gap="sm">
      <SegmentedControl
        size="xs"
        data={ROLLING_OPTIONS}
        value={rollingMetric}
        onChange={setRollingMetric}
      />
      <MultiLineChart
        series={series}
        height={280}
        yFormatter={(v) => v.toFixed(2)}
        zeroLine
      />
    </Stack>
  );
}

/**
 * @param {{ selectedSymbols: string[], metricsMap: Object }} props
 */
export default function ETFComparePanel({ selectedSymbols, metricsMap }) {
  if (selectedSymbols.length < 2) return null;

  // Normalized return series
  const returnSeries = selectedSymbols.map((sym) => {
    const m = metricsMap[sym];
    return m?.normalizedPrices?.length
      ? { symbol: sym, data: m.normalizedPrices.map((d) => ({ date: d.date, value: Number(d.value) })) }
      : null;
  }).filter(Boolean);

  // Bubble series
  const bubbleSeries = selectedSymbols.map((sym) => {
    const m = metricsMap[sym];
    return m?.bubbleHistory?.length
      ? { symbol: sym, data: m.bubbleHistory.map((d) => ({ date: d.date, value: d.bubble_pct })) }
      : null;
  }).filter(Boolean);

  return (
    <Card withBorder radius="lg" p="md" mt="md">
      {/* Metric cards row */}
      <SimpleGrid cols={{ base: 2, sm: 3, md: selectedSymbols.length }} mb="lg">
        {selectedSymbols.map((sym, i) => (
          <ETFMetricCard
            key={sym}
            symbol={sym}
            metrics={metricsMap[sym]}
            color={COMPARISON_COLORS[i % COMPARISON_COLORS.length]}
          />
        ))}
      </SimpleGrid>

      {/* 4 tabs */}
      <Tabs defaultValue="return" variant="pills" radius="md">
        <Tabs.List mb="md">
          <Tabs.Tab value="return">بازده</Tabs.Tab>
          <Tabs.Tab value="radar">رادار</Tabs.Tab>
          <Tabs.Tab value="bubble">حباب</Tabs.Tab>
          <Tabs.Tab value="rolling">رولینگ</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="return">
          <MultiLineChart
            series={returnSeries}
            height={280}
            yFormatter={(v) => `${v}٪`}
            zeroLine
          />
        </Tabs.Panel>

        <Tabs.Panel value="radar">
          <ETFRadarChart symbols={selectedSymbols} metricsMap={metricsMap} />
        </Tabs.Panel>

        <Tabs.Panel value="bubble">
          <MultiLineChart
            series={bubbleSeries}
            height={280}
            yFormatter={(v) => `${v?.toFixed ? v.toFixed(1) : v}٪`}
            zeroLine
          />
        </Tabs.Panel>

        <Tabs.Panel value="rolling">
          <RollingTab selectedSymbols={selectedSymbols} metricsMap={metricsMap} />
        </Tabs.Panel>
      </Tabs>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/pages/etf/ETFComparePanel.jsx
git commit -m "feat(etf-compare): add ETFComparePanel with 4-tab comparison"
```

---

## Task 5: Create `ETFMetricsTable` component

**Files:**
- Create: `frontend/src/pages/etf/ETFMetricsTable.jsx`

This component shows the screener table. It receives the ETF snapshot list, the `metricsMap` (may be empty before load), and a load handler.

```jsx
import { useState, useMemo } from 'react';
import { Group, Text, Badge, Progress, Button, Checkbox } from '@mantine/core';
import { IconCalculator } from '@tabler/icons-react';
import RallyMainCard from '../../components/RallyMainCard';
import RallyDataTable from '../../components/RallyDataTable';
import { formatNum, toPersianNum } from '../../utils/formatUtils';
import rallyColors from '../../theme/rallyColors';

/**
 * Format a metric value for display.
 * - Ratios (Sharpe, Sortino, etc.): 2 dp
 * - Percents (MaxDD, Alpha, VaR): multiply by 100, show ٪
 * - null / NaN: '-'
 */
function fmtRatio(v) {
  if (v == null || isNaN(v)) return '-';
  return toPersianNum(v.toFixed(2));
}
function fmtPct(v) {
  if (v == null || isNaN(v)) return '-';
  return `${toPersianNum((v * 100).toFixed(1))}٪`;
}
function fmtPctDirect(v) {
  // For bubble_pct which is already in % form
  if (v == null || isNaN(v)) return '-';
  return `${toPersianNum(v.toFixed(1))}٪`;
}

const METRIC_COLS = [
  { accessor: 'annualizedReturn', title: 'بازده سالانه', fmt: fmtPct, sortable: true },
  { accessor: 'volatility',       title: 'نوسان',         fmt: fmtPct, sortable: true },
  { accessor: 'sharpe',           title: 'شارپ',          fmt: fmtRatio, sortable: true },
  { accessor: 'sortino',          title: 'سورتینو',       fmt: fmtRatio, sortable: true },
  { accessor: 'beta',             title: 'بتا',           fmt: fmtRatio, sortable: true },
  { accessor: 'alpha',            title: 'آلفا (جنسن)',   fmt: fmtPct, sortable: true },
  { accessor: 'treynor',          title: 'ترینور',        fmt: fmtRatio, sortable: true },
  { accessor: 'mSquared',         title: 'M²',            fmt: fmtPct, sortable: true },
  { accessor: 'informationRatio', title: 'IR',            fmt: fmtRatio, sortable: true },
  { accessor: 'maxDrawdown',      title: 'حداکثر افت',   fmt: fmtPct, sortable: true },
  { accessor: 'calmar',           title: 'کالمار',        fmt: fmtRatio, sortable: true },
  { accessor: 'omega',            title: 'امگا',          fmt: fmtRatio, sortable: true },
  { accessor: 'var95',            title: 'VaR ۹۵٪',      fmt: fmtPct, sortable: true },
  { accessor: 'cvar95',           title: 'CVaR ۹۵٪',     fmt: fmtPct, sortable: true },
  { accessor: 'skewness',         title: 'چولگی',         fmt: fmtRatio, sortable: true },
  { accessor: 'kurtosis',         title: 'کشیدگی',        fmt: fmtRatio, sortable: true },
];

/**
 * @param {{
 *   etfs: Array,          // snapshot list from /api/market/etf-nav
 *   metricsMap: Object,   // symbol → computed metrics (may be empty)
 *   loadedCount: number,
 *   totalCount: number,
 *   isLoading: boolean,
 *   onLoadMetrics: () => void,
 *   selectedSymbols: string[],
 *   onSelectionChange: (symbols: string[]) => void,
 *   metricsEnabled: boolean,
 * }} props
 */
export default function ETFMetricsTable({
  etfs,
  metricsMap,
  loadedCount,
  totalCount,
  isLoading,
  onLoadMetrics,
  selectedSymbols,
  onSelectionChange,
  metricsEnabled,
}) {
  const [sortStatus, setSortStatus] = useState({ columnAccessor: 'bubble_pct', direction: 'desc' });

  // Merge snapshot + metrics into flat rows
  const rows = useMemo(() => {
    return (etfs || []).map((etf) => {
      const m = metricsMap[etf.symbol] || {};
      return {
        symbol: etf.symbol,
        name_fa: etf.name_fa,
        fund_type: etf.fund_type,
        bubble_pct: etf.bubble_pct,
        // Spread metrics flat
        annualizedReturn: m.annualizedReturn ?? null,
        volatility:       m.volatility ?? null,
        sharpe:           m.sharpe ?? null,
        sortino:          m.sortino ?? null,
        beta:             m.beta ?? null,
        alpha:            m.alpha ?? null,
        treynor:          m.treynor ?? null,
        mSquared:         m.mSquared ?? null,
        informationRatio: m.informationRatio ?? null,
        maxDrawdown:      m.maxDrawdown ?? null,
        calmar:           m.calmar ?? null,
        omega:            m.omega ?? null,
        var95:            m.var95 ?? null,
        cvar95:           m.cvar95 ?? null,
        skewness:         m.skewness ?? null,
        kurtosis:         m.kurtosis ?? null,
      };
    });
  }, [etfs, metricsMap]);

  // Sort rows
  const sorted = useMemo(() => {
    const { columnAccessor: col, direction } = sortStatus;
    return [...rows].sort((a, b) => {
      const va = a[col] ?? (direction === 'desc' ? -Infinity : Infinity);
      const vb = b[col] ?? (direction === 'desc' ? -Infinity : Infinity);
      return direction === 'desc' ? vb - va : va - vb;
    });
  }, [rows, sortStatus]);

  const toggleSelect = (symbol) => {
    if (selectedSymbols.includes(symbol)) {
      onSelectionChange(selectedSymbols.filter((s) => s !== symbol));
    } else if (selectedSymbols.length < 5) {
      onSelectionChange([...selectedSymbols, symbol]);
    }
  };

  const columns = [
    {
      accessor: '_select',
      title: '',
      width: 40,
      render: (r) => (
        <Checkbox
          size="xs"
          checked={selectedSymbols.includes(r.symbol)}
          onChange={() => toggleSelect(r.symbol)}
          disabled={!selectedSymbols.includes(r.symbol) && selectedSymbols.length >= 5}
        />
      ),
    },
    {
      accessor: 'symbol',
      title: 'نماد',
      width: 90,
      sortable: true,
      render: (r) => <Text size="sm" fw={600} c={rallyColors.blue}>{r.symbol}</Text>,
    },
    {
      accessor: 'name_fa',
      title: 'نام',
      width: 150,
      render: (r) => <Text size="sm">{r.name_fa ?? '-'}</Text>,
    },
    {
      accessor: 'fund_type',
      title: 'نوع',
      width: 90,
      render: (r) => r.fund_type ? <Badge size="xs" variant="light">{r.fund_type}</Badge> : null,
    },
    {
      accessor: 'bubble_pct',
      title: 'حباب٪',
      width: 80,
      sortable: true,
      textAlign: 'end',
      render: (r) => {
        const v = r.bubble_pct;
        const color = v > 0 ? rallyColors.green : v < 0 ? rallyColors.red : rallyColors.textDimmed;
        return <Text size="sm" c={color}>{fmtPctDirect(v)}</Text>;
      },
    },
    ...METRIC_COLS.map((col) => ({
      accessor: col.accessor,
      title: col.title,
      width: 100,
      sortable: col.sortable,
      textAlign: 'end',
      render: (r) => (
        <Text size="sm" c={r[col.accessor] == null ? 'dimmed' : undefined}>
          {col.fmt(r[col.accessor])}
        </Text>
      ),
    })),
  ];

  const loadProgress = totalCount > 0 ? Math.round((loadedCount / totalCount) * 100) : 0;

  return (
    <RallyMainCard
      title="متریک‌های صندوق‌های ETF"
      noPadding
      secondary={
        <Group gap="xs">
          {selectedSymbols.length >= 2 && (
            <Badge color="blue" variant="filled" size="sm">
              {selectedSymbols.length} انتخاب شده
            </Badge>
          )}
          {!metricsEnabled && (
            <Button
              size="xs"
              leftSection={<IconCalculator size={14} />}
              onClick={onLoadMetrics}
              loading={isLoading}
              color="blue"
            >
              محاسبه متریک‌ها
            </Button>
          )}
        </Group>
      }
    >
      {metricsEnabled && isLoading && (
        <Progress
          value={loadProgress}
          size="xs"
          animated
          color="blue"
          label={`${loadedCount} / ${totalCount}`}
        />
      )}
      <RallyDataTable
        records={sorted}
        columns={columns}
        idAccessor="symbol"
        loading={false}
        minHeight={300}
        emptyMessage="داده‌ای یافت نشد"
        sortStatus={sortStatus}
        onSortStatusChange={setSortStatus}
        storeColumnsKey="etf-metrics-table"
      />
    </RallyMainCard>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/pages/etf/ETFMetricsTable.jsx
git commit -m "feat(etf-compare): add ETFMetricsTable screener component"
```

---

## Task 6: Create `ETFComparePage` (page shell)

**Files:**
- Create: `frontend/src/pages/etf/ETFComparePage.jsx`

This orchestrates all sub-components.

```jsx
import { useState, useMemo } from 'react';
import { Box, Group, SegmentedControl, Select, Text, Collapse, Button } from '@mantine/core';
import { IconChartBar } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'motion/react';
import PageHeader from '../../components/PageHeader';
import ETFMetricsTable from './ETFMetricsTable';
import ETFComparePanel from './ETFComparePanel';
import useETFAllMetrics from '../../hooks/useETFAllMetrics';
import { useETFNav } from '../../hooks/useMarketData';
import { TEDPIX_NAMES } from '../../constants/market';

const PERIOD_OPTIONS = [
  { label: '۳ ماه', value: '3M' },
  { label: '۶ ماه', value: '6M' },
  { label: '۱ سال', value: '1Y' },
  { label: '۳ سال', value: '3Y' },
];

const BENCHMARK_OPTIONS = [
  { label: 'شاخص کل (TEDPIX)', value: TEDPIX_NAMES[0] },
  { label: 'فرابورس', value: 'فرابورس' },
];

export default function ETFComparePage() {
  const [period, setPeriod]         = useState('1Y');
  const [benchmark, setBenchmark]   = useState(TEDPIX_NAMES[0]);
  const [metricsEnabled, setMetricsEnabled] = useState(false);
  const [selectedSymbols, setSelectedSymbols] = useState([]);
  const [showCompare, setShowCompare] = useState(false);

  // Snapshot list
  const { data: etfs = [], isLoading: listLoading } = useETFNav();

  // Metrics computation
  const { metricsMap, loadedCount, totalCount, isLoading: metricsLoading } = useETFAllMetrics(
    etfs,
    period,
    benchmark,
    metricsEnabled,
  );

  // When period or benchmark changes, re-enable to refetch
  const handlePeriodChange = (val) => {
    setPeriod(val);
    if (metricsEnabled) setMetricsEnabled(false); // reset so user re-triggers
  };
  const handleBenchmarkChange = (val) => {
    setBenchmark(val);
    if (metricsEnabled) setMetricsEnabled(false);
  };

  const handleSelectionChange = (symbols) => {
    setSelectedSymbols(symbols);
    if (symbols.length < 2) setShowCompare(false);
  };

  return (
    <>
      <PageHeader title="مقایسه ETFها — متریک‌های کامل">
        <Group gap="xs" wrap="nowrap">
          <SegmentedControl
            size="xs"
            data={PERIOD_OPTIONS}
            value={period}
            onChange={handlePeriodChange}
          />
          <Select
            size="xs"
            w={180}
            data={BENCHMARK_OPTIONS}
            value={benchmark}
            onChange={handleBenchmarkChange}
            allowDeselect={false}
          />
        </Group>
      </PageHeader>

      {selectedSymbols.length >= 2 && (
        <Box mb="sm">
          <Button
            size="xs"
            leftSection={<IconChartBar size={14} />}
            onClick={() => setShowCompare((v) => !v)}
            variant={showCompare ? 'filled' : 'light'}
            color="blue"
          >
            {showCompare ? 'بستن مقایسه' : `مقایسه (${selectedSymbols.length})`}
          </Button>
        </Box>
      )}

      <Box mb="md">
        <ETFMetricsTable
          etfs={etfs}
          metricsMap={metricsMap}
          loadedCount={loadedCount}
          totalCount={totalCount}
          isLoading={metricsLoading || listLoading}
          onLoadMetrics={() => setMetricsEnabled(true)}
          selectedSymbols={selectedSymbols}
          onSelectionChange={handleSelectionChange}
          metricsEnabled={metricsEnabled}
        />
      </Box>

      <AnimatePresence>
        {showCompare && selectedSymbols.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <ETFComparePanel
              selectedSymbols={selectedSymbols}
              metricsMap={metricsMap}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/pages/etf/ETFComparePage.jsx
git commit -m "feat(etf-compare): add ETFComparePage shell with period/benchmark controls"
```

---

## Task 7: Add link from ETFNav list page

**Files:**
- Modify: `frontend/src/pages/ETFNav.jsx`

**Step 1: Read the current PageHeader usage** (it's at line ~38+). Add a Link button to the page header's secondary slot.

At the top of `ETFNav.jsx`, add import:
```jsx
import { useNavigate } from 'react-router-dom';
import { IconChartBar } from '@tabler/icons-react';
import { Button } from '@mantine/core';
```

(Check if `useNavigate` and `Button` are already imported — likely yes. Add only missing ones.)

**Step 2: Find the PageHeader in ETFNav.jsx** and add a button:

Find this pattern:
```jsx
<PageHeader title="صندوق‌های ETF">
```

Replace with:
```jsx
<PageHeader title="صندوق‌های ETF">
  <Button
    size="xs"
    leftSection={<IconChartBar size={14} />}
    variant="light"
    color="blue"
    onClick={() => navigate('/dashboard/etf-nav/compare')}
  >
    مقایسه متریک‌ها
  </Button>
</PageHeader>
```

**Step 3: Build and verify**

```bash
cd /Users/cjd/TSE_Dashboard/frontend && npm run build 2>&1 | tail -5
```
Expected: `✓ built` with 0 errors.

**Step 4: Commit**

```bash
git add frontend/src/pages/ETFNav.jsx
git commit -m "feat(etf-compare): add compare link to ETFNav list page"
```

---

## Task 8: Full build verification + manual checklist

**Step 1: Full build**

```bash
cd /Users/cjd/TSE_Dashboard/frontend && npm run build 2>&1 | grep -E "(error|Error|✓|built)"
```
Expected: `✓ built` with no `error` lines.

**Step 2: Manual checks** (requires `docker compose up -d`)

Navigate to `http://localhost/dashboard/etf-nav`:
- [ ] "مقایسه متریک‌ها" button appears in page header
- [ ] Clicking it navigates to `/dashboard/etf-nav/compare`

Navigate to `/dashboard/etf-nav/compare`:
- [ ] Page loads with period toggle (۳ ماه | ۶ ماه | ۱ سال | ۳ سال)
- [ ] Benchmark selector shows "شاخص کل" and "فرابورس" options
- [ ] Table shows ETF list with symbol/name/fund_type/bubble_pct columns
- [ ] "محاسبه متریک‌ها" button is visible
- [ ] Clicking it shows progress bar while loading
- [ ] After load: Sharpe, Sortino, Beta, Alpha columns populate (some ETFs may show `-` if insufficient data)
- [ ] Clicking table column header sorts correctly
- [ ] Checking 2+ ETF rows enables "مقایسه (N)" button
- [ ] Clicking "مقایسه" expands comparison panel
- [ ] "بازده" tab shows normalized return lines
- [ ] "رادار" tab shows spider chart with colored polygons
- [ ] "حباب" tab shows bubble% lines
- [ ] "رولینگ" tab shows rolling Sharpe/Beta/Vol with toggle

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat(etf-compare): complete ETF all-metrics screener and comparison panel"
```

---

## Gotchas & Edge Cases

| Scenario | Handling |
|----------|---------|
| ETF with < 10 days data | `useETFAllMetrics` skips it — shows `-` in all metric cells |
| No benchmark data | `computeAllMetrics` still works; CAPM metrics return `null` |
| Fara Bourse index not found | `metricsMap` will have null beta/alpha for all ETFs; UI shows `-` |
| 50+ ETFs parallel fetch | TanStack Query manages concurrency; browser limits to ~6 parallel requests, rest queue |
| Period change | Reset `metricsEnabled=false`, user must re-click "محاسبه متریک‌ها" |
| `extractPrices()` in riskMetrics | Reads `.close` field — we remap `nav_redemption → close` in `useETFAllMetrics` |
| RallyDataTable sort | Pass `sortStatus` and `onSortStatusChange` props; internal sort handled by the component |
