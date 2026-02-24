import { useNavigate } from 'react-router-dom';
import {
  ActionIcon, Alert, Badge, Grid, Group, Text, Title,
} from '@mantine/core';
import { IconStar, IconStarFilled } from '@tabler/icons-react';
import RallyMainCard from '../components/RallyMainCard';
import RallyChartSkeleton from '../components/RallyChartSkeleton';
import RallyKPISkeleton from '../components/RallyKPISkeleton';
import PercentChangeCell from '../components/cells/PercentChangeCell';
import RallyBreadcrumbs from '../components/RallyBreadcrumbs';
import DataFreshness from '../components/DataFreshness';
import useWatchlist from '../hooks/useWatchlist';
import useStockDetailData from '../hooks/useStockDetailData';
import { toJalali } from '../utils/dateUtils';
import { formatNum, formatSymbol } from '../utils/formatUtils';
import StockInfoSidebar from './stock/StockInfoSidebar';
import StockDetailTabs from './stock/StockDetailTabs';

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
    ewmaData,
    liquidityData,
    varBacktestData,
    volConeData,
  } = useStockDetailData();

  if (loading) return (
    <>
      <RallyBreadcrumbs items={[{ label: 'داشبورد', path: '/dashboard' }, { label: 'بازار', path: '/dashboard/market' }, { label: symbol }]} />
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, sm: 8, md: 8 }}>
          <RallyMainCard mb="md"><RallyChartSkeleton height={400} /></RallyMainCard>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 4, md: 4 }}>
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
        { label: formatSymbol(security.symbol, security.type) || symbol },
      ]} />

      {/* Header */}
      <Group gap="sm" mb="xs" wrap="wrap">
        <Title order={3}>{security.name_fa}</Title>
        <Badge color="rally-blue" variant="light">{formatSymbol(security.symbol, security.type)}</Badge>
        <Badge color={security.is_active ? 'rally-primary' : 'gray'} variant="outline">
          {security.is_active ? 'فعال' : 'غیرفعال'}
        </Badge>
        <ActionIcon variant="subtle" size="sm" onClick={() => toggleSymbol(security.symbol)} color={isWatched(security.symbol) ? 'rally-yellow' : 'gray'} aria-label={isWatched(security.symbol) ? 'حذف از دیده‌بان' : 'افزودن به دیده‌بان'}>
          {isWatched(security.symbol) ? <IconStarFilled size={18} /> : <IconStar size={18} />}
        </ActionIcon>
        <DataFreshness lastUpdated={lastUpdated} />
      </Group>
      <Text size="sm" c="dimmed" mb="md">{security.sector_name_fa}</Text>

      <Grid gutter="md">
        {/* Main Column — Tabbed Sections */}
        <Grid.Col span={{ base: 12, sm: 8, md: 8 }}>
          <StockDetailTabs
            symbol={symbol}
            security={security}
            history={history}
            historyLoading={historyLoading}
            selectedDuration={selectedDuration}
            setSelectedDuration={setSelectedDuration}
            indicatorPrefs={indicatorPrefs}
            toggleIndicator={toggleIndicator}

            metrics={metrics}
            benchmarkLoading={benchmarkLoading}
            insufficientData={insufficientData}
            monteCarloResult={monteCarloResult}
            monteCarloRunning={monteCarloRunning}
            scenarios={scenarios}
            benchHistory={benchHistory}
            ratioTimeSeries={ratioTimeSeries}
            ratiosLoading={ratiosLoading}
            historyColumns={historyColumns}
            historyPaged={historyPaged}
            page={page}
            setPage={setPage}
            perPage={perPage}
            setPerPage={setPerPage}
            totalRecords={totalRecords}
            ewmaData={ewmaData}
            liquidityData={liquidityData}
            varBacktestData={varBacktestData}
            volConeData={volConeData}
          />
        </Grid.Col>

        {/* Info Column */}
        <Grid.Col span={{ base: 12, sm: 4, md: 4 }}>
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
