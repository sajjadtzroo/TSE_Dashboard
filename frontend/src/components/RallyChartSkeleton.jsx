import { Skeleton, Stack } from '@mantine/core';

export default function RallyChartSkeleton({ height = 280 }) {
  return (
    <Stack gap="xs" p="xs">
      <Skeleton height={height} radius="md" />
    </Stack>
  );
}
