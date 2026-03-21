import { useRef } from 'react';
import { Box, SimpleGrid } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import PageHeader from '../../components/PageHeader';
import PageShell from '../../components/PageShell';
import DataFreshness from '../../components/DataFreshness';
import RefreshButton from '../../components/RefreshButton';
import KPIGridControl from '../../components/KPIGridControl';
import RallyKPISkeleton from '../../components/RallyKPISkeleton';
import RallyChartSkeleton from '../../components/RallyChartSkeleton';
import RallyTableSkeleton from '../../components/RallyTableSkeleton';
import RallyMainCard from '../../components/RallyMainCard';
import MarketBreadthBar from '../../components/MarketBreadthBar';
import TickerTape from '../../components/TickerTape';
import SectionTabs from '../../components/SectionTabs';
import CryptoKPIGrid from './dashboard/CryptoKPIGrid';
import CryptoBTCIndexSection from './dashboard/CryptoBTCIndexSection';
import CryptoChartsSection from './dashboard/CryptoChartsSection';
import CryptoCategorySection from './dashboard/CryptoCategorySection';
import CryptoVolatilitySection from './dashboard/CryptoVolatilitySection';
import CryptoLiquiditySection from './dashboard/CryptoLiquiditySection';
import CryptoTomanSection from './dashboard/CryptoTomanSection';
import CryptoHeatmapSection from './dashboard/CryptoHeatmapSection';
import CryptoMarketSection from './dashboard/CryptoMarketSection';
import CryptoTableSection from './dashboard/CryptoTableSection';
import DeribitFuturesSection from './dashboard/DeribitFuturesSection';
import DeribitOptionsSection from './dashboard/DeribitOptionsSection';
import useCryptoDashboard from '../../hooks/useCryptoDashboard';
import usePullToRefresh from '../../hooks/usePullToRefresh';
import useSectionObserver from '../../hooks/useSectionObserver';
import PullToRefreshIndicator from '../../components/mobile/PullToRefreshIndicator';
import { CRYPTO_DASHBOARD_SECTIONS } from '../../constants/crypto';

export default function CryptoDashboard() {
  const d = useCryptoDashboard();
  const isMobile = useMediaQuery('(max-width: 48em)');

  // Section refs (order matches CRYPTO_DASHBOARD_SECTIONS)
  const btcRef = useRef(null);
  const chartsRef = useRef(null);
  const categoryRef = useRef(null);
  const volatilityRef = useRef(null);
  const liquidityRef = useRef(null);
  const tomanRef = useRef(null);
  const heatmapRef = useRef(null);
  const marketRef = useRef(null);
  const tableRef = useRef(null);
  const futuresRef = useRef(null);
  const optionsRef = useRef(null);

  const sectionRefs = [btcRef, chartsRef, categoryRef, volatilityRef, liquidityRef, tomanRef, heatmapRef, marketRef, tableRef, futuresRef, optionsRef];
  const sections = CRYPTO_DASHBOARD_SECTIONS.map((s, i) => ({ ...s, ref: sectionRefs[i] }));
  const { activeIndex } = useSectionObserver(sectionRefs);

  // Pull-to-refresh (mobile only)
  const { pullDistance, isPulling, isRefreshing } = usePullToRefresh(d.fetchData, { enabled: isMobile });

  const skeleton = (
    <>
      <PageHeader title="داشبورد رمزارزها" />
      <SimpleGrid cols={{ base: 1, xs: 2, sm: 2, md: 3, lg: 4, xl: 8 }} mb="md">
        {[1,2,3,4,5,6,7,8].map(i => <RallyKPISkeleton key={i} />)}
      </SimpleGrid>
      <RallyMainCard mb="md"><RallyChartSkeleton height={200} /></RallyMainCard>
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
        <KPIGridControl />
        <RefreshButton onRefreshComplete={d.fetchData} />
      </PageHeader>

      <CryptoKPIGrid globalStats={d.globalStats} market={d.market} movers={d.movers} compact={isMobile} />

      <MarketBreadthBar advancers={d.advancers.length} decliners={d.decliners.length} unchanged={unchanged} />

      <SectionTabs sections={sections} activeIndex={activeIndex} />

      <div ref={btcRef} style={{ scrollMarginTop: 120 }}>
        <CryptoBTCIndexSection market={d.market} />
      </div>

      <div ref={chartsRef} style={{ scrollMarginTop: 120 }}>
        <CryptoChartsSection chartData={d.chartData} market={d.market} movers={d.movers} />
      </div>

      <div ref={categoryRef} style={{ scrollMarginTop: 120 }}>
        <CryptoCategorySection categoryPerformance={d.categoryPerformance} />
      </div>

      <div ref={volatilityRef} style={{ scrollMarginTop: 120 }}>
        <CryptoVolatilitySection volatilityMetrics={d.volatilityMetrics} />
      </div>

      <div ref={liquidityRef} style={{ scrollMarginTop: 120 }}>
        <CryptoLiquiditySection liquidityMetrics={d.liquidityMetrics} />
      </div>

      <div ref={tomanRef} style={{ scrollMarginTop: 120 }}>
        <CryptoTomanSection tomanMetrics={d.tomanMetrics} />
      </div>

      <div ref={heatmapRef} style={{ scrollMarginTop: 120 }}>
        <CryptoHeatmapSection market={d.market} />
      </div>

      <div ref={marketRef} style={{ scrollMarginTop: 120 }}>
        <CryptoMarketSection />
      </div>

      <div ref={tableRef} style={{ scrollMarginTop: 120 }}>
        <CryptoTableSection market={d.market} onRetry={d.fetchData} />
      </div>

      <div ref={futuresRef} style={{ scrollMarginTop: 120 }}>
        <DeribitFuturesSection />
      </div>

      <div ref={optionsRef} style={{ scrollMarginTop: 120 }}>
        <DeribitOptionsSection />
      </div>
    </PageShell>
  );
}
