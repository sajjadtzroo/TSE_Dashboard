import { useMemo } from 'react';
import { SimpleGrid, Card, Group, Text, Badge, Skeleton } from '@mantine/core';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useMarketIndices, useMarketIndexHistory } from '../../hooks/useMarketData';
import ChartTooltipV2 from '../../components/charts/shared/ChartTooltipV2';
import rallyColors from '../../theme/rallyColors';
import { toPersianNum, formatTrillion } from '../../utils/formatUtils';
import { GRID_STROKE, CURSOR_STROKE, axisTick } from '../../components/charts/shared/chartStyles';

const CHART_HEIGHT = 110;
const DAYS = 90;

function MiniAreaChart({ history, color }) {
  const chartData = useMemo(() => {
    if (!history || history.length === 0) return [];
    return history.map((d) => ({ name: d.date?.slice(5) || '', value: d.index_value }));
  }, [history]);

  if (chartData.length < 2) return null;

  const gradientId = `mini-area-${color.replace('#', '')}`;

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <AreaChart data={chartData} margin={{ top: 6, right: 6, bottom: 20, left: 44 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="60%" stopColor={color} stopOpacity={0.08} />
            <stop offset="100%" stopColor={color} stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis
          dataKey="name"
          tick={axisTick(9)}
          angle={-35}
          textAnchor="end"
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={(v) => formatTrillion(v)}
          tick={axisTick(9)}
          width={42}
        />
        <Tooltip
          content={<ChartTooltipV2 colorIndicator={false} formatter={(v) => formatTrillion(v)} />}
          cursor={CURSOR_STROKE}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function IndexCard({ name, color }) {
  const { data: indices } = useMarketIndices();
  const { data: history, isLoading } = useMarketIndexHistory(name, { days: DAYS });

  const entry = indices?.find((i) => i.name === name);
  const value = entry?.index_value ?? null;
  const changePct = entry?.index_change_pct ?? null;
  const isPositive = changePct > 0;
  const isNegative = changePct < 0;

  return (
    <Card
      radius="md"
      p="sm"
      style={{
        background: rallyColors.glassBg,
        backdropFilter: rallyColors.glassBlur,
        border: `1px solid ${rallyColors.glassBorder}`,
      }}
    >
      <Group justify="space-between" align="flex-start" mb={6} wrap="nowrap">
        <Text size="xs" c="dimmed" lineClamp={1} style={{ flex: 1 }}>{name}</Text>
        {changePct != null && (
          <Badge
            size="xs"
            variant="light"
            color={isPositive ? 'green' : isNegative ? 'red' : 'gray'}
          >
            {isPositive ? '+' : ''}{toPersianNum(changePct.toFixed(2))}٪
          </Badge>
        )}
      </Group>

      <Text size="md" fw={700} c={rallyColors.textPrimary} mb={4} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {value != null ? toPersianNum(value.toLocaleString('fa-IR', { maximumFractionDigits: 0 })) : '—'}
      </Text>

      {isLoading ? (
        <Skeleton height={CHART_HEIGHT} radius="sm" />
      ) : (
        <MiniAreaChart history={history} color={color} />
      )}
    </Card>
  );
}

export default function IndexMiniBar() {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" mb="sm">
      <IndexCard name="شاخص کل (هم وزن)" color={rallyColors.primary} />
      <IndexCard name="شاخص قیمت (هم وزن)" color={rallyColors.purple} />
    </SimpleGrid>
  );
}
