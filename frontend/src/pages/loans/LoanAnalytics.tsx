import { Stack } from '@mantine/core';
import { AnalyticsDashboard } from '../../features/loans/analytics/AnalyticsDashboard';
import RallyBreadcrumbs from '../../components/RallyBreadcrumbs';

export function Analytics() {
  return (
    <Stack gap="lg">
      <RallyBreadcrumbs items={[{ label: 'وام‌ها', path: '/loans' }, { label: 'تحلیل' }]} />
      <AnalyticsDashboard />
    </Stack>
  );
}

export default Analytics;
