import { useMemo } from 'react';
import { Group, Text, Stack, Progress, Divider } from '@mantine/core';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import RallyMainCard from '../../../components/RallyMainCard';
import rallyColors from '../../../theme/rallyColors';
import { formatNum, toPersianNum, formatVol } from '../../../utils/formatUtils';
import { GRID_STROKE, axisTick } from '../../../components/charts/shared/chartStyles';

export default function CryptoVolumeFlowCard({ dailyHistory }) {
  const flowData = useMemo(() => {
    if (!dailyHistory || dailyHistory.length < 5) return null;

    const recent = dailyHistory.slice(-20);

    // Bar chart data: volume colored by candle direction
    const bars = recent.map((h) => ({
      date: h.date?.slice(5) || '',
      volume: h.volume * h.close, // USD-denominated volume
      up: h.close >= h.open,
    }));

    // Average volumes
    const last5 = bars.slice(-5);
    const last20 = bars;
    const avg5 = last5.reduce((s, d) => s + d.volume, 0) / last5.length;
    const avg20 = last20.reduce((s, d) => s + d.volume, 0) / last20.length;

    // Accumulation/Distribution proxy: ((close - low) - (high - close)) / (high - low)
    // Positive = buying pressure, Negative = selling pressure
    let adSum = 0;
    let totalRange = 0;
    recent.forEach((h) => {
      const range = h.high - h.low;
      if (range > 0) {
        const clv = ((h.close - h.low) - (h.high - h.close)) / range;
        adSum += clv * h.volume;
        totalRange += h.volume;
      }
    });
    const buyPressure = totalRange > 0
      ? Math.max(0, Math.min(100, ((adSum / totalRange + 1) / 2) * 100))
      : 50;

    return { bars, avg5, avg20, buyPressure };
  }, [dailyHistory]);

  if (!flowData) return null;

  return (
    <RallyMainCard title="جریان حجم معاملات">
      <Group justify="space-between" mb="xs">
        <Stack gap={0}>
          <Text size="xs" c="dimmed">میانگین ۵ روزه</Text>
          <Text size="sm" fw={600} c={rallyColors.blue}>
            {formatVol(flowData.avg5)}
          </Text>
        </Stack>
        <Stack gap={0} align="flex-end">
          <Text size="xs" c="dimmed">میانگین ۲۰ روزه</Text>
          <Text size="sm" fw={600} c={rallyColors.purple}>
            {formatVol(flowData.avg20)}
          </Text>
        </Stack>
      </Group>

      <Divider mb="xs" color="#1E2234" />

      <Group justify="space-between" mb={4}>
        <Text size="xs" c="dimmed">فشار خرید (A/D)</Text>
        <Text size="xs" fw={500}>{toPersianNum(flowData.buyPressure.toFixed(1))}٪</Text>
      </Group>
      <Progress value={flowData.buyPressure} color="rally-primary" size="sm" mb="sm" />

      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={flowData.bars} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis dataKey="date" tick={axisTick(9)} />
          <YAxis tick={axisTick(9)} tickFormatter={(v) => formatVol(v)} />
          <Tooltip
            formatter={(val) => [formatVol(val), 'حجم']}
            contentStyle={{
              background: rallyColors.elevated,
              border: `1px solid ${rallyColors.border}`,
              borderRadius: 4,
              fontSize: 11,
            }}
          />
          <Bar dataKey="volume" radius={[2, 2, 0, 0]}>
            {flowData.bars.map((entry, i) => (
              <Cell key={i} fill={entry.up ? rallyColors.green : rallyColors.red} fillOpacity={0.7} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </RallyMainCard>
  );
}
