/**
 * AllMetricsInputForm
 * User parameter input for the All-Loans Financial Analysis page.
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  Group,
  NumberInput,
  Select,
  SegmentedControl,
  Slider,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconCalculator, IconTrendingUp } from '@tabler/icons-react';
import rallyColors from '../../../theme/rallyColors';
import type { AnalysisInputs } from './loanAnalysisEngine';

interface AllMetricsInputFormProps {
  onSubmit: (inputs: AnalysisInputs) => void;
  loading?: boolean;
}

const DEPOSIT_MONTH_OPTIONS = [
  { value: '1', label: '۱ ماه' },
  { value: '3', label: '۳ ماه' },
  { value: '6', label: '۶ ماه' },
  { value: '12', label: '۱۲ ماه' },
  { value: '24', label: '۲۴ ماه' },
];

const LOAN_MONTH_OPTIONS = [
  { value: '12', label: '۱۲ ماه' },
  { value: '24', label: '۲۴ ماه' },
  { value: '36', label: '۳۶ ماه' },
  { value: '48', label: '۴۸ ماه' },
  { value: '60', label: '۶۰ ماه' },
  { value: '84', label: '۸۴ ماه' },
  { value: '120', label: '۱۲۰ ماه' },
];

const RISK_OPTIONS = [
  { label: 'کم', value: 'low' },
  { label: 'متوسط', value: 'medium' },
  { label: 'زیاد', value: 'high' },
];

const cardStyle = {
  backgroundColor: rallyColors.card,
  borderRadius: 12,
  border: `1px solid ${rallyColors.border}`,
  boxShadow: rallyColors.glassShadow,
};

const sectionStyle = {
  backgroundColor: rallyColors.elevated,
  borderRadius: 8,
  border: `1px solid ${rallyColors.border}`,
};

const inputStyles = {
  input: {
    backgroundColor: rallyColors.bg,
    borderColor: rallyColors.borderStrong,
    color: rallyColors.textPrimary,
  },
};

const AllMetricsInputForm: React.FC<AllMetricsInputFormProps> = ({ onSubmit, loading }) => {
  const [depositAmount, setDepositAmount] = useState<number | string>(10_000_000);
  const [depositMonths, setDepositMonths] = useState('3');
  const [loanMonths, setLoanMonths] = useState('60');
  const [externalReturnRatePct, setExternalReturnRatePct] = useState(25);
  const [riskTolerance, setRiskTolerance] = useState<'low' | 'medium' | 'high'>('medium');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = typeof depositAmount === 'string' ? parseFloat(depositAmount) : depositAmount;
    if (!amount || amount <= 0) return;

    onSubmit({
      depositAmount: amount,
      depositMonths: parseInt(depositMonths, 10),
      loanMonths: parseInt(loanMonths, 10),
      externalReturnRate: externalReturnRatePct / 100,
      riskTolerance,
    });
  };

  return (
    <Box p="lg" style={cardStyle}>
      {/* Header */}
      <Group gap="sm" mb="lg">
        <Box p="xs" style={{ backgroundColor: 'rgba(187, 134, 252, 0.1)', borderRadius: 8 }}>
          <IconTrendingUp size={22} color="#BB86FC" />
        </Box>
        <Stack gap={2}>
          <Title order={3} size="h4" fw={600} c={rallyColors.textPrimary}>
            پارامترهای تحلیل
          </Title>
          <Text size="sm" c={rallyColors.textSecondary}>
            مقادیر زیر را وارد کنید تا همه وام‌ها با هم تحلیل شوند
          </Text>
        </Stack>
      </Group>

      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          {/* Row 1: Deposit amount + deposit months */}
          <Box p="md" style={sectionStyle}>
            <Text size="sm" fw={600} c={rallyColors.textPrimary} mb="sm">
              اطلاعات سپرده
            </Text>
            <Group grow align="flex-start">
              <Stack gap={4}>
                <Text size="xs" c={rallyColors.textSecondary}>مبلغ سپرده (ریال)</Text>
                <NumberInput
                  value={depositAmount}
                  onChange={setDepositAmount}
                  min={0}
                  step={1_000_000}
                  thousandSeparator=","
                  placeholder="مثال: ۱۰,۰۰۰,۰۰۰"
                  styles={inputStyles}
                />
              </Stack>
              <Stack gap={4}>
                <Text size="xs" c={rallyColors.textSecondary}>مدت سپرده</Text>
                <Select
                  value={depositMonths}
                  onChange={(v) => v && setDepositMonths(v)}
                  data={DEPOSIT_MONTH_OPTIONS}
                  styles={inputStyles}
                />
              </Stack>
            </Group>
          </Box>

          {/* Row 2: Loan repayment months */}
          <Box p="md" style={sectionStyle}>
            <Text size="sm" fw={600} c={rallyColors.textPrimary} mb="sm">
              مدت بازپرداخت وام
            </Text>
            <Select
              value={loanMonths}
              onChange={(v) => v && setLoanMonths(v)}
              data={LOAN_MONTH_OPTIONS}
              styles={inputStyles}
            />
          </Box>

          {/* Row 3: External return rate */}
          <Box p="md" style={sectionStyle}>
            <Group justify="space-between" mb="sm">
              <Text size="sm" fw={600} c={rallyColors.textPrimary}>
                نرخ بازده جایگزین (سالانه)
              </Text>
              <Text size="sm" fw={700} c="#BB86FC">
                {externalReturnRatePct}٪
              </Text>
            </Group>
            <Slider
              value={externalReturnRatePct}
              onChange={setExternalReturnRatePct}
              min={15}
              max={45}
              step={1}
              marks={[
                { value: 15, label: '۱۵٪' },
                { value: 25, label: '۲۵٪' },
                { value: 35, label: '۳۵٪' },
                { value: 45, label: '۴۵٪' },
              ]}
              styles={{
                track: { backgroundColor: rallyColors.border },
                bar: { background: 'linear-gradient(to right, #BB86FC, #9b59d0)' },
                thumb: { borderColor: '#BB86FC', backgroundColor: '#BB86FC' },
                markLabel: { color: rallyColors.textDimmed, fontSize: '0.7rem' },
              }}
            />
          </Box>

          {/* Row 4: Risk tolerance */}
          <Box p="md" style={sectionStyle}>
            <Text size="sm" fw={600} c={rallyColors.textPrimary} mb="sm">
              تحمل ریسک
            </Text>
            <SegmentedControl
              fullWidth
              value={riskTolerance}
              onChange={(v) => setRiskTolerance(v as 'low' | 'medium' | 'high')}
              data={RISK_OPTIONS}
              styles={{
                root: { backgroundColor: rallyColors.bg },
                label: { color: rallyColors.textSecondary },
                indicator: { backgroundColor: '#BB86FC' },
              }}
            />
          </Box>

          {/* Submit */}
          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={loading}
            leftSection={<IconCalculator size={20} />}
            styles={{
              root: {
                background: 'linear-gradient(to right, #BB86FC, #9b59d0)',
                color: '#1a1a1a',
                fontWeight: 600,
                borderRadius: 10,
              },
            }}
          >
            محاسبه و مقایسه همه وام‌ها
          </Button>
        </Stack>
      </form>
    </Box>
  );
};

export default AllMetricsInputForm;
