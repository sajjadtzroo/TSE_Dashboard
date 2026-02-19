import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

/**
 * Batch-fetches 7-day history for a list of symbols and returns a Map<symbol, number[]>.
 * Only fetches for the given symbols (current page). Cache survives pagination.
 *
 * @param {string[]} symbols - Array of stock symbols to fetch sparkline data for
 * @returns {{ sparklines: Map<string, number[]>, isLoading: boolean }}
 */
export default function useSparklineData(symbols = []) {
  const queries = useQueries({
    queries: symbols.map((symbol) => ({
      queryKey: ['sparkline', symbol, 7],
      queryFn: () =>
        api
          .get(`/stocks/${encodeURIComponent(symbol)}/history`, { params: { days: 7 } })
          .then((r) => ({ symbol, data: r.data })),
      staleTime: 5 * 60 * 1000,
      enabled: !!symbol,
    })),
  });

  const sparklines = useMemo(() => {
    const map = new Map();
    queries.forEach((q) => {
      if (q.data) {
        const closes = q.data.data?.map?.((d) => d.close).filter(Boolean) || [];
        if (closes.length >= 2) {
          map.set(q.data.symbol, closes);
        }
      }
    });
    return map;
  }, [queries]);

  const isLoading = queries.some((q) => q.isLoading);

  return { sparklines, isLoading };
}
