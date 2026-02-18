import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import useApiData from './useApiData';
import { isFundSector } from '../utils/sectorUtils';

export default function useDashboardData() {
  const [stats, setStats] = useState(null);
  const [recentData, setRecentData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  const timerRef = useRef(null);

  const [indexRange, setIndexRange] = useState(() => {
    try {
      return localStorage.getItem('dashboard-index-range') || '30';
    } catch {
      return '30';
    }
  });

  const [sectionsExpanded, setSectionsExpanded] = useState(() => {
    try {
      const saved = localStorage.getItem('dashboard-sections-expanded');
      return saved ? JSON.parse(saved) : { tedpix: true, charts: true, heatmap: true, table: true };
    } catch {
      return { tedpix: true, charts: true, heatmap: true, table: true };
    }
  });

  const [activeFilter, setActiveFilter] = useState(() => {
    try {
      return localStorage.getItem('dashboard-active-filter') || 'all';
    } catch {
      return 'all';
    }
  });

  const toggleSection = useCallback((key) => {
    setSectionsExpanded(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem('dashboard-sections-expanded', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const handleFilterChange = useCallback((filter) => {
    setActiveFilter(filter);
    try {
      localStorage.setItem('dashboard-active-filter', filter);
    } catch {}
  }, []);

  const handleIndexRangeChange = useCallback((value) => {
    setIndexRange(value);
    try {
      localStorage.setItem('dashboard-index-range', value);
    } catch {}
  }, []);

  const { data: tedpixHistory, loading: tedpixLoading } = useApiData(
    `/api/market/indices/TEDPIX/history?days=${indexRange}`,
    { deps: [indexRange], initialValue: [] }
  );

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, marketRes] = await Promise.all([
        axios.get('/api/stats'),
        axios.get('/api/market-overview'),
      ]);
      setStats(statsRes.data);
      setRecentData(marketRes.data.filter((item) => !isFundSector(item.sector_name_fa)));
      setError(null);
      setLastUpdated(new Date());
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { setLoading(true); fetchData(); }, [fetchData]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoRefresh > 0) timerRef.current = setInterval(fetchData, autoRefresh * 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [autoRefresh, fetchData]);

  // Derived data
  const sortedByChange = useMemo(
    () => [...recentData].sort((a, b) => (b.close_change_pct ?? 0) - (a.close_change_pct ?? 0)),
    [recentData]
  );

  const advancers = useMemo(() => recentData.filter((d) => d.close_change_pct > 0).length, [recentData]);
  const decliners = useMemo(() => recentData.filter((d) => d.close_change_pct < 0).length, [recentData]);
  const unchanged = recentData.length - advancers - decliners;

  const tedpixTrend = useMemo(() => {
    if (!tedpixHistory || tedpixHistory.length === 0) return 0;
    const first = tedpixHistory[0]?.index_value;
    const last = tedpixHistory[tedpixHistory.length - 1]?.index_value;
    if (!first || !last) return 0;
    return ((last - first) / first * 100).toFixed(2);
  }, [tedpixHistory]);

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
    return tedpixHistory.map(d => ({ x: d.date?.slice(5) || '', y: d.index_value }));
  }, [tedpixHistory]);

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

  return {
    // Raw data
    stats, recentData, loading, error, lastUpdated, fetchData,
    // Auto-refresh
    autoRefresh, setAutoRefresh,
    // Section expansion
    sectionsExpanded, toggleSection,
    // TEDPIX
    indexRange, handleIndexRangeChange, tedpixHistory, tedpixLoading, tedpixTrend, tedpixChartData,
    // Derived
    sortedByChange, advancers, decliners, unchanged,
    newHighs, newLows, avgPE, liquidityScore,
    volumeBySector, barData, pieData, totalSectorCount,
    // Filters
    activeFilter, handleFilterChange, filteredByCategory, filterCounts,
  };
}
