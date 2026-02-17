/**
 * Affordability Calculator
 * Calculate maximum affordable loan based on income
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
import {
  IconWallet,
  IconTrendingUp,
  IconAlertCircle,
  IconCircleCheck,
} from '@tabler/icons-react';
import { PieChartCard } from '@/components/loans/charts';
import { formatPersianAmount } from '@/utils/loans/persianNumber';
import { CurrencyInput } from '@/components/loans/inputs/CurrencyInput';
import { PercentageInput } from '@/components/loans/inputs/PercentageInput';
import { NumberInput } from './components/NumberInput';
import { ResultCard } from './components/ResultCard';
import rallyColors from '@/theme/rallyColors';
import { calculatePV, AnnuityType } from '@/utils/loans/timeValueOfMoney';

const glassCard = {
  backgroundColor: rallyColors.glassBg,
  border: `1px solid ${rallyColors.glassBorder}`,
  backdropFilter: 'blur(12px)',
};

export function AffordabilityCalculator() {
  const [monthlyIncome, setMonthlyIncome] = useState(50_000_000);
  const [existingDebts, setExistingDebts] = useState(10_000_000);
  const [maxDTI, setMaxDTI] = useState(40);
  const [interestRate, setInterestRate] = useState(18);
  const [loanTerm, setLoanTerm] = useState(60);
  const [showResults, setShowResults] = useState(false);

  const maxPayment = (monthlyIncome * maxDTI) / 100 - existingDebts;
  const monthlyRate = interestRate / 100 / 12;

  // Calculate max loan using CFA-compliant PV formula
  const maxLoan = -calculatePV(
    0, // No future value (loan paid off)
    -maxPayment, // Negative payment = outflow
    monthlyRate,
    loanTerm,
    AnnuityType.ORDINARY
  );

  const actualDTI = ((maxPayment + existingDebts) / monthlyIncome) * 100;

  const pieData = [
    { name: 'قسط وام', value: Math.round(maxPayment), fill: '#3b82f6' },
    { name: 'بدهی فعلی', value: existingDebts, fill: '#f59e0b' },
    {
      name: 'درآمد آزاد',
      value: monthlyIncome - maxPayment - existingDebts,
      fill: '#10b981',
    },
  ];

  return (
    <Stack gap="lg">
      <Card padding="xl" radius="md" style={glassCard}>
        <Group gap="sm" mb="xl">
          <Box
            style={{
              padding: 12,
              borderRadius: 12,
              backgroundColor: 'rgba(20, 184, 166, 0.1)',
            }}
          >
            <IconWallet size={24} color="#14b8a6" />
          </Box>
          <Box>
            <Title order={2} c={rallyColors.textPrimary}>
              محاسبه توان پرداخت
            </Title>
            <Text size="sm" c={rallyColors.textSecondary} mt={4}>
              تعیین حداکثر وام قابل دریافت بر اساس درآمد
            </Text>
          </Box>
        </Group>

        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
          <Stack gap="md">
            <CurrencyInput
              label="درآمد ماهانه"
              value={monthlyIncome}
              onChange={setMonthlyIncome}
              helperText="مجموع درآمد ثابت ماهانه شما"
              required
            />

            <CurrencyInput
              label="بدهی ماهانه فعلی"
              value={existingDebts}
              onChange={setExistingDebts}
              helperText="مجموع اقساط و بدهی‌های ماهانه فعلی"
            />

            <PercentageInput
              label="حداکثر نسبت بدهی به درآمد (DTI)"
              value={maxDTI}
              onChange={setMaxDTI}
              min={10}
              max={70}
              helperText="معمولاً بین 30-40 درصد توصیه می‌شود"
              required
            />

            <PercentageInput
              label="نرخ سود سالانه"
              value={interestRate}
              onChange={setInterestRate}
              min={0}
              max={50}
              helperText="نرخ سود مورد انتظار وام"
              required
            />

            <NumberInput
              label="مدت وام"
              value={loanTerm}
              onChange={setLoanTerm}
              min={12}
              max={360}
              suffix="ماه"
              helperText="تعداد ماه‌های بازپرداخت"
              required
            />

            <Button
              onClick={() => setShowResults(true)}
              color="blue"
              fullWidth
              size="lg"
              radius="md"
              leftSection={<IconWallet size={20} />}
              styles={{
                root: {
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                },
              }}
            >
              محاسبه توان پرداخت
            </Button>
          </Stack>

          {showResults ? (
            <Stack gap="md">
              <ResultCard
                label="حداکثر مبلغ وام قابل دریافت"
                value={formatPersianAmount(maxLoan)}
                icon={IconTrendingUp}
                color="primary"
                highlight
                subtitle="با توجه به درآمد و نسبت DTI شما"
              />

              <ResultCard
                label="حداکثر قسط ماهانه"
                value={formatPersianAmount(maxPayment)}
                icon={IconWallet}
                color="success"
                subtitle={`${actualDTI.toFixed(1)}٪ از درآمد ماهانه شما`}
              />

              <ResultCard
                label="نسبت بدهی به درآمد (DTI)"
                value={`${actualDTI.toFixed(1)}٪`}
                color={
                  actualDTI <= 30
                    ? 'success'
                    : actualDTI <= 40
                    ? 'warning'
                    : 'danger'
                }
                subtitle={`حداکثر مجاز: ${maxDTI}٪`}
              />

              <Box
                style={{
                  padding: 20,
                  borderRadius: 12,
                  border: `2px solid ${
                    actualDTI <= 30
                      ? 'rgba(20, 184, 166, 0.3)'
                      : actualDTI <= 40
                      ? 'rgba(245, 158, 11, 0.3)'
                      : 'rgba(236, 72, 153, 0.3)'
                  }`,
                  backgroundColor:
                    actualDTI <= 30
                      ? 'rgba(20, 184, 166, 0.1)'
                      : actualDTI <= 40
                      ? 'rgba(245, 158, 11, 0.1)'
                      : 'rgba(236, 72, 153, 0.1)',
                }}
              >
                <Group gap="sm" mb="xs">
                  {actualDTI <= 40 ? (
                    <IconCircleCheck size={20} color="#14b8a6" />
                  ) : (
                    <IconAlertCircle size={20} color="#ec4899" />
                  )}
                  <Text size="sm" fw={500} c={rallyColors.textSecondary}>
                    ارزیابی ریسک مالی
                  </Text>
                </Group>
                <Text
                  size="xl"
                  fw={700}
                  mb={4}
                  c={
                    actualDTI <= 30
                      ? '#14b8a6'
                      : actualDTI <= 40
                      ? '#f59e0b'
                      : '#ec4899'
                  }
                >
                  {actualDTI <= 30
                    ? 'ریسک کم'
                    : actualDTI <= 40
                    ? 'ریسک متوسط'
                    : 'ریسک بالا'}
                </Text>
                <Text size="xs" c={rallyColors.textSecondary}>
                  {actualDTI <= 30
                    ? 'شرایط مالی شما برای دریافت وام مناسب است'
                    : actualDTI <= 40
                    ? 'می‌توانید وام دریافت کنید اما با احتیاط'
                    : 'توصیه می‌شود مبلغ کمتری درخواست کنید'}
                </Text>
              </Box>
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
                <IconWallet size={64} color={rallyColors.textDimmed} />
                <Text c={rallyColors.textSecondary}>
                  اطلاعات درآمد خود را وارد کنید
                </Text>
              </Stack>
            </Center>
          )}
        </SimpleGrid>
      </Card>

      {showResults && (
        <PieChartCard title="تخصیص درآمد ماهانه" data={pieData} height={300} />
      )}
    </Stack>
  );
}

export default AffordabilityCalculator;
