# Technical Analysis Scale Controls Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an autoscale (reset-fit) button and a logarithmic y-axis toggle to the klinecharts candlestick chart in the technical analysis page.

**Architecture:** All changes are confined to `RallyCandlestickChart.jsx`. A custom `logYAxis` is registered once at module scope via klinecharts `registerYAxis`. A `useEffect` syncs the `isLogScale` boolean state to `chart.setPaneOptions`. The autoscale button is a one-shot action calling `chart.scrollToRealTime()`.

**Tech Stack:** React 18, klinecharts v9 (`registerYAxis`, `setPaneOptions`, `scrollToRealTime`), Mantine v7 (`ActionIcon`), `@tabler/icons-react`

---

### Task 1: Register the log y-axis at module scope

**Files:**
- Modify: `frontend/src/components/charts/RallyCandlestickChart.jsx:1-5`

**Context:** klinecharts v9 exports a `registerYAxis(name, config)` function. It must be called once before any chart is initialised. The config uses value-transform functions to map real prices → log space for positioning, while keeping tick labels as plain prices.

**Step 1: Add the import and registration**

In `RallyCandlestickChart.jsx`, change the klinecharts import line from:

```js
import { init, dispose } from 'klinecharts';
```

to:

```js
import { init, dispose, registerYAxis } from 'klinecharts';
```

Then add the following block **immediately after all imports** (outside any component, at module scope):

```js
registerYAxis('logYAxis', {
  realValueToDisplayValue: (v) => Math.log10(Math.max(v, 1e-10)),
  displayValueToRealValue: (v) => Math.pow(10, v),
  valueToRealValue:        (v) => v,
  realValueToValue:        (v) => v,
  displayValueToText:      (v, precision) => Math.pow(10, v).toFixed(precision),
});
```

**Step 2: Verify no console errors**

Start the dev server (`cd frontend && npm run dev`) and open `/dashboard/technical-analysis`. Open the browser console. There should be no errors about `registerYAxis`. The chart should still render normally.

**Step 3: Commit**

```bash
git add frontend/src/components/charts/RallyCandlestickChart.jsx
git commit -m "feat(charts): register logYAxis for technical analysis"
```

---

### Task 2: Add `isLogScale` state and the sync effect

**Files:**
- Modify: `frontend/src/components/charts/RallyCandlestickChart.jsx`

**Context:** We need a boolean state for the log scale toggle and a `useEffect` that calls `setPaneOptions` whenever the state changes or the chart reinitialises. The effect must guard against `chartRef.current` being null.

**Step 1: Add the state**

Inside the `RallyCandlestickChart` component, after the existing `const [candleType, setCandleType] = useState('candle_solid');` line, add:

```js
const [isLogScale, setIsLogScale] = useState(false);
```

**Step 2: Add the sync effect**

After Effect 3 (the `candleType` effect, which ends around line 156), add a new effect:

```js
// ── Effect 5: sync log scale ──────────────────────────────────────────
useEffect(() => {
  chartRef.current?.setPaneOptions({
    id:   'candle_pane',
    axis: { name: isLogScale ? 'logYAxis' : 'yAxis' },
  });
}, [isLogScale]);
```

Note: This effect intentionally has no dependency on `chartRef` — the chart init effect runs first and sets `chartRef.current`, so this effect fires after on the same render cycle.

**Step 3: Add the autoscale handler**

Add a plain callback (not a `useEffect`) below the state declarations:

```js
const handleAutoscale = () => {
  chartRef.current?.scrollToRealTime();
};
```

**Step 4: Verify**

Reload the page. The chart should still behave identically. There should be no change in behaviour yet (the buttons aren't in the UI yet).

**Step 5: Commit**

```bash
git add frontend/src/components/charts/RallyCandlestickChart.jsx
git commit -m "feat(charts): add isLogScale state and sync effect"
```

---

### Task 3: Add the toolbar buttons

**Files:**
- Modify: `frontend/src/components/charts/RallyCandlestickChart.jsx`

**Context:** The existing toolbar `Group` (around line 239) contains `<DrawingToolbar>` on the left and a `SegmentedControl` on the right. We add two `ActionIcon` buttons between them. Import `ActionIcon` from `@mantine/core` and `IconZoomReset`, `IconMathFunction` from `@tabler/icons-react`.

**Step 1: Update the Mantine import**

Change the existing Mantine import in `RallyCandlestickChart.jsx` from:

```js
import { Group, SegmentedControl } from '@mantine/core';
```

to:

```js
import { ActionIcon, Group, SegmentedControl, Tooltip } from '@mantine/core';
```

**Step 2: Update the tabler icons import**

Change the existing tabler icons import from:

```js
// (there may be no existing tabler import — add it fresh)
```

Add (or extend) the tabler icons import:

```js
import { IconMathFunction, IconZoomReset } from '@tabler/icons-react';
```

**Step 3: Update the toolbar JSX**

Find the `return` block's toolbar `Group` (the one that contains `<DrawingToolbar>` and the chart-type `SegmentedControl`). Replace it with:

```jsx
<Group
  justify="space-between"
  mb={4}
  pb={6}
  style={{ borderBottom: '1px solid rgba(148,163,184,0.08)' }}
  wrap="nowrap"
  gap="xs"
>
  <DrawingToolbar chartRef={chartRef} />
  <Group gap={4} wrap="nowrap">
    <Tooltip label="بازگشت به نمای خودکار" position="top" withArrow>
      <ActionIcon
        variant="subtle"
        size="sm"
        color="gray"
        onClick={handleAutoscale}
        aria-label="autoscale"
      >
        <IconZoomReset size={14} />
      </ActionIcon>
    </Tooltip>
    <Tooltip label={isLogScale ? 'غیرفعال کردن مقیاس لگاریتمی' : 'مقیاس لگاریتمی'} position="top" withArrow>
      <ActionIcon
        variant={isLogScale ? 'light' : 'subtle'}
        size="sm"
        color={isLogScale ? 'rally-green' : 'gray'}
        onClick={() => setIsLogScale((v) => !v)}
        aria-label="log scale"
      >
        <IconMathFunction size={14} />
      </ActionIcon>
    </Tooltip>
    <SegmentedControl
      size="xs"
      value={candleType}
      onChange={setCandleType}
      data={CHART_TYPES}
    />
  </Group>
</Group>
```

**Step 4: Verify visually**

1. Load `/dashboard/technical-analysis`, search for any symbol.
2. Confirm both icons appear in the toolbar to the left of the chart-type selector.
3. Click the **autoscale** (`IconZoomReset`) button — the chart should snap to the latest candle.
4. Click the **log scale** (`IconMathFunction`) button — it should turn green and the y-axis values should remain as normal prices but the spacing between candles should compress at higher prices (log spacing). A large-range chart (e.g. 1 year) makes this most visible.
5. Click log scale again — it should return to grey and linear scale.

**Step 5: Commit**

```bash
git add frontend/src/components/charts/RallyCandlestickChart.jsx
git commit -m "feat(charts): add autoscale and log scale toolbar buttons"
```

---

### Task 4: Final review

**Files:** Read-only review

**Step 1: Check for regressions**

- Open the stock detail page (wherever else `RallyCandlestickChart` is used) and confirm it also shows the two new buttons without issues.
- Check that live mode (duration = 'live') still works — the log scale toggle should function there too since klinecharts handles it at the pane level.

**Step 2: Verify Farsi tooltip text renders correctly**

The tooltips use RTL Farsi text. Confirm they render without visual truncation on a 1366px-wide viewport.

**Step 3: Final commit if any cleanup needed**

```bash
git add frontend/src/components/charts/RallyCandlestickChart.jsx
git commit -m "style(charts): polish autoscale/log scale button layout"
```
