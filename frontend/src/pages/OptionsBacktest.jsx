import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  SimpleGrid,
  NumberInput,
  Slider,
  SegmentedControl,
  Group,
  Text,
  Badge,
  Stack,
  Select,
  Button,
  Table,
  Loader,
  Paper,
} from '@mantine/core';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from 'recharts';
import RallyMainCard from '../components/RallyMainCard';
import RallyKPICard from '../components/RallyKPICard';
import PageHeader from '../components/PageHeader';
import { STRATEGY_PRESETS, STRATEGY_LABELS } from '../utils/blackScholes';
import useOptionsBacktestWorker from '../hooks/useOptionsBacktestWorker';
import { useOptionsUnderlyings } from '../hooks/useMarketData';
import { useStockHistory } from '../hooks/useMarketData';
import { formatNum } from '../utils/formatUtils';
import rallyColors from '../theme/rallyColors';
import { GRID_STROKE, axisTick, TOOLTIP_STYLE } from '../components/charts/shared/chartStyles';
import { IconChartLine, IconPlayerPlay, IconHistory, IconPlugConnected } from '@tabler/icons-react';

const TYPE_LABELS = { call: 'خرید (Call)', put: 'فروش (Put)', stock: 'سهم' };
const DIR_LABELS = { 1: 'خرید (Long)', '-1': 'فروش (Short)' };

export default function OptionsBacktest() {
  /* ── State ────────────────────────────────────────────────────── */
  const [mode, setMode] = useState('monteCarlo');
  const [selectedPreset, setSelectedPreset] = useState('straddle');
  const [stockPrice, setStockPrice] = useState(10000);
  const [volatility, setVolatility] = useState(30);
  const [riskFreeRate, setRiskFreeRate] = useState(23);
  const [entryDTE, setEntryDTE] = useState(30);
  const [numSims, setNumSims] = useState(100);
  const [pathLength, setPathLength] = useState(252);
  const [commission, setCommission] = useState(0);
  const [stopLoss, setStopLoss] = useState(0);
  const [profitTarget, setProfitTarget] = useState(0);

  /* ── Historical mode state ───────────────────────────────────── */
  const [selectedUnderlying, setSelectedUnderlying] = useState(null);
  const [historyDays, setHistoryDays] = useState(500);
  const { data: underlyings = [] } = useOptionsUnderlyings();
  const { data: historyData, isLoading: historyLoading } = useStockHistory(
    selectedUnderlying,
    { days: historyDays, enabled: !!selectedUnderlying && mode === 'historical' },
  );
  const underlyingSelectData = underlyings
    .filter((u) => u.underlying)
    .map((u) => ({ value: u.underlying, label: `${u.underlying}${u.name_fa ? ` - ${u.name_fa}` : ''}` }));

  // Auto-fill S from latest close of selected underlying
  useEffect(() => {
    if (historyData?.length > 0) {
      const latest = historyData[historyData.length - 1];
      const closePrice = latest.close || latest.last;
      if (closePrice > 0) setStockPrice(Math.round(closePrice));
    }
  }, [historyData]);

  /* ── Derived legs from preset ─────────────────────────────────── */
  const selectedLegs = useMemo(() => {
    if (!selectedPreset || !STRATEGY_PRESETS[selectedPreset]) {
      // Default to a simple long call if preset missing
      return [{ type: 'call', direction: 1, strike: 1.0, premium: 0, qty: 1 }];
    }
    const generator = STRATEGY_PRESETS[selectedPreset];
    const legs = generator(stockPrice);
    // Convert absolute strikes back to ratios for the backtest engine
    return legs.map((leg) => ({
      ...leg,
      strike: leg.type === 'stock' ? leg.strike : leg.strike / stockPrice,
    }));
  }, [selectedPreset, stockPrice]);

  /* ── Strategy presets for Select dropdown ──────────────────────── */
  const presetSelectData = useMemo(
    () =>
      Object.entries(STRATEGY_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
    [],
  );

  /* ── Worker ───────────────────────────────────────────────────── */
  const { result, running, error, run } = useOptionsBacktestWorker();

  const handleRun = useCallback(() => {
    const legsWithDefaults = selectedLegs.map((leg) => ({
      ...leg,
      premium: leg.premium || 0,
    }));

    if (mode === 'historical' && historyData?.length > 0) {
      const prices = historyData.map((d) => d.close || d.last || 0).filter((p) => p > 0);
      const dates = historyData.map((d) => d.date);
      run('historical', {
        legs: legsWithDefaults,
        historicalPrices: prices,
        dates,
        entryDTE,
        exitDTE: 0,
        r: riskFreeRate / 100,
        sigma: volatility > 0 ? volatility / 100 : null, // null = auto from history
        volLookback: 30,
        commission,
        slippage: 0,
        stopLoss: stopLoss > 0 ? stopLoss : null,
        profitTarget: profitTarget > 0 ? profitTarget : null,
      });
    } else {
      run('monteCarlo', {
        legs: legsWithDefaults,
        S0: stockPrice,
        r: riskFreeRate / 100,
        sigma: volatility / 100,
        numSims,
        pathLength,
        entryDTE,
        commission,
        slippage: 0,
        stopLoss: stopLoss > 0 ? stopLoss : null,
        profitTarget: profitTarget > 0 ? profitTarget : null,
      });
    }
  }, [mode, selectedLegs, stockPrice, riskFreeRate, volatility, numSims, pathLength, entryDTE, commission, stopLoss, profitTarget, historyData, run]);

  /* ── Aggregate stats from result ──────────────────────────────── */
  const isHistoricalResult = result && !result.aggregateStats && result.summary;
  const stats = isHistoricalResult
    ? {
        avgWinRate: result.summary.winRate,
        avgTotalPnL: result.summary.totalPnL,
        avgSharpe: result.summary.sharpeRatio,
        pnl5th: result.summary.maxDrawdown,
        pnl95th: result.summary.profitFactor,
      }
    : result?.aggregateStats;

  /* ── Equity curve ────────────────────────────────────────────── */
  const equityCurveData = useMemo(() => {
    if (isHistoricalResult && result?.equityCurve?.length) {
      return result.equityCurve.map((pt, idx) => ({
        idx,
        date: pt.date,
        equity: Math.round(pt.equity * 100) / 100,
      }));
    }
    if (!result?.simResults?.[0]?.equityCurve) return [];
    return result.simResults[0].equityCurve.map((pt, idx) => ({
      idx,
      date: pt.date,
      equity: Math.round(pt.equity * 100) / 100,
    }));
  }, [result, isHistoricalResult]);

  /* ── PnL distribution histogram ───────────────────────────────── */
  const pnlHistogramData = useMemo(() => {
    // For historical results, use trade PnLs
    const allPnLs = isHistoricalResult
      ? (result?.trades || []).map((t) => t.pnl).sort((a, b) => a - b)
      : stats?.pnlDistribution;
    if (!allPnLs?.length) return [];
    const min = allPnLs[0];
    const max = allPnLs[allPnLs.length - 1];
    if (min === max) return [{ range: formatNum(Math.round(min)), count: allPnLs.length, midpoint: min }];

    const numBins = Math.min(20, Math.max(5, Math.ceil(Math.sqrt(allPnLs.length))));
    const binWidth = (max - min) / numBins;
    const bins = Array.from({ length: numBins }, (_, i) => ({
      lo: min + i * binWidth,
      hi: min + (i + 1) * binWidth,
      count: 0,
    }));

    for (const pnl of allPnLs) {
      let idx = Math.floor((pnl - min) / binWidth);
      if (idx >= numBins) idx = numBins - 1;
      if (idx < 0) idx = 0;
      bins[idx].count++;
    }

    return bins.map((b) => {
      const midpoint = (b.lo + b.hi) / 2;
      return {
        range: `${formatNum(Math.round(b.lo))}`,
        count: b.count,
        midpoint,
      };
    });
  }, [stats]);

  /* ── Legs display table ───────────────────────────────────────── */
  const legsDisplayRows = useMemo(() => {
    if (!selectedPreset || !STRATEGY_PRESETS[selectedPreset]) return [];
    const legs = STRATEGY_PRESETS[selectedPreset](stockPrice);
    return legs.map((leg, idx) => (
      <Table.Tr key={idx}>
        <Table.Td>{TYPE_LABELS[leg.type] || leg.type}</Table.Td>
        <Table.Td>{DIR_LABELS[leg.direction] || leg.direction}</Table.Td>
        <Table.Td>{formatNum(leg.strike)}</Table.Td>
        <Table.Td>{formatNum(leg.qty)}</Table.Td>
      </Table.Tr>
    ));
  }, [selectedPreset, stockPrice]);

  return (
    <>
      <PageHeader title={'بک\u200Cتست استراتژی اختیار (Options Backtest)'} />

      {/* Mode Selector */}
      <RallyMainCard
        title={
          <Group gap="xs">
            <IconHistory size={18} color={rallyColors.blue} />
            <Text fw={600}>{'حالت بک\u200Cتست'}</Text>
          </Group>
        }
        mb="md"
      >
        <SegmentedControl
          value={mode}
          onChange={setMode}
          data={[
            { value: 'monteCarlo', label: 'مونت\u200Cکارلو (مسیرهای مصنوعی GBM)' },
            { value: 'historical', label: 'تاریخی (داده واقعی بازار)' },
          ]}
          size="sm"
          styles={{ root: { background: 'rgba(42, 46, 62, 0.5)' } }}
        />
        <Text size="xs" c="dimmed" mt="xs">
          {mode === 'monteCarlo'
            ? 'مسیرهای قیمتی مصنوعی بر اساس مدل حرکت براونی هندسی (GBM) تولید و استراتژی روی آنها اجرا می\u200Cشود.'
            : 'استراتژی روی داده تاریخی واقعی دارایی پایه اجرا می\u200Cشود.'}
        </Text>
      </RallyMainCard>

      {/* Historical Market Data Connection */}
      {mode === 'historical' && (
        <RallyMainCard
          title={
            <Group gap="xs">
              <IconPlugConnected size={18} color={rallyColors.blue} />
              <Text fw={600}>{'انتخاب دارایی پایه'}</Text>
            </Group>
          }
          mb="md"
        >
          <Group gap="md" wrap="wrap" align="flex-end">
            <Select
              label={'دارایی پایه'}
              placeholder={'انتخاب دارایی...'}
              data={underlyingSelectData}
              value={selectedUnderlying}
              onChange={setSelectedUnderlying}
              searchable
              clearable
              size="sm"
              style={{ minWidth: 220, flex: 1, maxWidth: 360 }}
              nothingFoundMessage={'دارایی یافت نشد'}
            />
            <NumberInput
              label={'تعداد روز تاریخی'}
              value={historyDays}
              onChange={(v) => setHistoryDays(v || 100)}
              min={100}
              max={2000}
              step={100}
              size="sm"
              style={{ maxWidth: 180 }}
            />
            {historyLoading && <Loader size="sm" color={rallyColors.primary} />}
            {historyData?.length > 0 && (
              <Badge color="rally-primary" variant="light" size="lg">
                {formatNum(historyData.length)} {'روز داده'}
              </Badge>
            )}
          </Group>
          <Text size="xs" c="dimmed" mt="xs">
            {'داده تاریخی OHLCV دارایی پایه بارگذاری و به عنوان مسیر قیمتی استفاده می\u200Cشود. نوسان‌پذیری به‌صورت خودکار از داده محاسبه خواهد شد.'}
          </Text>
        </RallyMainCard>
      )}

      {/* Strategy Configuration */}
      <RallyMainCard
        title={
          <Group gap="xs">
            <IconChartLine size={18} color={rallyColors.primary} />
            <Text fw={600}>{'انتخاب استراتژی'}</Text>
          </Group>
        }
        mb="md"
      >
        <Select
          label={'استراتژی'}
          placeholder={'انتخاب استراتژی...'}
          data={presetSelectData}
          value={selectedPreset}
          onChange={setSelectedPreset}
          searchable
          size="sm"
          style={{ maxWidth: 360 }}
          nothingFoundMessage={'استراتژی یافت نشد'}
        />

        {legsDisplayRows.length > 0 && (
          <>
            <Text size="sm" fw={600} mt="md" mb="xs">{'پایه\u200Cهای استراتژی'}</Text>
            <Paper p="xs" radius="md" style={{ background: 'rgba(42, 46, 62, 0.3)', overflowX: 'auto' }}>
              <Table striped highlightOnHover withTableBorder={false} style={{ fontSize: 13 }}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{'نوع'}</Table.Th>
                    <Table.Th>{'جهت'}</Table.Th>
                    <Table.Th>{'اعمال'}</Table.Th>
                    <Table.Th>{'تعداد'}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>{legsDisplayRows}</Table.Tbody>
              </Table>
            </Paper>
          </>
        )}
      </RallyMainCard>

      {/* Parameters */}
      <RallyMainCard mb="md">
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" mb="md">
          <div>
            <NumberInput
              label={'قیمت پایه اولیه (S₀)'}
              value={stockPrice}
              onChange={(v) => setStockPrice(v || 0)}
              min={1}
              step={100}
              size="sm"
            />
            <Slider
              value={stockPrice}
              onChange={setStockPrice}
              min={100}
              max={100000}
              step={100}
              mt="xs"
              size="xs"
              color="rally-primary"
            />
          </div>
          <div>
            <NumberInput
              label={'نوسان\u200Cپذیری (σ %)'}
              value={volatility}
              onChange={(v) => setVolatility(v ?? 1)}
              min={1}
              max={200}
              step={1}
              size="sm"
            />
            <Slider
              value={volatility}
              onChange={setVolatility}
              min={1}
              max={200}
              mt="xs"
              size="xs"
              color="rally-primary"
            />
          </div>
          <div>
            <NumberInput
              label={'نرخ بدون ریسک (r %)'}
              value={riskFreeRate}
              onChange={(v) => setRiskFreeRate(v ?? 0)}
              min={0}
              max={50}
              step={0.5}
              decimalScale={1}
              size="sm"
            />
          </div>
          <div>
            <NumberInput
              label={'روز تا سررسید ورود (Entry DTE)'}
              value={entryDTE}
              onChange={(v) => setEntryDTE(v || 1)}
              min={1}
              max={365}
              size="sm"
            />
          </div>
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" mb="md">
          <div>
            <Text size="sm" fw={500} mb={4}>{'تعداد شبیه\u200Cسازی'}</Text>
            <Slider
              value={numSims}
              onChange={setNumSims}
              min={10}
              max={500}
              step={10}
              size="sm"
              color="rally-primary"
              marks={[
                { value: 10, label: '10' },
                { value: 100, label: '100' },
                { value: 250, label: '250' },
                { value: 500, label: '500' },
              ]}
            />
            <Text size="xs" c="dimmed" mt={4} ta="center">{formatNum(numSims)}</Text>
          </div>
          <div>
            <NumberInput
              label={'طول مسیر (روز معاملاتی)'}
              value={pathLength}
              onChange={(v) => setPathLength(v || 1)}
              min={30}
              max={1000}
              step={1}
              size="sm"
            />
          </div>
          <div>
            <NumberInput
              label={'کارمزد هر قرارداد'}
              value={commission}
              onChange={(v) => setCommission(v ?? 0)}
              min={0}
              step={1}
              size="sm"
            />
          </div>
          <div>
            <SimpleGrid cols={2} spacing="xs">
              <NumberInput
                label={'حد ضرر (کسر)'}
                value={stopLoss}
                onChange={(v) => setStopLoss(v ?? 0)}
                min={0}
                max={5}
                step={0.1}
                decimalScale={2}
                size="sm"
                placeholder="0 = غیرفعال"
              />
              <NumberInput
                label={'حد سود (کسر)'}
                value={profitTarget}
                onChange={(v) => setProfitTarget(v ?? 0)}
                min={0}
                max={5}
                step={0.1}
                decimalScale={2}
                size="sm"
                placeholder="0 = غیرفعال"
              />
            </SimpleGrid>
          </div>
        </SimpleGrid>

        {/* Run Button */}
        <Group justify="center" mt="md">
          <Button
            size="md"
            leftSection={<IconPlayerPlay size={18} />}
            onClick={handleRun}
            loading={running}
            color="rally-primary"
          >
            {'اجرای بک\u200Cتست'}
          </Button>
          {running && (
            <Group gap="xs">
              <Loader size="sm" color={rallyColors.primary} />
              <Text size="sm" c="dimmed">{'در حال اجرا...'}</Text>
            </Group>
          )}
        </Group>

        {error && (
          <Text size="sm" c={rallyColors.red} mt="sm" ta="center">
            {'خطا: '}{error}
          </Text>
        )}
      </RallyMainCard>

      {/* ── Results Section ────────────────────────────────────────── */}
      {stats && (
        <>
          {/* KPI Cards */}
          <SimpleGrid cols={{ base: 2, md: 5 }} mb="md">
            <RallyKPICard
              title={'نرخ برد میانگین'}
              value={`${formatNum(Math.round(stats.avgWinRate * 10000) / 100)}%`}
              icon={IconChartLine}
              color={rallyColors.green}
              animateValue
            />
            <RallyKPICard
              title={'سود/زیان کل میانگین'}
              value={formatNum(Math.round(stats.avgTotalPnL * 100) / 100)}
              icon={IconChartLine}
              color={stats.avgTotalPnL >= 0 ? rallyColors.green : rallyColors.red}
              animateValue
            />
            <RallyKPICard
              title={'شارپ میانگین'}
              value={formatNum(Math.round(stats.avgSharpe * 100) / 100)}
              icon={IconChartLine}
              color={rallyColors.blue}
              animateValue
            />
            <RallyKPICard
              title={isHistoricalResult ? 'حداکثر افت' : 'صدک ۵'}
              value={isHistoricalResult
                ? `${formatNum(Math.round(stats.pnl5th * 10000) / 100)}%`
                : formatNum(Math.round(stats.pnl5th * 100) / 100)}
              color={rallyColors.red}
              animateValue
            />
            <RallyKPICard
              title={isHistoricalResult ? 'ضریب سود' : 'صدک ۹۵'}
              value={formatNum(Math.round(stats.pnl95th * 100) / 100)}
              color={rallyColors.green}
              animateValue
            />
          </SimpleGrid>

          <Stack gap="md">
            {/* Equity Curve */}
            {equityCurveData.length > 0 && (
              <RallyMainCard title={'منحنی سرمایه (Equity Curve)'} fullscreenable>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={equityCurveData} margin={{ top: 10, right: 20, bottom: 20, left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                    <XAxis
                      dataKey="date"
                      tick={axisTick(10)}
                      label={{
                        value: 'معامله',
                        position: 'insideBottom',
                        offset: -10,
                        fontSize: 11,
                        fill: rallyColors.textSecondary,
                      }}
                    />
                    <YAxis
                      tick={axisTick(10)}
                      tickFormatter={(v) => formatNum(v)}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(v) => [formatNum(v), 'سرمایه']}
                      labelFormatter={(v) => v}
                    />
                    <ReferenceLine y={0} stroke={rallyColors.yellow} strokeDasharray="5 5" />
                    <Line
                      type="monotone"
                      dataKey="equity"
                      stroke={rallyColors.primary}
                      strokeWidth={2}
                      dot={{ r: 2, fill: rallyColors.primary }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <Text size="xs" c="dimmed" mt="xs" ta="center">
                  {'منحنی سرمایه اولین شبیه\u200Cسازی (از مجموع '}{formatNum(numSims)}{' شبیه\u200Cسازی)'}
                </Text>
              </RallyMainCard>
            )}

            {/* PnL Distribution */}
            {pnlHistogramData.length > 0 && (
              <RallyMainCard title={'توزیع سود/زیان (PnL Distribution)'} fullscreenable>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={pnlHistogramData} margin={{ top: 10, right: 20, bottom: 20, left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                    <XAxis
                      dataKey="range"
                      tick={axisTick(9)}
                      label={{
                        value: 'سود/زیان',
                        position: 'insideBottom',
                        offset: -10,
                        fontSize: 11,
                        fill: rallyColors.textSecondary,
                      }}
                    />
                    <YAxis
                      tick={axisTick(10)}
                      label={{
                        value: 'فراوانی',
                        angle: -90,
                        position: 'insideLeft',
                        offset: -25,
                        fontSize: 11,
                        fill: rallyColors.textSecondary,
                      }}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(v) => [formatNum(v), 'تعداد']}
                      labelFormatter={(v) => `سود/زیان: ${v}`}
                    />
                    <ReferenceLine x={0} stroke={rallyColors.yellow} strokeDasharray="5 5" />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {pnlHistogramData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={entry.midpoint >= 0 ? rallyColors.green : rallyColors.red}
                          fillOpacity={0.85}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <Paper p="md" radius="md" mt="sm" style={{ background: 'rgba(42, 46, 62, 0.3)' }}>
                  <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                    <div>
                      <Text size="xs" c="dimmed">{'میانگین سود/زیان'}</Text>
                      <Text size="lg" fw={700} c={stats.avgTotalPnL >= 0 ? rallyColors.green : rallyColors.red}>
                        {formatNum(Math.round(stats.avgTotalPnL * 100) / 100)}
                      </Text>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed">{'صدک ۵ (بدترین حالت)'}</Text>
                      <Text size="lg" fw={700} c={rallyColors.red}>
                        {formatNum(Math.round(stats.pnl5th * 100) / 100)}
                      </Text>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed">{'صدک ۹۵ (بهترین حالت)'}</Text>
                      <Text size="lg" fw={700} c={rallyColors.green}>
                        {formatNum(Math.round(stats.pnl95th * 100) / 100)}
                      </Text>
                    </div>
                  </SimpleGrid>
                </Paper>
              </RallyMainCard>
            )}
            {/* Historical Trades Table */}
            {isHistoricalResult && result?.trades?.length > 0 && (
              <RallyMainCard title={`جزئیات معاملات (${formatNum(result.trades.length)} معامله)`}>
                <Paper p="xs" radius="md" style={{ background: 'rgba(42, 46, 62, 0.3)', overflowX: 'auto' }}>
                  <Table striped highlightOnHover withTableBorder style={{ fontSize: 12 }}>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>{'تاریخ ورود'}</Table.Th>
                        <Table.Th>{'تاریخ خروج'}</Table.Th>
                        <Table.Th>{'قیمت پایه'}</Table.Th>
                        <Table.Th>{'سود/زیان'}</Table.Th>
                        <Table.Th>{'سود/زیان (%)'}</Table.Th>
                        <Table.Th>{'روز نگهداری'}</Table.Th>
                        <Table.Th>{'دلیل خروج'}</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {result.trades.slice(0, 50).map((trade, i) => (
                        <Table.Tr key={i}>
                          <Table.Td>{trade.entryDate}</Table.Td>
                          <Table.Td>{trade.exitDate}</Table.Td>
                          <Table.Td>{formatNum(Math.round(trade.entrySpot))}</Table.Td>
                          <Table.Td>
                            <Text size="xs" fw={600} c={trade.pnl >= 0 ? rallyColors.green : rallyColors.red}>
                              {trade.pnl >= 0 ? '+' : ''}{formatNum(trade.pnl)}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs" c={trade.pnlPct >= 0 ? rallyColors.green : rallyColors.red}>
                              {(trade.pnlPct * 100).toFixed(1)}%
                            </Text>
                          </Table.Td>
                          <Table.Td>{trade.daysHeld}</Table.Td>
                          <Table.Td>
                            <Badge
                              size="xs"
                              variant="light"
                              color={trade.exitReason === 'profit-target' ? 'green' : trade.exitReason === 'stop-loss' ? 'red' : 'gray'}
                            >
                              {trade.exitReason === 'expiry' ? 'سررسید' : trade.exitReason === 'stop-loss' ? 'حد ضرر' : trade.exitReason === 'profit-target' ? 'حد سود' : trade.exitReason}
                            </Badge>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                  {result.trades.length > 50 && (
                    <Text size="xs" c="dimmed" mt="xs" ta="center">
                      {'نمایش ۵۰ معامله اول از '}{formatNum(result.trades.length)}
                    </Text>
                  )}
                </Paper>
              </RallyMainCard>
            )}
          </Stack>
        </>
      )}
    </>
  );
}
