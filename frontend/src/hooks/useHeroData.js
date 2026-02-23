import { useMemo } from 'react';
import { useMarketIndices, useMarketStats, useMarketOverview, useMarketIndexHistory } from './useMarketData';
import { useCryptoMarket } from './useCryptoData';
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
  const { data: history, isLoading: historyLoading } = useMarketIndexHistory(TEDPIX_NAMES[0], {
    days: 7,
    staleTime: 30 * 60 * 1000,
  });
  const { data: cryptoMarket } = useCryptoMarket({ retry: 1 });

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

    // ── TEPIX chart history (last 30 trading days) ──
    const chartPoints = (history || [])
      .filter((r) => r.close != null)
      .map((r) => ({ date: r.date, value: r.close }));

    // ── Top movers: top 3 by absolute |close_change_pct| ──
    const topMovers = (overview || [])
      .filter((s) => s.close_change_pct != null)
      .sort((a, b) => Math.abs(b.close_change_pct) - Math.abs(a.close_change_pct))
      .slice(0, 3)
      .map((s) => ({ symbol: s.symbol, changePct: s.close_change_pct }));

    // ── Crypto cards: BTC + ETH ──
    const cryptoCards = ['BTC', 'ETH'].map((sym) => {
      const coin = (cryptoMarket || []).find((c) => c.symbol === sym) ?? null;
      return coin
        ? {
            symbol: sym,
            name_fa: coin.name_fa,
            price: coin.last_price,
            changePct: coin.price_change_pct_24h,
          }
        : null;
    }).filter(Boolean);

    // ── Breadth: gainers vs losers count ──
    const breadth = (overview || []).reduce(
      (acc, s) => {
        if (s.close_change_pct == null) return acc;
        if (s.close_change_pct > 0) acc.gainers++;
        else if (s.close_change_pct < 0) acc.losers++;
        return acc;
      },
      { gainers: 0, losers: 0 },
    );

    return {
      tepixValue,
      tepixChangePct,
      tepixChangeAbs,
      totalValueToday,
      volumeBars,
      marketStatus,
      trending,
      chartPoints,
      topMovers,
      breadth,
      cryptoCards,
      isLoading: indicesLoading || statsLoading || overviewLoading || historyLoading,
    };
  }, [indices, stats, overview, history, cryptoMarket, indicesLoading, statsLoading, overviewLoading, historyLoading]);
}
