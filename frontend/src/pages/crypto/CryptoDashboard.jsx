import { useRef } from 'react';
import { Box, SimpleGrid } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import PageHeader from '../../components/PageHeader';
import PageShell from '../../components/PageShell';
import DataFreshness from '../../components/DataFreshness';
import RefreshButton from '../../components/RefreshButton';
import RallyKPISkeleton from '../../components/RallyKPISkeleton';
import RallyChartSkeleton from '../../components/RallyChartSkeleton';
import RallyTableSkeleton from '../../components/RallyTableSkeleton';
import RallyMainCard from '../../components/RallyMainCard';
import MarketBreadthBar from '../../components/MarketBreadthBar';
import TickerTape from '../../components/TickerTape';
import CryptoKPIGrid from './dashboard/CryptoKPIGrid';
import CryptoBTCIndexSection from './dashboard/CryptoBTCIndexSection';
import CryptoChartsSection from './dashboard/CryptoChartsSection';
import CryptoHeatmapSection from './dashboard/CryptoHeatmapSection';
import CryptoTableSection from './dashboard/CryptoTableSection';
import useCryptoDashboard from '../../hooks/useCryptoDashboard';
import usePullToRefresh from '../../hooks/usePullToRefresh';
import useSwipeNavigation from '../../hooks/useSwipeNavigation';
import PullToRefreshIndicator from '../../components/mobile/PullToRefreshIndicator';
import rallyColors from '../../theme/rallyColors';

export default function CryptoDashboard() {
  const d = useCryptoDashboard();
  const isMobile = useMediaQuery('(max-width: 48em)');

  // Section refs for swipe navigation
  const btcRef = useRef(null);
  const chartsRef = useRef(null);
  const heatmapRef = useRef(null);
  const tableRef = useRef(null);
  const sectionRefs = [btcRef, chartsRef, heatmapRef, tableRef];
  const { currentSection } = useSwipeNavigation(sectionRefs, { enabled: isMobile });

  // Pull-to-refresh (mobile only)
  const { pullDistance, isPulling, isRefreshing } = usePullToRefresh(d.fetchData, { enabled: isMobile });

  const skeleton = (
    <>
      <PageHeader title="داشبورد رمزارزها" />
      <SimpleGrid cols={{ base: 1, xs: 2, sm: 2, md: 3, lg: 4, xl: 8 }} mb="md">
        {[1,2,3,4,5,6,7,8].map(i => <RallyKPISkeleton key={i} />)}
      </SimpleGrid>
      <RallyMainCard mb="md"><RallyChartSkeleton height={280} /></RallyMainCard>
      <RallyMainCard noPadding><RallyTableSkeleton rows={8} columns={6} /></RallyMainCard>
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
        <DataFreshness lastUpdated={null} />
        <RefreshButton onRefreshComplete={d.fetchData} />
      </PageHeader>

      <CryptoKPIGrid globalStats={d.globalStats} market={d.market} movers={d.movers} compact={isMobile} />

      <MarketBreadthBar advancers={d.advancers.length} decliners={d.decliners.length} unchanged={unchanged} />

      <div ref={btcRef}>
        <CryptoBTCIndexSection market={d.market} />
      </div>

      <div ref={chartsRef}>
        <CryptoChartsSection chartData={d.chartData} market={d.market} movers={d.movers} />
      </div>

      <div ref={heatmapRef}>
        <CryptoHeatmapSection market={d.market} />
      </div>

      <div ref={tableRef}>
        <CryptoTableSection market={d.market} onRetry={d.fetchData} />
      </div>

      {/* Section dot indicators (mobile) */}
      {isMobile && (
        <Box style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '8px 0' }}>
          {sectionRefs.map((_, i) => (
            <Box
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: i === currentSection ? rallyColors.yellow : 'rgba(148, 163, 184, 0.25)',
                transition: 'background 0.2s ease',
              }}
            />
          ))}
        </Box>
      )}
    </PageShell>
  );
}
