/**
 * Refinance Calculator
 * Analyze savings from refinancing
 */

import { useState } from 'react';
import {
  Card,
  Text,
  Title,
  Stack,
  SimpleGrid,
  Box,
  Button,
  NumberInput,
} from '@mantine/core';
import { LineChartCard } from '@/components/charts';
import { formatPersianAmount, formatPersianNumber } from '@/utils/persianNumber';
import { calculatePMT, AnnuityType } from '@/utils/timeValueOfMoney';
import rallyColors from '@/theme/rallyColors';

const glassCard = {
  backgroundColor: rallyColors.glassBg,
  border: `1px solid ${rallyColors.glassBorder}`,
  backdropFilter: 'blur(12px)',
};

const inputStyles = {
  input: {
    backgroundColor: rallyColors.bg,
    border: `1px solid ${rallyColors.glassBorder}`,
    color: rallyColors.textPrimary,
  },
  label: {
    color: rallyColors.textSecondary,
    marginBottom: 8,
  },
};

export function RefinanceCalculator() {
  const [currentBalance, setCurrentBalance] = useState(80_000_000);
  const [currentRate, setCurrentRate] = useState(22);
  const [currentMonthsLeft, setCurrentMonthsLeft] = useState(48);
  const [newRate, setNewRate] = useState(18);
  const [newTerm, setNewTerm] = useState(60);
  const [closingCosts, setClosingCosts] = useState(2_000_000);
  const [showResults, setShowResults] = useState(false);

  // Use CFA-compliant TVM calculations
  const currentMonthlyRate = currentRate / 100 / 12;
  const newMonthlyRate = newRate / 100 / 12;

  // Calculate current payment
  const currentPayment = calculatePMT(
    -currentBalance,
    0,
    currentMonthlyRate,
    currentMonthsLeft,
    AnnuityType.ORDINARY
  );

  // Calculate new payment
  const newPayment = calculatePMT(
    -currentBalance,
    0,
    newMonthlyRate,
    newTerm,
    AnnuityType.ORDINARY
  );

  const monthlySavings = currentPayment - newPayment;
  const breakEvenMonths = closingCosts / monthlySavings;

  const currentTotalPayment = currentPayment * currentMonthsLeft;
  const newTotalPayment = newPayment * newTerm + closingCosts;
  const totalSavings = currentTotalPayment - newTotalPayment;

  // Chart data for cumulative savings
  const savingsData = [];
  let cumulativeSavings = -closingCosts;

  for (let month = 1; month <= Math.min(newTerm, 60); month += 6) {
    cumulativeSavings += monthlySavings * 6;
    savingsData.push({
      month: `ماه ${formatPersianNumber(month)}`,
      savings: Math.round(cumulativeSavings / 1_000_000),
    });
  }

  return (
    <Stack gap="lg">
      <Card padding="lg" radius="md" style={glassCard}>
        <Title order={3} c={rallyColors.textPrimary} mb="lg">
          تحلیل بازپرداخت مجدد
        </Title>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          <Stack gap="md">
            <Title order={5} c={rallyColors.textSecondary}>
              وام فعلی
            </Title>

            <NumberInput
              label="مانده بدهی (تومان)"
              value={currentBalance}
              onChange={(value) => setCurrentBalance(Number(value))}
              styles={inputStyles}
              hideControls
            />

            <NumberInput
              label="نرخ سود فعلی (%)"
              value={currentRate}
              onChange={(value) => setCurrentRate(Number(value))}
              step={0.1}
              decimalScale={1}
              styles={inputStyles}
              hideControls
            />

            <NumberInput
              label="ماه‌های باقیمانده"
              value={currentMonthsLeft}
              onChange={(value) => setCurrentMonthsLeft(Number(value))}
              styles={inputStyles}
              hideControls
            />

            <Title order={5} c={rallyColors.textSecondary} mt="md">
              وام جدید
            </Title>

            <NumberInput
              label="نرخ سود جدید (%)"
              value={newRate}
              onChange={(value) => setNewRate(Number(value))}
              step={0.1}
              decimalScale={1}
              styles={inputStyles}
              hideControls
            />

            <NumberInput
              label="مدت جدید (ماه)"
              value={newTerm}
              onChange={(value) => setNewTerm(Number(value))}
              styles={inputStyles}
              hideControls
            />

            <NumberInput
              label="هزینه‌های اداری (تومان)"
              value={closingCosts}
              onChange={(value) => setClosingCosts(Number(value))}
              styles={inputStyles}
              hideControls
            />

            <Button
              onClick={() => setShowResults(true)}
              color="blue"
              fullWidth
            >
              تحلیل
            </Button>
          </Stack>

          {showResults && (
            <Stack gap="md">
              <Box
                style={{
                  backgroundColor: rallyColors.bg,
                  padding: 16,
                  borderRadius: 8,
                  border: `1px solid ${rallyColors.glassBorder}`,
                }}
              >
                <Text size="sm" c={rallyColors.textSecondary} mb={4}>
                  صرفه‌جویی ماهانه
                </Text>
                <Text size="xl" fw={700} c="#14b8a6">
                  {formatPersianAmount(monthlySavings)}
                </Text>
              </Box>

              <Box
                style={{
                  backgroundColor: rallyColors.bg,
                  padding: 16,
                  borderRadius: 8,
                  border: `1px solid ${rallyColors.glassBorder}`,
                }}
              >
                <Text size="sm" c={rallyColors.textSecondary} mb={4}>
                  نقطه سربه‌سر
                </Text>
                <Text size="xl" fw={700} c={rallyColors.blue}>
                  {formatPersianNumber(Math.ceil(breakEvenMonths))} ماه
                </Text>
              </Box>

              <Box
                style={{
                  backgroundColor: rallyColors.bg,
                  padding: 16,
                  borderRadius: 8,
                  border: `1px solid ${rallyColors.glassBorder}`,
                }}
              >
                <Text size="sm" c={rallyColors.textSecondary} mb={4}>
                  صرفه‌جویی کل
                </Text>
                <Text
                  size="xl"
                  fw={700}
                  c={totalSavings > 0 ? '#14b8a6' : '#ec4899'}
                >
                  {formatPersianAmount(totalSavings)}
                </Text>
              </Box>

              <Box
                style={{
                  padding: 16,
                  borderRadius: 8,
                  border: `1px solid ${
                    totalSavings > 0 && breakEvenMonths < 24
                      ? '#14b8a6'
                      : totalSavings > 0
                      ? '#f59e0b'
                      : '#ec4899'
                  }`,
                  backgroundColor:
                    totalSavings > 0 && breakEvenMonths < 24
                      ? 'rgba(20, 184, 166, 0.1)'
                      : totalSavings > 0
                      ? 'rgba(245, 158, 11, 0.1)'
                      : 'rgba(236, 72, 153, 0.1)',
                }}
              >
                <Text size="sm" fw={600}>
                  {totalSavings > 0 && breakEvenMonths < 24
                    ? 'بازپرداخت مجدد توصیه می‌شود'
                    : totalSavings > 0
                    ? 'بازپرداخت مجدد ممکن است مفید باشد'
                    : 'بازپرداخت مجدد توصیه نمی‌شود'}
                </Text>
              </Box>
            </Stack>
          )}
        </SimpleGrid>
      </Card>

      {showResults && (
        <LineChartCard
          title="صرفه‌جویی تجمعی (میلیون تومان)"
          data={savingsData}
          dataKeys={[{ key: 'savings', name: 'صرفه‌جویی', color: '#10b981' }]}
          xAxisKey="month"
          height={300}
        />
      )}
    </Stack>
  );
}

export default RefinanceCalculator;
