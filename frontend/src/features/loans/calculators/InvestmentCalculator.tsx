/**
 * Investment Calculator
 * Calculate compound growth and ROI projections
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
import { LineChartCard, PieChartCard } from '@/components/loans/charts';
import { formatPersianAmount, formatPersianNumber } from '@/utils/loans/persianNumber';
import { toPersianNum } from '@/utils/formatUtils';
import { calculateFV, AnnuityType } from '@/utils/loans/timeValueOfMoney';
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

export function InvestmentCalculator() {
  const [initialInvestment, setInitialInvestment] = useState(50_000_000);
  const [monthlyContribution, setMonthlyContribution] = useState(5_000_000);
  const [annualReturn, setAnnualReturn] = useState(25);
  const [years, setYears] = useState(5);
  const [inflationRate, setInflationRate] = useState(30);
  const [showResults, setShowResults] = useState(false);

  const monthlyRate = annualReturn / 100 / 12;
  const months = years * 12;

  // Calculate future value using CFA-compliant FV formula
  const futureValue = calculateFV(
    -initialInvestment, // Negative = initial cash outflow
    -monthlyContribution, // Negative = periodic cash outflows
    monthlyRate,
    months,
    AnnuityType.ORDINARY
  );

  const totalContributions = initialInvestment + monthlyContribution * months;
  const totalEarnings = futureValue - totalContributions;
  const roi = (totalEarnings / totalContributions) * 100;

  // Inflation-adjusted value
  const inflationMultiplier = Math.pow(1 + inflationRate / 100, years);
  const inflationAdjustedValue = futureValue / inflationMultiplier;
  const realReturn =
    ((inflationAdjustedValue - totalContributions) / totalContributions) * 100;

  // Generate chart data using CFA-compliant calculations
  const chartData = [];

  for (let year = 0; year <= years; year++) {
    const periodsElapsed = year * 12;
    const contributionsToDate =
      initialInvestment + monthlyContribution * periodsElapsed;

    // Calculate FV at this point in time
    const valueAtYear =
      year === 0
        ? initialInvestment
        : calculateFV(
            -initialInvestment,
            -monthlyContribution,
            monthlyRate,
            periodsElapsed,
            AnnuityType.ORDINARY
          );

    chartData.push({
      year: `سال ${formatPersianNumber(year)}`,
      contributions: Math.round(contributionsToDate / 1_000_000),
      earnings: Math.round((valueAtYear - contributionsToDate) / 1_000_000),
      total: Math.round(valueAtYear / 1_000_000),
    });
  }

  const pieData = [
    { name: 'سرمایه اولیه', value: initialInvestment, fill: '#3b82f6' },
    {
      name: 'واریزی‌ها',
      value: totalContributions - initialInvestment,
      fill: '#8b5cf6',
    },
    { name: 'سود', value: Math.round(totalEarnings), fill: '#10b981' },
  ];

  return (
    <Stack gap="lg">
      <Card padding="lg" radius="md" style={glassCard}>
        <Title order={3} c={rallyColors.textPrimary} mb="lg">
          محاسبه بازده سرمایه‌گذاری
        </Title>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          <Stack gap="md">
            <NumberInput
              label="سرمایه اولیه (تومان)"
              value={initialInvestment}
              onChange={(value) => setInitialInvestment(Number(value))}
              styles={inputStyles}
              hideControls
            />

            <NumberInput
              label="واریز ماهانه (تومان)"
              value={monthlyContribution}
              onChange={(value) => setMonthlyContribution(Number(value))}
              styles={inputStyles}
              hideControls
            />

            <NumberInput
              label="بازده سالانه (%)"
              value={annualReturn}
              onChange={(value) => setAnnualReturn(Number(value))}
              step={0.1}
              decimalScale={1}
              styles={inputStyles}
              hideControls
            />

            <NumberInput
              label="مدت (سال)"
              value={years}
              onChange={(value) => setYears(Number(value))}
              styles={inputStyles}
              hideControls
            />

            <NumberInput
              label="نرخ تورم سالانه (%)"
              value={inflationRate}
              onChange={(value) => setInflationRate(Number(value))}
              step={0.1}
              decimalScale={1}
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
                  ارزش نهایی
                </Text>
                <Text size="xl" fw={700} c={rallyColors.blue}>
                  {formatPersianAmount(futureValue)}
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
                  مجموع سود
                </Text>
                <Text size="xl" fw={700} c="#14b8a6">
                  {formatPersianAmount(totalEarnings)}
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
                  بازده سرمایه (ROI)
                </Text>
                <Text size="xl" fw={700} c={rallyColors.yellow}>
                  {toPersianNum(roi.toFixed(1))}٪
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
                  ارزش تعدیل شده با تورم
                </Text>
                <Text size="lg" fw={700} c={rallyColors.textPrimary}>
                  {formatPersianAmount(inflationAdjustedValue)}
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
                  بازده واقعی
                </Text>
                <Text
                  size="lg"
                  fw={700}
                  c={realReturn > 0 ? '#14b8a6' : '#ec4899'}
                >
                  {toPersianNum(realReturn.toFixed(1))}٪
                </Text>
              </Box>
            </Stack>
          )}
        </SimpleGrid>
      </Card>

      {showResults && (
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          <LineChartCard
            title="رشد سرمایه (میلیون تومان)"
            data={chartData}
            dataKeys={[
              { key: 'contributions', name: 'واریزی‌ها', color: '#8b5cf6' },
              { key: 'total', name: 'کل دارایی', color: '#10b981' },
            ]}
            xAxisKey="year"
            height={300}
          />

          <PieChartCard
            title="ترکیب دارایی نهایی"
            data={pieData}
            height={300}
          />
        </SimpleGrid>
      )}
    </Stack>
  );
}

export default InvestmentCalculator;
