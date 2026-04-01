import { Box, SimpleGrid } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import PageHeader from '../../components/PageHeader';
import PageShell from '../../components/PageShell';
import DataFreshness from '../../components/DataFreshness';
import CryptoRefreshButton from '../../components/CryptoRefreshButton';
import RallyKPISkeleton from '../../components/RallyKPISkeleton';
import RallyChartSkeleton from '../../components/RallyChartSkeleton';
import RallyTableSkeleton from '../../components/RallyTableSkeleton';
import RallyMainCard from '../../components/RallyMainCard';
import MarketBreadthBar from '../../components/MarketBreadthBar';
import TickerTape from '../../components/TickerTape';
import CryptoMarketOverview from './dashboard/CryptoMarketOverview';
import CryptoMarketSection from './dashboard/CryptoMarketSection';
import useCryptoDashboard from '../../hooks/useCryptoDashboard';
import usePullToRefresh from '../../hooks/usePullToRefresh';
import PullToRefreshIndicator from '../../components/mobile/PullToRefreshIndicator';

export default function CryptoDashboard() {
  const d = useCryptoDashboard();
  const isMobile = useMediaQuery('(max-width: 48em)');

  const { pullDistance, isPulling, isRefreshing } = usePullToRefresh(d.fetchData, { enabled: isMobile });

  const skeleton = (
    <>
      <PageHeader title="داشبورد رمزارزها" />
      <SimpleGrid cols={{ base: 2, sm: 5 }} mb="md">
        {[1,2,3,4,5].map(i => <RallyKPISkeleton key={i} />)}
      </SimpleGrid>
      <RallyMainCard mb="md"><RallyChartSkeleton height={280} /></RallyMainCard>
      <RallyMainCard noPadding><RallyTableSkeleton rows={10} columns={6} /></RallyMainCard>
    </>
  );

  const unchanged = d.market.length - d.advancers.length - d.decliners.length;

  return (
    <PageShell loading={d.isLoading} error={d.isError ? 'خطا در بارگذاری داده‌ها' : null} hasData={d.market.length > 0} skeleton={skeleton} onRetry={d.fetchData}>
      <PullToRefreshIndicator pullDistance={pullDistance} isPulling={isPulling} isRefreshing={isRefreshing} />

      {d.market.length > 0 && (
        <Box display={{ base: 'none', sm: 'block' }}>
          <TickerTape items={d.market.slice(0, 15).map(c => ({ symbol: c.symbol, change: c.price_change_pct_24h ?? 0 }))} />
        </Box>
      )}

      <PageHeader title="داشبورد رمزارزها">
        <DataFreshness lastUpdated={d.dataUpdatedAt} />
        <CryptoRefreshButton onRefreshComplete={d.fetchData} />
      </PageHeader>

      <CryptoMarketOverview globalStats={d.globalStats} market={d.market} />

      <MarketBreadthBar advancers={d.advancers.length} decliners={d.decliners.length} unchanged={unchanged} />

      <CryptoMarketSection />
    </PageShell>
  );
}
