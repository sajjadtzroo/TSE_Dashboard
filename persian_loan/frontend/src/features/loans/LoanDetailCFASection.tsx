/**
 * Loan Detail CFA Section Component
 *
 * Displays CFA analysis for a specific loan with customizable parameters
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
  NumberInput,
} from '@mantine/core';
import { IconActivity, IconSettings } from '@tabler/icons-react';
import { LoanCFAMetrics } from './LoanCFAMetrics';
import { formatPersianNumber } from '@/utils/persianNumber';
import type { LoanWithBank } from '@/types';
import rallyColors from '@/theme/rallyColors';

interface LoanDetailCFASectionProps {
  loan: LoanWithBank;
}

export function LoanDetailCFASection({ loan }: LoanDetailCFASectionProps) {
  // Default values based on typical loan usage
  const [depositAmount, setDepositAmount] = useState(100_000_000); // 100M Toman
  const [depositMonths, setDepositMonths] = useState(6); // 6 months
  const [loanMonths, setLoanMonths] = useState(24); // 24 months
  const [commission, setCommission] = useState(0);
  const [showInputs, setShowInputs] = useState(true);
  const [calculatedOnce, setCalculatedOnce] = useState(false);

  // Auto-calculate loan amount based on coefficient table
  const estimatedLoanAmount = (() => {
    if (loan.coefficientTable && depositAmount > 0) {
      const matchingCoeff = loan.coefficientTable.find(
        (row) => row.depositMonths === depositMonths
      );
      if (matchingCoeff) {
        const coefficient = parseFloat(matchingCoeff.loanPercent || '100') / 100;
        return depositAmount * coefficient;
      }
    }
    // Use deposit ratio if available
    const ratio = parseFloat(loan.depositToFacilityRatio || '2');
    return depositAmount * ratio;
  })();

  const handleCalculate = () => {
    setCalculatedOnce(true);
    setShowInputs(false);
  };

  return (
    <Stack gap="lg">
      {/* Header */}
      <Card
        withBorder
        radius="md"
        p="xl"
        style={{
          background: `linear-gradient(135deg, ${rallyColors.blue}18, transparent)`,
          border: `1px solid ${rallyColors.blue}33`,
          backgroundColor: rallyColors.card,
        }}
      >
        <Group justify="space-between">
          <Group gap="sm">
            <IconActivity size={32} color={rallyColors.blue} />
            <div>
              <Title order={2} c={rallyColors.textPrimary}>
                تحلیل مالی CFA
              </Title>
              <Text size="sm" c={rallyColors.textSecondary}>
                ارزیابی حرفه‌ای با استانداردهای مهندسی مالی
              </Text>
            </div>
          </Group>
          {calculatedOnce && (
            <Button
              onClick={() => setShowInputs(!showInputs)}
              variant="subtle"
              leftSection={<IconSettings size={16} />}
            >
              {showInputs ? 'پنهان کردن تنظیمات' : 'تغییر پارامترها'}
            </Button>
          )}
        </Group>
      </Card>

      {/* Input Parameters */}
      {showInputs && (
        <Card
          withBorder
          radius="md"
          p="xl"
          style={{
            backgroundColor: rallyColors.card,
            border: `1px solid ${rallyColors.glassBorder}`,
          }}
        >
          <Title order={3} c={rallyColors.textPrimary} mb="md">
            پارامترهای محاسبه
          </Title>

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
            {/* Left Column */}
            <Stack gap="md">
              <NumberInput
                label="مبلغ سپرده (تومان)"
                value={depositAmount}
                onChange={(val) => setDepositAmount(Number(val) || 0)}
                placeholder="100,000,000"
                description="مبلغ سپرده‌ای که برای دریافت وام نیاز است"
                thousandSeparator=","
                styles={{
                  label: { color: rallyColors.textSecondary },
                  input: {
                    backgroundColor: rallyColors.bg,
                    borderColor: rallyColors.border,
                    color: rallyColors.textPrimary,
                  },
                  description: { color: rallyColors.textDimmed },
                }}
              />

              <NumberInput
                label="مدت سپرده (ماه)"
                value={depositMonths}
                onChange={(val) => setDepositMonths(Number(val) || 0)}
                placeholder="6"
                min={1}
                max={60}
                description="مدت زمانی که سپرده باید نگهداری شود"
                styles={{
                  label: { color: rallyColors.textSecondary },
                  input: {
                    backgroundColor: rallyColors.bg,
                    borderColor: rallyColors.border,
                    color: rallyColors.textPrimary,
                  },
                  description: { color: rallyColors.textDimmed },
                }}
              />

              <NumberInput
                label="کارمزد (تومان)"
                value={commission}
                onChange={(val) => setCommission(Number(val) || 0)}
                placeholder="0"
                description="کارمزد و هزینه‌های جانبی"
                thousandSeparator=","
                styles={{
                  label: { color: rallyColors.textSecondary },
                  input: {
                    backgroundColor: rallyColors.bg,
                    borderColor: rallyColors.border,
                    color: rallyColors.textPrimary,
                  },
                  description: { color: rallyColors.textDimmed },
                }}
              />
            </Stack>

            {/* Right Column */}
            <Stack gap="md">
              <NumberInput
                label="مدت بازپرداخت وام (ماه)"
                value={loanMonths}
                onChange={(val) => setLoanMonths(Number(val) || 0)}
                placeholder="24"
                min={1}
                max={360}
                description="تعداد ماه‌های بازپرداخت وام"
                styles={{
                  label: { color: rallyColors.textSecondary },
                  input: {
                    backgroundColor: rallyColors.bg,
                    borderColor: rallyColors.border,
                    color: rallyColors.textPrimary,
                  },
                  description: { color: rallyColors.textDimmed },
                }}
              />

              {/* Estimated Loan Amount */}
              <Box
                p="md"
                style={{
                  backgroundColor: `${rallyColors.blue}18`,
                  border: `1px solid ${rallyColors.blue}33`,
                  borderRadius: 8,
                }}
              >
                <Text size="sm" c={rallyColors.textSecondary} mb={4}>
                  مبلغ وام تخمینی
                </Text>
                <Text size="xl" fw={700} c={rallyColors.blue}>
                  {formatPersianNumber(Math.round(estimatedLoanAmount).toLocaleString('fa-IR'))} تومان
                </Text>
                <Text size="xs" c={rallyColors.textDimmed} mt={4}>
                  بر اساس ضرایب وام و مبلغ سپرده
                </Text>
              </Box>

              {/* Loan Details */}
              <Box
                p="md"
                style={{
                  backgroundColor: rallyColors.bg,
                  borderRadius: 8,
                  border: `1px solid ${rallyColors.border}`,
                }}
              >
                <Text size="sm" fw={500} c={rallyColors.textSecondary} mb="xs">
                  مشخصات وام
                </Text>
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="xs" c={rallyColors.textSecondary}>نرخ بهره:</Text>
                    <Text size="xs" fw={500} c={rallyColors.textPrimary}>
                      {loan.interestRateNumeric
                        ? formatPersianNumber(loan.interestRateNumeric.toFixed(1))
                        : 'N/A'}٪
                    </Text>
                  </Group>
                  {loan.depositToFacilityRatio && (
                    <Group justify="space-between">
                      <Text size="xs" c={rallyColors.textSecondary}>نسبت سپرده به وام:</Text>
                      <Text size="xs" fw={500} c={rallyColors.textPrimary}>
                        1:{formatPersianNumber(loan.depositToFacilityRatio)}
                      </Text>
                    </Group>
                  )}
                  {loan.category && (
                    <Group justify="space-between">
                      <Text size="xs" c={rallyColors.textSecondary}>نوع وام:</Text>
                      <Text size="xs" fw={500} c={rallyColors.textPrimary}>
                        {loan.categoryFA || loan.category}
                      </Text>
                    </Group>
                  )}
                </Stack>
              </Box>
            </Stack>
          </SimpleGrid>

          {/* Calculate Button */}
          <Button
            onClick={handleCalculate}
            fullWidth
            mt="lg"
            leftSection={<IconActivity size={16} />}
          >
            محاسبه تحلیل CFA
          </Button>
        </Card>
      )}

      {/* CFA Analysis Results */}
      {calculatedOnce && (
        <LoanCFAMetrics
          loan={loan}
          depositAmount={depositAmount}
          depositMonths={depositMonths}
          loanMonths={loanMonths}
          commission={commission}
        />
      )}

      {/* Instructions */}
      {!calculatedOnce && (
        <Card
          withBorder
          radius="md"
          p="xl"
          style={{
            backgroundColor: `${rallyColors.blue}0d`,
            border: `1px solid ${rallyColors.blue}33`,
          }}
        >
          <Title order={4} c={rallyColors.blue} mb="sm">
            راهنمای استفاده
          </Title>
          <Stack gap="xs">
            <Text size="sm" c={rallyColors.textSecondary}>
              <Text span fw={600} style={{ color: '#93c5fd' }}>
                1. مبلغ سپرده:
              </Text>{' '}
              مبلغی که باید برای دریافت این وام سپرده‌گذاری کنید.
            </Text>
            <Text size="sm" c={rallyColors.textSecondary}>
              <Text span fw={600} style={{ color: '#93c5fd' }}>
                2. مدت سپرده:
              </Text>{' '}
              مدت زمانی که سپرده شما باید در بانک باقی بماند (معمولاً 3 تا 12 ماه).
            </Text>
            <Text size="sm" c={rallyColors.textSecondary}>
              <Text span fw={600} style={{ color: '#93c5fd' }}>
                3. مدت بازپرداخت:
              </Text>{' '}
              تعداد ماه‌هایی که برای بازپرداخت وام زمان دارید.
            </Text>
            <Text
              size="sm"
              c={rallyColors.textSecondary}
              pt="sm"
              mt="sm"
              style={{ borderTop: `1px solid ${rallyColors.blue}33` }}
            >
              پس از وارد کردن اطلاعات، دکمه{' '}
              <Text span fw={700}>"محاسبه تحلیل CFA"</Text> را بزنید تا تحلیل جامع مالی شامل:
            </Text>
            <Box component="ul" style={{ listStyleType: 'disc', paddingInlineStart: '1.5rem' }}>
              <Text component="li" size="xs" c={rallyColors.textSecondary} mb={4}>
                محاسبه CAPM (بازده مورد انتظار)
              </Text>
              <Text component="li" size="xs" c={rallyColors.textSecondary} mb={4}>
                محاسبه WACC (هزینه سرمایه)
              </Text>
              <Text component="li" size="xs" c={rallyColors.textSecondary} mb={4}>
                تحلیل جریان نقدی (NPV, IRR)
              </Text>
              <Text component="li" size="xs" c={rallyColors.textSecondary} mb={4}>
                معیارهای ریسک (Sharpe, Treynor, Jensen's Alpha)
              </Text>
              <Text component="li" size="xs" c={rallyColors.textSecondary}>
                توصیه سرمایه‌گذاری (قبول/رد/بررسی)
              </Text>
            </Box>
          </Stack>
        </Card>
      )}
    </Stack>
  );
}
