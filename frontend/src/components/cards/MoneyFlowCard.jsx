import { useMemo } from 'react';
import { Group, Text, Stack, Progress, Divider } from '@mantine/core';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import RallyMainCard from '../RallyMainCard';
import rallyColors from '../../theme/rallyColors';
import { formatNum, formatTrillion, toPersianNum } from '../../utils/formatUtils';
import { GRID_STROKE, axisTick } from '../charts/shared/chartStyles';

export default function MoneyFlowCard({ history }) {
  const flowData = useMemo(() => {
    if (!history || history.length < 2) return null;

    const recent = history.slice(-20); // last 20 days

    const dailyFlows = recent.map((h) => {
      const realNet = ((h.real_buy_volume || 0) - (h.real_sell_volume || 0)) * (h.close || 0);
      const legalNet = ((h.legal_buy_volume || 0) - (h.legal_sell_volume || 0)) * (h.close || 0);
      return {
        date: h.date?.slice(5) || '',
        netFlow: realNet + legalNet,
        realNet,
        legalNet,
      };
    });

    const last5 = dailyFlows.slice(-5);
    const avgRealNet = last5.reduce((s, d) => s + d.realNet, 0) / last5.length;
    const avgLegalNet = last5.reduce((s, d) => s + d.legalNet, 0) / last5.length;

    const totalBuy = recent.reduce((s, h) => s + (h.real_buy_volume || 0), 0);
    const totalSell = recent.reduce((s, h) => s + (h.real_sell_volume || 0), 0);
    const buyPressure = totalBuy + totalSell > 0 ? (totalBuy / (totalBuy + totalSell)) * 100 : 50;

    return { dailyFlows, avgRealNet, avgLegalNet, buyPressure };
  }, [history]);

  if (!flowData) return null;

  return (
    <RallyMainCard title="جریان نقدینگی" mb="md">
      <Group justify="space-between" mb="xs">
        <Stack gap={0}>
          <Text size="xs" c="dimmed">جریان حقیقی (۵ روزه)</Text>
          <Text size="sm" fw={600} c={flowData.avgRealNet >= 0 ? rallyColors.green : rallyColors.red}>
            {formatTrillion(flowData.avgRealNet)}
          </Text>
        </Stack>
        <Stack gap={0} align="flex-end">
          <Text size="xs" c="dimmed">جریان حقوقی (۵ روزه)</Text>
          <Text size="sm" fw={600} c={flowData.avgLegalNet >= 0 ? rallyColors.green : rallyColors.red}>
            {formatTrillion(flowData.avgLegalNet)}
          </Text>
        </Stack>
      </Group>

      <Divider mb="xs" color="rgba(148, 163, 184, 0.12)" />

      <Group justify="space-between" mb={4}>
        <Text size="xs" c="dimmed">فشار خرید</Text>
        <Text size="xs" fw={500}>{toPersianNum(flowData.buyPressure.toFixed(1))}٪</Text>
      </Group>
      <Progress value={flowData.buyPressure} color="rally-green" size="sm" mb="sm" />

      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={flowData.dailyFlows} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis dataKey="date" tick={axisTick(9)} />
          <YAxis tick={axisTick(9)} tickFormatter={(v) => formatTrillion(v)} />
          <Tooltip
            formatter={(val) => formatTrillion(val)}
            contentStyle={{ background: rallyColors.elevated, border: `1px solid ${rallyColors.border}`, borderRadius: 4, fontSize: 11 }}
          />
          <Bar dataKey="netFlow" radius={[2, 2, 0, 0]}>
            {flowData.dailyFlows.map((entry, i) => (
              <Cell key={i} fill={entry.netFlow >= 0 ? rallyColors.green : rallyColors.red} fillOpacity={0.7} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </RallyMainCard>
  );
}
