/**
 * Dashboard Charts Component
 */

import { SimpleGrid } from '@mantine/core';
import { useSummary, useByCategory } from '@/hooks/loans';
import { PieChartCard, BarChartCard } from '@/components/loans/charts';
import { LoadingPage } from '@/components/loans/ui';

const METHOD_LABELS: Record<string, string> = {
  installment: 'اقساطی',
  zero_interest: 'بدون سود',
  average_based: 'بر اساس میانگین',
  gold_backed: 'پشتوانه طلا',
  credit_card: 'کارت اعتباری',
  pos_based: 'مبتنی بر POS',
  other: 'سایر',
};

const toPersianNum = (n: number) =>
  n.toString().replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);

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
        name: METHOD_LABELS[key] || key,
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
