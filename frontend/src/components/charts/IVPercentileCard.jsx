import { useMemo } from 'react';
import { SimpleGrid, Stack, Text, Center, Loader } from '@mantine/core';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import useDeribitIVHistory from '../../hooks/useDeribitIVHistory';
import rallyColors from '../../theme/rallyColors';
import { GRID_STROKE, axisTick, TOOLTIP_STYLE, CURSOR_STROKE } from './shared/chartStyles';

/**
 * IV color based on percentile value.
 *  <20% green  (low IV — good for buyers)
 *  20-40% light green
 *  40-60% yellow
 *  60-80% orange
 *  >80%  red   (high IV)
 */
function ivColor(pct) {
  if (pct < 20)  return rallyColors.green;
  if (pct < 40)  return '#22C55E';
  if (pct < 60)  return rallyColors.yellow;
  if (pct < 80)  return '#F97316';
  return rallyColors.red;
}

/**
 * Semicircular SVG gauge for IV Percentile (0-100%).
 */
function IVGauge({ value, size = 180 }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const radius = 60;
  const cx = 80;
  const cy = 75;
  const circumference = Math.PI * radius; // half circle
  const offset = circumference - (clamped / 100) * circumference;
  const color = ivColor(clamped);

  return (
    <Stack align="center" gap={4}>
      <svg width={size} height={size * 0.6} viewBox="0 0 160 95">
        {/* Background arc */}
        <path
          d="M 20 75 A 60 60 0 0 1 140 75"
          fill="none"
          stroke="#1E2234"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Value arc */}
        <path
          d="M 20 75 A 60 60 0 0 1 140 75"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.5s ease' }}
        />
        {/* Center value */}
        <text
          x={cx}
          y={cy - 10}
          textAnchor="middle"
          fill={rallyColors.textPrimary}
          fontSize="26"
          fontWeight="800"
          fontFamily="Poppins, sans-serif"
        >
          {clamped}%
        </text>
      </svg>
      <Text size="sm" fw={600} c={color} ta="center">
        IV رتبه
      </Text>
    </Stack>
  );
}

/**
 * IV Percentile Gauge + 90-day DVOL line chart.
 *
 * Props:
 *  - currency: 'BTC' | 'ETH'
 *
 * Fetches 365-day daily DVOL data, computes percentile of current close
 * against the full year, and displays a gauge + 90-day line chart.
 */
export default function IVPercentileCard({ currency = 'BTC' }) {
  const { data, loading } = useDeribitIVHistory(currency, '86400', 365);

  const { percentile, recent90 } = useMemo(() => {
    if (!data || data.length === 0) return { percentile: null, recent90: [] };

    const closes = data.map((d) => d.iv).filter((v) => v != null);
    if (closes.length === 0) return { percentile: null, recent90: [] };

    const current = closes[closes.length - 1];
    const below = closes.filter((v) => v < current).length;
    const pct = (below / closes.length) * 100;

    // Last 90 data points for the mini chart
    const last90 = data.slice(-90);

    return { percentile: pct, recent90: last90 };
  }, [data]);

  if (loading) {
    return (
      <Center h={260}>
        <Loader size="sm" color="rally-primary" />
      </Center>
    );
  }

  if (percentile == null || recent90.length === 0) {
    return (
      <Center h={260}>
        <Text c="dimmed" size="sm">داده‌ای موجود نیست</Text>
      </Center>
    );
  }

  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
      {/* Left: Gauge */}
      <Center>
        <IVGauge value={percentile} />
      </Center>

      {/* Right: 90-day DVOL line chart */}
      <Stack gap={4}>
        <Text size="xs" fw={500} c={rallyColors.textSecondary} ta="center">
          نوسان ضمنی ۹۰ روزه (DVOL)
        </Text>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={recent90} margin={{ top: 8, right: 12, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis
              dataKey="time"
              tick={axisTick(9)}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={axisTick(9)}
              tickFormatter={(v) => `${v.toFixed(0)}%`}
              width={40}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              cursor={CURSOR_STROKE}
              formatter={(v) => [`${v.toFixed(2)}%`, 'DVOL']}
              labelFormatter={(l) => l}
            />
            <Line
              type="monotone"
              dataKey="iv"
              stroke={rallyColors.primary}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: rallyColors.primary }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Stack>
    </SimpleGrid>
  );
}
