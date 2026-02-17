import { Skeleton, Stack } from '@mantine/core';

interface RallyChartSkeletonProps {
  height?: number;
}

export default function RallyChartSkeleton({ height = 280 }: RallyChartSkeletonProps) {
  return (
    <Stack gap="xs" p="xs">
      <Skeleton height={height} radius="md" />
    </Stack>
  );
}
