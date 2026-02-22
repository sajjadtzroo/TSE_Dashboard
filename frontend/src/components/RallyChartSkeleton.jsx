import { Skeleton, Stack } from '@mantine/core';
import styles from './skeletons/Shimmer.module.css';

export default function RallyChartSkeleton({ height = 280 }) {
  return (
    <Stack gap="xs" p="xs">
      <Skeleton height={height} radius="md" className={styles.shimmer} />
    </Stack>
  );
}
