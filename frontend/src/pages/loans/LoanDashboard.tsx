import { Stack } from '@mantine/core';
import { DashboardSummary } from '@/features/loans/analytics/DashboardSummary';
import { DashboardCharts } from '@/features/loans/analytics/DashboardCharts';

export default function Dashboard() {
  return (
    <Stack gap="lg">
      <DashboardSummary />
      <DashboardCharts />
    </Stack>
  );
}
