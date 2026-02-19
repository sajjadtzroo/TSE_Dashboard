import { Text } from '@mantine/core';
import { toPersianNum } from '../../utils/formatUtils';

export default function NumberCell({ value, fallback = '-', suffix = '' }) {
  if (value == null) return <Text size="sm">{fallback}</Text>;
  return (
    <Text size="sm">
      {toPersianNum(value.toLocaleString())}{suffix}
    </Text>
  );
}
