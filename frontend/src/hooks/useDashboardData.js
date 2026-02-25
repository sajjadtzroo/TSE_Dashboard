import { useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useMarketStats, useMarketOverview, useMarketIndexHistory,
  useDollarHistory, useDollarRate, useGoldHistory, useGoldLatest,
} from './useMarketData';
import { isFundSector } from '../utils/sectorUtils';

// ── Sub-hook 1: Stats, loading, error, refresh, auto-refresh ────────────────
export function useDashboardStats() {
  const queryClient = useQueryClient();
  const [autoRefresh, setAutoRefresh] = useState(0);

  const [indexRange, setIndexRange] = useState(() => {
    try { return localStorage.getItem('dashboard-index-range') || '30'; }
    catch { return '30'; }
  });

  const [sectionsExpanded, setSectionsExpanded] = useState(() => {
    try {
      const saved = localStorage.getItem('dashboard-sections-expanded');
      return saved ? JSON.parse(saved) : { tedpix: true, charts: true, heatmap: true, table: true };
    } catch { return { tedpix: true, charts: true, heatmap: true, table: true }; }
  });

  const toggleSection = useCallback((key) => {
    setSectionsExpanded(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem('dashboard-sections-expanded', JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  const handleIndexRangeChange = useCallback((value) => {
    setIndexRange(value);
    try { localStorage.setItem('dashboard-index-range', value); } catch {}
  }, []);

  const refetchInterval = autoRefresh > 0 ? Math.max(autoRefresh, 10) * 1000 : false;

  const { data: stats, dataUpdatedAt: statsUpdatedAt } = useMarketStats({ refetchInterval });
  const { data: rawMarket = [], isLoading: marketLoading, error: marketError } = useMarketOverview({ refetchInterval, limit: 2000 });
  const { data: tedpixHistory = [], isLoading: tedpixLoading } = useMarketIndexHistory('TEDPIX', { days: Number(indexRange) });
  const { data: equalWeightTotalHistory = [], isLoading: ewTotalLoading } =
    useMarketIndexHistory('شاخص کل (هم وزن)', { days: Number(indexRange) });
  const { data: equalWeightPriceHistory = [], isLoading: ewPriceLoading } =
    useMarketIndexHistory('شاخص قیمت (هم وزن)', { days: Number(indexRange) });

  const recentData = useMemo(
    () => rawMarket.filter(item => !isFundSector(item.sector_name_fa)),
    [rawMarket]
  );
  const loading = marketLoading;
  const error = marketError?.message || null;
  const lastUpdated = statsUpdatedAt ? new Date(statsUpdatedAt) : null;

  const fetchData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['stats'] });
    queryClient.invalidateQueries({ queryKey: ['market-overview'] });
  }, [queryClient]);

  const sortedByChange = useMemo(
    () => [...recentData].sort((a, b) => (b.close_change_pct ?? 0) - (a.close_change_pct ?? 0)),
    [recentData]
  );

  const advancers = useMemo(() => recentData.filter((d) => d.close_change_pct > 0).length, [recentData]);
  const decliners = useMemo(() => recentData.filter((d) => d.close_change_pct < 0).length, [recentData]);
  const unchanged = recentData.length - advancers - decliners;

  const tedpixTrend = useMemo(() => {
    if (!tedpixHistory || tedpixHistory.length === 0) return 0;
    const first = tedpixHistory[0]?.close;
    const last = tedpixHistory[tedpixHistory.length - 1]?.close;
    if (!first || !last) return 0;
    return ((last - first) / first * 100).toFixed(2);
  }, [tedpixHistory]);

  const ewTotalTrend = useMemo(() => {
    if (!equalWeightTotalHistory.length) return 0;
    const first = equalWeightTotalHistory[0]?.close;
    const last = equalWeightTotalHistory[equalWeightTotalHistory.length - 1]?.close;
    if (!first || !last) return 0;
    return ((last - first) / first * 100).toFixed(2);
  }, [equalWeightTotalHistory]);

  const ewPriceTrend = useMemo(() => {
    if (!equalWeightPriceHistory.length) return 0;
    const first = equalWeightPriceHistory[0]?.close;
    const last = equalWeightPriceHistory[equalWeightPriceHistory.length - 1]?.close;
    if (!first || !last) return 0;
    return ((last - first) / first * 100).toFixed(2);
  }, [equalWeightPriceHistory]);

  const { newHighs, newLows } = useMemo(() => {
    const highs = recentData.filter(d => d.high === d.close && d.close_change_pct > 2).length;
    const lows = recentData.filter(d => d.low === d.close && d.close_change_pct < -2).length;
    return { newHighs: highs, newLows: lows };
  }, [recentData]);

  const avgPE = useMemo(() => {
    const validPE = recentData.filter(d => d.pe_ratio && d.pe_ratio > 0 && d.pe_ratio < 100).map(d => d.pe_ratio);
    return validPE.length ? (validPE.reduce((a, b) => a + b, 0) / validPE.length).toFixed(1) : null;
  }, [recentData]);

  const liquidityScore = useMemo(() => {
    const totalVolume = stats?.total_volume_today || 0;
    const activeSecurities = stats?.securities_with_data_today || 1;
    const baseline = 1e9;
    return Math.min(100, Math.round((totalVolume / activeSecurities / baseline) * 100));
  }, [stats]);

  return {
    stats, recentData, loading, error, lastUpdated, fetchData,
    autoRefresh, setAutoRefresh,
    sectionsExpanded, toggleSection,
    indexRange, handleIndexRangeChange, tedpixHistory, tedpixLoading, tedpixTrend,
    equalWeightTotalHistory, ewTotalLoading, ewTotalTrend,
    equalWeightPriceHistory, ewPriceLoading, ewPriceTrend,
    sortedByChange, advancers, decliners, unchanged,
    newHighs, newLows, avgPE, liquidityScore,
  };
}

// ── Sub-hook 2: Chart data (volume by sector, bar, pie, sparklines, tedpix) ─
export function useDashboardCharts(stats, recentData, sortedByChange, tedpixHistory, equalWeightTotalHistory, equalWeightPriceHistory) {
  const kpiSparklines = useMemo(() => {
    const key = 'kpi-sparkline-history';
    let history = [];
    try {
      const saved = sessionStorage.getItem(key);
      history = saved ? JSON.parse(saved) : [];
    } catch { history = []; }

    if (stats) {
      const entry = {
        volume: stats.total_volume_today || 0,
        value: stats.total_value_today || 0,
      };
      const last = history[history.length - 1];
      if (!last || last.volume !== entry.volume || last.value !== entry.value) {
        history = [...history, entry].slice(-7);
        try { sessionStorage.setItem(key, JSON.stringify(history)); } catch {}
      }
    }

    const tedpixSparkline = tedpixHistory && tedpixHistory.length > 1
      ? tedpixHistory.map(d => d.close).filter(Boolean)
      : [];

    return {
      tedpix: tedpixSparkline,
      volume: history.map(h => h.volume),
      value: history.map(h => h.value),
    };
  }, [stats, tedpixHistory]);

  const volumeBySector = useMemo(() => {
    const sectorMap = {};
    recentData.forEach(d => {
      const sector = d.sector_name_fa || 'سایر';
      if (!sectorMap[sector]) sectorMap[sector] = 0;
      sectorMap[sector] += d.volume || 0;
    });
    return Object.entries(sectorMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([sector, vol]) => ({
        x: sector.length > 15 ? sector.slice(0, 15) + '...' : sector,
        y: Math.round(vol / 1e9),
      }));
  }, [recentData]);

  const { barData, pieData, totalSectorCount } = useMemo(() => {
    const top10 = sortedByChange.slice(0, 5).concat(sortedByChange.slice(-5).reverse());
    const bar = top10.map((d) => ({
      x: d.symbol,
      y: Number((d.close_change_pct ?? 0).toFixed(2)),
    }));

    const sectorMap = {};
    recentData.forEach((d) => {
      const s = d.sector_name_fa || 'Other';
      if (!sectorMap[s]) sectorMap[s] = { count: 0 };
      sectorMap[s].count += 1;
    });
    const sectorEntries = Object.entries(sectorMap).sort((a, b) => b[1].count - a[1].count).slice(0, 8);
    const pie = sectorEntries.map(([s, v]) => ({ x: s.length > 12 ? s.slice(0, 12) + '...' : s, y: v.count }));
    const total = sectorEntries.reduce((a, [, v]) => a + v.count, 0);

    return { barData: bar, pieData: pie, totalSectorCount: total };
  }, [sortedByChange, recentData]);

  const tedpixChartData = useMemo(() => {
    if (!tedpixHistory || tedpixHistory.length === 0) return [];
    return tedpixHistory.map(d => ({ x: d.date?.slice(5) || '', y: d.close }));
  }, [tedpixHistory]);

  const ewTotalChartData = useMemo(() => {
    if (!equalWeightTotalHistory.length) return [];
    return equalWeightTotalHistory.map(d => ({ x: d.date?.slice(5) || '', y: d.close }));
  }, [equalWeightTotalHistory]);

  const ewPriceChartData = useMemo(() => {
    if (!equalWeightPriceHistory.length) return [];
    return equalWeightPriceHistory.map(d => ({ x: d.date?.slice(5) || '', y: d.close }));
  }, [equalWeightPriceHistory]);

  return { kpiSparklines, volumeBySector, barData, pieData, totalSectorCount, tedpixChartData, ewTotalChartData, ewPriceChartData };
}

// ── Sub-hook 3: Filter state + derived filtered data ────────────────────────
export function useDashboardFilters(recentData, advancers, decliners) {
  const [activeFilter, setActiveFilter] = useState(() => {
    try { return localStorage.getItem('dashboard-active-filter') || 'all'; }
    catch { return 'all'; }
  });

  const handleFilterChange = useCallback((filter) => {
    setActiveFilter(filter);
    try { localStorage.setItem('dashboard-active-filter', filter); } catch {}
  }, []);

  const filteredByCategory = useMemo(() => {
    const volumes = recentData.map(d => d.volume ?? 0).sort((a, b) => a - b);
    const medianVolume = volumes.length ? volumes[Math.floor(volumes.length / 2)] : 0;
    switch (activeFilter) {
      case 'gainers': return recentData.filter(d => d.close_change_pct > 2);
      case 'losers': return recentData.filter(d => d.close_change_pct < -2);
      case 'positive': return recentData.filter(d => d.close_change_pct > 0);
      case 'negative': return recentData.filter(d => d.close_change_pct < 0);
      case 'high-volume': return recentData.filter(d => d.volume > medianVolume);
      default: return recentData;
    }
  }, [activeFilter, recentData]);

  const filterCounts = useMemo(() => {
    const volumes = recentData.map(d => d.volume ?? 0).sort((a, b) => a - b);
    const medianVolume = volumes.length ? volumes[Math.floor(volumes.length / 2)] : 0;
    return {
      all: recentData.length,
      positive: advancers,
      negative: decliners,
      gainers: recentData.filter(d => d.close_change_pct > 2).length,
      losers: recentData.filter(d => d.close_change_pct < -2).length,
      'high-volume': recentData.filter(d => d.volume > medianVolume).length,
    };
  }, [recentData, advancers, decliners]);

  return { activeFilter, handleFilterChange, filteredByCategory, filterCounts };
}

// ── Sub-hook 4: Currency & gold chart data ───────────────────────────────────
export function useDashboardCurrency() {
  const { data: dollarHistory, isLoading: dollarHistLoading } = useDollarHistory(7);
  const { data: dollarRate }  = useDollarRate({ staleTime: 15_000 });
  const { data: goldHistory,  isLoading: goldHistLoading }  = useGoldHistory(7);
  const { data: goldLatest }  = useGoldLatest({ staleTime: 15_000 });

  return {
    dollarSpotChartData:  dollarHistory?.spot    ?? [],
    dollarSpotTrend:      dollarRate?.spot?.change_pct    ?? 0,
    dollarSpotLoading:    dollarHistLoading,

    dollarFwdChartData:   dollarHistory?.forward ?? [],
    dollarFwdTrend:       dollarRate?.forward?.change_pct ?? 0,
    dollarFwdLoading:     dollarHistLoading,

    goldChartData:        goldHistory ?? [],
    goldTrend:            goldLatest?.GOLD_18K?.change_pct_1h ?? 0,
    goldLoading:          goldHistLoading,
  };
}

// ── Backward-compatible composition wrapper ─────────────────────────────────
export default function useDashboardData() {
  const statsHook = useDashboardStats();
  const chartsHook = useDashboardCharts(
    statsHook.stats,
    statsHook.recentData,
    statsHook.sortedByChange,
    statsHook.tedpixHistory,
    statsHook.equalWeightTotalHistory,
    statsHook.equalWeightPriceHistory,
  );
  const filtersHook = useDashboardFilters(
    statsHook.recentData, statsHook.advancers, statsHook.decliners,
  );
  const currencyHook = useDashboardCurrency();

  return {
    ...statsHook,
    ...chartsHook,
    ...filtersHook,
    ...currencyHook,
  };
}
