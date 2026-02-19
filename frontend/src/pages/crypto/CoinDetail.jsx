import { useParams } from 'react-router-dom';
import {
  ActionIcon, Alert, Badge, Grid, Group, SimpleGrid, Text, Title,
} from '@mantine/core';
import { IconStar, IconStarFilled } from '@tabler/icons-react';
import RallyMainCard from '../../components/RallyMainCard';
import RallyDataTable from '../../components/RallyDataTable';
import RallyChartSkeleton from '../../components/RallyChartSkeleton';
import RallyKPISkeleton from '../../components/RallyKPISkeleton';
import RallyBreadcrumbs from '../../components/RallyBreadcrumbs';
import DataFreshness from '../../components/DataFreshness';
import RiskMetricsPanel from '../../components/RiskMetricsPanel';
import MovingAverageCard from '../../components/cards/MovingAverageCard';
import ScenarioAnalysisCard from '../../components/cards/ScenarioAnalysisCard';
import RelativePerformanceChart from '../../components/charts/RelativePerformanceChart';
import CryptoIcon from '../../components/CryptoIcon';
import useWatchlist from '../../hooks/useWatchlist';
import useCoinDetailData from '../../hooks/useCoinDetailData';
import CoinChartSection from './coin/CoinChartSection';
import CoinInfoSidebar from './coin/CoinInfoSidebar';
import CryptoPeerComparisonCard from './coin/CryptoPeerComparisonCard';
import PercentChangeCell from '../../components/cells/PercentChangeCell';
import { formatNum, formatUsd } from '../../utils/formatUtils';
import { toJalali } from '../../utils/dateUtils';
import { getCryptoCategory, CRYPTO_CATEGORY_LABELS } from '../../constants/crypto';

export default function CoinDetail() {
  const { symbol } = useParams();
  const { toggleSymbol, isWatched } = useWatchlist();

  const {
    detail,
    chartHistory,
    chartInterval,
    setChartInterval,
    chartHistoryLoading,
    dailyHistory,
    benchSymbol,
    benchHistory,
    market,
    marketLoading,
    isLoading,
    isError,
    lastUpdated,
    indicatorPrefs,
    toggleIndicator,
    overlays,
    activeSubCharts,
    metrics,
    insufficientData,
    monteCarloResult,
    monteCarloRunning,
    scenarios,
    historyPaged,
    page,
    setPage,
    perPage,
    setPerPage,
    totalRecords,
  } = useCoinDetailData(symbol);

  // Loading skeleton
  if (isLoading) return (
    <>
      <RallyBreadcrumbs items={[{ label: 'رمزارز', path: '/crypto' }, { label: symbol }]} />
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, md: 8 }}>
          <RallyMainCard mb="md"><RallyChartSkeleton height={400} /></RallyMainCard>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <SimpleGrid cols={1}>
            {[1, 2, 3].map(i => <RallyKPISkeleton key={i} variant="accent-bar" />)}
          </SimpleGrid>
        </Grid.Col>
      </Grid>
    </>
  );

  if (isError) return <Alert color="red">خطا در بارگذاری داده‌ها</Alert>;

  // Category badge
  const category = getCryptoCategory(symbol);
  const categoryLabel = category ? CRYPTO_CATEGORY_LABELS[category] : null;

  // History table columns
  const historyColumns = [
    { accessor: 'date', title: 'تاریخ', width: 110, render: (r) => toJalali(r.date) },
    { accessor: 'open', title: 'باز', width: 100, textAlign: 'end', render: (r) => formatUsd(r.open) },
    { accessor: 'high', title: 'بیشترین', width: 100, textAlign: 'end', render: (r) => formatUsd(r.high) },
    { accessor: 'low', title: 'کمترین', width: 100, textAlign: 'end', render: (r) => formatUsd(r.low) },
    { accessor: 'close', title: 'بسته', width: 100, textAlign: 'end', render: (r) => formatUsd(r.close) },
    { accessor: 'close_change_pct', title: 'تغییر', width: 90, textAlign: 'end', render: (r) => <PercentChangeCell value={r.close_change_pct} /> },
    { accessor: 'volume', title: 'حجم', width: 110, textAlign: 'end', render: (r) => formatNum(r.volume) },
  ];

  return (
    <>
      {/* Breadcrumbs */}
      <RallyBreadcrumbs items={[
        { label: 'رمزارز', path: '/crypto' },
        { label: detail?.name_fa || symbol },
      ]} />

      {/* Header */}
      <Group gap="sm" mb="xs" wrap="wrap">
        <CryptoIcon symbol={symbol} size={32} />
        <Title order={3}>{detail?.name_fa || symbol}</Title>
        <Badge color="rally-blue" variant="light">{symbol}</Badge>
        <ActionIcon
          variant="subtle"
          size="sm"
          onClick={() => toggleSymbol(symbol)}
          color={isWatched(symbol) ? 'rally-yellow' : 'gray'}
        >
          {isWatched(symbol) ? <IconStarFilled size={18} /> : <IconStar size={18} />}
        </ActionIcon>
        <DataFreshness lastUpdated={lastUpdated} />
      </Group>
      {categoryLabel && (
        <Text size="sm" c="dimmed" mb="md">{categoryLabel}</Text>
      )}

      <Grid gutter="md">
        {/* ── Left Column (8/12) ──────────────────────────────────────── */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          {/* Chart with indicators */}
          <CoinChartSection
            symbol={symbol}
            chartHistory={chartHistory}
            interval={chartInterval}
            onIntervalChange={setChartInterval}
            detail={detail}
            loading={chartHistoryLoading}
            indicators={indicatorPrefs}
            onIndicatorToggle={toggleIndicator}
            overlays={overlays}
            activeSubCharts={activeSubCharts}
          />

          {/* Risk Metrics Panel */}
          {dailyHistory.length > 5 && (
            <RiskMetricsPanel
              metrics={metrics}
              insufficientData={insufficientData}
              monteCarloResult={monteCarloResult}
              monteCarloRunning={monteCarloRunning}
              scenarios={scenarios}
            />
          )}

          {/* Moving Average + Relative Performance */}
          {dailyHistory.length > 5 && (
            <Grid gutter="md" mb="md">
              <Grid.Col span={{ base: 12, md: 6 }}>
                <MovingAverageCard history={dailyHistory} />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                {benchHistory.length > 0 && (
                  <RallyMainCard title={`عملکرد نسبی در مقابل ${benchSymbol}`} mb="md">
                    <RelativePerformanceChart
                      stockHistory={dailyHistory}
                      benchHistory={benchHistory}
                      height={220}
                      stockLabel={symbol}
                      benchLabel={benchSymbol}
                    />
                  </RallyMainCard>
                )}
              </Grid.Col>
            </Grid>
          )}

          {/* Scenario Analysis + Peer Comparison */}
          {(scenarios.length > 0 || market?.length > 0) && (
            <Grid gutter="md" mb="md">
              <Grid.Col span={{ base: 12, md: 6 }}>
                <ScenarioAnalysisCard scenarios={scenarios} />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <CryptoPeerComparisonCard
                  currentSymbol={symbol}
                  market={market}
                  loading={marketLoading}
                />
              </Grid.Col>
            </Grid>
          )}

          {/* Historical Data Table */}
          {dailyHistory.length > 0 && (
            <RallyMainCard title={`داده‌های تاریخی (${dailyHistory.length} روز)`} noPadding>
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

        {/* ── Right Column (4/12) ─────────────────────────────────────── */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <CoinInfoSidebar detail={detail} symbol={symbol} market={market} dailyHistory={dailyHistory} />
        </Grid.Col>
      </Grid>
    </>
  );
}
