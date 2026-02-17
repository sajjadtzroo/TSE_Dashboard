/**
 * Dashboard Charts Component
 */

import { useSummary, useByCategory } from '../../hooks';
import { PieChartCard, BarChartCard } from '../../components/charts';
import { LoadingPage } from '../../components/ui';

export function DashboardCharts() {
  const { data: summary, isLoading: summaryLoading } = useSummary();
  const { data: byCategory, isLoading: categoryLoading } = useByCategory();

  if (summaryLoading || categoryLoading) {
    return <LoadingPage />;
  }

  const categoryData = byCategory
    ? Object.entries(byCategory).map(([key, banks]) => ({
        name: key === 'traditional-banks' ? 'سنتی' : 'دیجیتال',
        value: banks.length,
      }))
    : [];

  const methodData = summary?.calculationMethods
    ? Object.entries(summary.calculationMethods).map(([key, value]) => ({
        name: key,
        count: value as number,
      }))
    : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
    </div>
  );
}

export default DashboardCharts;
