import { Text } from '@mantine/core';
import rallyColors from '../../../theme/rallyColors';

interface PercentChangeCellProps {
  value: number | null | undefined;
  fallback?: string;
}

export default function PercentChangeCell({ value, fallback = '-' }: PercentChangeCellProps) {
  if (value == null) return <Text size="sm">{fallback}</Text>;
  const color = value > 0 ? rallyColors.green : value < 0 ? rallyColors.red : rallyColors.textDimmed;
  const sign = value > 0 ? '+' : '';
  return (
    <Text size="sm" fw={600} style={{ color }}>
      {sign}{value.toFixed(2)}%
    </Text>
  );
}
