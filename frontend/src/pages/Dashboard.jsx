import { useRef, useMemo, lazy, Suspense } from 'react';
import { motion } from 'motion/react';
import { Box, SimpleGrid } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import PageHeader from '../components/PageHeader';
import PageShell from '../components/PageShell';
import DataFreshness from '../components/DataFreshness';
import ExportButton from '../components/ExportButton';
import RefreshButton from '../components/RefreshButton';
import KPIGridControl from '../components/KPIGridControl';
import RallyKPISkeleton from '../components/RallyKPISkeleton';
import RallyChartSkeleton from '../components/RallyChartSkeleton';
import RallyTableSkeleton from '../components/RallyTableSkeleton';
import RallyMainCard from '../components/RallyMainCard';
import MarketBreadthBar from '../components/MarketBreadthBar';
import MarketPulseBar from '../components/MarketPulseBar';
import TickerTape from '../components/TickerTape';
import SectionTabs from '../components/SectionTabs';
import DashboardKPIGrid from './dashboard/DashboardKPIGrid';
import DashboardTedpixSection from './dashboard/DashboardTedpixSection';
import DashboardEqualWeightSection from './dashboard/DashboardEqualWeightSection';

// Lazy-load below-fold heavy sections
const DashboardChartsSection = lazy(() => import('./dashboard/DashboardChartsSection'));
const DashboardHeatmapSection = lazy(() => import('./dashboard/DashboardHeatmapSection'));
const DashboardTableSection = lazy(() => import('./dashboard/DashboardTableSection'));
import useDashboardData from '../hooks/useDashboardData';
import usePullToRefresh from '../hooks/usePullToRefresh';
import useSwipeNavigation from '../hooks/useSwipeNavigation';
import useSectionObserver from '../hooks/useSectionObserver';
import PullToRefreshIndicator from '../components/mobile/PullToRefreshIndicator';
import { DASHBOARD_SECTIONS } from '../constants/dashboard';

const sectionReveal = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
};
const sectionTransition = (delay = 0) => ({
  duration: 0.5,
  delay,
  ease: [0.22, 1, 0.36, 1],
});

export default function Dashboard() {
  const d = useDashboardData();
  const isMobile = useMediaQuery('(max-width: 48em)');

  // Section refs for swipe navigation
  const tedpixRef = useRef(null);
  const chartsRef = useRef(null);
  const heatmapRef = useRef(null);
  const tableRef = useRef(null);
  const sectionRefs = [tedpixRef, chartsRef, heatmapRef, tableRef];
  const { currentSection } = useSwipeNavigation(sectionRefs, { enabled: isMobile });

  // Sticky section tabs
  const sections = useMemo(
    () => DASHBOARD_SECTIONS.map((s, i) => ({ ...s, ref: sectionRefs[i] })),
    // sectionRefs are stable refs, so this only runs once
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const { activeIndex } = useSectionObserver(sectionRefs);

  // Pull-to-refresh (mobile only)
  const { pullDistance, isPulling, isRefreshing } = usePullToRefresh(d.fetchData, { enabled: isMobile });

  const skeleton = (
    <>
      <PageHeader title="داشبورد بازار" />
      <SimpleGrid cols={{ base: 2, xs: 2, sm: 3, md: 4, lg: 5, xl: 7 }} spacing={{ base: 'sm', md: 'md' }} mb="md">
        {[1,2,3,4,5,6,7].map(i => <RallyKPISkeleton key={i} />)}
      </SimpleGrid>
      <RallyMainCard mb="md"><RallyChartSkeleton height={200} /></RallyMainCard>
      <RallyMainCard noPadding><RallyTableSkeleton rows={8} columns={5} /></RallyMainCard>
    </>
  );

  return (
    <PageShell loading={d.loading} error={d.error} hasData={d.recentData.length > 0} skeleton={skeleton} onRetry={d.fetchData}>
      <PullToRefreshIndicator pullDistance={pullDistance} isPulling={isPulling} isRefreshing={isRefreshing} />

      {d.sortedByChange.length > 0 && (
        <Box display={{ base: 'none', sm: 'block' }}>
          <TickerTape items={d.sortedByChange.slice(0, 20).map((i) => ({ symbol: i.symbol, change: i.close_change_pct }))} />
        </Box>
      )}

      <PageHeader title="داشبورد بازار">
        <DataFreshness lastUpdated={d.lastUpdated} />
        <KPIGridControl />
        <RefreshButton onRefreshComplete={d.fetchData} />
      </PageHeader>

      <MarketPulseBar
        stats={d.stats}
        tedpixValue={d.tedpixChartData?.length ? d.tedpixChartData[d.tedpixChartData.length - 1]?.y : null}
        tedpixChange={d.tedpixTrend}
        advancers={d.advancers}
        decliners={d.decliners}
        totalVolume={d.stats?.total_volume_today}
      />

      <DashboardKPIGrid stats={d.stats} newHighs={d.newHighs} newLows={d.newLows} avgPE={d.avgPE} liquidityScore={d.liquidityScore} compact={isMobile} kpiSparklines={d.kpiSparklines} />

      <MarketBreadthBar advancers={d.advancers} decliners={d.decliners} unchanged={d.unchanged} />

      <SectionTabs sections={sections} activeIndex={activeIndex} />

      <motion.div ref={tedpixRef} style={{ scrollMarginTop: 120 }} {...sectionReveal} transition={sectionTransition(0)}>
        <DashboardTedpixSection
          tedpixTrend={d.tedpixTrend}
          indexRange={d.indexRange}
          onIndexRangeChange={d.handleIndexRangeChange}
          expanded={d.sectionsExpanded.tedpix}
          onToggle={() => d.toggleSection('tedpix')}
          tedpixLoading={d.tedpixLoading}
          tedpixChartData={d.tedpixChartData}
        />
        <DashboardEqualWeightSection
          tedpixChartData={d.tedpixChartData}
          tedpixTrend={d.tedpixTrend}
          tedpixLoading={d.tedpixLoading}
          ewTotalChartData={d.ewTotalChartData}
          ewTotalTrend={d.ewTotalTrend}
          ewTotalLoading={d.ewTotalLoading}
          ewPriceChartData={d.ewPriceChartData}
          ewPriceTrend={d.ewPriceTrend}
          ewPriceLoading={d.ewPriceLoading}
        />
      </motion.div>

      <Suspense fallback={<RallyMainCard mb="md"><RallyChartSkeleton height={300} /></RallyMainCard>}>
        <motion.div ref={chartsRef} style={{ scrollMarginTop: 120 }} {...sectionReveal} transition={sectionTransition(0.08)}>
          <DashboardChartsSection
            expanded={d.sectionsExpanded.charts}
            onToggle={() => d.toggleSection('charts')}
            barData={d.barData}
            volumeBySector={d.volumeBySector}
            pieData={d.pieData}
            totalSectorCount={d.totalSectorCount}
            recentData={d.recentData}
          />
        </motion.div>
      </Suspense>

      <Suspense fallback={<RallyMainCard mb="md"><RallyChartSkeleton height={300} /></RallyMainCard>}>
        <motion.div ref={heatmapRef} style={{ scrollMarginTop: 120 }} {...sectionReveal} transition={sectionTransition(0.12)}>
          <DashboardHeatmapSection
            expanded={d.sectionsExpanded.heatmap}
            onToggle={() => d.toggleSection('heatmap')}
            recentData={d.recentData}
          />
        </motion.div>
      </Suspense>

      <Suspense fallback={<RallyMainCard noPadding><RallyTableSkeleton rows={8} columns={5} /></RallyMainCard>}>
        <motion.div ref={tableRef} style={{ scrollMarginTop: 120 }} {...sectionReveal} transition={sectionTransition(0.16)}>
          <DashboardTableSection
            expanded={d.sectionsExpanded.table}
            onToggle={() => d.toggleSection('table')}
            recentData={d.recentData}
            filteredByCategory={d.filteredByCategory}
            filterCounts={d.filterCounts}
            activeFilter={d.activeFilter}
            onFilterChange={d.handleFilterChange}
            onRetry={d.fetchData}
          />
        </motion.div>
      </Suspense>

    </PageShell>
  );
}
