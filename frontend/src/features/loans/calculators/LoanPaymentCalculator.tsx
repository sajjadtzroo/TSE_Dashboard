/**
 * Loan Payment Calculator
 * Calculate monthly payments and amortization schedule
 */

import { useState } from 'react';
import {
  Card,
  Text,
  Title,
  Group,
  Stack,
  SimpleGrid,
  Box,
  Button,
  Center,
} from '@mantine/core';
import { IconCalculator, IconTrendingUp, IconCurrencyDollar, IconPigMoney } from '@tabler/icons-react';
import { PieChartCard, LineChartCard } from '@/components/loans/charts';
import { formatPersianAmount, formatPersianNumber } from '@/utils/loans/persianNumber';
import { toPersianNum } from '@/utils/formatUtils';
import { CurrencyInput } from '@/components/loans/inputs/CurrencyInput';
import { PercentageInput } from '@/components/loans/inputs/PercentageInput';
import { NumberInput } from './components/NumberInput';
import { ResultCard } from './components/ResultCard';
import rallyColors, { glassCard } from '@/theme/rallyColors';
import {
  calculatePMT,
  generateAmortizationSchedule,
  AnnuityType,
} from '@/utils/loans/timeValueOfMoney';

interface PaymentInputs {
  principal: number;
  annualRate: number;
  termMonths: number;
  extraPayment: number;
}

export function LoanPaymentCalculator() {
  const [inputs, setInputs] = useState<PaymentInputs>({
    principal: 100_000_000,
    annualRate: 18,
    termMonths: 60,
    extraPayment: 0,
  });
  const [showResults, setShowResults] = useState(false);

  const handleCalculate = () => {
    setShowResults(true);
  };

  // Use CFA-compliant TVM calculations
  const monthlyRate = inputs.annualRate / 100 / 12;

  // Calculate monthly payment using CFA standard PMT formula
  const monthlyPayment = calculatePMT(
    -inputs.principal, // Negative = cash outflow (borrowing)
    0, // No future value (loan paid off)
    monthlyRate,
    inputs.termMonths,
    AnnuityType.ORDINARY // Payments at end of period
  );

  const totalPayment = monthlyPayment * inputs.termMonths;
  const totalInterest = totalPayment - inputs.principal;

  // Generate amortization schedule using CFA-compliant function
  const fullSchedule = generateAmortizationSchedule(
    inputs.principal,
    inputs.annualRate / 100,
    inputs.termMonths,
    12 // Monthly payments
  );

  // Format first 12 months for chart
  const schedule = fullSchedule.slice(0, 12).map((payment) => ({
    month: `ماه ${formatPersianNumber(payment.period)}`,
    interest: Math.round(payment.interest),
    principal: Math.round(payment.principal),
    balance: Math.round(payment.balance),
  }));

  const pieData = [
    { name: 'اصل وام', value: inputs.principal, fill: '#3b82f6' },
    { name: 'سود', value: Math.round(totalInterest), fill: '#ef4444' },
  ];

  return (
    <Stack gap="lg">
      <Card padding="xl" radius="md" style={glassCard}>
        <Group gap="sm" mb="xl">
          <Box
            style={{
              padding: 12,
              borderRadius: 12,
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
            }}
          >
            <IconCalculator size={24} color={rallyColors.blue} />
          </Box>
          <Box>
            <Title order={2} c={rallyColors.textPrimary}>
              محاسبه قسط وام
            </Title>
            <Text size="sm" c={rallyColors.textSecondary} mt={4}>
              محاسبه دقیق قسط ماهانه و جدول بازپرداخت
            </Text>
          </Box>
        </Group>

        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
          {/* Inputs */}
          <Stack gap="md">
            <CurrencyInput
              label="مبلغ وام"
              value={inputs.principal}
              onChange={(value) => setInputs({ ...inputs, principal: value })}
              helperText="مبلغ اصلی وام به تومان"
              required
            />

            <PercentageInput
              label="نرخ سود سالانه"
              value={inputs.annualRate}
              onChange={(value) => setInputs({ ...inputs, annualRate: value })}
              min={0}
              max={50}
              step={0.1}
              helperText="نرخ سود سالانه بانک"
              required
            />

            <NumberInput
              label="مدت بازپرداخت"
              value={inputs.termMonths}
              onChange={(value) => setInputs({ ...inputs, termMonths: value })}
              min={1}
              max={360}
              suffix="ماه"
              helperText="تعداد ماه‌های بازپرداخت"
              required
            />

            <CurrencyInput
              label="پرداخت اضافی ماهانه"
              value={inputs.extraPayment}
              onChange={(value) => setInputs({ ...inputs, extraPayment: value })}
              helperText="مبلغ اضافی که هر ماه می‌پردازید (اختیاری)"
            />

            <Button
              onClick={handleCalculate}
              color="blue"
              fullWidth
              size="lg"
              radius="md"
              leftSection={<IconCalculator size={20} />}
              styles={{
                root: {
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                },
              }}
            >
              محاسبه کنید
            </Button>
          </Stack>

          {/* Results */}
          {showResults ? (
            <Stack gap="md">
              <ResultCard
                label="قسط ماهانه"
                value={formatPersianAmount(monthlyPayment)}
                icon={IconCurrencyDollar}
                color="primary"
                highlight
                subtitle="مبلغی که هر ماه باید بپردازید"
              />

              <ResultCard
                label="مجموع پرداختی"
                value={formatPersianAmount(totalPayment)}
                icon={IconTrendingUp}
                subtitle={`شامل ${formatPersianAmount(inputs.principal)} اصل + ${formatPersianAmount(totalInterest)} سود`}
              />

              <ResultCard
                label="مجموع سود پرداختی"
                value={formatPersianAmount(totalInterest)}
                icon={IconPigMoney}
                color="danger"
                subtitle="مجموع سودی که به بانک می‌پردازید"
              />

              <ResultCard
                label="نسبت سود به اصل"
                value={`${toPersianNum(((totalInterest / inputs.principal) * 100).toFixed(1))}٪`}
                color="warning"
                subtitle={
                  totalInterest > inputs.principal
                    ? 'سود بیشتر از اصل است!'
                    : 'نسبت قابل قبول'
                }
              />
            </Stack>
          ) : (
            <Center
              style={{
                padding: 48,
                border: `2px dashed ${rallyColors.glassBorder}`,
                borderRadius: 12,
              }}
            >
              <Stack align="center" gap="md">
                <IconCalculator size={64} color={rallyColors.textDimmed} />
                <Text c={rallyColors.textSecondary}>
                  اطلاعات وام را وارد کرده و محاسبه کنید
                </Text>
              </Stack>
            </Center>
          )}
        </SimpleGrid>
      </Card>

      {/* Charts */}
      {showResults && (
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          <PieChartCard title="ترکیب پرداختی" data={pieData} height={300} />

          <LineChartCard
            title="جدول بازپرداخت (۱۲ ماه اول)"
            data={schedule}
            dataKeys={[
              { key: 'principal', name: 'اصل', color: '#3b82f6' },
              { key: 'interest', name: 'سود', color: '#ef4444' },
            ]}
            xAxisKey="month"
            height={300}
          />
        </SimpleGrid>
      )}
    </Stack>
  );
}

export default LoanPaymentCalculator;
