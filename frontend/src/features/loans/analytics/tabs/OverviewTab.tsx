/**
 * Overview Tab - General analytics overview
 */

import { SimpleGrid, Stack } from '@mantine/core';
import { PieChartCard, BarChartCard } from '@/components/loans/charts';
import { useLoans, useBanks } from '@/hooks/loans';
import { Loading } from '@/components/loans/ui';

export function OverviewTab() {
  const { data: loans, isLoading: loansLoading } = useLoans();
  const { data: banks, isLoading: banksLoading } = useBanks();

  if (loansLoading || banksLoading) {
    return <Loading text="در حال بارگذاری داده‌ها..." />;
  }

  // Bank distribution by category
  const traditionalBanks = banks?.filter((b) => b.category === 'traditional-banks') || [];
  const digitalBanks = banks?.filter((b) => b.category === 'digital-banks') || [];

  const bankCategoryData = [
    { name: 'بانک‌های سنتی', value: traditionalBanks.length, fill: '#3b82f6' },
    { name: 'بانک‌های دیجیتال', value: digitalBanks.length, fill: '#8b5cf6' },
  ];

  // Loans by bank
  const loansByBank = banks?.map((bank) => ({
    name: bank.nameFA,
    loans: bank.loansCount || 0,
  })).sort((a, b) => b.loans - a.loans).slice(0, 10) || [];

  // Requirements overview
  const withGuarantor = loans?.filter((l) => l.guarantor !== false).length || 0;
  const withoutGuarantor = loans?.filter((l) => l.guarantor === false).length || 0;

  const requirementsData = [
    { name: 'با ضامن', value: withGuarantor, fill: '#f59e0b' },
    { name: 'بدون ضامن', value: withoutGuarantor, fill: '#10b981' },
  ];

  return (
    <Stack gap="lg">
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <PieChartCard
          title="توزیع بانک‌ها بر اساس نوع"
          data={bankCategoryData}
          height={300}
        />

        <PieChartCard
          title="وام‌ها بر اساس نیاز به ضامن"
          data={requirementsData}
          height={300}
        />
      </SimpleGrid>

      <BarChartCard
        title="تعداد وام‌ها به تفکیک بانک (۱۰ بانک برتر)"
        data={loansByBank}
        dataKey="loans"
        height={400}
        color="#3b82f6"
      />
    </Stack>
  );
}

export default OverviewTab;
