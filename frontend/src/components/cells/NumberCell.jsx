import { Text } from '@mantine/core';

export default function NumberCell({ value, fallback = '-', suffix = '' }) {
  if (value == null) return <Text size="sm">{fallback}</Text>;
  return (
    <Text size="sm">
      {value.toLocaleString()}{suffix}
    </Text>
  );
}
