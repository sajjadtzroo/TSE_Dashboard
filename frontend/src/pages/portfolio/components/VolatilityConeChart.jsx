import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  ErrorBar,
} from 'recharts';
import { SimpleGrid, Text, Badge, Stack } from '@mantine/core';
import RallyMainCard from '../../../components/RallyMainCard';
import RallyKPICard from '../../../components/RallyKPICard';
import ChartEmptyState from '../../../components/charts/shared/ChartEmptyState';
import { usePortfolioContext } from '../PortfolioProvider';
import { computeVolatilityCone } from '../../../utils/riskMetrics/volCone';
import { GRID_STROKE, axisTick, TOOLTIP_STYLE } from '../../../components/charts/shared/chartStyles';
import { toPersianNum } from '../../../utils/formatUtils';
import rallyColors from '../../../theme/rallyColors';
import { IconFlame } from '@tabler/icons-react';

const WINDOW_LABELS = { 20: '۲۰ روز', 60: '۶۰ روز', 90: '۹۰ روز', 120: '۱۲۰ روز', 250: '۱ سال' };

function ConeTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div style={{ ...TOOLTIP_STYLE }}>
      <Text size="xs" fw={600} c={rallyColors.textPrimary} mb={4}>{WINDOW_LABELS[d.window] || d.window}</Text>
      <Text size="xs" c={rallyColors.blue}>فعلی: {d.current?.toFixed(1)}٪</Text>
      <Text size="xs" c={rallyColors.textSecondary}>P25-P75: {d.p25?.toFixed(1)}–{d.p75?.toFixed(1)}٪</Text>
      <Text size="xs" c={rallyColors.textDimmed}>Min-Max: {d.min?.toFixed(1)}–{d.max?.toFixed(1)}٪</Text>
    </div>
  );
}

export default function VolatilityConeChart() {
  const { portfolioReturns } = usePortfolioContext();

  const coneData = useMemo(() => {
    const { returns: portRets } = portfolioReturns;
    if (portRets.length < 20) return [];
    return computeVolatilityCone(portRets);
  }, [portfolioReturns]);

  if (!coneData.length) {
    return (
      <RallyMainCard title="مخروط نوسان‌پذیری">
        <ChartEmptyState height={250} message="داده کافی برای مخروط نوسان‌پذیری نیست" />
      </RallyMainCard>
    );
  }

  // Prepare chart data with error bars for range visualization
  const chartData = coneData.map((d) => ({
    ...d,
    label: WINDOW_LABELS[d.window] || `${d.window}d`,
    rangeBottom: d.p25,
    rangeTop: d.p75,
    errorLow: d.current - d.min,
    errorHigh: d.max - d.current,
  }));

  const latest = coneData[0]; // shortest window = most recent signal

  return (
    <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
      <RallyMainCard title="مخروط نوسان‌پذیری" fullscreenable>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 12, right: 12, bottom: 0, left: 12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis dataKey="label" tick={axisTick()} tickLine={false} axisLine={false} />
            <YAxis tick={axisTick()} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}٪`} />
            <Tooltip content={<ConeTooltip />} />
            <Bar dataKey="current" radius={[6, 6, 0, 0]} maxBarSize={48}>
              {chartData.map((d, i) => {
                // Color based on where current sits in range
                const pctInRange = d.p75 !== d.p25 ? (d.current - d.p25) / (d.p75 - d.p25) : 0.5;
                const color = pctInRange > 0.75 ? rallyColors.red : pctInRange > 0.5 ? rallyColors.yellow : rallyColors.green;
                return <Cell key={i} fill={color} fillOpacity={0.7} />;
              })}
              <ErrorBar dataKey="errorHigh" direction="y" width={8} stroke={rallyColors.textDimmed} strokeWidth={1} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </RallyMainCard>

      <Stack gap="md">
        {coneData.map((d) => {
          const pctInRange = d.p75 !== d.p25 ? (d.current - d.p25) / (d.p75 - d.p25) : 0.5;
          const level = pctInRange > 0.75 ? 'بالا' : pctInRange > 0.5 ? 'متوسط' : 'پایین';
          const color = pctInRange > 0.75 ? 'red' : pctInRange > 0.5 ? 'yellow' : 'green';
          return (
            <RallyMainCard key={d.window} p="sm">
              <Stack gap={2} align="flex-end">
                <Text size="xs" c="dimmed">{WINDOW_LABELS[d.window]}</Text>
                <Text size="lg" fw={700} c={rallyColors.textPrimary}>{toPersianNum(d.current.toFixed(1))}٪</Text>
                <Badge size="xs" color={color} variant="light">{level}</Badge>
                <Text size="xs" c="dimmed">محدوده: {toPersianNum(d.min.toFixed(1))}–{toPersianNum(d.max.toFixed(1))}٪</Text>
              </Stack>
            </RallyMainCard>
          );
        })}
      </Stack>
    </SimpleGrid>
  );
}
