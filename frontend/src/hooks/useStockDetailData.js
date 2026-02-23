import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useStockDetail, useStockHistory, useOrderBook, useMarketIndexHistory, useFinancialStatements } from './useMarketData';
import useIndicatorPrefs from './useIndicatorPrefs';
import usePagination from './usePagination';

import useRiskMetrics from './useRiskMetrics';
import useMonteCarloWorker from './useMonteCarloWorker';
import { scenarioAnalysis } from '../utils/riskMetrics/scenario';
import { computeRatioTimeSeries } from '../utils/financialRatios';
import { computeEWMAVolatility } from '../utils/riskMetrics/rolling';
import { amihudIlliquidity, avgTurnoverRatio, bidAskSpread, rollingAmihud, turnoverRatio } from '../utils/riskMetrics/liquidity';
import { backtestVaR, kupiecPOF, baselTrafficLight } from '../utils/riskMetrics/varBacktest';
import { computeVolatilityCone } from '../utils/riskMetrics/volCone';
import { computeSimpleReturns } from '../utils/riskMetrics/returns';

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

  // When 'live' is selected the chart switches to intraday data; other panels
  // (risk metrics, moving averages, etc.) fall back to 90 days of history.
  const historyDays = selectedDuration === 'live' ? 90 : Number(selectedDuration);

  // Cascade secondary queries behind primary data to avoid load spikes
  const hasDetail = !!stockData;

  const {
    data: history = [],
    isLoading: historyLoading,
  } = useStockHistory(symbol, { days: historyDays, enabled: !!symbol && hasDetail });

  // Long-term history for advanced risk features (volCone, EWMA, VaR backtest)
  // Always fetch all available data — independent of chart duration selector
  const {
    data: riskHistory = [],
    isLoading: riskHistoryLoading,
  } = useStockHistory(symbol, { days: 0, enabled: !!symbol && hasDetail });

  const { data: orderBook = [] } = useOrderBook(symbol, { enabled: !!symbol && hasDetail });

  const { data: benchHistory = [] } = useMarketIndexHistory(
    'شاخص كل',
    { days: historyDays, enabled: hasDetail }
  );

  // Financial statements (income_statement + balance_sheet)
  const { data: incomeStatements = [], isLoading: incLoading } = useFinancialStatements(
    symbol, { statement_type: 'income_statement', period_months: 12, per_page: 20, enabled: !!symbol && hasDetail }
  );
  const { data: balanceSheets = [], isLoading: bsLoading } = useFinancialStatements(
    symbol, { statement_type: 'balance_sheet', period_months: 12, per_page: 20, enabled: !!symbol && hasDetail }
  );
  const { data: cashFlowStatements = [], isLoading: cfLoading } = useFinancialStatements(
    symbol, { statement_type: 'cash_flow', period_months: 12, per_page: 20, enabled: !!symbol && hasDetail }
  );

  const error = stockError?.message || null;
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  // ── Derived state (unchanged) ─────────────────────────────────────────

  // Pagination
  const historyRows = [...history].reverse().map((h, i) => ({ id: i, ...h }));
  const { paged: historyPaged, page, setPage, perPage, setPerPage, totalRecords } = usePagination(historyRows);

  // Risk metrics
  const { metrics, benchmarkLoading, insufficientData } = useRiskMetrics(symbol, history, String(historyDays));

  // Returns from full history for advanced risk analytics
  const riskReturns = useMemo(() => {
    if (!riskHistory || riskHistory.length < 2) return { returns: [], dates: [] };
    const sr = computeSimpleReturns(riskHistory);
    return { returns: sr.map((r) => r.ret), dates: sr.map((r) => r.date) };
  }, [riskHistory]);

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

  // Scenario analysis — use benchmark vol for market-level shocks (CFA convention)
  const scenarios = useMemo(() => {
    if (!metrics || metrics.beta == null || !history.length) return [];
    const lastPrice = history[history.length - 1]?.close;
    if (!lastPrice) return [];
    // Prefer benchmarkVolatility; fall back to stock vol / beta as proxy
    const marketVol = metrics.benchmarkVolatility
      || (metrics.beta !== 0 ? metrics.volatility / Math.abs(metrics.beta) : metrics.volatility);
    return scenarioAnalysis(lastPrice, metrics.beta, marketVol, metrics.alpha || 0);
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
    return computeRatioTimeSeries({ incomeStatements, balanceSheets, cashFlowStatements, market });
  }, [incomeStatements, balanceSheets, cashFlowStatements, stockData]);

  const ratiosLoading = incLoading || bsLoading || cfLoading;

  // ── EWMA Volatility ────────────────────────────────────────────────────
  const ewmaData = useMemo(() => {
    if (riskReturns.returns.length < 30) return null;
    const returns = riskReturns.returns;
    const dates = riskReturns.dates;
    const ewma = computeEWMAVolatility(returns, dates, 0.94);
    // Also compute simple rolling vol for comparison (30-day window, annualized)
    const window = 30;
    const simpleVol = [];
    for (let i = window - 1; i < returns.length; i++) {
      const slice = returns.slice(i - window + 1, i + 1);
      const m = slice.reduce((s, v) => s + v, 0) / slice.length;
      const variance = slice.reduce((s, v) => s + (v - m) ** 2, 0) / (slice.length - 1);
      simpleVol.push({
        date: dates[i],
        simpleVol: Math.sqrt(variance) * Math.sqrt(252) * 100,
      });
    }
    // Merge on date
    const simpleMap = Object.fromEntries(simpleVol.map((d) => [d.date, d.simpleVol]));
    return ewma
      .filter((d) => simpleMap[d.date] != null)
      .map((d) => ({
        date: d.date,
        ewmaVol: d.ewmaVol * 100,
        simpleVol: simpleMap[d.date],
      }));
  }, [riskReturns]);

  // ── Liquidity Data ─────────────────────────────────────────────────────
  const liquidityData = useMemo(() => {
    if (!history || history.length < 2) return null;
    const totalShares = stockData?.security?.total_shares;
    const lastRow = history[history.length - 1];

    return {
      amihud: amihudIlliquidity(history),
      currentTurnover: turnoverRatio(lastRow?.volume, totalShares),
      avgTurnover: avgTurnoverRatio(history, totalShares),
      spread: bidAskSpread(orderBook),
      rollingAmihud: rollingAmihud(history, 20),
    };
  }, [history, stockData, orderBook]);

  // ── VaR Backtesting ────────────────────────────────────────────────────
  const varBacktestData = useMemo(() => {
    if (riskReturns.returns.length < 280) return null;
    const result = backtestVaR(riskReturns.returns, riskReturns.dates, 250, 0.95);
    if (!result) return null;

    const kupiec = kupiecPOF(result.totalDays, result.violations, 0.05);
    const trafficLight = baselTrafficLight(result.violations, result.totalDays, 0.95);

    return { ...result, kupiec, trafficLight };
  }, [riskReturns]);

  // ── Volatility Cone ────────────────────────────────────────────────────
  const volConeData = useMemo(() => {
    if (riskReturns.returns.length < 250) return null;
    return computeVolatilityCone(riskReturns.returns);
  }, [riskReturns]);

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
    ewmaData,
    liquidityData,
    varBacktestData,
    volConeData,
  };
}
