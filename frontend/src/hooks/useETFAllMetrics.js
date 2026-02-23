import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import api from '../services/apiClient';
import { computeAllMetrics } from '../utils/riskMetrics/index.js';
import { computeRollingMetrics } from '../utils/riskMetrics/rolling.js';
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
