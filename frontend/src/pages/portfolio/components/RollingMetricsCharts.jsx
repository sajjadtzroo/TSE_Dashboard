import { useMemo } from 'react';
import { SimpleGrid, Text } from '@mantine/core';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import RallyMainCard from '../../../components/RallyMainCard';
import ChartEmptyState from '../../../components/charts/shared/ChartEmptyState';
import { usePortfolioContext } from '../PortfolioProvider';
import { computeRollingMetrics, computeEWMAVolatility } from '../../../utils/riskMetrics/rolling';
import { alignReturnSeries } from '../../../utils/riskMetrics/returns';
import { GRID_STROKE, axisTick, TOOLTIP_STYLE } from '../../../components/charts/shared/chartStyles';
import rallyColors from '../../../theme/rallyColors';

const CHARTS = [
  { key: 'rollingSharpe', label: 'شارپ غلتان', color: rallyColors.blue, ref: 0 },
  { key: 'rollingBeta', label: 'بتای غلتان', color: rallyColors.yellow, ref: 1 },
  { key: 'rollingVol', label: 'نوسان‌پذیری غلتان', color: rallyColors.red, ref: null },
  { key: 'rollingCorrelation', label: 'همبستگی غلتان', color: rallyColors.purple, ref: null },
];

function MiniChart({ data, dataKey, label, color, refValue }) {
  if (!data?.length) {
    return (
      <RallyMainCard title={label}>
        <ChartEmptyState height={180} message="داده کافی نیست" />
      </RallyMainCard>
    );
  }

  return (
    <RallyMainCard title={label} fullscreenable>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis dataKey="date" tick={axisTick(9)} tickLine={false} axisLine={false} />
          <YAxis tick={axisTick(9)} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [v?.toFixed(3), label]} />
          {refValue != null && (
            <ReferenceLine y={refValue} stroke={rallyColors.textDimmed} strokeDasharray="4 4" strokeOpacity={0.5} />
          )}
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </RallyMainCard>
  );
}

export default function RollingMetricsCharts() {
  const { portfolioReturns, benchReturnSeries } = usePortfolioContext();

  const { rollingData, ewmaData } = useMemo(() => {
    const { returns: portRets, dates: portDates } = portfolioReturns;
    if (portRets.length < 30) return { rollingData: [], ewmaData: [] };

    const portReturnObjs = portDates.map((d, i) => ({ date: d, ret: portRets[i] }));
    const aligned = alignReturnSeries(portReturnObjs, benchReturnSeries);

    const rolling = computeRollingMetrics(
      aligned.stockReturns,
      aligned.benchReturns,
      aligned.dates,
      30,
    );

    const ewma = computeEWMAVolatility(portRets, portDates);

    // Merge EWMA into rolling vol chart data
    const merged = rolling.map((r) => {
      const ewmaPoint = ewma.find((e) => e.date === r.date);
      return { ...r, ewmaVol: ewmaPoint?.ewmaVol ?? null };
    });

    return { rollingData: merged, ewmaData: ewma };
  }, [portfolioReturns, benchReturnSeries]);

  if (!rollingData.length) {
    return (
      <RallyMainCard title="متریک‌های غلتان">
        <ChartEmptyState height={200} message="حداقل ۳۰ روز داده برای متریک‌های غلتان لازم است" />
      </RallyMainCard>
    );
  }

  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
      {CHARTS.map((c) => (
        <MiniChart
          key={c.key}
          data={rollingData}
          dataKey={c.key}
          label={c.label}
          color={c.color}
          refValue={c.ref}
        />
      ))}
    </SimpleGrid>
  );
}
