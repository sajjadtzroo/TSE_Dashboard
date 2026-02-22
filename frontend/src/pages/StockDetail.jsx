import { useNavigate } from 'react-router-dom';
import {
  ActionIcon, Alert, Badge, Grid, Group, Text, Title,
} from '@mantine/core';
import { IconStar, IconStarFilled } from '@tabler/icons-react';
import RallyMainCard from '../components/RallyMainCard';
import RallyDataTable from '../components/RallyDataTable';
import RallyChartSkeleton from '../components/RallyChartSkeleton';
import RallyKPISkeleton from '../components/RallyKPISkeleton';
import PercentChangeCell from '../components/cells/PercentChangeCell';
import RallyBreadcrumbs from '../components/RallyBreadcrumbs';
import DataFreshness from '../components/DataFreshness';
import RiskMetricsPanel from '../components/RiskMetricsPanel';
import FinancialRatiosPanel from '../components/FinancialRatiosPanel';
import MovingAverageCard from '../components/cards/MovingAverageCard';
import PeerComparisonCard from '../components/cards/PeerComparisonCard';
import ScenarioAnalysisCard from '../components/cards/ScenarioAnalysisCard';
import RelativePerformanceChart from '../components/charts/RelativePerformanceChart';
import useWatchlist from '../hooks/useWatchlist';
import useStockDetailData from '../hooks/useStockDetailData';
import { toJalali } from '../utils/dateUtils';
import { formatNum } from '../utils/formatUtils';
import CodalAnnouncementsCard from '../components/cards/CodalAnnouncementsCard';
import RealtimeChartCard from '../components/cards/RealtimeChartCard';
import StockInfoSidebar from './stock/StockInfoSidebar';
import StockChartSection from './stock/StockChartSection';

export default function StockDetail() {
  const navigate = useNavigate();
  const { toggleSymbol, isWatched } = useWatchlist();

  const {
    symbol,
    stockData,
    history,
    loading,
    historyLoading,
    error,
    selectedDuration,
    setSelectedDuration,
    lastUpdated,
    indicatorPrefs,
    toggleIndicator,
    overlays,
    activeSubCharts,
    metrics,
    benchmarkLoading,
    insufficientData,
    orderBook,
    monteCarloResult,
    monteCarloRunning,
    scenarios,
    benchHistory,
    ratioTimeSeries,
    ratiosLoading,
    historyPaged,
    page,
    setPage,
    perPage,
    setPerPage,
    totalRecords,
  } = useStockDetailData();

  if (loading) return (
    <>
      <RallyBreadcrumbs items={[{ label: 'داشبورد', path: '/dashboard' }, { label: 'بازار', path: '/dashboard/market' }, { label: symbol }]} />
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, md: 8 }}>
          <RallyMainCard mb="md"><RallyChartSkeleton height={400} /></RallyMainCard>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <RallyKPISkeleton variant="accent-bar" />
        </Grid.Col>
      </Grid>
    </>
  );
  if (error) return <Alert color="red">خطا در بارگذاری: {error}</Alert>;

  const { security, latest_ohlcv } = stockData;

  // History table columns
  const historyColumns = [
    { accessor: 'date', title: 'تاریخ', width: 100, render: (r) => toJalali(r.date) },
    { accessor: 'open', title: 'باز', width: 90, textAlign: 'end', render: (r) => formatNum(r.open) },
    { accessor: 'high', title: 'بیشترین', width: 90, textAlign: 'end', render: (r) => formatNum(r.high) },
    { accessor: 'low', title: 'کمترین', width: 90, textAlign: 'end', render: (r) => formatNum(r.low) },
    { accessor: 'close', title: 'قیمت پایانی', width: 90, textAlign: 'end', render: (r) => formatNum(r.close) },
    { accessor: 'close_change_pct', title: 'تغییر ٪', width: 80, textAlign: 'end', render: (r) => <PercentChangeCell value={r.close_change_pct} /> },
    { accessor: 'volume', title: 'حجم', width: 100, textAlign: 'end', render: (r) => formatNum(r.volume) },
    { accessor: 'trades', title: 'تعداد معاملات', width: 80, textAlign: 'end', render: (r) => formatNum(r.trades) },
  ];

  return (
    <>
      {/* Breadcrumbs */}
      <RallyBreadcrumbs items={[
        { label: 'داشبورد', path: '/dashboard' },
        { label: 'بازار', path: '/dashboard/market' },
        { label: security.symbol || symbol },
      ]} />

      {/* Header */}
      <Group gap="sm" mb="xs" wrap="wrap">
        <Title order={3}>{security.name_fa}</Title>
        <Badge color="rally-blue" variant="light">{security.symbol}</Badge>
        <Badge color={security.is_active ? 'rally-green' : 'gray'} variant="outline">
          {security.is_active ? 'فعال' : 'غیرفعال'}
        </Badge>
        <ActionIcon variant="subtle" size="sm" onClick={() => toggleSymbol(security.symbol)} color={isWatched(security.symbol) ? 'rally-yellow' : 'gray'} aria-label={isWatched(security.symbol) ? 'حذف از دیده‌بان' : 'افزودن به دیده‌بان'}>
          {isWatched(security.symbol) ? <IconStarFilled size={18} /> : <IconStar size={18} />}
        </ActionIcon>
        <DataFreshness lastUpdated={lastUpdated} />
      </Group>
      <Text size="sm" c="dimmed" mb="md">{security.sector_name_fa}</Text>

      <Grid gutter="md">
        {/* Charts Column */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <StockChartSection
            history={history}
            historyLoading={historyLoading}
            duration={selectedDuration}
            onDurationChange={setSelectedDuration}
            indicators={indicatorPrefs}
            onIndicatorToggle={toggleIndicator}
            overlays={overlays}
            activeSubCharts={activeSubCharts}
          />

          {/* Real-time intraday candlestick chart */}
          <RealtimeChartCard symbol={security.symbol} />

          {/* Risk Metrics Panel */}
          {history.length > 5 && (
            <RiskMetricsPanel
              metrics={metrics}
              benchmarkLoading={benchmarkLoading}
              insufficientData={insufficientData}
              monteCarloResult={monteCarloResult}
              monteCarloRunning={monteCarloRunning}
              scenarios={scenarios}
            />
          )}

          {/* Codal Announcements */}
          <CodalAnnouncementsCard symbol={security.symbol} />

          {/* Financial Ratios Panel (CFA L1) */}
          <FinancialRatiosPanel
            ratioTimeSeries={ratioTimeSeries}
            loading={ratiosLoading}
          />

          {/* Additional analytics cards */}
          {history.length > 5 && (
            <Grid gutter="md" mb="md">
              <Grid.Col span={{ base: 12, md: 6 }}>
                <MovingAverageCard history={history} />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                {benchHistory.length > 0 && (
                  <RallyMainCard title="عملکرد نسبی در مقابل شاخص" mb="md">
                    <RelativePerformanceChart
                      stockHistory={history}
                      benchHistory={benchHistory}
                      height={220}
                    />
                  </RallyMainCard>
                )}
              </Grid.Col>
            </Grid>
          )}

          {/* Scenario analysis + Peer comparison */}
          {scenarios.length > 0 && (
            <Grid gutter="md" mb="md">
              <Grid.Col span={{ base: 12, md: 6 }}>
                <ScenarioAnalysisCard scenarios={scenarios} />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <PeerComparisonCard
                  sectorName={security.sector_name_fa}
                  currentSymbol={security.symbol}
                />
              </Grid.Col>
            </Grid>
          )}

          {history.length > 0 && (
            <RallyMainCard title={`داده‌های تاریخی (${history.length} days)`} noPadding>
              <RallyDataTable
                records={historyPaged}
                columns={historyColumns}
                page={page}
                onPageChange={setPage}
                recordsPerPage={perPage}
                onRecordsPerPageChange={setPerPage}
                totalRecords={totalRecords}
                minHeight={300}
              />
            </RallyMainCard>
          )}
        </Grid.Col>

        {/* Info Column */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <StockInfoSidebar
            stock={stockData}
            orderBook={orderBook}
            history={history}
            loading={loading}
          />
        </Grid.Col>
      </Grid>
    </>
  );
}
