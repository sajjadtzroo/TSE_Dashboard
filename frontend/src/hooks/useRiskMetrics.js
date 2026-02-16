import { useMemo } from 'react';
import useApiData from './useApiData';
import { computeAllMetrics } from '../utils/riskMetrics/index.js';

const TEDPIX_NAMES = ['شاخص كل', 'شاخص کل', 'TEDPIX'];

/**
 * Hook that computes all risk/CAPM metrics for a stock.
 * Fetches TEDPIX history from the new endpoint.
 */
export default function useRiskMetrics(symbol, stockHistory, selectedDuration, rfAnnual = 0.23) {
  const days = Number(selectedDuration) || 365;

  // Try fetching TEDPIX — will attempt each variant
  const { data: benchHistory, loading: benchmarkLoading } = useApiData(
    `/api/market/indices/${encodeURIComponent(TEDPIX_NAMES[0])}/history?days=${days}`,
    { deps: [days], initialValue: [] }
  );

  const metrics = useMemo(() => {
    if (!stockHistory || stockHistory.length < 5) return null;
    return computeAllMetrics({
      stockHistory,
      benchHistory: benchHistory.length > 0 ? benchHistory : null,
      rfAnnual,
    });
  }, [stockHistory, benchHistory, rfAnnual]);

  const insufficientData = stockHistory && stockHistory.length < 30;

  return { metrics, benchmarkLoading, insufficientData };
}
