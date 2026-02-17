/**
 * Loan Amounts Tab - Amount range analysis
 */

import { SimpleGrid, Stack, Card, Text, Title } from '@mantine/core';
import { BarChartCard } from '@/components/loans/charts';
import { useLoans, useBanks } from '@/hooks/loans';
import { Loading } from '@/components/loans/ui';
import { parsePersianAmount, formatPersianAmount } from '@/utils/loans/persianNumber';
import { LoanAmountsTable } from '../components';
import rallyColors from '../../../../theme/rallyColors';

export function LoanAmountsTab() {
  const { data: loans, isLoading: loansLoading } = useLoans();
  const { data: banks, isLoading: banksLoading } = useBanks();

  if (loansLoading || banksLoading) {
    return <Loading text="در حال بارگذاری داده‌ها..." />;
  }

  // Parse amounts
  const loansWithAmounts = loans
    ?.map((loan) => ({
      ...loan,
      minAmountNumeric: parsePersianAmount(loan.minAmount),
      maxAmountNumeric: parsePersianAmount(loan.maxAmount),
    }))
    .filter((loan) => loan.maxAmountNumeric && loan.maxAmountNumeric > 0) || [];

  // Amount distribution (buckets in millions)
  const amountBuckets = [
    { range: 'کمتر از ۱۰۰ میلیون', max: 100_000_000, count: 0 },
    { range: '۱۰۰-۵۰۰ میلیون', min: 100_000_000, max: 500_000_000, count: 0 },
    { range: '۵۰۰ میلیون - ۱ میلیارد', min: 500_000_000, max: 1_000_000_000, count: 0 },
    { range: '۱-۵ میلیارد', min: 1_000_000_000, max: 5_000_000_000, count: 0 },
    { range: 'بیش از ۵ میلیارد', min: 5_000_000_000, count: 0 },
  ];

  loansWithAmounts.forEach((loan) => {
    const amount = loan.maxAmountNumeric!;
    const bucket = amountBuckets.find(
      (b) => (!b.min || amount >= b.min) && (!b.max || amount < b.max)
    );
    if (bucket) bucket.count++;
  });

  const amountDistributionData = amountBuckets.map((b) => ({
    name: b.range,
    تعداد: b.count,
  }));

  // Statistics
  const maxAmounts = loansWithAmounts.map((l) => l.maxAmountNumeric!);
  const avgMaxAmount = maxAmounts.reduce((sum, amt) => sum + amt, 0) / maxAmounts.length || 0;
  const minMaxAmount = Math.min(...maxAmounts);
  const maxMaxAmount = Math.max(...maxAmounts);

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
          <Text size="sm" c={rallyColors.textSecondary} mb="xs">میانگین حداکثر مبلغ</Text>
          <Title order={3} c={rallyColors.blue}>
            {formatPersianAmount(avgMaxAmount)}
          </Title>
        </Card>
        <Card
          withBorder
          radius="md"
          p="lg"
          style={{ backgroundColor: rallyColors.card, borderColor: rallyColors.glassBorder }}
        >
          <Text size="sm" c={rallyColors.textSecondary} mb="xs">کمترین حداکثر</Text>
          <Title order={3} c={rallyColors.green}>
            {formatPersianAmount(minMaxAmount)}
          </Title>
        </Card>
        <Card
          withBorder
          radius="md"
          p="lg"
          style={{ backgroundColor: rallyColors.card, borderColor: rallyColors.glassBorder }}
        >
          <Text size="sm" c={rallyColors.textSecondary} mb="xs">بیشترین حداکثر</Text>
          <Title order={3} c={rallyColors.red}>
            {formatPersianAmount(maxMaxAmount)}
          </Title>
        </Card>
      </SimpleGrid>

      {/* Amount Distribution Chart */}
      <BarChartCard
        title="توزیع حداکثر مبلغ وام"
        data={amountDistributionData}
        dataKey="تعداد"
        height={350}
        color="#8b5cf6"
      />

      {/* Loan Amounts Table */}
      <LoanAmountsTable loans={loans || []} banks={banks || []} />
    </Stack>
  );
}

export default LoanAmountsTab;
