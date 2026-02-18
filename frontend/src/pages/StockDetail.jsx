import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ActionIcon, Alert, Badge, Card, Center, Divider, Grid, Group, Loader,
  SegmentedControl, Stack, Text, Title,
} from '@mantine/core';
import {
  IconTrendingUp, IconTrendingDown, IconArrowUpRight, IconArrowDownRight,
  IconUsers, IconBuildingBank, IconStar, IconStarFilled,
} from '@tabler/icons-react';
import axios from 'axios';
import RallyMainCard from '../components/RallyMainCard';
import RallyDataTable from '../components/RallyDataTable';
import RallyCandlestickChart from '../components/charts/RallyCandlestickChart';
import TechnicalSubChart from '../components/charts/TechnicalSubChart';
import PercentChangeCell from '../components/cells/PercentChangeCell';
import rallyColors from '../theme/rallyColors';
import RallyBreadcrumbs from '../components/RallyBreadcrumbs';
import DataFreshness from '../components/DataFreshness';
import RallyKPISkeleton from '../components/RallyKPISkeleton';
import RallyChartSkeleton from '../components/RallyChartSkeleton';
import RallyTableSkeleton from '../components/RallyTableSkeleton';
import IndicatorToggle from '../components/IndicatorToggle';
import RiskMetricsPanel from '../components/RiskMetricsPanel';
import OrderBookCard from '../components/cards/OrderBookCard';
import MoneyFlowCard from '../components/cards/MoneyFlowCard';
import MovingAverageCard from '../components/cards/MovingAverageCard';
import PeerComparisonCard from '../components/cards/PeerComparisonCard';
import ScenarioAnalysisCard from '../components/cards/ScenarioAnalysisCard';
import RelativePerformanceChart from '../components/charts/RelativePerformanceChart';
import useWatchlist from '../hooks/useWatchlist';
import usePagination from '../hooks/usePagination';
import useIndicatorPrefs from '../hooks/useIndicatorPrefs';
import useTechnicalIndicators from '../hooks/useTechnicalIndicators';
import useRiskMetrics from '../hooks/useRiskMetrics';
import useMonteCarloWorker from '../hooks/useMonteCarloWorker';
import useApiData from '../hooks/useApiData';
import { toJalali } from '../utils/dateUtils';
import { formatNum } from '../utils/formatUtils';
import { scenarioAnalysis } from '../utils/riskMetrics/scenario';
import { DURATION_OPTIONS } from '../constants/stockDetail';

export default function StockDetail() {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const [stockData, setStockData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState('30');
  const { toggleSymbol, isWatched } = useWatchlist();
  const [lastUpdated, setLastUpdated] = useState(null);

  // Technical indicator preferences (persisted in localStorage)
  const { prefs: indicatorPrefs, toggle: toggleIndicator } = useIndicatorPrefs();

  // Pagination hook - must be called before any conditional returns
  const historyRows = [...history].reverse().map((h, i) => ({ id: i, ...h }));
  const { paged: historyPaged, page, setPage, perPage, setPerPage, totalRecords } = usePagination(historyRows);

  // Technical indicators
  const { overlays, subCharts } = useTechnicalIndicators(history, indicatorPrefs);

  // Risk metrics
  const { metrics, benchmarkLoading, insufficientData } = useRiskMetrics(symbol, history, selectedDuration);

  // Order book data
  const { data: orderBook } = useApiData(
    `/api/stocks/${encodeURIComponent(symbol)}/orderbook`,
    { deps: [symbol], initialValue: [] }
  );

  // Monte Carlo simulation config
  const mcConfig = useMemo(() => {
    if (!metrics || !metrics.volatility || !history.length) return null;
    const lastPrice = history[history.length - 1]?.close || history[history.length - 1]?.adj_close;
    if (!lastPrice) return null;
    return {
      currentPrice: lastPrice,
      mu: metrics.annualizedReturn || 0,
      sigma: metrics.volatility,
      days: 252,
      numPaths: 1000,
    };
  }, [metrics, history]);

  const { result: monteCarloResult, running: monteCarloRunning } = useMonteCarloWorker(mcConfig);

  // Scenario analysis
  const scenarios = useMemo(() => {
    if (!metrics || metrics.beta == null || !history.length) return [];
    const lastPrice = history[history.length - 1]?.close;
    if (!lastPrice) return [];
    return scenarioAnalysis(lastPrice, metrics.beta, metrics.volatility, metrics.alpha || 0);
  }, [metrics, history]);

  // Benchmark history for relative performance chart
  const { data: benchHistory } = useApiData(
    `/api/market/indices/${encodeURIComponent('شاخص كل')}/history?days=${selectedDuration}`,
    { deps: [selectedDuration], initialValue: [] }
  );

  // Active sub-chart indicators
  const activeSubCharts = useMemo(() => {
    return Object.entries(subCharts).filter(([key]) => indicatorPrefs[key]);
  }, [subCharts, indicatorPrefs]);

  const fetchHistory = useCallback(async (days) => {
    try {
      setHistoryLoading(true);
      const res = await axios.get(`/api/stocks/${encodeURIComponent(symbol)}/history?days=${days}`);
      setHistory(res.data);
    } catch (err) { console.error('Error fetching history:', err); }
    finally { setHistoryLoading(false); }
  }, [symbol]);

  const fetchStockData = useCallback(async () => {
    try {
      setLoading(true);
      const encodedSymbol = encodeURIComponent(symbol);
      const [detailRes, historyRes] = await Promise.all([
        axios.get(`/api/stocks/${encodedSymbol}`),
        axios.get(`/api/stocks/${encodedSymbol}/history?days=${selectedDuration}`),
      ]);
      setStockData(detailRes.data);
      setHistory(historyRes.data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [symbol, selectedDuration]);

  useEffect(() => { fetchStockData(); }, [fetchStockData]);
  useEffect(() => { if (stockData) fetchHistory(selectedDuration); }, [selectedDuration, stockData, fetchHistory]);

  if (loading) return (
    <>
      <RallyBreadcrumbs items={[{ label: 'داشبورد', path: '/dashboard' }, { label: 'بازار', path: '/dashboard/market' }, { label: symbol }]} />
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, md: 8 }}>
          <RallyMainCard mb="md"><RallyChartSkeleton height={280} /></RallyMainCard>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <RallyKPISkeleton variant="accent-bar" />
        </Grid.Col>
      </Grid>
    </>
  );
  if (error) return <Alert color="red">خطا در بارگذاری: {error}</Alert>;

  const { security, latest_ohlcv } = stockData;
  const isPositive = latest_ohlcv?.close_change >= 0;
  const days = Number(selectedDuration);

  // History table
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

  const InfoRow = ({ label, value, color }) => (
    <Group justify="space-between" py={4}>
      <Text size="sm" c="dimmed">{label}</Text>
      <Text size="sm" fw={500} c={color}>{value}</Text>
    </Group>
  );

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
        <ActionIcon variant="subtle" size="sm" onClick={() => toggleSymbol(security.symbol)} color={isWatched(security.symbol) ? 'rally-yellow' : 'gray'}>
          {isWatched(security.symbol) ? <IconStarFilled size={18} /> : <IconStar size={18} />}
        </ActionIcon>
        <DataFreshness lastUpdated={lastUpdated} />
      </Group>
      <Text size="sm" c="dimmed" mb="md">{security.sector_name_fa}</Text>

      <Grid gutter="md">
        {/* Charts Column */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <RallyMainCard
            title={
              <Group justify="space-between" w="100%" wrap="wrap" gap="xs">
                <Title order={4}>نمودار قیمت</Title>
                <Group gap="xs">
                  <IndicatorToggle prefs={indicatorPrefs} onToggle={toggleIndicator} />
                  <SegmentedControl
                    size="xs"
                    value={selectedDuration}
                    onChange={setSelectedDuration}
                    data={DURATION_OPTIONS}
                  />
                </Group>
              </Group>
            }
            mb="md"
          >
            {historyLoading ? (
              <Center mih={400}><Loader color="rally-green" size="sm" /></Center>
            ) : history.length > 0 ? (
              <>
                <RallyCandlestickChart
                  data={history}
                  height={400}
                  showVolume
                  activeIndicators={indicatorPrefs}
                  overlayData={overlays}
                />
                {/* Sub-charts for RSI, MACD, Stochastic, ATR, OBV */}
                {activeSubCharts.map(([key, chartData]) => (
                  <TechnicalSubChart
                    key={key}
                    type={key}
                    data={chartData}
                    height={150}
                  />
                ))}
              </>
            ) : (
              <Center mih={400}><Text c="dimmed">داده نموداری موجود نیست</Text></Center>
            )}
          </RallyMainCard>

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
          {latest_ohlcv && (
            <Card withBorder radius="md" mb="md">
              <Group gap="xs" mb="sm">
                {isPositive
                  ? <IconTrendingUp size={24} color={rallyColors.green} />
                  : <IconTrendingDown size={24} color={rallyColors.orange} />
                }
                <Text size="xl" fw={700} c={isPositive ? rallyColors.green : rallyColors.orange}>
                  {formatNum(latest_ohlcv.close)}
                </Text>
              </Group>
              <Group gap={4} mb="sm">
                {isPositive
                  ? <IconArrowUpRight size={16} color={rallyColors.green} />
                  : <IconArrowDownRight size={16} color={rallyColors.orange} />
                }
                <Text size="sm" fw={600} c={isPositive ? rallyColors.green : rallyColors.orange}>
                  {latest_ohlcv.close_change > 0 ? '+' : ''}
                  {formatNum(latest_ohlcv.close_change)} ({(latest_ohlcv.close_change_pct ?? 0).toFixed(2)}%)
                </Text>
              </Group>
              <Divider mb="xs" color="rgba(148, 163, 184, 0.12)" />
              <InfoRow label="باز" value={formatNum(latest_ohlcv.open)} />
              <InfoRow label="بیشترین" value={formatNum(latest_ohlcv.high)} />
              <InfoRow label="کمترین" value={formatNum(latest_ohlcv.low)} />
              <InfoRow label="آخرین" value={formatNum(latest_ohlcv.last)} />
              <InfoRow label="حجم" value={formatNum(latest_ohlcv.volume)} />
              <InfoRow label="تعداد معاملات" value={formatNum(latest_ohlcv.trades)} />
            </Card>
          )}

          {latest_ohlcv && (latest_ohlcv.pe_ratio || latest_ohlcv.eps || latest_ohlcv.market_cap) && (
            <RallyMainCard title="شاخص‌های مالی" mb="md">
              <InfoRow label="P/E Ratio" value={latest_ohlcv.pe_ratio?.toFixed(2) || 'N/A'} />
              <InfoRow label="EPS" value={formatNum(latest_ohlcv.eps)} />
              <InfoRow label="ارزش بازار" value={formatNum(latest_ohlcv.market_cap)} />
            </RallyMainCard>
          )}

          {latest_ohlcv && (latest_ohlcv.real_buy_count || latest_ohlcv.legal_buy_count) && (
            <RallyMainCard title="فعالیت معامله‌گران" mb="md">
              <Group gap="xs" mb={4}>
                <IconUsers size={18} color={rallyColors.blue} />
                <Text size="sm" fw={600}>حقیقی</Text>
              </Group>
              <InfoRow label="خریدار" value={formatNum(latest_ohlcv.real_buy_count)} color={rallyColors.green} />
              <InfoRow label="فروشنده" value={formatNum(latest_ohlcv.real_sell_count)} color={rallyColors.orange} />
              <Divider my="xs" color="rgba(148, 163, 184, 0.12)" />
              <Group gap="xs" mb={4}>
                <IconBuildingBank size={18} color={rallyColors.purple} />
                <Text size="sm" fw={600}>حقوقی</Text>
              </Group>
              <InfoRow label="خریدار" value={formatNum(latest_ohlcv.legal_buy_count)} color={rallyColors.green} />
              <InfoRow label="فروشنده" value={formatNum(latest_ohlcv.legal_sell_count)} color={rallyColors.orange} />
            </RallyMainCard>
          )}

          {/* Order Book Depth */}
          <OrderBookCard orderBook={orderBook} />

          {/* Money Flow */}
          <MoneyFlowCard history={history} />
        </Grid.Col>
      </Grid>
    </>
  );
}
