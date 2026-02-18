import { useRef, useMemo } from 'react';
import { Badge, Box, SimpleGrid } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconPlayerPlay, IconPlayerPause } from '@tabler/icons-react';
import PageHeader from '../components/PageHeader';
import PageShell from '../components/PageShell';
import DataFreshness from '../components/DataFreshness';
import ExportButton from '../components/ExportButton';
import RefreshButton from '../components/RefreshButton';
import RallyKPISkeleton from '../components/RallyKPISkeleton';
import RallyChartSkeleton from '../components/RallyChartSkeleton';
import RallyTableSkeleton from '../components/RallyTableSkeleton';
import RallyMainCard from '../components/RallyMainCard';
import MarketBreadthBar from '../components/MarketBreadthBar';
import TickerTape from '../components/TickerTape';
import SectionTabs from '../components/SectionTabs';
import DashboardKPIGrid from './dashboard/DashboardKPIGrid';
import DashboardTedpixSection from './dashboard/DashboardTedpixSection';
import DashboardChartsSection from './dashboard/DashboardChartsSection';
import DashboardHeatmapSection from './dashboard/DashboardHeatmapSection';
import DashboardTableSection from './dashboard/DashboardTableSection';
import useDashboardData from '../hooks/useDashboardData';
import usePullToRefresh from '../hooks/usePullToRefresh';
import useSwipeNavigation from '../hooks/useSwipeNavigation';
import useSectionObserver from '../hooks/useSectionObserver';
import PullToRefreshIndicator from '../components/mobile/PullToRefreshIndicator';
import rallyColors from '../theme/rallyColors';
import { AUTO_REFRESH_INTERVALS, DASHBOARD_SECTIONS } from '../constants/dashboard';

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
      <SimpleGrid cols={{ base: 1, xs: 2, sm: 2, md: 3, lg: 4, xl: 7 }} mb="md">
        {[1,2,3,4,5,6,7].map(i => <RallyKPISkeleton key={i} />)}
      </SimpleGrid>
      <RallyMainCard mb="md"><RallyChartSkeleton height={280} /></RallyMainCard>
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
        {d.autoRefresh > 0
          ? <IconPlayerPause size={14} color={rallyColors.green} />
          : <IconPlayerPlay size={14} color={rallyColors.textSecondary} />
        }
        {AUTO_REFRESH_INTERVALS.map((opt) => (
          <Badge key={opt.seconds} size="sm" variant={d.autoRefresh === opt.seconds ? 'filled' : 'light'} color={d.autoRefresh === opt.seconds ? 'rally-green' : 'gray'} style={{ cursor: 'pointer' }} onClick={() => d.setAutoRefresh(opt.seconds)}>
            {opt.label}
          </Badge>
        ))}
        <DataFreshness lastUpdated={d.lastUpdated} />
        <RefreshButton onRefreshComplete={d.fetchData} />
      </PageHeader>

      <DashboardKPIGrid stats={d.stats} newHighs={d.newHighs} newLows={d.newLows} avgPE={d.avgPE} liquidityScore={d.liquidityScore} compact={isMobile} kpiSparklines={d.kpiSparklines} />

      <MarketBreadthBar advancers={d.advancers} decliners={d.decliners} unchanged={d.unchanged} />

      <SectionTabs sections={sections} activeIndex={activeIndex} />

      <div ref={tedpixRef} style={{ scrollMarginTop: 120 }}>
        <DashboardTedpixSection
          tedpixTrend={d.tedpixTrend}
          indexRange={d.indexRange}
          onIndexRangeChange={d.handleIndexRangeChange}
          expanded={d.sectionsExpanded.tedpix}
          onToggle={() => d.toggleSection('tedpix')}
          tedpixLoading={d.tedpixLoading}
          tedpixChartData={d.tedpixChartData}
        />
      </div>

      <div ref={chartsRef} style={{ scrollMarginTop: 120 }}>
        <DashboardChartsSection
          expanded={d.sectionsExpanded.charts}
          onToggle={() => d.toggleSection('charts')}
          barData={d.barData}
          volumeBySector={d.volumeBySector}
          pieData={d.pieData}
          totalSectorCount={d.totalSectorCount}
          recentData={d.recentData}
        />
      </div>

      <div ref={heatmapRef} style={{ scrollMarginTop: 120 }}>
        <DashboardHeatmapSection
          expanded={d.sectionsExpanded.heatmap}
          onToggle={() => d.toggleSection('heatmap')}
          recentData={d.recentData}
        />
      </div>

      <div ref={tableRef} style={{ scrollMarginTop: 120 }}>
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
      </div>

    </PageShell>
  );
}
