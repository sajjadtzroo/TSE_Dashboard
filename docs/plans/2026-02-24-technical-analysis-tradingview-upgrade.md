# Technical Analysis — TradingView-Style Upgrade

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade the Technical Analysis page to look and behave like TradingView: colored volume bars, OHLCV readout inside the chart header, timeframe button group, and a searchable right-drawer indicator panel.

**Architecture:** Top-bar layout kept. Four targeted changes to three existing files + one new component (`IndicatorDrawer.jsx`). No new routes, no new hooks, no new API calls. All changes are inside `frontend/src/`.

**Tech Stack:** React 18, Mantine v7, KLineChart (klinecharts), @tabler/icons-react, rallyColors design tokens.

---

## Reference: Key File Paths

- `frontend/src/components/charts/RallyCandlestickChart.jsx` — KLineChart wrapper (main chart)
- `frontend/src/pages/stock/StockChartSection.jsx` — card wrapper, header, toolbar
- `frontend/src/components/charts/IndicatorDrawer.jsx` — NEW: right-slide drawer (replaces IndicatorToggle popover)
- `frontend/src/pages/TechnicalAnalysis.jsx` — page shell (minor cleanup)
- `frontend/src/constants/stockDetail.js` — DURATION_OPTIONS constants
- `frontend/src/utils/indicatorMeta.js` — indicator metadata (label, color, category, klcId)
- `frontend/src/theme/rallyColors.js` — all color tokens

## Reference: KLineChart API

```js
// Init
import { init, dispose } from 'klinecharts';
const chart = init(containerRef.current, { timezone: 'Asia/Tehran', styles: DARK_THEME });

// Subscribe to crosshair changes (fires on mouse move over chart)
chart.subscribeAction('onCrosshairChange', (data) => {
  // data.kLineData => { timestamp, open, high, low, close, volume } | undefined
});

// Colored volume — override after createIndicator
chart.overrideIndicator({
  name: 'VOL',
  styles: {
    bars: [{
      style: 'fill',
      upColor: '#10B98180',   // rallyColors.green + 50% alpha
      downColor: '#EF444480', // rallyColors.red   + 50% alpha
    }],
  },
}, 'volume_pane');
```

## Reference: Mantine components used

```js
import { Drawer, TextInput, Tabs, Group, Stack, Text, Box, UnstyledButton, Button } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
```

---

## Task 1: Colored Volume Bars

**Files:**
- Modify: `frontend/src/components/charts/RallyCandlestickChart.jsx:131-143` (Effect 1 — init chart)

**Step 1: Find the VOL createIndicator call in Effect 1**

In `RallyCandlestickChart.jsx`, Effect 1 (line ~132) calls:
```js
chart.createIndicator('VOL', false, { id: 'volume_pane', height: 80, minHeight: 60 });
```

**Step 2: Override VOL colors immediately after creation**

Replace that single line with:
```js
chart.createIndicator('VOL', false, { id: 'volume_pane', height: 80, minHeight: 60 });
// Color volume bars green/red based on candle direction
chart.overrideIndicator(
  {
    name: 'VOL',
    styles: {
      bars: [{
        style: 'fill',
        upColor: `${rallyColors.green}80`,
        downColor: `${rallyColors.red}80`,
      }],
    },
  },
  'volume_pane',
);
```

**Step 3: Verify visually**
Run `cd frontend && npm run dev`, open Technical Analysis, pick any symbol. Volume bars should now be teal-green for up-candles and red for down-candles.

**Step 4: Commit**
```bash
git add frontend/src/components/charts/RallyCandlestickChart.jsx
git commit -m "feat(chart): color volume bars green/red by candle direction"
```

---

## Task 2: OHLCV readout inside the chart (crosshair callback)

**Files:**
- Modify: `frontend/src/components/charts/RallyCandlestickChart.jsx`

This adds a TradingView-style OHLCV strip inside the chart component that updates as the user hovers.

**Step 1: Add `useState` for OHLCV and import `formatNum`**

At the top of `RallyCandlestickChart.jsx`, add to the existing React import:
```js
import { useEffect, useRef, useState } from 'react';
```
(already present — confirm `useState` is there)

Add after the existing imports:
```js
import { formatNum } from '../../utils/formatUtils';
```

**Step 2: Add OHLCV state**

Inside the component, after the existing `const [isLogScale, setIsLogScale] = useState(false);` line, add:
```js
const [ohlcv, setOhlcv] = useState(null); // { open, high, low, close, volume, timestamp }
```

**Step 3: Subscribe to crosshair in Effect 1 (init)**

Inside Effect 1, after `chart.createIndicator(...)` calls and before `const ro = new ResizeObserver...`, add:
```js
chart.subscribeAction('onCrosshairChange', ({ kLineData }) => {
  setOhlcv(kLineData ?? null);
});
```

**Step 4: Add OHLCV strip above the chart div**

The component currently returns:
```jsx
return (
  <div>
    <Group justify="space-between" mb={4} pb={6} ...>
      <DrawingToolbar chartRef={chartRef} />
      <Group gap={4} wrap="nowrap">
        ...
      </Group>
    </Group>
    <div ref={containerRef} style={{ width: '100%', height: chartHeight + 80 }} />
  </div>
);
```

Add the OHLCV strip between the toolbar Group and the chart div:

```jsx
{/* OHLCV readout — shows last or hovered bar values */}
{ohlcv && (
  <Group gap="lg" px={2} pb={6} wrap="nowrap" style={{ fontSize: 11, opacity: 0.9 }}>
    <Group gap={4}>
      <Text size="xs" c="dimmed">O</Text>
      <Text size="xs" c={ohlcv.close >= ohlcv.open ? rallyColors.green : rallyColors.red} fw={500}>
        {formatNum(ohlcv.open)}
      </Text>
    </Group>
    <Group gap={4}>
      <Text size="xs" c="dimmed">H</Text>
      <Text size="xs" c={rallyColors.green} fw={500}>{formatNum(ohlcv.high)}</Text>
    </Group>
    <Group gap={4}>
      <Text size="xs" c="dimmed">L</Text>
      <Text size="xs" c={rallyColors.red} fw={500}>{formatNum(ohlcv.low)}</Text>
    </Group>
    <Group gap={4}>
      <Text size="xs" c="dimmed">C</Text>
      <Text size="xs" c={ohlcv.close >= ohlcv.open ? rallyColors.green : rallyColors.red} fw={500}>
        {formatNum(ohlcv.close)}
      </Text>
    </Group>
    <Group gap={4}>
      <Text size="xs" c="dimmed">V</Text>
      <Text size="xs" c={rallyColors.textSecondary}>{formatNum(ohlcv.volume)}</Text>
    </Group>
  </Group>
)}
```

**Step 5: Seed ohlcv from last bar in Effect 2 (data load)**

In Effect 2 (after `chart.applyNewData(bars)`), add:
```js
// Seed OHLCV strip with latest bar so it shows immediately before hover
if (bars.length > 0) {
  const last = bars[bars.length - 1];
  setOhlcv({ open: last.open, high: last.high, low: last.low, close: last.close, volume: last.volume });
}
```

**Step 6: Verify**
Hover over the chart — the OHLCV strip should update with each candle's values. When no symbol is loaded, the strip should be absent.

**Step 7: Commit**
```bash
git add frontend/src/components/charts/RallyCandlestickChart.jsx
git commit -m "feat(chart): add OHLCV crosshair readout strip inside chart header"
```

---

## Task 3: Timeframe button group (replace SegmentedControl)

**Files:**
- Modify: `frontend/src/pages/stock/StockChartSection.jsx`

Replace the `SegmentedControl` duration picker with a compact `Button.Group` of pills that look like TradingView timeframe buttons.

**Step 1: Update imports in StockChartSection.jsx**

Current imports include `SegmentedControl`. Add `Button` to the Mantine import list. The final Mantine import line should be:
```js
import {
  Badge, Button, Center, Group, Loader, SegmentedControl, Text, Title,
} from '@mantine/core';
```

**Step 2: Replace the duration SegmentedControl in the `header` JSX**

Find this block (inside the `header` variable):
```jsx
<SegmentedControl
  size="xs"
  value={duration}
  onChange={onDurationChange}
  data={DURATION_OPTIONS}
/>
```

Replace it with:
```jsx
<Button.Group>
  {DURATION_OPTIONS.map(({ label, value }) => (
    <Button
      key={value}
      size="compact-xs"
      variant={duration === value ? 'filled' : 'subtle'}
      color={duration === value ? 'rally-green' : 'gray'}
      onClick={() => onDurationChange(value)}
      styles={{ root: { minWidth: 34, fontWeight: duration === value ? 700 : 400 } }}
    >
      {label}
    </Button>
  ))}
</Button.Group>
```

**Step 3: Remove SegmentedControl from imports if no longer used**

Check if `SegmentedControl` is still used for the live interval selector (the `isLive` branch). If yes, keep it in imports. If the live interval selector also needs upgrading, replace it the same way:
```jsx
{isLive && (
  <Button.Group>
    {[{ label: '۱ دقیقه', value: '1min' }, { label: '۵ دقیقه', value: '5min' }].map(({ label, value }) => (
      <Button
        key={value}
        size="compact-xs"
        variant={liveInterval === value ? 'filled' : 'subtle'}
        color={liveInterval === value ? 'rally-green' : 'gray'}
        onClick={() => setLiveInterval(value)}
        styles={{ root: { minWidth: 52, fontWeight: liveInterval === value ? 700 : 400 } }}
      >
        {label}
      </Button>
    ))}
  </Button.Group>
)}
```

Once both `SegmentedControl` usages are replaced, remove it from the Mantine import.

**Step 4: Verify**
Timeframe buttons appear as a connected pill group. Active timeframe is highlighted in green. Clicking switches the chart duration.

**Step 5: Commit**
```bash
git add frontend/src/pages/stock/StockChartSection.jsx
git commit -m "feat(chart): replace SegmentedControl duration picker with Button.Group"
```

---

## Task 4: Searchable Indicator Drawer (new component)

**Files:**
- Create: `frontend/src/components/charts/IndicatorDrawer.jsx`
- Modify: `frontend/src/pages/stock/StockChartSection.jsx` (replace IndicatorToggle with IndicatorDrawer)

### Step 1: Create `IndicatorDrawer.jsx`

Create `frontend/src/components/charts/IndicatorDrawer.jsx` with this complete content:

```jsx
import { useState, useMemo } from 'react';
import {
  ActionIcon, Box, Button, Drawer, Group, Stack, Tabs, Text, TextInput, Tooltip, UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconSearch, IconX, IconChartLine } from '@tabler/icons-react';
import indicatorMeta from '../../utils/indicatorMeta';
import rallyColors from '../../theme/rallyColors';

// Group indicators by drawer tab
const TAB_GROUPS = {
  overlay: { label: 'روی نمودار', keys: Object.keys(indicatorMeta).filter((k) => indicatorMeta[k].category === 'overlay') },
  momentum: { label: 'مومنتوم', keys: ['rsi', 'macd', 'stochastic', 'williamsR', 'cci', 'roc'] },
  trend: { label: 'روند و حجم', keys: ['adx', 'obv'] },
};

function IndicatorRow({ indicatorKey, prefs, onToggle }) {
  const meta = indicatorMeta[indicatorKey];
  const active = !!prefs[indicatorKey];

  return (
    <UnstyledButton
      onClick={() => onToggle(indicatorKey)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '7px 10px',
        borderRadius: 6,
        background: active ? `${meta.color}14` : 'transparent',
        border: `1px solid ${active ? meta.color + '40' : 'transparent'}`,
        width: '100%',
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      <Box
        style={{
          width: 10,
          height: 10,
          borderRadius: 3,
          background: meta.color,
          flexShrink: 0,
          opacity: active ? 1 : 0.45,
        }}
      />
      <Text size="sm" c={active ? rallyColors.textPrimary : rallyColors.textSecondary} fw={active ? 600 : 400} style={{ flex: 1 }}>
        {meta.label}
      </Text>
      {active && (
        <Box
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: meta.color,
            flexShrink: 0,
          }}
        />
      )}
    </UnstyledButton>
  );
}

export default function IndicatorDrawer({ prefs = {}, onToggle }) {
  const [opened, { open, close }] = useDisclosure(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('overlay');

  const activeCount = Object.values(prefs).filter(Boolean).length;

  // Filter current tab's keys by search query
  const visibleKeys = useMemo(() => {
    const base = TAB_GROUPS[tab]?.keys ?? [];
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter((k) => {
      const m = indicatorMeta[k];
      return m.label.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q);
    });
  }, [tab, search]);

  return (
    <>
      <Tooltip label="اندیکاتورها" position="bottom" withArrow>
        <Button
          size="compact-xs"
          variant="subtle"
          color="gray"
          leftSection={<IconChartLine size={13} />}
          onClick={open}
          styles={{
            root: {
              fontWeight: 500,
              fontSize: 11,
              ...(activeCount > 0 && {
                color: rallyColors.green,
                borderColor: `${rallyColors.green}40`,
              }),
            },
          }}
        >
          اندیکاتور{activeCount > 0 ? ` (${activeCount})` : ''}
        </Button>
      </Tooltip>

      <Drawer
        opened={opened}
        onClose={close}
        title={
          <Group gap="xs">
            <IconChartLine size={16} color={rallyColors.green} />
            <Text fw={700} size="sm">اندیکاتورها</Text>
          </Group>
        }
        position="right"
        size={300}
        styles={{
          header: { background: rallyColors.card, borderBottom: `1px solid ${rallyColors.border}` },
          body: { background: rallyColors.card, padding: 0 },
          overlay: { backdropFilter: 'blur(2px)' },
        }}
      >
        {/* Search */}
        <Box px="sm" pt="sm" pb="xs">
          <TextInput
            placeholder="جستجو…"
            leftSection={<IconSearch size={13} />}
            rightSection={
              search ? (
                <ActionIcon size="xs" variant="subtle" color="gray" onClick={() => setSearch('')}>
                  <IconX size={11} />
                </ActionIcon>
              ) : null
            }
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            size="xs"
            styles={{ input: { textAlign: 'right', background: rallyColors.elevated, border: `1px solid ${rallyColors.border}` } }}
          />
        </Box>

        {/* Tabs */}
        <Tabs value={tab} onChange={setTab} variant="pills" radius="sm">
          <Tabs.List px="sm" pb="xs" style={{ gap: 4, flexWrap: 'nowrap' }}>
            {Object.entries(TAB_GROUPS).map(([key, { label }]) => {
              const tabActiveCount = TAB_GROUPS[key].keys.filter((k) => !!prefs[k]).length;
              return (
                <Tabs.Tab
                  key={key}
                  value={key}
                  size="xs"
                  styles={{
                    tab: { fontSize: 11, padding: '4px 10px', whiteSpace: 'nowrap' },
                  }}
                >
                  {label}{tabActiveCount > 0 ? ` · ${tabActiveCount}` : ''}
                </Tabs.Tab>
              );
            })}
          </Tabs.List>

          {/* Indicator list */}
          {Object.keys(TAB_GROUPS).map((key) => (
            <Tabs.Panel key={key} value={key}>
              <Stack gap={2} px="xs" pb="sm">
                {visibleKeys.length === 0 ? (
                  <Text size="xs" c="dimmed" ta="center" py="lg">نتیجه‌ای یافت نشد</Text>
                ) : (
                  visibleKeys.map((k) => (
                    <IndicatorRow key={k} indicatorKey={k} prefs={prefs} onToggle={onToggle} />
                  ))
                )}
              </Stack>
            </Tabs.Panel>
          ))}
        </Tabs>
      </Drawer>
    </>
  );
}
```

### Step 2: Wire IndicatorDrawer into StockChartSection

In `frontend/src/pages/stock/StockChartSection.jsx`:

1. Remove the import of `IndicatorToggle`:
   ```js
   // DELETE this line:
   import IndicatorToggle from '../../components/IndicatorToggle';
   ```

2. Add the new import:
   ```js
   import IndicatorDrawer from '../../components/charts/IndicatorDrawer';
   ```

3. In the `header` JSX, find:
   ```jsx
   {!isLive && <IndicatorToggle prefs={indicators} onToggle={onIndicatorToggle} />}
   ```
   Replace with:
   ```jsx
   {!isLive && <IndicatorDrawer prefs={indicators} onToggle={onIndicatorToggle} />}
   ```

### Step 3: Verify
Click the "اندیکاتور" button — the right drawer opens. Search for "RSI" — only RSI appears. Click it — RSI toggles on and the chart adds the RSI sub-pane. Close the drawer — chart is updated. Active indicator count shows in the button label.

### Step 4: Commit
```bash
git add frontend/src/components/charts/IndicatorDrawer.jsx \
        frontend/src/pages/stock/StockChartSection.jsx
git commit -m "feat(chart): replace IndicatorToggle popover with searchable right-drawer"
```

---

## Task 5: Clean up TechnicalAnalysis.jsx (remove duplicate OHLCV badges)

**Files:**
- Modify: `frontend/src/pages/TechnicalAnalysis.jsx`

Now that OHLCV is displayed inside the chart itself (Task 2), the three external badges in the page header (close / change / volume) are redundant. Remove them.

**Step 1: Find and delete the badge group**

In `TechnicalAnalysis.jsx`, find this block (inside the `RallyMainCard` Group):
```jsx
{/* Right: inline KPI chips (only when symbol loaded) */}
{selectedSymbol && last && (
  <Group gap="xs" wrap="wrap">
    <Badge variant="light" color="gray">{close != null ? formatNum(close) : '—'}</Badge>
    <Badge variant="light" color={changePct != null && changePct >= 0 ? 'green' : 'red'}>
      {changePct != null
        ? `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`
        : '—'}
    </Badge>
    <Badge variant="light" color="blue">{volume != null ? formatNum(volume) : '—'}</Badge>
  </Group>
)}
```

Delete the entire block.

**Step 2: Remove now-unused variables**

With the badges removed, these derived variables are unused:
```js
const close = last?.close ?? null;
const changePct = last?.close_change_pct ?? null;
const volume = last?.volume ?? null;
const changeColor = ...
```

Delete all four lines. Keep `last`, `high52w`, and `low52w` (still used by the high/low bar).

**Step 3: Clean up unused imports**

If `Badge` is no longer used, remove it from the Mantine import. Also check if `formatNum` is still used (it's used by the high/low bar value — keep it).

**Step 4: Verify**
Page header now shows: brand icon + title + search. The chart itself shows OHLCV on hover. The high/low KPI bar below the header still appears.

**Step 5: Commit**
```bash
git add frontend/src/pages/TechnicalAnalysis.jsx
git commit -m "refactor(technical-analysis): remove duplicate OHLCV badges (now shown in chart header)"
```

---

## Task 6: Split StockChartSection header into 2 rows

**Files:**
- Modify: `frontend/src/pages/stock/StockChartSection.jsx`

Currently everything is in one `Group justify="space-between"`. Split into two rows to match the TradingView layout shown in the design: title row + toolbar row.

**Step 1: Restructure the header variable**

Replace the current `header` variable with:
```jsx
const header = (
  <Stack gap={6} w="100%">
    {/* Row 1: Symbol badge + title + live status */}
    <Group justify="space-between" w="100%" wrap="wrap" gap="xs">
      <Group gap="xs">
        {symbol && (
          <Badge variant="outline" color="gray" size="sm" radius="sm">{symbol}</Badge>
        )}
        <Title order={4}>{isLive ? 'نمودار لحظه‌ای' : 'نمودار قیمت'}</Title>
        {isLive && live && hasData && (
          <Badge color="rally-green" variant="light" size="sm">● زنده</Badge>
        )}
        {isLive && !live && (
          <Badge color="gray" variant="outline" size="sm">بازار بسته</Badge>
        )}
      </Group>
    </Group>

    {/* Row 2: Toolbar — drawing tools (left) | controls (right) */}
    <Group justify="space-between" w="100%" wrap="wrap" gap="xs">
      {/* Spacer — drawing tools are rendered inside RallyCandlestickChart */}
      <Box />
      <Group gap={6} wrap="wrap">
        {!isLive && <IndicatorDrawer prefs={indicators} onToggle={onIndicatorToggle} />}
        <Button.Group>
          {DURATION_OPTIONS.map(({ label, value }) => (
            <Button
              key={value}
              size="compact-xs"
              variant={duration === value ? 'filled' : 'subtle'}
              color={duration === value ? 'rally-green' : 'gray'}
              onClick={() => onDurationChange(value)}
              styles={{ root: { minWidth: 34, fontWeight: duration === value ? 700 : 400 } }}
            >
              {label}
            </Button>
          ))}
        </Button.Group>
        {isLive && (
          <Button.Group>
            {[{ label: '۱ دقیقه', value: '1min' }, { label: '۵ دقیقه', value: '5min' }].map(({ label, value }) => (
              <Button
                key={value}
                size="compact-xs"
                variant={liveInterval === value ? 'filled' : 'subtle'}
                color={liveInterval === value ? 'rally-green' : 'gray'}
                onClick={() => setLiveInterval(value)}
                styles={{ root: { minWidth: 52, fontWeight: liveInterval === value ? 700 : 400 } }}
              >
                {label}
              </Button>
            ))}
          </Button.Group>
        )}
      </Group>
    </Group>
  </Stack>
);
```

**Step 2: Add `Stack` and `Box` to Mantine imports**

```js
import {
  Badge, Box, Button, Center, Group, Loader, Stack, Text, Title,
} from '@mantine/core';
```

**Step 3: Verify**
The card title area has two visual rows: symbol+title on top, timeframe buttons + indicator button on the bottom right.

**Step 4: Commit**
```bash
git add frontend/src/pages/stock/StockChartSection.jsx
git commit -m "feat(chart): split StockChartSection header into two rows (TradingView-style)"
```

---

## Completion Check

After all 6 tasks, verify:

- [ ] Volume bars are teal-green for up-candles, red for down-candles
- [ ] Hovering over the chart updates the OHLCV strip (O / H / L / C / V labels)
- [ ] OHLCV strip seeds with the latest bar's values immediately on data load
- [ ] Duration selector is a connected pill button group, not a SegmentedControl
- [ ] "اندیکاتور" button opens a right-side drawer
- [ ] Drawer has search + 3 tabs (روی نمودار / مومنتوم / روند و حجم)
- [ ] Searching "RSI" shows only RSI
- [ ] Clicking an indicator in the drawer toggles it on/off in the chart
- [ ] Active indicator count shows in the drawer button label
- [ ] Page header no longer shows the close/change/volume badge row
- [ ] High/low bar below the header still appears
- [ ] Works on mobile (drawer closes properly, buttons wrap)
