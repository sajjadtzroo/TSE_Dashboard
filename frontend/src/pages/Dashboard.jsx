import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Badge, Group, SimpleGrid, Text, Progress, SegmentedControl, Collapse, ActionIcon, Box,
} from '@mantine/core';
import {
  IconBuildingBank, IconChartLine, IconVolume, IconCalendar,
  IconTrendingUp, IconTrendingDown,
  IconPlayerPlay, IconPlayerPause,
  IconArrowUpRight, IconArrowDownRight,
  IconStar, IconStarFilled,
  IconChevronDown, IconDroplet,
} from '@tabler/icons-react';
import axios from 'axios';
import RallyMainCard from '../components/RallyMainCard';
import RallyKPICard from '../components/RallyKPICard';
import RallyListCard from '../components/RallyListCard';
import RallyDataTable from '../components/RallyDataTable';
import RefreshButton from '../components/RefreshButton';
import DataFreshness from '../components/DataFreshness';
import PageHeader from '../components/PageHeader';
import ExportButton from '../components/ExportButton';
import RallyKPISkeleton from '../components/RallyKPISkeleton';
import RallyChartSkeleton from '../components/RallyChartSkeleton';
import RallyTableSkeleton from '../components/RallyTableSkeleton';
import useWatchlist from '../hooks/useWatchlist';
import usePagination from '../hooks/usePagination';
import useApiData from '../hooks/useApiData';
import RallyBarChart from '../components/charts/RallyBarChart';
import RallyPieChart from '../components/charts/RallyPieChart';
import RallyAreaChart from '../components/charts/RallyAreaChart';
import RallyTreemap from '../components/charts/RallyTreemap';
import { RALLY_COLOR_SCALE } from '../components/charts/RallyPieChart';
import PercentChangeCell from '../components/cells/PercentChangeCell';
import TickerTape from '../components/TickerTape';
import rallyColors from '../theme/rallyColors';
import { isFundSector } from '../utils/sectorUtils';
import { formatNum, toPersianNum, formatTrillion } from '../utils/formatUtils';

const AUTO_REFRESH_INTERVALS = [
  { label: 'خاموش', seconds: 0 },
  { label: '30s', seconds: 30 },
  { label: '1m', seconds: 60 },
  { label: '5m', seconds: 300 },
];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentData, setRecentData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  const timerRef = useRef(null);
  const navigate = useNavigate();
  const { toggleSymbol, isWatched } = useWatchlist();

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

  const sortedByChange = [...recentData].sort((a, b) => (b.close_change_pct ?? 0) - (a.close_change_pct ?? 0));
  const topGainers = sortedByChange.filter((d) => d.close_change_pct > 0).slice(0, 5);
  const topLosers = sortedByChange.filter((d) => d.close_change_pct < 0).reverse().slice(0, 5);
  const advancers = recentData.filter((d) => d.close_change_pct > 0).length;
  const decliners = recentData.filter((d) => d.close_change_pct < 0).length;
  const unchanged = recentData.length - advancers - decliners;
  const breadthTotal = advancers + decliners + unchanged || 1;
  const advPct = Math.round((advancers / breadthTotal) * 100);
  const decPct = Math.round((decliners / breadthTotal) * 100);

  const tedpixTrend = useMemo(() => {
    if (!tedpixHistory || tedpixHistory.length === 0) return 0;
    const first = tedpixHistory[0]?.index_value;
    const last = tedpixHistory[tedpixHistory.length - 1]?.index_value;
    if (!first || !last) return 0;
    return ((last - first) / first * 100).toFixed(2);
  }, [tedpixHistory]);

  const { newHighs, newLows } = useMemo(() => {
    const highs = recentData.filter(d =>
      d.high === d.close && d.close_change_pct > 2
    ).length;
    const lows = recentData.filter(d =>
      d.low === d.close && d.close_change_pct < -2
    ).length;
    return { newHighs: highs, newLows: lows };
  }, [recentData]);

  const avgPE = useMemo(() => {
    const validPE = recentData
      .filter(d => d.pe_ratio && d.pe_ratio > 0 && d.pe_ratio < 100)
      .map(d => d.pe_ratio);
    return validPE.length
      ? (validPE.reduce((a, b) => a + b, 0) / validPE.length).toFixed(1)
      : null;
  }, [recentData]);

  const liquidityScore = useMemo(() => {
    const totalVolume = stats?.total_volume_today || 0;
    const activeSecurities = stats?.securities_with_data_today || 1;
    const avgVolumePerSecurity = totalVolume / activeSecurities;
    const baseline = 1e9;
    return Math.min(100, Math.round((avgVolumePerSecurity / baseline) * 100));
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
        y: Math.round(vol / 1e9)
      }));
  }, [recentData]);

  const filteredByCategory = useMemo(() => {
    const volumes = recentData.map(d => d.volume).sort((a, b) => a - b);
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

  const sectorMap = {};
  recentData.forEach((d) => {
    const s = d.sector_name_fa || 'Other';
    if (!sectorMap[s]) sectorMap[s] = { count: 0 };
    sectorMap[s].count += 1;
  });
  const sectorEntries = Object.entries(sectorMap).sort((a, b) => b[1].count - a[1].count).slice(0, 8);

  const top10 = sortedByChange.slice(0, 5).concat(sortedByChange.slice(-5).reverse());
  const barData = top10.map((d) => ({
    x: d.symbol,
    y: Number(d.close_change_pct?.toFixed(2)) || 0,
  }));

  const pieData = sectorEntries.map(([s, v]) => ({ x: s.length > 12 ? s.slice(0, 12) + '...' : s, y: v.count }));
  const totalSectorCount = sectorEntries.reduce((a, [, v]) => a + v.count, 0);

  const tedpixChartData = useMemo(() => {
    if (!tedpixHistory || tedpixHistory.length === 0) return [];
    return tedpixHistory.map(d => ({
      x: d.date?.slice(5) || '',
      y: d.index_value
    }));
  }, [tedpixHistory]);

  const columns = [
    {
      accessor: '_star',
      title: '',
      width: 36,
      render: (r) => {
        const watched = isWatched(r.symbol);
        const Icon = watched ? IconStarFilled : IconStar;
        return <Icon size={16} color={watched ? rallyColors.yellow : rallyColors.textDimmed} style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); toggleSymbol(r.symbol); }} />;
      },
    },
    { accessor: 'symbol', title: 'نماد', width: 80 },
    { accessor: 'name_fa', title: 'نام', width: 150 },
    { accessor: 'close', title: 'قیمت پایانی', width: 100, textAlign: 'end', render: (r) => formatNum(r.close) },
    { accessor: 'close_change_pct', title: 'تغییر ٪', width: 90, textAlign: 'end', render: (r) => <PercentChangeCell value={r.close_change_pct} /> },
    { accessor: 'volume', title: 'حجم', width: 110, textAlign: 'end', render: (r) => formatNum(r.volume) },
  ];

  const { paged, page, setPage, perPage, setPerPage, totalRecords } = usePagination(filteredByCategory);

  if (loading && !recentData.length) {
    return (
      <>
        <PageHeader title="داشبورد بازار" />
        <SimpleGrid cols={{ base: 1, xs: 2, sm: 2, md: 3, lg: 4, xl: 7 }} mb="md">
          {[1,2,3,4,5,6,7].map(i => <RallyKPISkeleton key={i} />)}
        </SimpleGrid>
        <RallyMainCard mb="md"><RallyChartSkeleton height={280} /></RallyMainCard>
        <RallyMainCard noPadding><RallyTableSkeleton rows={8} columns={5} /></RallyMainCard>
      </>
    );
  }

  if (error && !recentData.length) {
    return <Alert color="red" title="خطا در بارگذاری داده‌ها">{error}</Alert>;
  }

  return (
    <>
      {sortedByChange.length > 0 && (
        <Box display={{ base: 'none', sm: 'block' }}>
          <TickerTape
            items={sortedByChange.slice(0, 20).map((d) => ({
              symbol: d.symbol,
              change: d.close_change_pct,
            }))}
          />
        </Box>
      )}

      <PageHeader title="داشبورد بازار">
        {autoRefresh > 0
          ? <IconPlayerPause size={14} color={rallyColors.green} />
          : <IconPlayerPlay size={14} color={rallyColors.textSecondary} />
        }
        {AUTO_REFRESH_INTERVALS.map((opt) => (
          <Badge key={opt.seconds} size="sm" variant={autoRefresh === opt.seconds ? 'filled' : 'light'} color={autoRefresh === opt.seconds ? 'rally-green' : 'gray'} style={{ cursor: 'pointer' }} onClick={() => setAutoRefresh(opt.seconds)}>
            {opt.label}
          </Badge>
        ))}
        <DataFreshness lastUpdated={lastUpdated} />
        <ExportButton filename="dashboard" columns={columns} records={recentData} />
        <RefreshButton onRefreshComplete={fetchData} />
      </PageHeader>

      <SimpleGrid cols={{ base: 1, xs: 2, sm: 2, md: 3, lg: 4, xl: 7 }} spacing={{ base: 'sm', md: 'md' }} mb="md">
        <RallyKPICard
          title="کل نمادها"
          value={formatNum(stats?.total_securities)}
          icon={IconBuildingBank}
          color={rallyColors.darkGreen}
          bgColor={rallyColors.darkGreen}
        />
        <RallyKPICard
          title="فعال امروز"
          value={formatNum(stats?.securities_with_data_today)}
          icon={IconChartLine}
          color={rallyColors.purple}
          bgColor="#6D28D9"
        />
        <RallyKPICard
          title="حجم کل"
          value={stats?.total_volume_today ? toPersianNum((stats.total_volume_today / 1e9).toFixed(1)) + 'B' : toPersianNum('0')}
          icon={IconVolume}
          color={rallyColors.green}
          bgColor="#047857"
        />
        <RallyKPICard
          title="ارزش کل"
          value={stats?.total_value_today ? toPersianNum((stats.total_value_today / 1e12).toFixed(2)) + 'T' : toPersianNum('0')}
          icon={IconCalendar}
          color={rallyColors.red}
          bgColor="#DC2626"
          subtitle={stats?.latest_date || ''}
        />
        <RallyKPICard
          title="رکوردهای جدید"
          value={`${toPersianNum(newHighs)} / ${toPersianNum(newLows)}`}
          subtitle="بالاترین / پایین‌ترین"
          icon={IconTrendingUp}
          color={rallyColors.purple}
          bgColor="#6D28D9"
        />
        <RallyKPICard
          title="میانگین P/E بازار"
          value={avgPE ? toPersianNum(avgPE) : '-'}
          subtitle="نسبت قیمت به سود"
          icon={IconChartLine}
          color={rallyColors.blue}
          bgColor="#0284C7"
        />
        <RallyKPICard
          title="نقدشوندگی بازار"
          value={toPersianNum(liquidityScore)}
          subtitle="از ۱۰۰"
          icon={IconDroplet}
          color={rallyColors.green}
          bgColor="#047857"
        />
      </SimpleGrid>

      <RallyMainCard mb="md">
        <Group gap="md" align="center" wrap="wrap">
          <Text fw={600} size="sm" miw={100}>وسعت بازار</Text>
          <div style={{ flex: 1, minWidth: 200 }}>
            <Progress.Root size="sm" radius="xl">
              <Progress.Section value={advPct} color={rallyColors.green} />
              <Progress.Section value={100 - advPct - decPct} color="gray" />
              <Progress.Section value={decPct} color={rallyColors.orange} />
            </Progress.Root>
          </div>
          <Group gap="xs">
            <Badge size="sm" variant="light" color="rally-green" leftSection={<IconTrendingUp size={12} />}>{formatNum(advancers)}</Badge>
            <Badge size="sm" variant="light" color="gray">{formatNum(unchanged)}</Badge>
            <Badge size="sm" variant="light" color="rally-orange" leftSection={<IconTrendingDown size={12} />}>{formatNum(decliners)}</Badge>
          </Group>
        </Group>
      </RallyMainCard>

      <RallyMainCard
        title={
          <Group gap="xs">
            <Text>روند شاخص کل (TEDPIX)</Text>
            <Badge color={Number(tedpixTrend) > 0 ? 'green' : 'red'} variant="light">
              {Number(tedpixTrend) > 0 ? '+' : ''}{toPersianNum(tedpixTrend)}%
            </Badge>
          </Group>
        }
        secondary={
          <Group gap="xs">
            <SegmentedControl
              value={indexRange}
              onChange={handleIndexRangeChange}
              data={[
                { label: '۱ ماه', value: '30' },
                { label: '۳ ماه', value: '90' },
                { label: '۶ ماه', value: '180' },
                { label: '۱ سال', value: '365' }
              ]}
              size="xs"
            />
            <ActionIcon
              variant="subtle"
              onClick={() => toggleSection('tedpix')}
              size="sm"
            >
              <IconChevronDown
                size={16}
                style={{ transform: sectionsExpanded.tedpix ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
              />
            </ActionIcon>
          </Group>
        }
        fullscreenable
        mb="md"
      >
        <Collapse in={sectionsExpanded.tedpix}>
          {tedpixLoading ? (
            <RallyChartSkeleton height={200} />
          ) : tedpixChartData.length > 0 ? (
            <RallyAreaChart
              data={tedpixChartData}
              fillColor={rallyColors.blue}
              height={200}
              zoomable={true}
              yFormatter={(v) => formatTrillion(v)}
            />
          ) : (
            <Text c="dimmed" ta="center" py="xl">داده شاخص موجود نیست</Text>
          )}
        </Collapse>
      </RallyMainCard>

      <RallyMainCard
        title="نمودارها و آمار"
        secondary={
          <ActionIcon
            variant="subtle"
            onClick={() => toggleSection('charts')}
            size="sm"
          >
            <IconChevronDown
              size={16}
              style={{ transform: sectionsExpanded.charts ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
            />
          </ActionIcon>
        }
        mb="md"
      >
        <Collapse in={sectionsExpanded.charts}>
          <SimpleGrid cols={{ base: 1, sm: 1, md: 2, lg: 3, xl: 4 }} spacing="md">
            <RallyMainCard title="بیشترین رشد و افت" fullscreenable>
              {barData.length > 0 ? (
                <RallyBarChart
                  data={barData}
                  autoColorByValue
                  height={280}
                  tooltipFormatter={(d) => `${d.x}: ${d.y > 0 ? '+' : ''}${d.y}%`}
                />
              ) : (
                <Text c="dimmed" ta="center" py="xl">داده قیمتی موجود نیست</Text>
              )}
            </RallyMainCard>

            <RallyMainCard title="توزیع حجم معاملات (میلیارد)" fullscreenable>
              {volumeBySector.length > 0 ? (
                <RallyBarChart
                  data={volumeBySector}
                  horizontal={true}
                  height={280}
                  barColor={rallyColors.blue}
                  tooltipFormatter={(d) => `${d.x}: ${toPersianNum(d.y)}B`}
                />
              ) : (
                <Text c="dimmed" ta="center" py="xl">داده حجم موجود نیست</Text>
              )}
            </RallyMainCard>

            <RallyMainCard title="توزیع صنایع" fullscreenable>
              {pieData.length > 0 ? (
                <RallyPieChart
                  data={pieData}
                  colorScale={RALLY_COLOR_SCALE.concat(['#4FC3F7', '#AED581', '#FFB74D'])}
                  centerLabel="مجموع"
                  centerValue={totalSectorCount}
                  height={280}
                  width={280}
                />
              ) : (
                <Text c="dimmed" ta="center" py="xl">داده صنعت موجود نیست</Text>
              )}
            </RallyMainCard>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mantine-spacing-md)' }}>
              <RallyListCard
                title="بیشترین رشد"
                items={topGainers.map((d) => ({
                  key: d.ins_code,
                  label: d.symbol,
                  value: `${d.close_change_pct > 0 ? '+' : ''}${d.close_change_pct?.toFixed(2)}%`,
                  color: rallyColors.green,
                  icon: <IconArrowUpRight size={14} color={rallyColors.green} />,
                }))}
                accentColor={rallyColors.green}
                emptyMessage="بدون نماد مثبت"
                onItemClick={(item) => navigate(`/dashboard/stock/${item.label}`)}
              />
              <RallyListCard
                title="بیشترین افت"
                items={topLosers.map((d) => ({
                  key: d.ins_code,
                  label: d.symbol,
                  value: `${d.close_change_pct?.toFixed(2)}%`,
                  color: rallyColors.orange,
                  icon: <IconArrowDownRight size={14} color={rallyColors.orange} />,
                }))}
                accentColor={rallyColors.orange}
                emptyMessage="بدون نماد منفی"
                onItemClick={(item) => navigate(`/dashboard/stock/${item.label}`)}
              />
            </div>
          </SimpleGrid>
        </Collapse>
      </RallyMainCard>

      <RallyMainCard
        title="نقشه گرمایی بازار"
        fullscreenable
        secondary={
          <Group gap="xs">
            <Text size="xs" c="dimmed">
              اندازه: ارزش بازار | رنگ: تغییر قیمت
            </Text>
            <ActionIcon
              variant="subtle"
              onClick={() => toggleSection('heatmap')}
              size="sm"
            >
              <IconChevronDown
                size={16}
                style={{ transform: sectionsExpanded.heatmap ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
              />
            </ActionIcon>
          </Group>
        }
        mb="md"
      >
        <Collapse in={sectionsExpanded.heatmap}>
          {recentData.filter(d => d.market_cap && d.market_cap > 0).length > 0 ? (
            <RallyTreemap
              data={recentData.filter(d => d.market_cap && d.market_cap > 0)}
              groupBy="sector_name_fa"
              sizeAccessor="market_cap"
              colorAccessor="close_change_pct"
              onCellClick={(d) => navigate(`/dashboard/stock/${d.symbol}`)}
              height={500}
            />
          ) : (
            <Text c="dimmed" ta="center" py="xl">داده ارزش بازار موجود نیست</Text>
          )}
        </Collapse>
      </RallyMainCard>

      <RallyMainCard
        title={`نمادهای فعال (${formatNum(recentData.length)})`}
        noPadding
        secondary={
          <ActionIcon
            variant="subtle"
            onClick={() => toggleSection('table')}
            size="sm"
          >
            <IconChevronDown
              size={16}
              style={{ transform: sectionsExpanded.table ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
            />
          </ActionIcon>
        }
      >
        <Collapse in={sectionsExpanded.table}>
          <Group gap="xs" mb="md" px="md" pt="sm">
            <Badge
              variant={activeFilter === 'all' ? 'filled' : 'light'}
              onClick={() => handleFilterChange('all')}
              style={{ cursor: 'pointer' }}
            >
              همه ({toPersianNum(recentData.length)})
            </Badge>
            <Badge
              variant={activeFilter === 'positive' ? 'filled' : 'light'}
              color="green"
              onClick={() => handleFilterChange('positive')}
              style={{ cursor: 'pointer' }}
            >
              مثبت ({toPersianNum(advancers)})
            </Badge>
            <Badge
              variant={activeFilter === 'negative' ? 'filled' : 'light'}
              color="red"
              onClick={() => handleFilterChange('negative')}
              style={{ cursor: 'pointer' }}
            >
              منفی ({toPersianNum(decliners)})
            </Badge>
            <Badge
              variant={activeFilter === 'gainers' ? 'filled' : 'light'}
              color="green"
              onClick={() => handleFilterChange('gainers')}
              style={{ cursor: 'pointer' }}
            >
              برندگان (+۲٪)
            </Badge>
            <Badge
              variant={activeFilter === 'losers' ? 'filled' : 'light'}
              color="orange"
              onClick={() => handleFilterChange('losers')}
              style={{ cursor: 'pointer' }}
            >
              بازندگان (-۲٪)
            </Badge>
            <Badge
              variant={activeFilter === 'high-volume' ? 'filled' : 'light'}
              color="blue"
              onClick={() => handleFilterChange('high-volume')}
              style={{ cursor: 'pointer' }}
            >
              پرحجم
            </Badge>
          </Group>

          <RallyDataTable
            records={paged}
            columns={columns}
            idAccessor="ins_code"
            page={page}
            onPageChange={setPage}
            recordsPerPage={perPage}
            onRecordsPerPageChange={setPerPage}
            totalRecords={totalRecords}
            onRowClick={({ record }) => navigate(`/dashboard/stock/${record.symbol}`)}
            emptyMessage="داده‌ای موجود نیست"
            onRetry={fetchData}
            minHeight={350}
          />
        </Collapse>
      </RallyMainCard>
    </>
  );
}
