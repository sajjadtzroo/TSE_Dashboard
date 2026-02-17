import { Stack } from '@mantine/core';
import { DashboardSummary } from '@/features/analytics/DashboardSummary';
import { DashboardCharts } from '@/features/analytics/DashboardCharts';

export default function Dashboard() {
  return (
    <Stack gap="lg">
      <DashboardSummary />
      <DashboardCharts />
    </Stack>
  );
}
