import { useMemo } from 'react';
import { useMarketIndices, useMarketStats, useMarketOverview } from './useMarketData';
import { TEDPIX_NAMES } from '../constants/market';
import { getTehranMarketStatus } from '../utils/marketStatus';

/**
 * Encapsulates all hero-section data extraction into one hook.
 * Reuses existing TanStack Query hooks — shares cache with Dashboard/LandingPage.
 */
export function useHeroData() {
  const { data: indices, isLoading: indicesLoading } = useMarketIndices();
  const { data: stats, isLoading: statsLoading } = useMarketStats();
  const { data: overview, isLoading: overviewLoading } = useMarketOverview({ limit: 15 });

  return useMemo(() => {
    // ── TEPIX from indices ──
    const tepixRow = (indices || []).find((r) =>
      TEDPIX_NAMES.some((n) => r.index_name === n || r.name === n),
    );
    const tepixValue = tepixRow?.index_value ?? tepixRow?.value ?? null;
    const tepixChangePct = tepixRow?.index_change_pct ?? tepixRow?.change_pct ?? null;
    const tepixChangeAbs = tepixRow?.index_change ?? tepixRow?.change ?? null;

    // ── Trade value from stats ──
    const totalValueToday = stats?.total_value_today ?? null;

    // ── Volume bars: top 6 stocks by volume, normalized 0-1 ──
    let volumeBars = null;
    if (overview?.length) {
      const sorted = [...overview]
        .filter((s) => s.volume != null && s.volume > 0)
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 6);
      if (sorted.length) {
        const max = sorted[0].volume;
        volumeBars = sorted.map((s) => s.volume / max);
      }
    }

    // ── Market status ──
    const marketStatus = getTehranMarketStatus();

    // ── Trending: top 4 gainers ──
    const trending = (overview || [])
      .filter((s) => s.close_change_pct != null && s.close_change_pct > 0)
      .sort((a, b) => b.close_change_pct - a.close_change_pct)
      .slice(0, 4)
      .map((s) => ({ symbol: s.symbol, changePct: s.close_change_pct }));

    return {
      tepixValue,
      tepixChangePct,
      tepixChangeAbs,
      totalValueToday,
      volumeBars,
      marketStatus,
      trending,
      isLoading: indicesLoading || statsLoading || overviewLoading,
    };
  }, [indices, stats, overview, indicesLoading, statsLoading, overviewLoading]);
}
