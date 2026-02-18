import { Stack, Group, Text } from '@mantine/core';
import rallyColors from '../../theme/rallyColors';

export default function OptionsSummary({ breakeven, maxProfit, maxLoss, riskReward, netPremium, formatLocalNum }) {
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
    </Stack>
  );
}
