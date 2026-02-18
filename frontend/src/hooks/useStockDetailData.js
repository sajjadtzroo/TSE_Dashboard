import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import useApiData from './useApiData';
import useIndicatorPrefs from './useIndicatorPrefs';
import usePagination from './usePagination';
import useTechnicalIndicators from './useTechnicalIndicators';
import useRiskMetrics from './useRiskMetrics';
import useMonteCarloWorker from './useMonteCarloWorker';
import { scenarioAnalysis } from '../utils/riskMetrics/scenario';

/**
 * Custom hook that encapsulates all data fetching and derived state
 * for the StockDetail page.
 */
export default function useStockDetailData() {
  const { symbol } = useParams();
  const [stockData, setStockData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState('30');
  const [lastUpdated, setLastUpdated] = useState(null);

  // Technical indicator preferences (persisted in localStorage)
  const { prefs: indicatorPrefs, toggle: toggleIndicator } = useIndicatorPrefs();

  // Pagination hook - must be called before any conditional returns
  const historyRows = [...history].reverse().map((h, i) => ({ id: i, ...h }));
  const { paged: historyPaged, page, setPage, perPage, setPerPage, totalRecords } = usePagination(historyRows);

  // Technical indicators
  const { overlays, subCharts } = useTechnicalIndicators(history, indicatorPrefs);

  // Risk metrics
  const { metrics, benchmarkLoading, insufficientData } = useRiskMetrics(symbol, history, selectedDuration);

  // Order book data
  const { data: orderBook } = useApiData(
    `/api/stocks/${encodeURIComponent(symbol)}/orderbook`,
    { deps: [symbol], initialValue: [] }
  );

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

  // Benchmark history for relative performance chart
  const { data: benchHistory } = useApiData(
    `/api/market/indices/${encodeURIComponent('شاخص كل')}/history?days=${selectedDuration}`,
    { deps: [selectedDuration], initialValue: [] }
  );

  // Active sub-chart indicators
  const activeSubCharts = useMemo(() => {
    return Object.entries(subCharts).filter(([key]) => indicatorPrefs[key]);
  }, [subCharts, indicatorPrefs]);

  const fetchHistory = useCallback(async (days) => {
    try {
      setHistoryLoading(true);
      const res = await axios.get(`/api/stocks/${encodeURIComponent(symbol)}/history?days=${days}`);
      setHistory(res.data);
    } catch (err) { console.error('Error fetching history:', err); }
    finally { setHistoryLoading(false); }
  }, [symbol]);

  const fetchStockData = useCallback(async () => {
    try {
      setLoading(true);
      const encodedSymbol = encodeURIComponent(symbol);
      const [detailRes, historyRes] = await Promise.all([
        axios.get(`/api/stocks/${encodedSymbol}`),
        axios.get(`/api/stocks/${encodedSymbol}/history?days=${selectedDuration}`),
      ]);
      setStockData(detailRes.data);
      setHistory(historyRes.data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [symbol, selectedDuration]);

  useEffect(() => { fetchStockData(); }, [fetchStockData]);
  useEffect(() => { if (stockData) fetchHistory(selectedDuration); }, [selectedDuration, stockData, fetchHistory]);

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
    historyPaged,
    page,
    setPage,
    perPage,
    setPerPage,
    totalRecords,
  };
}
