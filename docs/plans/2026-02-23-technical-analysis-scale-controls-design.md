# Design: Autoscale + Log Scale Controls for Technical Analysis Chart

**Date:** 2026-02-23
**Status:** Approved
**Scope:** `frontend/src/components/charts/RallyCandlestickChart.jsx` only

---

## Problem

The technical analysis chart (`/dashboard/technical-analysis`) lacks two common trading-chart controls:

1. **Autoscale** — reset/fit the y-axis to frame visible candles
2. **Log scale** — switch the y-axis between linear and logarithmic

---

## Approach

Approach A: two icon buttons added to the existing chart toolbar inside `RallyCandlestickChart.jsx`. No prop threading required.

---

## Architecture

### Log Scale — `registerYAxis`

Register a custom `logYAxis` once at **module scope** (before any chart instance is created):

```js
import { init, dispose, registerYAxis } from 'klinecharts';

registerYAxis('logYAxis', {
  realValueToDisplayValue: (v) => Math.log10(Math.max(v, 1e-10)),
  displayValueToRealValue: (v) => Math.pow(10, v),
  valueToRealValue:        (v) => v,
  realValueToValue:        (v) => v,
  displayValueToText:      (v, precision) => Math.pow(10, v).toFixed(precision),
});
```

Toggle via:
```js
chart.setPaneOptions({
  id:   'candle_pane',
  axis: { name: isLogScale ? 'logYAxis' : 'yAxis' },
});
```

### Autoscale — `scrollToRealTime`

One-shot button calls:
```js
chart.scrollToRealTime();
```

This scrolls to the latest candle and recalculates the y-axis to frame all visible data.

---

## UI

Toolbar layout (left → right):

```
[ DrawingToolbar ]  [ Autoscale ActionIcon ]  [ Log ActionIcon (toggle) ]  [ Chart type SegmentedControl ]
```

- Both `ActionIcon` components: `variant="subtle"`, `size="sm"`
- Log scale icon: `IconMathFunction` — `color="rally-green"` when active, `color="gray"` when off
- Autoscale icon: `IconZoomReset` — always `color="gray"`, no toggle state
- Both have `title` attributes for tooltip (Farsi labels)

---

## State

```js
const [isLogScale, setIsLogScale] = useState(false);
```

No new props. Autoscale is stateless (one-shot).

---

## Effect

Add a `useEffect` that syncs `isLogScale` → `setPaneOptions` whenever it changes or the chart is initialised:

```js
useEffect(() => {
  chartRef.current?.setPaneOptions({
    id:   'candle_pane',
    axis: { name: isLogScale ? 'logYAxis' : 'yAxis' },
  });
}, [isLogScale]);
```

---

## Files Changed

| File | Change |
|------|--------|
| `frontend/src/components/charts/RallyCandlestickChart.jsx` | Add `registerYAxis` call at module scope, `isLogScale` state, log-scale effect, autoscale handler, two `ActionIcon` buttons in toolbar |

No other files need modification.
