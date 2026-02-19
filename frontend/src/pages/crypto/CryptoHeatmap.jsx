import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, SimpleGrid, Text } from '@mantine/core';
import { useMediaQuery, useViewportSize } from '@mantine/hooks';
import { IconCurrencyBitcoin, IconTrendingUp, IconVolume } from '@tabler/icons-react';
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
import { useCryptoMarket } from '../../hooks/useCryptoData';
import { getCryptoCategory } from '../../constants/crypto';
import rallyColors from '../../theme/rallyColors';
import animStyles from '../../components/shared/animations.module.css';
import { toPersianNum } from '../../utils/formatUtils';

export default function CryptoHeatmap() {
  const isMobile = useMediaQuery('(max-width: 48em)');
  const { height: viewportHeight } = useViewportSize();
  const navigate = useNavigate();
  const { data: market = [], isLoading, isError, refetch, dataUpdatedAt } = useCryptoMarket();
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  const treemapData = useMemo(() =>
    market.filter(c => c.market_cap_usd > 0).map(coin => ({
      symbol: coin.symbol,
      name_fa: coin.name_fa || coin.symbol,
      sector_name_fa: getCryptoCategory(coin.symbol),
      market_cap: coin.market_cap_usd,
      close_change_pct: coin.price_change_pct_24h ?? 0,
    })),
    [market]
  );

  const advancers = market.filter(c => (c.price_change_pct_24h ?? 0) > 0).length;
  const decliners = market.filter(c => (c.price_change_pct_24h ?? 0) < 0).length;
  const unchanged = market.length - advancers - decliners;

  const skeleton = (
    <>
      <PageHeader title="نقشه رمزارزها" />
      <SimpleGrid cols={{ base: 1, xs: 2, sm: 3 }} mb="md">
        {[1, 2, 3].map(i => <RallyKPISkeleton key={i} />)}
      </SimpleGrid>
      <RallyChartSkeleton height={600} />
    </>
  );

  return (
    <PageShell loading={isLoading} error={isError ? 'خطا در بارگذاری' : null} hasData={market.length > 0} skeleton={skeleton} onRetry={refetch}>
      <PageHeader title="نقشه گرمایی رمزارزها">
        <DataFreshness lastUpdated={lastUpdated} />
        <RefreshButton onRefreshComplete={refetch} />
      </PageHeader>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="md">
        <Box className={animStyles.cardEnter} h="100%">
          <RallyKPICard title="تعداد رمزارزها" value={String(market.length)} icon={IconCurrencyBitcoin} color={rallyColors.yellow} bgColor={rallyColors.yellow} />
        </Box>
        <Box className={animStyles.cardEnter} h="100%">
          <RallyKPICard title="مثبت / منفی" value={`${toPersianNum(advancers)} / ${toPersianNum(decliners)}`} icon={IconTrendingUp} color={rallyColors.green} bgColor={rallyColors.green} />
        </Box>
        <Box className={animStyles.cardEnter} h="100%">
          <RallyKPICard title="حجم کل ۲۴h" value={'$' + toPersianNum((market.reduce((s, c) => s + (c.volume_24h || 0), 0) / 1e9).toFixed(1)) + 'B'} icon={IconVolume} color={rallyColors.blue} bgColor={rallyColors.blue} />
        </Box>
      </SimpleGrid>

      <MarketBreadthBar advancers={advancers} decliners={decliners} unchanged={unchanged} />

      <Box className={`${animStyles.sectionEnter} ${animStyles.sectionDelay1}`}>
        <RallyMainCard title="نقشه گرمایی" fullscreenable mb="md">
          <Text size="xs" c="dimmed" mb="xs">اندازه: ارزش بازار | رنگ: تغییر ۲۴ ساعته</Text>
          {treemapData.length > 0 ? (
            <>
              <RallyTreemap
                data={treemapData}
                groupBy="sector_name_fa"
                sizeAccessor="market_cap"
                colorAccessor="close_change_pct"
                onCellClick={(d) => navigate(`/crypto/coin/${d.symbol}`)}
                height={isMobile ? 360 : Math.max(500, Math.min(700, Math.round((viewportHeight || 800) * 0.6)))}
              />
              <ColorScaleLegend
                min={Math.min(...treemapData.map(d => d.close_change_pct), -1)}
                max={Math.max(...treemapData.map(d => d.close_change_pct), 1)}
              />
            </>
          ) : (
            <Text c="dimmed" ta="center" py="xl">داده‌ای موجود نیست</Text>
          )}
        </RallyMainCard>
      </Box>
    </PageShell>
  );
}
