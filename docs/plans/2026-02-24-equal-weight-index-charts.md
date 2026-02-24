# Equal-Weight Index Charts Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add side-by-side mini area charts for `شاخص کل (هم وزن)` and `شاخص قیمت (هم وزن)` below the existing TEDPIX section on the dashboard.

**Architecture:** Two new `useMarketIndexHistory` calls in `useDashboardStats` share the existing `indexRange` state. A new `DashboardEqualWeightSection.jsx` renders a 2-column `SimpleGrid` of `RallyMainCard`s with `RallyAreaChart`s. Wired into `Dashboard.jsx` immediately below `DashboardTedpixSection`. Backend gets two new name aliases for convenience.

**Tech Stack:** React 18, Mantine v7 (`SimpleGrid`, `RallyMainCard`, `RallyAreaChart`), TanStack Query (`useMarketIndexHistory`), rallyColors tokens.

---

## Reference: Key file locations

| File | Role |
|------|------|
| `frontend/src/hooks/useDashboardData.js` | Sub-hook data composition — add two new index history calls here |
| `frontend/src/hooks/useMarketData.js` | `useMarketIndexHistory(name, { days })` hook — already exists, no changes needed |
| `frontend/src/pages/dashboard/DashboardTedpixSection.jsx` | Existing TEDPIX card — no changes needed |
| `frontend/src/pages/dashboard/DashboardEqualWeightSection.jsx` | **NEW** — 2-col SimpleGrid with two mini charts |
| `frontend/src/pages/Dashboard.jsx` | Add import + render new section below TEDPIX |
| `api/routes/market.py` | `_INDEX_ALIASES` dict — add two new entries |
| `frontend/src/theme/rallyColors.js` | Color tokens: `rallyColors.green`, `rallyColors.purple` |
| `frontend/src/utils/formatUtils.js` | `formatTrillion(v)` — already used for y-axis in TEDPIX chart |

## Reference: Exact DB index names (verified via live API)

- Equal-weight total: `'شاخص کل (هم وزن)'`
- Equal-weight price: `'شاخص قیمت (هم وزن)'`

## Reference: Existing TEDPIX pattern to follow

In `useDashboardData.js`:
```js
// Stats sub-hook:
const { data: tedpixHistory = [], isLoading: tedpixLoading } =
  useMarketIndexHistory('TEDPIX', { days: Number(indexRange) });

// Charts sub-hook:
const tedpixChartData = useMemo(() => {
  if (!tedpixHistory || tedpixHistory.length === 0) return [];
  return tedpixHistory.map(d => ({ x: d.date?.slice(5) || '', y: d.close }));
}, [tedpixHistory]);
```

In `DashboardTedpixSection.jsx`:
```jsx
<RallyAreaChart
  data={tedpixChartData}
  fillColor={rallyColors.blue}
  height={185}
  zoomable
  yFormatter={(v) => formatTrillion(v)}
/>
```

---

## Task 1: Backend — add equal-weight aliases

**Files:**
- Modify: `api/routes/market.py` (the `_INDEX_ALIASES` dict, around line 321)

**Step 1: Add two aliases to `_INDEX_ALIASES`**

Find this dict:
```python
_INDEX_ALIASES = {
    "TEDPIX": "شاخص کل",
    "tedpix": "شاخص کل",
    "شاخص كل": "شاخص کل",  # Arabic ك → Persian ک
    "بازار اول": "شاخص بازار اول",
    "بازار دوم": "شاخص بازار دوم",
    "شاخص قیمت(وزنی-ارزشی)": "شاخص قیمت (وزنی-ارزشی)",
}
```

Add two entries:
```python
_INDEX_ALIASES = {
    "TEDPIX": "شاخص کل",
    "tedpix": "شاخص کل",
    "شاخص كل": "شاخص کل",  # Arabic ك → Persian ک
    "بازار اول": "شاخص بازار اول",
    "بازار دوم": "شاخص بازار دوم",
    "شاخص قیمت(وزنی-ارزشی)": "شاخص قیمت (وزنی-ارزشی)",
    "TEFIX": "شاخص کل (هم وزن)",
    "TEPIX_EW": "شاخص قیمت (هم وزن)",
}
```

**Step 2: Verify via curl**
```bash
curl -s "http://localhost:80/api/market/indices/TEFIX/history?days=5" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d), 'records')"
```
Expected output: `5 records`

**Step 3: Commit**
```bash
cd /Users/cjd/TSE_Dashboard && git add api/routes/market.py && git commit -m "feat(api): add TEFIX and TEPIX_EW aliases for equal-weight indices"
```

---

## Task 2: Hook — fetch equal-weight index data

**Files:**
- Modify: `frontend/src/hooks/useDashboardData.js`

### Step 1: Add two history fetches in `useDashboardStats`

Inside `useDashboardStats`, after the existing TEDPIX line:
```js
const { data: tedpixHistory = [], isLoading: tedpixLoading } = useMarketIndexHistory('TEDPIX', { days: Number(indexRange) });
```

Add:
```js
const { data: equalWeightTotalHistory = [], isLoading: ewTotalLoading } =
  useMarketIndexHistory('شاخص کل (هم وزن)', { days: Number(indexRange) });
const { data: equalWeightPriceHistory = [], isLoading: ewPriceLoading } =
  useMarketIndexHistory('شاخص قیمت (هم وزن)', { days: Number(indexRange) });
```

### Step 2: Compute trends in `useDashboardStats`

After the existing `tedpixTrend` useMemo, add two more:
```js
const ewTotalTrend = useMemo(() => {
  if (!equalWeightTotalHistory.length) return 0;
  const first = equalWeightTotalHistory[0]?.close;
  const last = equalWeightTotalHistory[equalWeightTotalHistory.length - 1]?.close;
  if (!first || !last) return 0;
  return ((last - first) / first * 100).toFixed(2);
}, [equalWeightTotalHistory]);

const ewPriceTrend = useMemo(() => {
  if (!equalWeightPriceHistory.length) return 0;
  const first = equalWeightPriceHistory[0]?.close;
  const last = equalWeightPriceHistory[equalWeightPriceHistory.length - 1]?.close;
  if (!first || !last) return 0;
  return ((last - first) / first * 100).toFixed(2);
}, [equalWeightPriceHistory]);
```

### Step 3: Expose from `useDashboardStats` return object

Add to the return object at the bottom of `useDashboardStats`:
```js
return {
  // ... existing fields ...
  equalWeightTotalHistory, ewTotalLoading, ewTotalTrend,
  equalWeightPriceHistory, ewPriceLoading, ewPriceTrend,
};
```

### Step 4: Derive chart data in `useDashboardCharts`

`useDashboardCharts` receives `(stats, recentData, sortedByChange, tedpixHistory)`. Update its signature to also receive the two new histories:

```js
export function useDashboardCharts(stats, recentData, sortedByChange, tedpixHistory, equalWeightTotalHistory, equalWeightPriceHistory) {
```

Inside the function, after the existing `tedpixChartData` useMemo, add:
```js
const ewTotalChartData = useMemo(() => {
  if (!equalWeightTotalHistory.length) return [];
  return equalWeightTotalHistory.map(d => ({ x: d.date?.slice(5) || '', y: d.close }));
}, [equalWeightTotalHistory]);

const ewPriceChartData = useMemo(() => {
  if (!equalWeightPriceHistory.length) return [];
  return equalWeightPriceHistory.map(d => ({ x: d.date?.slice(5) || '', y: d.close }));
}, [equalWeightPriceHistory]);
```

Add both to the return:
```js
return { kpiSparklines, volumeBySector, barData, pieData, totalSectorCount, tedpixChartData, ewTotalChartData, ewPriceChartData };
```

### Step 5: Update the composition wrapper

In `useDashboardData` (the default export at the bottom), update the `useDashboardCharts` call:
```js
const chartsHook = useDashboardCharts(
  statsHook.stats,
  statsHook.recentData,
  statsHook.sortedByChange,
  statsHook.tedpixHistory,
  statsHook.equalWeightTotalHistory,   // add
  statsHook.equalWeightPriceHistory,   // add
);
```

### Step 6: Commit
```bash
cd /Users/cjd/TSE_Dashboard && git add frontend/src/hooks/useDashboardData.js && git commit -m "feat(dashboard): fetch equal-weight index history and compute trends"
```

---

## Task 3: Create DashboardEqualWeightSection component

**Files:**
- Create: `frontend/src/pages/dashboard/DashboardEqualWeightSection.jsx`

**Step 1: Create the file with this exact content**

```jsx
import { Badge, Box, Group, SimpleGrid, Text } from '@mantine/core';
import RallyMainCard from '../../components/RallyMainCard';
import RallyChartSkeleton from '../../components/RallyChartSkeleton';
import RallyAreaChart from '../../components/charts/RallyAreaChart';
import rallyColors from '../../theme/rallyColors';
import { toPersianNum, formatTrillion } from '../../utils/formatUtils';

function EqualWeightCard({ title, trend, chartData, loading, fillColor }) {
  const trendNum = Number(trend);
  return (
    <RallyMainCard
      title={
        <Group gap="xs" wrap="wrap">
          <Text size="sm" fw={600}>{title}</Text>
          <Badge
            color={trendNum > 0 ? 'green' : 'red'}
            variant="light"
            size="sm"
          >
            {trendNum > 0 ? '+' : ''}{toPersianNum(trend)}%
          </Badge>
        </Group>
      }
      mb="md"
    >
      {loading ? (
        <RallyChartSkeleton height={130} />
      ) : chartData.length > 0 ? (
        <RallyAreaChart
          data={chartData}
          fillColor={fillColor}
          height={130}
          yFormatter={(v) => formatTrillion(v)}
        />
      ) : (
        <Box py="xl" ta="center">
          <Text c="dimmed" size="sm">داده موجود نیست</Text>
        </Box>
      )}
    </RallyMainCard>
  );
}

export default function DashboardEqualWeightSection({
  ewTotalChartData,
  ewTotalTrend,
  ewTotalLoading,
  ewPriceChartData,
  ewPriceTrend,
  ewPriceLoading,
}) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mb="md">
      <EqualWeightCard
        title="شاخص کل (هم‌وزن)"
        trend={ewTotalTrend}
        chartData={ewTotalChartData}
        loading={ewTotalLoading}
        fillColor={rallyColors.green}
      />
      <EqualWeightCard
        title="شاخص قیمت (هم‌وزن)"
        trend={ewPriceTrend}
        chartData={ewPriceChartData}
        loading={ewPriceLoading}
        fillColor={rallyColors.purple}
      />
    </SimpleGrid>
  );
}
```

**Step 2: Commit**
```bash
cd /Users/cjd/TSE_Dashboard && git add frontend/src/pages/dashboard/DashboardEqualWeightSection.jsx && git commit -m "feat(dashboard): add DashboardEqualWeightSection with side-by-side mini charts"
```

---

## Task 4: Wire into Dashboard.jsx

**Files:**
- Modify: `frontend/src/pages/Dashboard.jsx`

**Step 1: Add import**

After the existing `DashboardTedpixSection` import:
```js
import DashboardTedpixSection from './dashboard/DashboardTedpixSection';
import DashboardEqualWeightSection from './dashboard/DashboardEqualWeightSection';
```

**Step 2: Render below the TEDPIX motion.div**

Find the `DashboardTedpixSection` block (around line 110-120):
```jsx
<motion.div ref={tedpixRef} style={{ scrollMarginTop: 120 }} {...sectionReveal} transition={sectionTransition(0)}>
  <DashboardTedpixSection
    tedpixTrend={d.tedpixTrend}
    indexRange={d.indexRange}
    onIndexRangeChange={d.handleIndexRangeChange}
    expanded={d.sectionsExpanded.tedpix}
    onToggle={() => d.toggleSection('tedpix')}
    tedpixLoading={d.tedpixLoading}
    tedpixChartData={d.tedpixChartData}
  />
</motion.div>
```

Add the equal-weight section immediately after it (before the `<Suspense>` for charts):
```jsx
<motion.div ref={tedpixRef} style={{ scrollMarginTop: 120 }} {...sectionReveal} transition={sectionTransition(0)}>
  <DashboardTedpixSection
    tedpixTrend={d.tedpixTrend}
    indexRange={d.indexRange}
    onIndexRangeChange={d.handleIndexRangeChange}
    expanded={d.sectionsExpanded.tedpix}
    onToggle={() => d.toggleSection('tedpix')}
    tedpixLoading={d.tedpixLoading}
    tedpixChartData={d.tedpixChartData}
  />
  <DashboardEqualWeightSection
    ewTotalChartData={d.ewTotalChartData}
    ewTotalTrend={d.ewTotalTrend}
    ewTotalLoading={d.ewTotalLoading}
    ewPriceChartData={d.ewPriceChartData}
    ewPriceTrend={d.ewPriceTrend}
    ewPriceLoading={d.ewPriceLoading}
  />
</motion.div>
```

**Step 3: Commit**
```bash
cd /Users/cjd/TSE_Dashboard && git add frontend/src/pages/Dashboard.jsx && git commit -m "feat(dashboard): render equal-weight index charts below TEDPIX section"
```

---

## Completion Checklist

After all 4 tasks, verify in the browser at `http://localhost:5173/dashboard`:

- [ ] Below the TEDPIX trend chart, two mini cards appear side-by-side
- [ ] Left card: "شاخص کل (هم‌وزن)" with green area chart + trend badge
- [ ] Right card: "شاخص قیمت (هم‌وزن)" with purple area chart + trend badge
- [ ] Trend badge shows correct `+/-` percentage
- [ ] Changing the TEDPIX range selector (۱ ماه / ۳ ماه / ۶ ماه / ۱ سال) updates both mini charts too
- [ ] On mobile width (< 480px) the two cards stack vertically
- [ ] Loading skeletons appear briefly on first load
- [ ] No console errors
