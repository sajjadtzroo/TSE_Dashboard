import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useStockDetail, useStockHistory, useOrderBook, useMarketIndexHistory, useFinancialStatements } from './useMarketData';
import useIndicatorPrefs from './useIndicatorPrefs';
import usePagination from './usePagination';
import useTechnicalIndicators from './useTechnicalIndicators';
import useRiskMetrics from './useRiskMetrics';
import useMonteCarloWorker from './useMonteCarloWorker';
import { scenarioAnalysis } from '../utils/riskMetrics/scenario';
import { computeRatioTimeSeries } from '../utils/financialRatios';

/**
 * Custom hook that encapsulates all data fetching and derived state
 * for the StockDetail page. Uses TanStack Query for all API calls.
 */
export default function useStockDetailData() {
  const { symbol } = useParams();
  const [selectedDuration, setSelectedDuration] = useState('30');

  // Technical indicator preferences (persisted in localStorage)
  const { prefs: indicatorPrefs, toggle: toggleIndicator } = useIndicatorPrefs();

  // ── TanStack Query fetches ────────────────────────────────────────────
  const {
    data: stockData,
    isLoading: loading,
    error: stockError,
    dataUpdatedAt,
  } = useStockDetail(symbol);

  const {
    data: history = [],
    isLoading: historyLoading,
  } = useStockHistory(symbol, { days: Number(selectedDuration) });

  const { data: orderBook = [] } = useOrderBook(symbol);

  const { data: benchHistory = [] } = useMarketIndexHistory(
    'شاخص كل',
    { days: Number(selectedDuration) }
  );

  // Financial statements (income_statement + balance_sheet)
  const { data: incomeStatements = [], isLoading: incLoading } = useFinancialStatements(
    symbol, { statement_type: 'income_statement', period_months: 12, per_page: 20 }
  );
  const { data: balanceSheets = [], isLoading: bsLoading } = useFinancialStatements(
    symbol, { statement_type: 'balance_sheet', period_months: 12, per_page: 20 }
  );

  const error = stockError?.message || null;
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  // ── Derived state (unchanged) ─────────────────────────────────────────

  // Pagination
  const historyRows = [...history].reverse().map((h, i) => ({ id: i, ...h }));
  const { paged: historyPaged, page, setPage, perPage, setPerPage, totalRecords } = usePagination(historyRows);

  // Technical indicators
  const { overlays, subCharts } = useTechnicalIndicators(history, indicatorPrefs);

  // Risk metrics
  const { metrics, benchmarkLoading, insufficientData } = useRiskMetrics(symbol, history, selectedDuration);

  // Monte Carlo simulation config
  const mcConfig = useMemo(() => {
    if (!metrics || !metrics.volatility || !history.length) return null;
    const lastPrice = history[history.length - 1]?.close || history[history.length - 1]?.adj_close;
    if (!lastPrice) return null;
    return {
      currentPrice: lastPrice,
      mu: metrics.annualizedReturn || 0,
      sigma: metrics.volatility,
      days: 252,
      numPaths: 1000,
    };
  }, [metrics, history]);

  const { result: monteCarloResult, running: monteCarloRunning } = useMonteCarloWorker(mcConfig);

  // Scenario analysis
  const scenarios = useMemo(() => {
    if (!metrics || metrics.beta == null || !history.length) return [];
    const lastPrice = history[history.length - 1]?.close;
    if (!lastPrice) return [];
    return scenarioAnalysis(lastPrice, metrics.beta, metrics.volatility, metrics.alpha || 0);
  }, [metrics, history]);

  // Financial ratio time-series
  const ratioTimeSeries = useMemo(() => {
    if (!incomeStatements.length && !balanceSheets.length) return [];
    const market = stockData ? {
      market_cap: stockData.latest_ohlcv?.market_cap,
      pe_ratio: stockData.latest_ohlcv?.pe_ratio,
      close: stockData.latest_ohlcv?.close,
      total_shares: stockData.security?.total_shares,
    } : null;
    return computeRatioTimeSeries({ incomeStatements, balanceSheets, market });
  }, [incomeStatements, balanceSheets, stockData]);

  const ratiosLoading = incLoading || bsLoading;

  // Active sub-chart indicators
  const activeSubCharts = useMemo(() => {
    return Object.entries(subCharts).filter(([key]) => indicatorPrefs[key]);
  }, [subCharts, indicatorPrefs]);

  return {
    symbol,
    stockData,
    history,
    loading,
    historyLoading,
    error,
    selectedDuration,
    setSelectedDuration,
    lastUpdated,
    indicatorPrefs,
    toggleIndicator,
    overlays,
    activeSubCharts,
    metrics,
    benchmarkLoading,
    insufficientData,
    orderBook,
    monteCarloResult,
    monteCarloRunning,
    scenarios,
    benchHistory,
    ratioTimeSeries,
    ratiosLoading,
    historyPaged,
    page,
    setPage,
    perPage,
    setPerPage,
    totalRecords,
  };
}
