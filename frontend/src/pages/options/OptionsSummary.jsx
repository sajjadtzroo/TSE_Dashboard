import { Stack, Group, Text, Progress } from '@mantine/core';
import rallyColors from '../../theme/rallyColors';

export default function OptionsSummary({ breakeven, maxProfit, maxLoss, riskReward, netPremium, pop, formatLocalNum }) {
  const popPct = pop != null ? Math.round(pop * 1000) / 10 : null;
  const popColor = popPct != null && popPct > 50 ? rallyColors.green : rallyColors.red;

  return (
    <Stack gap="xs">
      <Group justify="space-between">
        <Text size="sm" c="dimmed">نقطه سربه‌سر</Text>
        <Text size="sm" fw={600}>
          {breakeven.length
            ? breakeven.map((b) => formatLocalNum(b)).join(', ')
            : '—'}
        </Text>
      </Group>
      <Group justify="space-between">
        <Text size="sm" c="dimmed">حداکثر سود</Text>
        <Text size="sm" fw={600} c={rallyColors.green}>
          {maxProfit === Infinity ? 'نامحدود' : `+${formatLocalNum(maxProfit)}`}
        </Text>
      </Group>
      <Group justify="space-between">
        <Text size="sm" c="dimmed">حداکثر زیان</Text>
        <Text size="sm" fw={600} c={rallyColors.orange}>
          {maxLoss === -Infinity ? 'نامحدود' : formatLocalNum(maxLoss)}
        </Text>
      </Group>
      <Group justify="space-between">
        <Text size="sm" c="dimmed">ریسک به بازده</Text>
        <Text size="sm" fw={600}>
          {riskReward != null ? `${riskReward}:1` : '—'}
        </Text>
      </Group>
      <Group justify="space-between">
        <Text size="sm" c="dimmed">پرمیوم خالص</Text>
        <Text
          size="sm"
          fw={600}
          c={netPremium >= 0 ? rallyColors.green : rallyColors.orange}
        >
          {netPremium >= 0 ? '+' : ''}{formatLocalNum(netPremium)}
        </Text>
      </Group>
      {popPct != null && (
        <Stack gap={4}>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">احتمال سود</Text>
            <Text size="sm" fw={600} c={popColor}>
              {popPct}%
            </Text>
          </Group>
          <Progress
            value={popPct}
            size="sm"
            radius="xl"
            color={popPct > 50 ? 'green' : 'red'}
          />
        </Stack>
      )}
    </Stack>
  );
}
