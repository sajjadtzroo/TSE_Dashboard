import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Badge, Group, SimpleGrid, Text, Progress,
} from '@mantine/core';
import {
  IconBuildingBank, IconChartLine, IconVolume, IconCalendar,
  IconTrendingUp, IconTrendingDown,
  IconPlayerPlay, IconPlayerPause,
  IconArrowUpRight, IconArrowDownRight,
  IconStar, IconStarFilled,
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
import RallyBarChart from '../components/charts/RallyBarChart';
import RallyPieChart from '../components/charts/RallyPieChart';
import { RALLY_COLOR_SCALE } from '../components/charts/RallyPieChart';
import PercentChangeCell from '../components/cells/PercentChangeCell';
import TickerTape from '../components/TickerTape';
import rallyColors from '../theme/rallyColors';
import { isFundSector } from '../utils/sectorUtils';
import { formatNum, toPersianNum } from '../utils/formatUtils';

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
  const sortedByChange = [...recentData].sort((a, b) => (b.close_change_pct ?? 0) - (a.close_change_pct ?? 0));
  const topGainers = sortedByChange.filter((d) => d.close_change_pct > 0).slice(0, 5);
  const topLosers = sortedByChange.filter((d) => d.close_change_pct < 0).reverse().slice(0, 5);
  const advancers = recentData.filter((d) => d.close_change_pct > 0).length;
  const decliners = recentData.filter((d) => d.close_change_pct < 0).length;
  const unchanged = recentData.length - advancers - decliners;
  const breadthTotal = advancers + decliners + unchanged || 1;
  const advPct = Math.round((advancers / breadthTotal) * 100);
  const decPct = Math.round((decliners / breadthTotal) * 100);

  // Sector aggregation
  const sectorMap = {};
  recentData.forEach((d) => {
    const s = d.sector_name_fa || 'Other';
    if (!sectorMap[s]) sectorMap[s] = { count: 0 };
    sectorMap[s].count += 1;
  });
  const sectorEntries = Object.entries(sectorMap).sort((a, b) => b[1].count - a[1].count).slice(0, 8);

  // Bar chart data
  const top10 = sortedByChange.slice(0, 5).concat(sortedByChange.slice(-5).reverse());
  const barData = top10.map((d) => ({
    x: d.symbol,
    y: Number(d.close_change_pct?.toFixed(2)) || 0,
  }));

  // Pie data
  const pieData = sectorEntries.map(([s, v]) => ({ x: s.length > 12 ? s.slice(0, 12) + '...' : s, y: v.count }));
  const totalSectorCount = sectorEntries.reduce((a, [, v]) => a + v.count, 0);

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

  const { paged, page, setPage, perPage, setPerPage, totalRecords } = usePagination(recentData);

  if (loading && !recentData.length) {
    return (
      <>
        <PageHeader title="داشبورد بازار" />
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="md">
          {[1,2,3,4].map(i => <RallyKPISkeleton key={i} />)}
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
      {/* Ticker Tape */}
      {sortedByChange.length > 0 && (
        <TickerTape
          items={sortedByChange.slice(0, 20).map((d) => ({
            symbol: d.symbol,
            change: d.close_change_pct,
          }))}
        />
      )}

      {/* Header */}
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

      {/* KPI Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="md">
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
      </SimpleGrid>

      {/* Market Breadth */}
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

      {/* Charts row */}
      <SimpleGrid cols={{ base: 1, md: 3 }} mb="md" spacing="md">
        <RallyMainCard title="بیشترین رشد و افت" style={{ gridColumn: 'span 1' }}>
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

        <RallyMainCard title="توزیع صنایع">
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
            onItemClick={(item) => navigate(`/stock/${item.label}`)}
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
            onItemClick={(item) => navigate(`/stock/${item.label}`)}
          />
        </div>
      </SimpleGrid>

      {/* Data Table */}
      <RallyMainCard title={`نمادهای فعال (${formatNum(recentData.length)})`} noPadding>
        <RallyDataTable
          records={paged}
          columns={columns}
          idAccessor="ins_code"
          page={page}
          onPageChange={setPage}
          recordsPerPage={perPage}
          onRecordsPerPageChange={setPerPage}
          totalRecords={totalRecords}
          onRowClick={({ record }) => navigate(`/stock/${record.symbol}`)}
          emptyMessage="داده‌ای موجود نیست"
          onRetry={fetchData}
          minHeight={350}
        />
      </RallyMainCard>
    </>
  );
}
