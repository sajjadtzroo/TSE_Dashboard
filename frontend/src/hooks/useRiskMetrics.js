import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/apiClient';
import { computeAllMetrics } from '../utils/riskMetrics/index.js';
import { TEDPIX_NAMES } from '../constants/market';

/**
 * Hook that computes all risk/CAPM metrics for a stock.
 * Fetches TEDPIX history from the new endpoint.
 */
export default function useRiskMetrics(symbol, stockHistory, selectedDuration, rfAnnual = 0.23) {
  const days = Number(selectedDuration) || 365;

  // Try fetching TEDPIX — will attempt each variant
  const { data: benchHistory = [], isLoading: benchmarkLoading } = useQuery({
    queryKey: ['market-index-history', TEDPIX_NAMES[0], days],
    queryFn: () => api.get(`/market/indices/${encodeURIComponent(TEDPIX_NAMES[0])}/history`, { params: { days } }).then(r => r.data),
    staleTime: 10 * 60 * 1000,
  });

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
