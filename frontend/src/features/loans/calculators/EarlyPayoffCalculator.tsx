/**
 * Early Payoff Calculator
 * Calculate impact of extra payments on loan
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
import { LineChartCard } from '@/components/loans/charts';
import { formatPersianAmount, formatPersianNumber } from '@/utils/loans/persianNumber';
import { calculatePMT, calculateEarlyPayoff, AnnuityType } from '@/utils/loans/timeValueOfMoney';
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

export function EarlyPayoffCalculator() {
  const [principal, setPrincipal] = useState(100_000_000);
  const [rate, setRate] = useState(18);
  const [term, setTerm] = useState(60);
  const [extraMonthly, setExtraMonthly] = useState(2_000_000);
  const [extraYearly, setExtraYearly] = useState(0);
  const [oneTime, setOneTime] = useState(0);
  const [showResults, setShowResults] = useState(false);

  // Use CFA-compliant TVM calculations
  const monthlyRate = rate / 100 / 12;

  // Calculate regular payment using CFA standard
  const regularPayment = calculatePMT(
    -principal,
    0,
    monthlyRate,
    term,
    AnnuityType.ORDINARY
  );

  // Calculate early payoff using CFA-compliant function
  const earlyPayoffResult = calculateEarlyPayoff(
    principal,
    rate / 100,
    term,
    extraMonthly,
    12 // monthly payments
  );

  const monthsToPayoff = earlyPayoffResult.periodsToPayoff;
  const interestSaved = earlyPayoffResult.interestSaved;
  const monthsSaved = term - monthsToPayoff;

  // Chart data
  const chartData = [];
  let originalBalance = principal;
  let acceleratedBalance = principal;

  for (let month = 0; month <= Math.min(term, 60); month += 3) {
    if (month > 0) {
      for (let i = 0; i < 3; i++) {
        const originalInterest = originalBalance * monthlyRate;
        originalBalance -= regularPayment - originalInterest;

        const acceleratedInterest = acceleratedBalance * monthlyRate;
        const accPrincipal =
          regularPayment - acceleratedInterest + extraMonthly;
        acceleratedBalance -= accPrincipal;
      }
    }

    chartData.push({
      month: `ماه ${formatPersianNumber(month)}`,
      original: Math.max(0, Math.round(originalBalance / 1_000_000)),
      accelerated: Math.max(0, Math.round(acceleratedBalance / 1_000_000)),
    });

    if (acceleratedBalance <= 0) break;
  }

  return (
    <Stack gap="lg">
      <Card padding="lg" radius="md" style={glassCard}>
        <Title order={3} c={rallyColors.textPrimary} mb="lg">
          محاسبه پرداخت زودتر
        </Title>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          <Stack gap="md">
            <NumberInput
              label="مبلغ وام (تومان)"
              value={principal}
              onChange={(value) => setPrincipal(Number(value))}
              styles={inputStyles}
              hideControls
            />

            <NumberInput
              label="نرخ سود سالانه (%)"
              value={rate}
              onChange={(value) => setRate(Number(value))}
              step={0.1}
              decimalScale={1}
              styles={inputStyles}
              hideControls
            />

            <NumberInput
              label="مدت وام (ماه)"
              value={term}
              onChange={(value) => setTerm(Number(value))}
              styles={inputStyles}
              hideControls
            />

            <NumberInput
              label="پرداخت اضافی ماهانه (تومان)"
              value={extraMonthly}
              onChange={(value) => setExtraMonthly(Number(value))}
              styles={inputStyles}
              hideControls
            />

            <NumberInput
              label="پرداخت اضافی سالانه (تومان)"
              value={extraYearly}
              onChange={(value) => setExtraYearly(Number(value))}
              styles={inputStyles}
              hideControls
            />

            <NumberInput
              label="پرداخت یکباره (تومان)"
              value={oneTime}
              onChange={(value) => setOneTime(Number(value))}
              styles={inputStyles}
              hideControls
            />

            <Button
              onClick={() => setShowResults(true)}
              color="blue"
              fullWidth
            >
              محاسبه
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
                  قسط معمولی
                </Text>
                <Text size="xl" fw={700} c={rallyColors.textPrimary}>
                  {formatPersianAmount(regularPayment)}
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
                  زمان تسویه
                </Text>
                <Text size="xl" fw={700} c={rallyColors.blue}>
                  {formatPersianNumber(monthsToPayoff)} ماه
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
                  زمان صرفه‌جویی شده
                </Text>
                <Text size="xl" fw={700} c="#14b8a6">
                  {formatPersianNumber(monthsSaved)} ماه
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
                  سود صرفه‌جویی شده
                </Text>
                <Text size="xl" fw={700} c="#14b8a6">
                  {formatPersianAmount(interestSaved)}
                </Text>
              </Box>
            </Stack>
          )}
        </SimpleGrid>
      </Card>

      {showResults && (
        <LineChartCard
          title="مقایسه مانده بدهی (میلیون تومان)"
          data={chartData}
          dataKeys={[
            { key: 'original', name: 'عادی', color: '#ef4444' },
            { key: 'accelerated', name: 'با پرداخت اضافی', color: '#10b981' },
          ]}
          xAxisKey="month"
          height={300}
        />
      )}
    </Stack>
  );
}

export default EarlyPayoffCalculator;
