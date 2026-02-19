import { useMemo } from 'react';
import { useMarketIndices, useMarketIndexHistory, useMarketStats } from './useMarketData';

/**
 * TEDPIX summary for the sidebar Market Pulse widget.
 * Reuses TanStack Query cache — no duplicate requests if Dashboard already fetched.
 */
export function useTedpixSummary() {
  const { data: indices } = useMarketIndices();
  const { data: history } = useMarketIndexHistory('TEDPIX', { days: 7 });

  return useMemo(() => {
    const tedpix = Array.isArray(indices)
      ? indices.find((i) => i.index_name === 'TEDPIX' || i.name === 'TEDPIX')
      : null;

    const value = tedpix?.index_value ?? tedpix?.value ?? null;
    const changePct = tedpix?.change_pct ?? tedpix?.index_change_pct ?? null;

    const history7d = Array.isArray(history)
      ? history.map((h) => h.index_value ?? h.value).filter(Boolean)
      : [];

    return { value, changePct, history7d };
  }, [indices, history]);
}

/**
 * Quick stats (advancers / decliners / unchanged / totalVolume) for sidebar widget.
 */
export function useMarketQuickStats() {
  const { data: stats } = useMarketStats();

  return useMemo(() => {
    if (!stats) return { advancers: 0, decliners: 0, unchanged: 0, totalVolume: 0 };

    return {
      advancers: stats.advancers ?? 0,
      decliners: stats.decliners ?? 0,
      unchanged: stats.unchanged ?? 0,
      totalVolume: stats.total_volume_today ?? 0,
    };
  }, [stats]);
}
