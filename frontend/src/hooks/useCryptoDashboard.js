/**
 * Combined crypto dashboard state hook.
 * Aggregates crypto market data, global stats, and movers into a single
 * dashboard-ready interface with derived state and chart data.
 *
 * Follows the pattern from useDashboardData.js.
 */
import { useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCryptoMarket, useCryptoGlobalStats, useCryptoMovers, useCryptoSignals } from './useCryptoData';
import { CRYPTO_CATEGORIES } from '../constants/crypto';

export default function useCryptoDashboard() {
  const queryClient = useQueryClient();

  // ── TanStack Query fetches ──────────────────────────────────────────────
  const {
    data: market = [],
    isLoading: marketLoading,
    isError: marketError,
    dataUpdatedAt: marketUpdatedAt,
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

  const {
    data: signals = [],
    isLoading: signalsLoading,
    isError: signalsError,
  } = useCryptoSignals();

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

  // ── Category performance (CFA L1 — Sector Analysis) ────────────────────
  const categoryPerformance = useMemo(() => {
    if (!market.length) return [];
    const symbolMap = Object.fromEntries(market.map(c => [c.symbol, c]));
    return Object.entries(CRYPTO_CATEGORIES).map(([category, symbols]) => {
      const coins = symbols.filter(s => symbolMap[s]).map(s => symbolMap[s]);
      if (!coins.length) return { category, avgChange: 0, count: 0, totalVolume: 0 };
      const avgChange = coins.reduce((s, c) => s + (c.price_change_pct_24h ?? 0), 0) / coins.length;
      const totalVolume = coins.reduce((s, c) => s + (c.volume_24h ?? 0), 0);
      return { category, avgChange: Number(avgChange.toFixed(2)), count: coins.length, totalVolume };
    });
  }, [market]);

  // ── Volatility & risk metrics (CFA L1/L2 — Quantitative Risk) ─────────
  const volatilityMetrics = useMemo(() => {
    if (!market.length) return [];
    return market
      .filter(c => c.last_price > 0 && c.price_change_pct_24h != null)
      .map(c => {
        const return24h = c.price_change_pct_24h ?? 0;
        // Use high/low range if available, otherwise use |change| as volatility proxy
        const volatility = (c.high_24h > 0 && c.low_24h > 0)
          ? ((c.high_24h - c.low_24h) / c.last_price) * 100
          : Math.abs(return24h) * 1.5;  // scale factor: intraday range ≈ 1.5× daily change
        const riskAdjReturn = volatility > 0 ? Number((return24h / volatility).toFixed(3)) : 0;
        return {
          symbol: c.symbol,
          volatility: Number(volatility.toFixed(2)),
          return24h: Number(return24h.toFixed(2)),
          riskAdjReturn,
          volume: c.turnover_24h ?? c.volume_24h ?? 0,
        };
      })
      .sort((a, b) => b.riskAdjReturn - a.riskAdjReturn);
  }, [market]);

  // ── Liquidity & spread analysis (CFA L2 — Market Microstructure) ──────
  const liquidityMetrics = useMemo(() => {
    if (!market.length) return [];
    const coins = market
      .filter(c => c.best_bid > 0 && c.best_ask > 0)
      .map(c => {
        const midPrice = (c.best_ask + c.best_bid) / 2;
        const spread = ((c.best_ask - c.best_bid) / midPrice) * 100;
        return { symbol: c.symbol, spread: Number(spread.toFixed(4)), volume: c.volume_24h ?? 0 };
      })
      .sort((a, b) => a.spread - b.spread);

    return coins.map((c, i) => ({
      ...c,
      spreadRank: i + 1,
      volumeRank: [...coins].sort((a, b) => b.volume - a.volume).findIndex(x => x.symbol === c.symbol) + 1,
    }));
  }, [market]);

  // ── Toman premium tracker (Iran-Specific) ─────────────────────────────
  const tomanMetrics = useMemo(() => {
    if (!market.length) return { avgRate: 0, stdDev: 0, coins: [] };
    const coins = market
      .filter(c => c.price_toman > 0 && c.last_price > 0)
      .map(c => ({
        symbol: c.symbol,
        impliedRate: Math.round(c.price_toman / c.last_price),
      }));

    if (!coins.length) return { avgRate: 0, stdDev: 0, coins: [] };
    const avgRate = Math.round(coins.reduce((s, c) => s + c.impliedRate, 0) / coins.length);
    const variance = coins.reduce((s, c) => s + Math.pow(c.impliedRate - avgRate, 2), 0) / coins.length;
    const stdDev = Math.round(Math.sqrt(variance));

    return {
      avgRate,
      stdDev,
      coins: coins.map(c => ({
        ...c,
        deviation: c.impliedRate - avgRate,
        deviationPct: Number(((c.impliedRate - avgRate) / avgRate * 100).toFixed(2)),
        isOutlier: Math.abs(c.impliedRate - avgRate) > stdDev,
      })),
    };
  }, [market]);

  // ── Aggregate loading / error ───────────────────────────────────────────
  // globalStats is optional (may 404 if no data) — don't block the dashboard
  const isLoading = marketLoading || moversLoading || signalsLoading;
  const isError = marketError || moversError || signalsError;

  // ── Manual refresh ──────────────────────────────────────────────────────
  const fetchData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['crypto-market'] });
    queryClient.invalidateQueries({ queryKey: ['crypto-global-stats'] });
    queryClient.invalidateQueries({ queryKey: ['crypto-movers'] });
    queryClient.invalidateQueries({ queryKey: ['crypto-signals'] });
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
    // Analytics
    categoryPerformance,
    volatilityMetrics,
    liquidityMetrics,
    tomanMetrics,
    signals,
    // Status
    isLoading,
    isError,
    fetchData,
    dataUpdatedAt: marketUpdatedAt > 0 ? marketUpdatedAt : null,
  };
}
