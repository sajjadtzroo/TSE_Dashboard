/**
 * Single coin detail page hook.
 * Mirrors useStockDetailData pattern — combines detail, history, indicators,
 * risk metrics, Monte Carlo, scenario analysis, and pagination.
 */
import { useState, useMemo } from 'react';
import { useCryptoDetail, useCryptoHistory, useCryptoMarket } from './useCryptoData';
import useIndicatorPrefs from './useIndicatorPrefs';
import usePagination from './usePagination';
import useTechnicalIndicators from './useTechnicalIndicators';
import useCryptoRiskMetrics from './useCryptoRiskMetrics';
import useMonteCarloWorker from './useMonteCarloWorker';
import { scenarioAnalysis } from '../utils/riskMetrics/scenario';
import { CRYPTO_RISK_FREE_RATE } from '../constants/crypto';

export default function useCoinDetailData(symbol, { interval = '1day' } = {}) {
  const [chartInterval, setChartInterval] = useState(interval);

  // Technical indicator preferences (persisted in localStorage)
  const { prefs: indicatorPrefs, toggle: toggleIndicator } = useIndicatorPrefs();

  // ── TanStack Query fetches ────────────────────────────────────────────
  const {
    data: detail = null,
    isLoading: detailLoading,
    isError: detailError,
    dataUpdatedAt,
  } = useCryptoDetail(symbol);

  // Chart data (user-selected interval)
  const {
    data: chartHistory = [],
    isLoading: chartHistoryLoading,
  } = useCryptoHistory(symbol, { interval: chartInterval, limit: 200 });

  // Daily data for risk/indicator calculations (always daily, 365 days)
  const {
    data: dailyHistory = [],
    isLoading: dailyLoading,
  } = useCryptoHistory(symbol, { interval: '1day', limit: 365 });

  // Benchmark: BTC for all coins, ETH if coin is BTC
  const benchSymbol = symbol?.toUpperCase() === 'BTC' ? 'ETH' : 'BTC';
  const {
    data: benchHistory = [],
  } = useCryptoHistory(benchSymbol, { interval: '1day', limit: 365 });

  // Market data for peer comparison
  const {
    data: market = [],
    isLoading: marketLoading,
  } = useCryptoMarket();

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  // ── Normalize history → { date, open, high, low, close, volume } ─────
  const normalizedDaily = useMemo(() => {
    if (!dailyHistory?.length) return [];
    return dailyHistory.map((c) => ({
      date: (c.open_time || '').split('T')[0],
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
      volume: Number(c.volume),
    })).filter((c) => c.date);
  }, [dailyHistory]);

  const normalizedChart = useMemo(() => {
    if (!chartHistory?.length) return [];
    return chartHistory.map((c) => ({
      date: (c.open_time || '').split('T')[0],
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
      volume: Number(c.volume),
    })).filter((c) => c.date);
  }, [chartHistory]);

  // Benchmark normalized → { date, index_value }
  const normalizedBench = useMemo(() => {
    if (!benchHistory?.length) return [];
    return benchHistory.map((c) => ({
      date: (c.open_time || '').split('T')[0],
      index_value: Number(c.close),
    })).filter((c) => c.date);
  }, [benchHistory]);

  // ── Technical Indicators ──────────────────────────────────────────────
  const { overlays, subCharts } = useTechnicalIndicators(normalizedDaily, indicatorPrefs);

  const activeSubCharts = useMemo(() => {
    return Object.entries(subCharts).filter(([key]) => indicatorPrefs[key]);
  }, [subCharts, indicatorPrefs]);

  // ── Risk Metrics ──────────────────────────────────────────────────────
  const { metrics, insufficientData } = useCryptoRiskMetrics(
    normalizedDaily, normalizedBench, CRYPTO_RISK_FREE_RATE
  );

  // ── Monte Carlo ───────────────────────────────────────────────────────
  const mcConfig = useMemo(() => {
    if (!metrics || !metrics.volatility || !normalizedDaily.length) return null;
    const lastPrice = normalizedDaily[normalizedDaily.length - 1]?.close;
    if (!lastPrice) return null;
    return {
      currentPrice: lastPrice,
      mu: metrics.annualizedReturn || 0,
      sigma: metrics.volatility,
      days: 252,
      numPaths: 1000,
    };
  }, [metrics, normalizedDaily]);

  const { result: monteCarloResult, running: monteCarloRunning } = useMonteCarloWorker(mcConfig);

  // ── Scenario Analysis ─────────────────────────────────────────────────
  const scenarios = useMemo(() => {
    if (!metrics || metrics.beta == null || !normalizedDaily.length) return [];
    const lastPrice = normalizedDaily[normalizedDaily.length - 1]?.close;
    if (!lastPrice) return [];
    return scenarioAnalysis(lastPrice, metrics.beta, metrics.volatility, metrics.alpha || 0);
  }, [metrics, normalizedDaily]);

  // ── Pagination for history table ──────────────────────────────────────
  const historyRows = useMemo(() => {
    return [...normalizedDaily].reverse().map((h, i) => ({ id: i, ...h }));
  }, [normalizedDaily]);

  const { paged: historyPaged, page, setPage, perPage, setPerPage, totalRecords } = usePagination(historyRows);

  return {
    symbol,
    detail,
    // Chart data (user-selected interval)
    chartHistory: normalizedChart,
    chartInterval,
    setChartInterval,
    chartHistoryLoading,
    // Daily data for analysis
    dailyHistory: normalizedDaily,
    // Benchmark
    benchSymbol,
    benchHistory: normalizedBench,
    // Market
    market,
    marketLoading,
    // Loading/error
    isLoading: detailLoading || dailyLoading,
    isError: detailError,
    lastUpdated,
    // Indicators
    indicatorPrefs,
    toggleIndicator,
    overlays,
    activeSubCharts,
    // Risk
    metrics,
    insufficientData,
    // Monte Carlo
    monteCarloResult,
    monteCarloRunning,
    // Scenarios
    scenarios,
    // History table pagination
    historyPaged,
    page,
    setPage,
    perPage,
    setPerPage,
    totalRecords,
  };
}
