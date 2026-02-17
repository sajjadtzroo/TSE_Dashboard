/**
 * Dashboard Charts Component
 */

import { SimpleGrid } from '@mantine/core';
import { useSummary, useByCategory } from '@/hooks';
import { PieChartCard, BarChartCard } from '@/components/charts';
import { LoadingPage } from '@/components/ui';

export function DashboardCharts() {
  const { data: summary, isLoading: summaryLoading } = useSummary();
  const { data: byCategory, isLoading: categoryLoading } = useByCategory();

  if (summaryLoading || categoryLoading) {
    return <LoadingPage />;
  }

  const categoryData = byCategory
    ? Object.entries(byCategory).map(([key, banks]) => ({
        name: key === 'traditional-banks' ? 'سنتی' : 'دیجیتال',
        value: (banks as any[]).length,
      }))
    : [];

  const methodData = summary?.calculationMethods
    ? Object.entries(summary.calculationMethods).map(([key, value]) => ({
        name: key,
        count: value as number,
      }))
    : [];

  return (
    <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
      <PieChartCard
        title="توزیع بانک‌ها"
        data={categoryData}
        height={300}
      />
      <BarChartCard
        title="روش‌های محاسبه وام"
        data={methodData}
        dataKey="count"
        height={300}
        layout="vertical"
      />
    </SimpleGrid>
  );
}

export default DashboardCharts;
