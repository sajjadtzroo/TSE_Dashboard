import { Text } from '@mantine/core';
import rallyColors from '../../theme/rallyColors';

export default function PercentChangeCell({ value, decimals = 2, showSign = true }) {
  if (value == null) return <Text size="sm">-</Text>;
  const color = value > 0 ? rallyColors.green : value < 0 ? rallyColors.orange : undefined;
  const prefix = showSign && value > 0 ? '+' : '';
  return (
    <Text size="sm" fw={600} c={color}>
      {prefix}{value.toFixed(decimals)}%
    </Text>
  );
}
