/**
 * Combined crypto dashboard state hook.
 * Aggregates crypto market data, global stats, and movers into a single
 * dashboard-ready interface with derived state and chart data.
 *
 * Follows the pattern from useDashboardData.js.
 */
import { useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCryptoMarket, useCryptoGlobalStats, useCryptoMovers } from './useCryptoData';
import { CRYPTO_CATEGORIES } from '../constants/crypto';

export default function useCryptoDashboard() {
  const queryClient = useQueryClient();

  // ── TanStack Query fetches ──────────────────────────────────────────────
  const {
    data: market = [],
    isLoading: marketLoading,
    isError: marketError,
  } = useCryptoMarket();

  const {
    data: globalStats = null,
    isLoading: globalStatsLoading,
    isError: globalStatsError,
  } = useCryptoGlobalStats();

  const {
    data: movers = { gainers: [], losers: [] },
    isLoading: moversLoading,
    isError: moversError,
  } = useCryptoMovers();

  // ── Derived state ───────────────────────────────────────────────────────
  const advancers = useMemo(
    () => market.filter(coin => (coin.price_change_pct_24h ?? 0) > 0),
    [market]
  );

  const decliners = useMemo(
    () => market.filter(coin => (coin.price_change_pct_24h ?? 0) < 0),
    [market]
  );

  const topMovers = useMemo(() => {
    const sorted = [...market].sort(
      (a, b) => Math.abs(b.price_change_pct_24h ?? 0) - Math.abs(a.price_change_pct_24h ?? 0)
    );
    return sorted.slice(0, 10);
  }, [market]);

  // ── Chart data: market cap distribution (pie chart) ─────────────────────
  const marketCapPieData = useMemo(() => {
    const withCap = market
      .filter(coin => coin.market_cap_usd && coin.market_cap_usd > 0)
      .sort((a, b) => b.market_cap_usd - a.market_cap_usd);

    const top8 = withCap.slice(0, 8);
    const othersSum = withCap.slice(8).reduce((sum, coin) => sum + coin.market_cap_usd, 0);

    const pie = top8.map(coin => ({
      x: coin.symbol,
      y: Math.round(coin.market_cap_usd / 1e6), // in millions USD
    }));

    if (othersSum > 0) {
      pie.push({ x: 'Other', y: Math.round(othersSum / 1e6) });
    }

    return pie;
  }, [market]);

  // ── Chart data: volume distribution (bar chart) ─────────────────────────
  const volumeBarData = useMemo(() => {
    const withVolume = market
      .filter(coin => coin.volume_24h && coin.volume_24h > 0)
      .sort((a, b) => b.volume_24h - a.volume_24h);

    return withVolume.slice(0, 10).map(coin => ({
      x: coin.symbol,
      y: Math.round(coin.volume_24h / 1e6), // in millions USD
    }));
  }, [market]);

  // ── Chart data: category breakdown ──────────────────────────────────────
  const categoryData = useMemo(() => {
    const symbolSet = new Set(market.map(c => c.symbol));
    return Object.entries(CRYPTO_CATEGORIES).map(([category, symbols]) => ({
      x: category,
      y: symbols.filter(s => symbolSet.has(s)).length,
    }));
  }, [market]);

  // ── Aggregate loading / error ───────────────────────────────────────────
  const isLoading = marketLoading || globalStatsLoading || moversLoading;
  const isError = marketError || globalStatsError || moversError;

  // ── Manual refresh ──────────────────────────────────────────────────────
  const fetchData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['crypto-market'] });
    queryClient.invalidateQueries({ queryKey: ['crypto-global-stats'] });
    queryClient.invalidateQueries({ queryKey: ['crypto-movers'] });
  }, [queryClient]);

  return {
    // Raw data
    market,
    globalStats,
    movers,
    // Derived
    advancers,
    decliners,
    topMovers,
    // Chart data
    chartData: {
      marketCapPie: marketCapPieData,
      volumeBar: volumeBarData,
      categories: categoryData,
    },
    // Status
    isLoading,
    isError,
    fetchData,
  };
}
