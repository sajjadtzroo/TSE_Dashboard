import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Badge, Center, Grid, Group, Loader, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import api from '../services/apiClient';
import RallyBreadcrumbs from '../components/RallyBreadcrumbs';
import RallyMainCard from '../components/RallyMainCard';
import RallyChartSkeleton from '../components/RallyChartSkeleton';
import RallyKPISkeleton from '../components/RallyKPISkeleton';
import DataFreshness from '../components/DataFreshness';
import { useETFNavHistory } from '../hooks/useMarketData';
import useRiskMetrics from '../hooks/useRiskMetrics';
import useMonteCarloWorker from '../hooks/useMonteCarloWorker';
import usePagination from '../hooks/usePagination';
import { mean as calcMean, stdDev } from '../utils/riskMetrics/descriptive';
import { scenarioAnalysis } from '../utils/riskMetrics/scenario';
import { computeSimpleReturns } from '../utils/riskMetrics/returns';
import { backtestVaR, kupiecPOF, baselTrafficLight } from '../utils/riskMetrics/varBacktest';
import ETFDetailTabs from './etf/ETFDetailTabs';
import ETFInfoSidebar from './etf/ETFInfoSidebar';

const BREADCRUMBS = (symbol) => [
  { label: 'داشبورد', path: '/dashboard' },
  { label: 'NAV صندوق‌ها', path: '/dashboard/etf-nav' },
  { label: symbol },
];

export default function ETFDetail() {
  const { symbol } = useParams();
  const [selectedDuration, setSelectedDuration] = useState('365');

  const days = selectedDuration === '0' ? 0 : Number(selectedDuration) || 365;

  // Current snapshot
  const {
    data: etfList,
    isLoading: snapshotLoading,
    error: snapshotError,
    dataUpdatedAt: lastUpdated,
  } = useQuery({
    queryKey: ['etf-nav', symbol],
    queryFn: () => api.get('/market/etf-nav', { params: { symbol } }).then(r => r.data),
    enabled: !!symbol,
    staleTime: 3 * 60 * 1000,
  });
  const etfData = etfList?.[0] || null;

  // History (duration-based for chart/metrics)
  const { data: rawHistory, isLoading: historyLoading } = useETFNavHistory(symbol, { days });
  const history = rawHistory || [];

  // Full history for VaR backtest (needs 250+ days)
  const { data: rawFullHistory } = useETFNavHistory(symbol, { days: 0 });
  const fullHistory = rawFullHistory || [];

  // Transform for risk metrics: {date, close}
  const stockHistory = useMemo(
    () => history.filter((h) => h.last_price != null).map((h) => ({ date: h.date, close: h.last_price })),
    [history],
  );

  // Risk metrics (reuses TEDPIX benchmark fetch + all CFA computations)
  const { metrics, benchmarkLoading, insufficientData } = useRiskMetrics(
    symbol, stockHistory, selectedDuration,
  );

  // Full-history returns for VaR backtest
  const fullReturns = useMemo(() => {
    const prices = fullHistory.filter((h) => h.last_price != null).map((h) => ({ date: h.date, close: h.last_price }));
    if (prices.length < 2) return { returns: [], dates: [] };
    const sr = computeSimpleReturns(prices);
    return { returns: sr.map((r) => r.ret), dates: sr.map((r) => r.date) };
  }, [fullHistory]);

  // Monte Carlo simulation
  const mcConfig = useMemo(() => {
    if (!metrics || !metrics.volatility || !stockHistory.length) return null;
    const lastPrice = stockHistory[stockHistory.length - 1]?.close;
    if (!lastPrice) return null;
    return {
      currentPrice: lastPrice,
      mu: metrics.annualizedReturn || 0,
      sigma: metrics.volatility,
      days: 252,
      numPaths: 1000,
    };
  }, [metrics, stockHistory]);

  const { result: monteCarloResult, running: monteCarloRunning } = useMonteCarloWorker(mcConfig);

  // Scenario analysis — use benchmark vol for market-level shocks (CFA convention)
  const scenarios = useMemo(() => {
    if (!metrics || metrics.beta == null || !stockHistory.length) return [];
    const lastPrice = stockHistory[stockHistory.length - 1]?.close;
    if (!lastPrice) return [];
    const marketVol = metrics.benchmarkVolatility
      || (metrics.beta !== 0 ? metrics.volatility / Math.abs(metrics.beta) : metrics.volatility);
    return scenarioAnalysis(lastPrice, metrics.beta, marketVol, metrics.alpha || 0);
  }, [metrics, stockHistory]);

  // VaR Backtesting (needs 280+ returns)
  const varBacktestData = useMemo(() => {
    if (fullReturns.returns.length < 280) return null;
    const result = backtestVaR(fullReturns.returns, fullReturns.dates, 250, 0.95);
    if (!result) return null;
    const kupiec = kupiecPOF(result.totalDays, result.violations, 0.05);
    const trafficLight = baselTrafficLight(result.violations, result.totalDays, 0.95);
    return { ...result, kupiec, trafficLight };
  }, [fullReturns]);

  // Premium/discount (bubble) analytics
  const bubbleStats = useMemo(() => {
    const bubbles = history.filter((h) => h.bubble_pct != null).map((h) => h.bubble_pct);
    if (bubbles.length < 5) return null;
    const avg = calcMean(bubbles);
    const std = stdDev(bubbles);
    const current = bubbles[bubbles.length - 1];
    const zScore = std > 0 ? (current - avg) / std : 0;
    return { mean: avg, std, current, zScore, count: bubbles.length };
  }, [history]);

  // Pagination for history tab
  const { paged: historyPaged, page, setPage, perPage, setPerPage, totalRecords } = usePagination(history);

  // Loading skeleton
  if (snapshotLoading && !etfData) {
    return (
      <>
        <RallyBreadcrumbs items={BREADCRUMBS(symbol)} />
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
  }

  if (snapshotError) {
    return (
      <>
        <RallyBreadcrumbs items={BREADCRUMBS(symbol)} />
        <Alert color="red">خطا در بارگذاری اطلاعات صندوق: {snapshotError?.message ?? String(snapshotError)}</Alert>
      </>
    );
  }

  return (
    <>
      {/* Breadcrumbs */}
      <RallyBreadcrumbs items={BREADCRUMBS(symbol)} />

      {/* Header */}
      <Group gap="sm" mb="xs" wrap="wrap">
        <Title order={3}>{etfData?.name_fa || symbol}</Title>
        <Badge color="rally-blue" variant="light">{symbol}</Badge>
        {etfData?.fund_type && (
          <Badge color="rally-purple" variant="outline">{etfData.fund_type}</Badge>
        )}
        <DataFreshness lastUpdated={lastUpdated} />
      </Group>

      {insufficientData && stockHistory.length > 0 && (
        <Alert color="yellow" mb="md" variant="light">
          داده تاریخی کمتر از ۳۰ روز است — نتایج تحلیل ریسک ممکن است دقیق نباشد
        </Alert>
      )}

      <Grid gutter="md">
        {/* Main Column — Tabs */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <ETFDetailTabs
            history={history}
            historyLoading={historyLoading}
            duration={selectedDuration}
            onDurationChange={setSelectedDuration}
            metrics={metrics}
            benchmarkLoading={benchmarkLoading}
            insufficientData={insufficientData}
            monteCarloResult={monteCarloResult}
            monteCarloRunning={monteCarloRunning}
            scenarios={scenarios}
            varBacktestData={varBacktestData}
            historyPaged={historyPaged}
            page={page}
            setPage={setPage}
            perPage={perPage}
            setPerPage={setPerPage}
            totalRecords={totalRecords}
          />
        </Grid.Col>

        {/* Sidebar */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <ETFInfoSidebar
            etfData={etfData}
            metrics={metrics}
            bubbleStats={bubbleStats}
            loading={snapshotLoading}
          />
        </Grid.Col>
      </Grid>
    </>
  );
}
