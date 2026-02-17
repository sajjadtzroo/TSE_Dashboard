import { Text } from '@mantine/core';

interface NumberCellProps {
  value: number | null | undefined;
  fallback?: string;
  suffix?: string;
}

export default function NumberCell({ value, fallback = '-', suffix = '' }: NumberCellProps) {
  if (value == null) return <Text size="sm">{fallback}</Text>;
  return (
    <Text size="sm">
      {value.toLocaleString()}{suffix}
    </Text>
  );
}
