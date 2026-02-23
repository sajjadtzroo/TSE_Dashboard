import { useState, useMemo } from 'react';
import {
  Tabs, Card, SimpleGrid, Text, Stack, Group, SegmentedControl, Badge, Divider,
} from '@mantine/core';
import rallyColors from '../../theme/rallyColors';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, Legend,
} from 'recharts';
import { COMPARISON_COLORS } from '../../constants/chartColors';
import { toPersianNum } from '../../utils/formatUtils';
import ETFRadarChart from './ETFRadarChart';

const METRIC_LABELS = {
  sharpe: 'شارپ', sortino: 'سورتینو', beta: 'بتا',
  alpha: 'آلفای جنسن', maxDrawdown: 'حداکثر افت',
};

const cardStyle = (color) => ({
  background: rallyColors.glassBg,
  backdropFilter: rallyColors.glassBlur,
  borderTop: `2px solid ${color}`,
  border: `1px solid ${rallyColors.glassBorder}`,
  borderTopColor: color,
  minWidth: 140,
});

/** Single metric card for one ETF */
function ETFMetricCard({ symbol, metrics, color }) {
  if (!metrics) return (
    <Card radius="md" p="sm" style={cardStyle(color)}>
      <Text size="sm" fw={700} c={color}>{symbol}</Text>
      <Text size="xs" c="dimmed" mt={4}>داده کافی نیست</Text>
    </Card>
  );

  return (
    <Card radius="md" p="sm" style={cardStyle(color)}>
      <Text size="sm" fw={700} c={color} mb={8}>{symbol}</Text>
      {Object.entries(METRIC_LABELS).map(([key, label]) => {
        const val = key === 'maxDrawdown'
          ? (metrics[key] != null ? `${(metrics[key] * 100).toFixed(1)}٪` : '-')
          : key === 'alpha'
          ? (metrics[key] != null ? `${(metrics[key] * 100).toFixed(2)}٪` : '-')
          : (metrics[key] != null ? toPersianNum(metrics[key].toFixed(2)) : '-');
        return (
          <Group key={key} justify="space-between" gap={4} py={2}
            style={{ borderBottom: `1px solid ${rallyColors.border}` }}
          >
            <Text size="xs" c="dimmed">{label}</Text>
            <Text size="xs" fw={600} c={rallyColors.textPrimary}>{val}</Text>
          </Group>
        );
      })}
    </Card>
  );
}

/** Multi-series line chart (Recharts) */
function MultiLineChart({ series, height = 280, yFormatter, zeroLine = false }) {
  const merged = useMemo(() => {
    const map = {};
    series.forEach(({ symbol, data }) => {
      data.forEach(({ date, value }) => {
        if (!map[date]) map[date] = { date };
        map[date][symbol] = value;
      });
    });
    return Object.values(map).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }, [series]);

  if (!merged.length) return <Text size="sm" c="dimmed" ta="center" py="xl">داده کافی نیست</Text>;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={merged} margin={{ top: 8, right: 16, bottom: 30, left: 50 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} tickCount={6} angle={-30} textAnchor="end" />
        <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={yFormatter} />
        <Tooltip formatter={(v) => (yFormatter ? yFormatter(v) : v)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {zeroLine && <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 2" />}
        {series.map(({ symbol }, i) => (
          <Line
            key={symbol}
            type="monotone"
            dataKey={symbol}
            stroke={COMPARISON_COLORS[i % COMPARISON_COLORS.length]}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Rolling metrics tab content */
function RollingTab({ selectedSymbols, metricsMap }) {
  const [rollingMetric, setRollingMetric] = useState('rollingSharpe');

  const ROLLING_OPTIONS = [
    { label: 'شارپ رولینگ', value: 'rollingSharpe' },
    { label: 'بتا رولینگ', value: 'rollingBeta' },
    { label: 'نوسان رولینگ', value: 'rollingVol' },
  ];

  const series = selectedSymbols.map((sym) => {
    const m = metricsMap[sym];
    if (!m?.rolling?.length) return null;
    return {
      symbol: sym,
      data: m.rolling
        .filter((r) => r[rollingMetric] != null)
        .map((r) => ({ date: r.date, value: Number(r[rollingMetric].toFixed(3)) })),
    };
  }).filter(Boolean);

  return (
    <Stack gap="sm">
      <SegmentedControl
        size="xs"
        data={ROLLING_OPTIONS}
        value={rollingMetric}
        onChange={setRollingMetric}
      />
      <MultiLineChart
        series={series}
        height={280}
        yFormatter={(v) => v.toFixed(2)}
        zeroLine
      />
    </Stack>
  );
}

/**
 * @param {{ selectedSymbols: string[], metricsMap: Object }} props
 */
export default function ETFComparePanel({ selectedSymbols, metricsMap }) {
  if (selectedSymbols.length < 2) return null;

  const returnSeries = selectedSymbols.map((sym) => {
    const m = metricsMap[sym];
    return m?.normalizedPrices?.length
      ? { symbol: sym, data: m.normalizedPrices.map((d) => ({ date: d.date, value: Number(d.value) })) }
      : null;
  }).filter(Boolean);

  const bubbleSeries = selectedSymbols.map((sym) => {
    const m = metricsMap[sym];
    return m?.bubbleHistory?.length
      ? { symbol: sym, data: m.bubbleHistory.map((d) => ({ date: d.date, value: d.bubble_pct })) }
      : null;
  }).filter(Boolean);

  return (
    <Card
      radius="lg"
      p="lg"
      mt="md"
      style={{
        background: rallyColors.glassBg,
        backdropFilter: rallyColors.glassBlur,
        border: `1px solid ${rallyColors.glassBorder}`,
        boxShadow: rallyColors.glassShadow,
      }}
    >
      <Group justify="space-between" mb="md">
        <Text size="sm" fw={600} c={rallyColors.textSecondary}>مقایسه صندوق‌های انتخاب‌شده</Text>
        <Badge variant="light" color="blue" size="sm">{selectedSymbols.length} صندوق</Badge>
      </Group>

      <SimpleGrid cols={{ base: 2, sm: 3, md: Math.min(selectedSymbols.length, 5) }} mb="lg">
        {selectedSymbols.map((sym, i) => (
          <ETFMetricCard
            key={sym}
            symbol={sym}
            metrics={metricsMap[sym]}
            color={COMPARISON_COLORS[i % COMPARISON_COLORS.length]}
          />
        ))}
      </SimpleGrid>

      <Divider mb="md" style={{ borderColor: rallyColors.border }} />

      <Tabs defaultValue="return" variant="pills" radius="md">
        <Tabs.List mb="md">
          <Tabs.Tab value="return">بازده</Tabs.Tab>
          <Tabs.Tab value="radar">رادار</Tabs.Tab>
          <Tabs.Tab value="bubble">حباب</Tabs.Tab>
          <Tabs.Tab value="rolling">رولینگ</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="return">
          <MultiLineChart
            series={returnSeries}
            height={280}
            yFormatter={(v) => (v == null ? '-' : `${v}٪`)}
            zeroLine
          />
        </Tabs.Panel>

        <Tabs.Panel value="radar">
          <ETFRadarChart symbols={selectedSymbols} metricsMap={metricsMap} />
        </Tabs.Panel>

        <Tabs.Panel value="bubble">
          <MultiLineChart
            series={bubbleSeries}
            height={280}
            yFormatter={(v) => `${v?.toFixed ? v.toFixed(1) : v}٪`}
            zeroLine
          />
        </Tabs.Panel>

        <Tabs.Panel value="rolling">
          <RollingTab selectedSymbols={selectedSymbols} metricsMap={metricsMap} />
        </Tabs.Panel>
      </Tabs>
    </Card>
  );
}
