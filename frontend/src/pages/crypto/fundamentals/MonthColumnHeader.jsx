import { Badge, Stack, Text } from '@mantine/core';
import { toPersianNum } from '../../../utils/formatUtils';

export default function MonthColumnHeader({ period }) {
  const { jalaliLabel, dayCount } = period;

  return (
    <Stack gap={4} align="center">
      <Text size="xs" fw={600}>{jalaliLabel}</Text>
      <Badge size="xs" variant="light" color="gray">
        {toPersianNum(dayCount)} روز
      </Badge>
    </Stack>
  );
}
