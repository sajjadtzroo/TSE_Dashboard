/**
 * Requirements Tab - Loan requirements analysis
 */

import { SimpleGrid, Stack } from '@mantine/core';
import { PieChartCard, BarChartCard } from '@/components/loans/charts';
import { useLoans } from '@/hooks/loans';
import { Loading } from '@/components/loans/ui';

export function RequirementsTab() {
  const { data: loans, isLoading } = useLoans();

  if (isLoading) {
    return <Loading text="در حال بارگذاری داده‌ها..." />;
  }

  // Guarantor analysis
  const withGuarantor = loans?.filter((l) => l.guarantor !== false).length || 0;
  const withoutGuarantor = loans?.filter((l) => l.guarantor === false).length || 0;

  const guarantorData = [
    { name: 'با ضامن', value: withGuarantor, fill: '#f59e0b' },
    { name: 'بدون ضامن', value: withoutGuarantor, fill: '#22C55E' },
  ];

  // Collateral analysis
  const withCollateral = loans?.filter((l) => l.collateral).length || 0;
  const withoutCollateral = (loans?.length || 0) - withCollateral;

  const collateralData = [
    { name: 'با وثیقه', value: withCollateral, fill: '#ef4444' },
    { name: 'بدون وثیقه', value: withoutCollateral, fill: '#3b82f6' },
  ];

  // Credit rating requirements
  const withCreditRating = loans?.filter((l) => l.creditRatingRequired).length || 0;
  const withoutCreditRating = (loans?.length || 0) - withCreditRating;

  const creditRatingData = [
    { name: 'نیاز به رتبه', value: withCreditRating },
    { name: 'بدون نیاز', value: withoutCreditRating },
  ];

  const creditRatingChartData = creditRatingData.map((item) => ({
    name: item.name,
    تعداد: item.value,
  }));

  return (
    <Stack gap="lg">
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <PieChartCard
          title="تحلیل نیاز به ضامن"
          data={guarantorData}
          height={300}
        />

        <PieChartCard
          title="تحلیل نیاز به وثیقه"
          data={collateralData}
          height={300}
        />
      </SimpleGrid>

      <BarChartCard
        title="نیاز به رتبه اعتباری"
        data={creditRatingChartData}
        dataKey="تعداد"
        height={300}
        color="#06b6d4"
      />
    </Stack>
  );
}

export default RequirementsTab;
