import { Text } from '@mantine/core';
import { toPersianNum } from '../../../../utils/formatUtils';

interface NumberCellProps {
  value: number | null | undefined;
  fallback?: string;
  suffix?: string;
}

export default function NumberCell({ value, fallback = '-', suffix = '' }: NumberCellProps) {
  if (value == null) return <Text size="sm">{fallback}</Text>;
  return (
    <Text size="sm">
      {toPersianNum(value.toLocaleString())}{suffix}
    </Text>
  );
}
