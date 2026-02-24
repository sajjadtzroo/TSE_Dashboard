/**
 * Interest Rates Tab - Interest rate analysis
 */

import { SimpleGrid, Stack, Card, Text, Title } from '@mantine/core';
import { BarChartCard } from '@/components/loans/charts';
import { useLoans, useBanks } from '@/hooks/loans';
import { Loading } from '@/components/loans/ui';
import { parseInterestRate } from '@/utils/loans/persianNumber';
import { toPersianNum } from '@/utils/formatUtils';
import { InterestRatesTable } from '../components';
import rallyColors from '../../../../theme/rallyColors';

export function InterestRatesTab() {
  const { data: loans, isLoading: loansLoading } = useLoans();
  const { data: banks, isLoading: banksLoading } = useBanks();

  if (loansLoading || banksLoading) {
    return <Loading text="در حال بارگذاری داده‌ها..." />;
  }

  // Parse interest rates
  const loansWithRates = loans
    ?.map((loan) => ({
      ...loan,
      rateNumeric: parseInterestRate(loan.interestRate || ''),
    }))
    .filter((loan) => loan.rateNumeric > 0) || [];

  // Rate distribution (histogram buckets)
  const rateBuckets = [
    { range: '۰-۱۰٪', min: 0, max: 10, count: 0 },
    { range: '۱۰-۱۵٪', min: 10, max: 15, count: 0 },
    { range: '۱۵-۲۰٪', min: 15, max: 20, count: 0 },
    { range: '۲۰-۲۵٪', min: 20, max: 25, count: 0 },
    { range: '۲۵+٪', min: 25, max: 100, count: 0 },
  ];

  loansWithRates.forEach((loan) => {
    const bucket = rateBuckets.find(
      (b) => loan.rateNumeric >= b.min && loan.rateNumeric < b.max
    );
    if (bucket) bucket.count++;
  });

  const rateDistributionData = rateBuckets.map((b) => ({
    name: b.range,
    تعداد: b.count,
  }));

  // Average rate statistics
  const avgRate =
    loansWithRates.reduce((sum, l) => sum + l.rateNumeric, 0) / loansWithRates.length || 0;
  const minRate = Math.min(...loansWithRates.map((l) => l.rateNumeric));
  const maxRate = Math.max(...loansWithRates.map((l) => l.rateNumeric));

  return (
    <Stack gap="lg">
      {/* Statistics Cards */}
      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
        <Card
          withBorder
          radius="md"
          p="lg"
          style={{ backgroundColor: rallyColors.card, borderColor: rallyColors.glassBorder }}
        >
          <Text size="sm" c={rallyColors.textSecondary} mb="xs">میانگین نرخ سود</Text>
          <Title order={2} c={rallyColors.blue}>
            {toPersianNum(avgRate.toFixed(2))}٪
          </Title>
        </Card>
        <Card
          withBorder
          radius="md"
          p="lg"
          style={{ backgroundColor: rallyColors.card, borderColor: rallyColors.glassBorder }}
        >
          <Text size="sm" c={rallyColors.textSecondary} mb="xs">کمترین نرخ</Text>
          <Title order={2} c={rallyColors.primary}>
            {toPersianNum(minRate.toFixed(2))}٪
          </Title>
        </Card>
        <Card
          withBorder
          radius="md"
          p="lg"
          style={{ backgroundColor: rallyColors.card, borderColor: rallyColors.glassBorder }}
        >
          <Text size="sm" c={rallyColors.textSecondary} mb="xs">بیشترین نرخ</Text>
          <Title order={2} c={rallyColors.red}>
            {toPersianNum(maxRate.toFixed(2))}٪
          </Title>
        </Card>
      </SimpleGrid>

      {/* Rate Distribution Chart */}
      <BarChartCard
        title="توزیع نرخ سود"
        data={rateDistributionData}
        dataKey="تعداد"
        height={350}
        color="#3b82f6"
      />

      {/* Interest Rates Table */}
      <InterestRatesTable loans={loans || []} banks={banks || []} />
    </Stack>
  );
}

export default InterestRatesTab;
