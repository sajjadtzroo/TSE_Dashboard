import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Box, Center, Group, Select, SimpleGrid, Text,
} from '@mantine/core';
import {
  IconBuildingBank, IconChartLine, IconVolume, IconCalendar,
  IconTrendingUp,
} from '@tabler/icons-react';
import RallyMainCard from '../components/RallyMainCard';
import RallyKPICard from '../components/RallyKPICard';
import RallyKPISkeleton from '../components/RallyKPISkeleton';
import MarketBreadthBar from '../components/MarketBreadthBar';
import TopMoversCards from '../components/TopMoversCards';
import RallyBarChart from '../components/charts/RallyBarChart';
import RallyPieChart, { RALLY_COLOR_SCALE } from '../components/charts/RallyPieChart';
import RallyTreemap from '../components/charts/RallyTreemap';
import ColorScaleLegend from '../components/charts/ColorScaleLegend';
import RallyChartSkeleton from '../components/RallyChartSkeleton';
import RefreshButton from '../components/RefreshButton';
import DataFreshness from '../components/DataFreshness';
import PageHeader from '../components/PageHeader';
import PageShell from '../components/PageShell';
import { useMarketOverview, useSectors } from '../hooks/useMarketData';
import { isFundSector } from '../utils/sectorUtils';
import { formatNum, toPersianNum, formatTrillion } from '../utils/formatUtils';
import rallyColors from '../theme/rallyColors';
import animStyles from '../components/shared/animations.module.css';

export default function Heatmap() {
  const [selectedSector, setSelectedSector] = useState(null);
  const [sizeMetric, setSizeMetric] = useState('market_cap');
  const navigate = useNavigate();

  const { data: rawMarket = [], isLoading: loading, error: queryError, refetch: refresh, dataUpdatedAt } = useMarketOverview();
  const { data: rawSectors = [] } = useSectors();
  const error = queryError?.message || null;
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;
  const marketData = useMemo(() => rawMarket.filter((item) => !isFundSector(item.sector_name_fa)), [rawMarket]);
  const sectors = useMemo(() => rawSectors.filter((s) => !isFundSector(s)), [rawSectors]);

  const filteredData = selectedSector
    ? marketData.filter((d) => d.sector_name_fa === selectedSector)
    : marketData;

  // Computed statistics
  const stats = useMemo(() => {
    if (!filteredData.length) return null;
    const positive = filteredData.filter((d) => (d.close_change_pct || 0) > 0).length;
    const negative = filteredData.filter((d) => (d.close_change_pct || 0) < 0).length;
    const neutral = filteredData.length - positive - negative;

    const totalVolume = filteredData.reduce((s, d) => s + (d.volume || 0), 0);
    const totalValue = filteredData.reduce((s, d) => s + (d.value || 0), 0);
    const totalTrades = filteredData.reduce((s, d) => s + (d.trades || 0), 0);

    const validPE = filteredData.filter((d) => d.pe_ratio > 0 && d.pe_ratio < 100).map((d) => d.pe_ratio);
    const avgPE = validPE.length ? (validPE.reduce((a, b) => a + b, 0) / validPE.length).toFixed(1) : null;

    return { positive, negative, neutral, total: filteredData.length, totalVolume, totalValue, totalTrades, avgPE };
  }, [filteredData]);

  // Breadth values
  const advancers = stats?.positive || 0;
  const decliners = stats?.negative || 0;
  const unchanged = stats?.neutral || 0;

  // Change distribution histogram — stock count per % change bucket
  const changeDistribution = useMemo(() => {
    const buckets = [
      { label: '<-5٪', min: -Infinity, max: -5 },
      { label: '-5 تا -2٪', min: -5, max: -2 },
      { label: '-2 تا 0٪', min: -2, max: 0 },
      { label: '0٪', min: 0, max: 0 },
      { label: '0 تا +2٪', min: 0, max: 2 },
      { label: '+2 تا +5٪', min: 2, max: 5 },
      { label: '>+5٪', min: 5, max: Infinity },
    ];
    return buckets.map((b) => {
      const count = filteredData.filter((d) => {
        const pct = d.close_change_pct ?? 0;
        if (b.min === 0 && b.max === 0) return pct === 0;
        if (b.min === 0 && b.max > 0) return pct > 0 && pct <= b.max;
        if (b.max === 0 && b.min < 0) return pct < 0 && pct >= b.min;
        return pct > b.min && pct <= b.max;
      }).length;
      return { x: b.label, y: count };
    });
  }, [filteredData]);

  // Sector performance — avg % change per sector (top 10)
  const sectorPerformance = useMemo(() => {
    const map = {};
    filteredData.forEach((d) => {
      const s = d.sector_name_fa || 'سایر';
      if (!map[s]) map[s] = { sum: 0, count: 0 };
      map[s].sum += d.close_change_pct ?? 0;
      map[s].count += 1;
    });
    return Object.entries(map)
      .filter(([, v]) => v.count >= 3)
      .map(([sector, v]) => ({ x: sector.length > 18 ? sector.slice(0, 18) + '…' : sector, y: Number((v.sum / v.count).toFixed(2)) }))
      .sort((a, b) => b.y - a.y)
      .slice(0, 10);
  }, [filteredData]);

  // Sector value distribution pie — by trade value
  const { pieData, totalSectorValue } = useMemo(() => {
    const map = {};
    filteredData.forEach((d) => {
      const s = d.sector_name_fa || 'سایر';
      map[s] = (map[s] || 0) + (d.value || 0);
    });
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const total = entries.reduce((a, [, v]) => a + v, 0);
    return {
      pieData: entries.map(([s, v]) => ({ x: s.length > 12 ? s.slice(0, 12) + '…' : s, y: Math.round(v / 1e9) })),
      totalSectorValue: total,
    };
  }, [filteredData]);

  const skeleton = (
    <>
      <PageHeader title="نقشه بازار" />
      <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 6 }} mb="md">
        {[1, 2, 3, 4, 5, 6].map((i) => <RallyKPISkeleton key={i} />)}
      </SimpleGrid>
      <RallyChartSkeleton height={600} />
    </>
  );

  return (
    <PageShell loading={loading} error={error} hasData={marketData.length > 0} skeleton={skeleton} onRetry={refresh}>
      <PageHeader title="نقشه بازار">
        <DataFreshness lastUpdated={lastUpdated} />
        <RefreshButton onRefreshComplete={refresh} />
      </PageHeader>

      {/* KPI Cards */}
      {stats && (
        <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 6 }} spacing={{ base: 'sm', md: 'md' }} mb="md">
          <Box className={animStyles.cardEnter} h="100%">
            <RallyKPICard
              title="کل نمادها"
              value={formatNum(stats.total)}
              icon={IconBuildingBank}
              color={rallyColors.green}
              bgColor={rallyColors.darkGreen}
            />
          </Box>
          <Box className={animStyles.cardEnter} h="100%">
            <RallyKPICard
              title="مثبت / منفی"
              value={`${toPersianNum(stats.positive)} / ${toPersianNum(stats.negative)}`}
              icon={IconTrendingUp}
              color={rallyColors.green}
              bgColor={rallyColors.green}
            />
          </Box>
          <Box className={animStyles.cardEnter} h="100%">
            <RallyKPICard
              title="حجم کل"
              value={formatTrillion(stats.totalVolume)}
              icon={IconVolume}
              color={rallyColors.purple}
              bgColor={rallyColors.purple}
            />
          </Box>
          <Box className={animStyles.cardEnter} h="100%">
            <RallyKPICard
              title="ارزش کل"
              value={formatTrillion(stats.totalValue)}
              icon={IconCalendar}
              color={rallyColors.blue}
              bgColor={rallyColors.blue}
            />
          </Box>
          <Box className={animStyles.cardEnter} h="100%">
            <RallyKPICard
              title="تعداد معاملات"
              value={formatNum(stats.totalTrades)}
              icon={IconChartLine}
              color={rallyColors.yellow}
              bgColor={rallyColors.yellow}
            />
          </Box>
          <Box className={animStyles.cardEnter} h="100%">
            <RallyKPICard
              title="میانگین P/E"
              value={stats.avgPE ? toPersianNum(stats.avgPE) : '-'}
              subtitle="نسبت قیمت به سود"
              icon={IconChartLine}
              color={rallyColors.blue}
              bgColor={rallyColors.blue}
            />
          </Box>
        </SimpleGrid>
      )}

      {/* Market Breadth Bar */}
      {stats && (
        <MarketBreadthBar advancers={advancers} decliners={decliners} unchanged={unchanged} />
      )}

      {/* Filters + Treemap */}
      <Box className={`${animStyles.sectionEnter} ${animStyles.sectionDelay1}`}>
        <RallyMainCard mb="md" fullscreenable>
          <Group p="md" pb={0} gap="md">
            <Select
              placeholder="فیلتر صنعت"
              data={[{ value: '', label: 'همه صنایع' }, ...sectors.map((s) => ({ value: s, label: s }))]}
              value={selectedSector || ''}
              onChange={(v) => setSelectedSector(v || null)}
              clearable
              searchable
              w={220}
              size="sm"
            />
            <Select
              label="اندازه بر اساس"
              data={[
                { value: 'market_cap', label: 'ارزش بازار' },
                { value: 'volume', label: 'حجم' },
              ]}
              value={sizeMetric}
              onChange={(v) => setSizeMetric(v)}
              w={160}
              size="sm"
            />
          </Group>

          {filteredData.length > 0 ? (
            <>
              <RallyTreemap
                data={filteredData}
                groupBy="sector_name_fa"
                sizeAccessor={sizeMetric}
                colorAccessor="close_change_pct"
                onCellClick={(d) => navigate(`/dashboard/stock/${d.symbol}`)}
                height={Math.max(500, Math.min(800, Math.round(window.innerHeight * 0.65)))}
              />
              <ColorScaleLegend
                min={Math.min(...filteredData.map((d) => d.close_change_pct ?? 0), -1)}
                max={Math.max(...filteredData.map((d) => d.close_change_pct ?? 0), 1)}
              />
            </>
          ) : (
            <Center py="xl">
              <Alert color="gray">داده‌ای موجود نیست</Alert>
            </Center>
          )}
        </RallyMainCard>
      </Box>

      {/* Charts & Lists Section */}
      <Box className={`${animStyles.sectionEnter} ${animStyles.sectionDelay2}`}>
        <SimpleGrid cols={{ base: 1, md: 2, lg: 4 }} spacing="md">
          <RallyMainCard title="توزیع تغییرات قیمت" fullscreenable>
            {changeDistribution.some((d) => d.y > 0) ? (
              <RallyBarChart
                data={changeDistribution}
                autoColorByValue
                height={280}
                tooltipFormatter={(d) => `${d.x}: ${toPersianNum(d.y)} نماد`}
              />
            ) : (
              <Text c="dimmed" ta="center" py="xl">داده قیمتی موجود نیست</Text>
            )}
          </RallyMainCard>

          <RallyMainCard title="عملکرد صنایع (میانگین تغییر ٪)" fullscreenable>
            {sectorPerformance.length > 0 ? (
              <RallyBarChart
                data={sectorPerformance}
                horizontal
                autoColorByValue
                height={280}
                tooltipFormatter={(d) => `${d.x}: ${d.y > 0 ? '+' : ''}${d.y}%`}
              />
            ) : (
              <Text c="dimmed" ta="center" py="xl">داده صنعت موجود نیست</Text>
            )}
          </RallyMainCard>

          <RallyMainCard title="ارزش معاملات صنایع (میلیارد)" fullscreenable>
            {pieData.length > 0 ? (
              <RallyPieChart
                data={pieData}
                colorScale={RALLY_COLOR_SCALE.concat(['#4FC3F7', '#AED581', '#FFB74D'])}
                centerLabel="ارزش کل"
                centerValue={formatTrillion(totalSectorValue)}
                height={280}
                width={280}
              />
            ) : (
              <Text c="dimmed" ta="center" py="xl">داده صنعت موجود نیست</Text>
            )}
          </RallyMainCard>

          <TopMoversCards data={filteredData} />
        </SimpleGrid>
      </Box>
    </PageShell>
  );
}
