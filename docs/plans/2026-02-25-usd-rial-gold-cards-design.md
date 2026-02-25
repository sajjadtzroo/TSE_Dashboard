# Design: USD/Rial + Gold Cards in DashboardEqualWeightSection

**Date:** 2026-02-25
**Branch:** develop
**Status:** Approved

---

## Goal

Add a second row of 3 glassmorphic `IndexMiniCard` cards to `DashboardEqualWeightSection`:

| Card | Data | Fill colour |
|------|------|-------------|
| دلار (نقدی) — USD spot buy | 7-day 4h-bucket history + 24h `change_pct` | `rallyColors.primary` |
| دلار (فردایی) — USD forward | 7-day 4h-bucket history + 24h `change_pct` | `rallyColors.blue` |
| طلای ۱۸ عیار — Gold 18K | 7-day 4h-bucket history + 1h `change_pct_1h` | `rallyColors.yellow` |

Each card reuses the existing `IndexMiniCard` component (no changes needed): label, delta pill, current price, 110px area chart.

---

## Files Changed

| # | File | Change |
|---|------|--------|
| 1 | `api/routes/market.py` | Add `/api/dollar/history` and `/api/gold/history` endpoints |
| 2 | `frontend/src/hooks/useMarketData.js` | Add `useDollarHistory` and `useGoldHistory` hooks |
| 3 | `frontend/src/hooks/useDashboardData.js` | Derive 9 new fields from the new hooks |
| 4 | `frontend/src/pages/Dashboard.jsx` | Pass 9 new props to `DashboardEqualWeightSection` |
| 5 | `frontend/src/pages/dashboard/DashboardEqualWeightSection.jsx` | Accept new props, add second `SimpleGrid` row |

---

## 1. Backend — `api/routes/market.py`

### `GET /api/dollar/history?days=7`

```python
@router.get("/dollar/history", tags=["market"])
@cached(module="market", endpoint="dollar-history",
        trading_ttl=60, off_hours_ttl=300, tags=["currency_rates"])
@handle_api_errors("dollar_history")
def get_dollar_history(days: int = Query(7, ge=1, le=90), db: Session = Depends(get_db)):
```

- Resolves USD `security_id` from `securities` table
- Queries `currency_rates` for `rate_type IN ('spot', 'forward')` in the last `days` days
- Buckets into 4-hour intervals using `time_bucket('4 hours', posted_at)`
- Takes `MAX(price)` (last posted price wins) per bucket per `rate_type`
- Returns:
  ```json
  {
    "spot":    [{"x": "2026-02-18T08:00:00+00:00", "y": 163500}, ...],
    "forward": [{"x": "2026-02-18T08:00:00+00:00", "y": 164000}, ...]
  }
  ```
- Sorted ascending by `x` (oldest first — chart reads left to right)

### `GET /api/gold/history?days=7`

```python
@router.get("/gold/history", tags=["market"])
@cached(module="market", endpoint="gold-history",
        trading_ttl=60, off_hours_ttl=300, tags=["gold_prices"])
@handle_api_errors("gold_history")
def get_gold_history(days: int = Query(7, ge=1, le=90), db: Session = Depends(get_db)):
```

- Resolves `GOLD_18K` `security_id` from `securities` table
- Queries `gold_prices` for the last `days` days
- Buckets into 4-hour intervals using `time_bucket('4 hours', scraped_at)`
- Takes `MAX(price_irr)` per bucket
- Returns:
  ```json
  [{"x": "2026-02-18T08:00:00+00:00", "y": 42500000}, ...]
  ```
- Sorted ascending by `x`

**TimescaleDB note:** Both tables are hypertables with `time_bucket` available. If TimescaleDB extension is unavailable (test env), fall back to `date_trunc('hour', ...)` with integer division for 4-hour bucketing.

---

## 2. Frontend Hooks — `useMarketData.js`

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

---

## 3. Dashboard Data Hook — `useDashboardData.js`

Add a new `useCurrencyData()` sub-hook (or inline block) that calls all four hooks and returns 9 fields:

```js
const { data: dollarHistory, isLoading: dollarHistLoading } = useDollarHistory(7);
const { data: dollarRate }                                   = useDollarRate({ staleTime: 15_000 });
const { data: goldHistory,  isLoading: goldHistLoading }    = useGoldHistory(7);
const { data: goldLatest }                                   = useGoldLatest({ staleTime: 15_000 });

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
```

Spread these 9 fields into the existing `useDashboardData` return object.

---

## 4. Dashboard.jsx

Add 9 new props to the `<DashboardEqualWeightSection>` JSX block:

```jsx
dollarSpotChartData={d.dollarSpotChartData}
dollarSpotTrend={d.dollarSpotTrend}
dollarSpotLoading={d.dollarSpotLoading}
dollarFwdChartData={d.dollarFwdChartData}
dollarFwdTrend={d.dollarFwdTrend}
dollarFwdLoading={d.dollarFwdLoading}
goldChartData={d.goldChartData}
goldTrend={d.goldTrend}
goldLoading={d.goldLoading}
```

---

## 5. DashboardEqualWeightSection.jsx

Accept 9 new props (all with safe defaults). Add a second `SimpleGrid` below the existing one:

```jsx
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
```

`IndexMiniCard` is unchanged — it already handles the glassmorphic style, spring hover, delta pill, and area chart.

---

## Constraints

- No new components — reuse `IndexMiniCard` exactly as-is
- `time_bucket` requires TimescaleDB; both tables are confirmed hypertables
- Gold chart uses `price_irr` (Toman); USD chart uses `price` (Toman) — same unit, `formatNum` handles display
- `rallyColors.yellow` = `#F59E0B` — used for gold, matches financial convention
- All cache tags already exist (`currency_rates`, `gold_prices`) — invalidation is automatic
