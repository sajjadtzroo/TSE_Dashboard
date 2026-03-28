import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, SimpleGrid, Text } from '@mantine/core';
import { useMediaQuery, useViewportSize } from '@mantine/hooks';
import { IconFlame, IconTrendingUp, IconChartBar } from '@tabler/icons-react';
import RallyMainCard from '../../components/RallyMainCard';
import RallyKPICard from '../../components/RallyKPICard';
import RallyKPISkeleton from '../../components/RallyKPISkeleton';
import RallyChartSkeleton from '../../components/RallyChartSkeleton';
import MarketBreadthBar from '../../components/MarketBreadthBar';
import RallyTreemap from '../../components/charts/RallyTreemap';
import ColorScaleLegend from '../../components/charts/ColorScaleLegend';
import PageHeader from '../../components/PageHeader';
import PageShell from '../../components/PageShell';
import DataFreshness from '../../components/DataFreshness';
import RefreshButton from '../../components/RefreshButton';
import RallyBreadcrumbs from '../../components/RallyBreadcrumbs';
import { useCommodityPrices } from '../../hooks/useCommodityData';
import { COMMODITY_SYMBOLS, getCommodityCategory } from '../../constants/commodity';
import rallyColors from '../../theme/rallyColors';
import animStyles from '../../components/shared/animations.module.css';
import { toPersianNum } from '../../utils/formatUtils';
import { clampColorRange } from '../../utils/colorUtils';

export default function CommodityHeatmap() {
  const isMobile = useMediaQuery('(max-width: 48em)');
  const { height: viewportHeight } = useViewportSize();
  const navigate = useNavigate();
  const { data: prices = [], isLoading, isError, refetch, dataUpdatedAt } = useCommodityPrices();
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  const treemapData = useMemo(() =>
    prices.map(p => ({
      symbol: p.symbol,
      name_fa: COMMODITY_SYMBOLS[p.symbol]?.name_fa ?? p.symbol,
      sector_name_fa: getCommodityCategory(p.symbol),
      market_cap: Math.abs(p.price * (p.volume ?? 1)),
      close_change_pct: p.change_pct ?? 0,
    })),
    [prices],
  );

  const legendRange = useMemo(() => {
    const values = treemapData.map(d => d.close_change_pct);
    return clampColorRange(values);
  }, [treemapData]);

  const advancers = prices.filter(c => (c.change_pct ?? 0) > 0).length;
  const decliners = prices.filter(c => (c.change_pct ?? 0) < 0).length;
  const unchanged = prices.length - advancers - decliners;

  const skeleton = (
    <>
      <PageHeader title="نقشه کالاها" />
      <SimpleGrid cols={{ base: 1, xs: 2, sm: 3 }} mb="md">
        {[1, 2, 3].map(i => <RallyKPISkeleton key={i} />)}
      </SimpleGrid>
      <RallyChartSkeleton height={600} />
    </>
  );

  return (
    <PageShell loading={isLoading} error={isError ? 'خطا در بارگذاری' : null} hasData={prices.length > 0} skeleton={skeleton} onRetry={refetch}>
      <RallyBreadcrumbs items={[{ label: 'کالاها', path: '/commodity' }, { label: 'نقشه بازار' }]} />
      <PageHeader title="نقشه گرمایی کالاها">
        <DataFreshness lastUpdated={lastUpdated} />
        <RefreshButton onRefreshComplete={refetch} />
      </PageHeader>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="md">
        <Box className={animStyles.cardEnter} h="100%">
          <RallyKPICard title="تعداد کالاها" value={String(prices.length)} icon={IconFlame} color="#EA580C" bgColor="#EA580C" />
        </Box>
        <Box className={animStyles.cardEnter} h="100%">
          <RallyKPICard title="مثبت / منفی" value={`${toPersianNum(advancers)} / ${toPersianNum(decliners)}`} icon={IconTrendingUp} color={rallyColors.primary} bgColor={rallyColors.primary} />
        </Box>
        <Box className={animStyles.cardEnter} h="100%">
          <RallyKPICard title="کل کالاها" value={toPersianNum(prices.length)} icon={IconChartBar} color={rallyColors.blue} bgColor={rallyColors.blue} />
        </Box>
      </SimpleGrid>

      <MarketBreadthBar advancers={advancers} decliners={decliners} unchanged={unchanged} />

      <Box className={`${animStyles.sectionEnter} ${animStyles.sectionDelay1}`}>
        <RallyMainCard title="نقشه گرمایی" fullscreenable mb="md">
          <Text size="xs" c="dimmed" mb="xs">اندازه: حجم معامله | رنگ: تغییر روزانه</Text>
          {treemapData.length > 0 ? (
            <>
              <RallyTreemap
                data={treemapData}
                groupBy="sector_name_fa"
                sizeAccessor="market_cap"
                colorAccessor="close_change_pct"
                onCellClick={(d) => navigate(`/commodity/${d.symbol}`)}
                height={isMobile ? 360 : Math.max(500, Math.min(700, Math.round((viewportHeight || 800) * 0.6)))}
              />
              <ColorScaleLegend min={legendRange.min} max={legendRange.max} hasOutliers={legendRange.hasOutliers} />
            </>
          ) : (
            <Text c="dimmed" ta="center" py="xl">داده‌ای موجود نیست</Text>
          )}
        </RallyMainCard>
      </Box>
    </PageShell>
  );
}
