import { useRef } from 'react';
import { Box, SimpleGrid } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import PageHeader from '../../components/PageHeader';
import PageShell from '../../components/PageShell';
import DataFreshness from '../../components/DataFreshness';
import RefreshButton from '../../components/RefreshButton';
import RallyKPISkeleton from '../../components/RallyKPISkeleton';
import RallyMainCard from '../../components/RallyMainCard';
import RallyChartSkeleton from '../../components/RallyChartSkeleton';
import RallyTableSkeleton from '../../components/RallyTableSkeleton';
import MarketBreadthBar from '../../components/MarketBreadthBar';
import SectionTabs from '../../components/SectionTabs';
import CommodityKPIGrid from './dashboard/CommodityKPIGrid';
import CommodityChartsSection from './dashboard/CommodityChartsSection';
import CommodityTableSection from './dashboard/CommodityTableSection';
import { useCommodityPrices } from '../../hooks/useCommodityData';
import { COMMODITY_SYMBOLS } from '../../constants/commodity';
import useSectionObserver from '../../hooks/useSectionObserver';
import usePullToRefresh from '../../hooks/usePullToRefresh';
import PullToRefreshIndicator from '../../components/mobile/PullToRefreshIndicator';
import { COMMODITY_DASHBOARD_SECTIONS } from '../../constants/commodity';

export default function CommodityDashboard() {
  const isMobile = useMediaQuery('(max-width: 48em)');
  const { data: prices = [], isLoading, isError, refetch, dataUpdatedAt } = useCommodityPrices();
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  // Enrich with metadata
  const enriched = prices.map(p => ({
    ...p,
    name_fa: COMMODITY_SYMBOLS[p.symbol]?.name_fa ?? p.symbol,
  }));

  const advancers = enriched.filter(c => (c.change_pct ?? 0) > 0).length;
  const decliners = enriched.filter(c => (c.change_pct ?? 0) < 0).length;
  const unchanged = enriched.length - advancers - decliners;

  // Section refs
  const chartsRef = useRef(null);
  const energyRef = useRef(null);
  const metalsRef = useRef(null);
  const agriRef = useRef(null);
  const tableRef = useRef(null);

  const sectionRefs = [chartsRef, energyRef, metalsRef, agriRef, tableRef];
  const sections = COMMODITY_DASHBOARD_SECTIONS.map((s, i) => ({ ...s, ref: sectionRefs[i] }));
  const { activeIndex } = useSectionObserver(sectionRefs);

  const { pullDistance, isPulling, isRefreshing } = usePullToRefresh(refetch, { enabled: isMobile });

  const skeleton = (
    <>
      <PageHeader title="داشبورد کالاها" />
      <SimpleGrid cols={{ base: 2, sm: 2, md: 4 }} mb="md">
        {[1, 2, 3, 4].map(i => <RallyKPISkeleton key={i} />)}
      </SimpleGrid>
      <RallyMainCard mb="md"><RallyChartSkeleton height={200} /></RallyMainCard>
      <RallyMainCard noPadding><RallyTableSkeleton rows={8} columns={6} /></RallyMainCard>
    </>
  );

  return (
    <PageShell
      loading={isLoading}
      error={isError ? 'خطا در بارگذاری داده‌ها' : null}
      hasData={enriched.length > 0}
      skeleton={skeleton}
      onRetry={refetch}
    >
      <PullToRefreshIndicator pullDistance={pullDistance} isPulling={isPulling} isRefreshing={isRefreshing} />

      <PageHeader title="داشبورد کالاها">
        <DataFreshness lastUpdated={lastUpdated} />
        <RefreshButton onRefreshComplete={refetch} />
      </PageHeader>

      <CommodityKPIGrid prices={enriched} compact={isMobile} />

      <MarketBreadthBar advancers={advancers} decliners={decliners} unchanged={unchanged} />

      <SectionTabs sections={sections} activeIndex={activeIndex} />

      <div ref={chartsRef} style={{ scrollMarginTop: 120 }}>
        <CommodityChartsSection prices={enriched} />
      </div>

      <div ref={energyRef} style={{ scrollMarginTop: 120 }}>
        <CommodityTableSection prices={enriched.filter(p => COMMODITY_SYMBOLS[p.symbol]?.category === 'energy')} />
      </div>

      <div ref={metalsRef} style={{ scrollMarginTop: 120 }}>
        <CommodityTableSection prices={enriched.filter(p => COMMODITY_SYMBOLS[p.symbol]?.category === 'metals')} />
      </div>

      <div ref={agriRef} style={{ scrollMarginTop: 120 }}>
        <CommodityTableSection prices={enriched.filter(p => ['agricultural', 'livestock'].includes(COMMODITY_SYMBOLS[p.symbol]?.category))} />
      </div>

      <div ref={tableRef} style={{ scrollMarginTop: 120 }}>
        <CommodityTableSection prices={enriched} />
      </div>
    </PageShell>
  );
}
