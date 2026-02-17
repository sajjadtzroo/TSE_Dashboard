/**
 * Calculator Form Component
 */

import { Stack, Text, NumberInput, SimpleGrid, UnstyledButton, Box } from '@mantine/core';
import rallyColors from '@/theme/rallyColors';
import type { CalculatorInputs } from './types';
import { formatCurrency } from '@/utils/financialCalculations';

interface CalculatorFormProps {
  inputs: CalculatorInputs;
  onChange: (inputs: CalculatorInputs) => void;
}

const inputStyles = {
  input: {
    backgroundColor: rallyColors.elevated,
    border: `1px solid ${rallyColors.glassBorder}`,
    color: rallyColors.textPrimary,
  },
  label: {
    color: rallyColors.textSecondary,
    marginBottom: 8,
  },
};

export function CalculatorForm({ inputs, onChange }: CalculatorFormProps) {
  const handleChange = (field: keyof CalculatorInputs, value: any) => {
    onChange({ ...inputs, [field]: value });
  };

  return (
    <Stack gap="lg">
      {/* Deposit Amount */}
      <Box>
        <NumberInput
          label="مبلغ سپرده (تومان)"
          value={inputs.depositAmount}
          onChange={(value) => handleChange('depositAmount', Number(value))}
          step={1000000}
          styles={inputStyles}
          hideControls
        />
        <Text size="xs" c={rallyColors.textSecondary} mt={4}>
          مبلغی که می‌توانید به عنوان سپرده بگذارید: {formatCurrency(inputs.depositAmount)}
        </Text>
      </Box>

      {/* Deposit Duration */}
      <Box>
        <NumberInput
          label="مدت سپرده‌گذاری (ماه)"
          value={inputs.depositMonths}
          onChange={(value) => handleChange('depositMonths', Number(value))}
          min={1}
          max={60}
          styles={inputStyles}
          hideControls
        />
        <Text size="xs" c={rallyColors.textSecondary} mt={4}>
          حداقل ۱ ماه، حداکثر ۶۰ ماه
        </Text>
      </Box>

      {/* External Return Rate */}
      <Box>
        <NumberInput
          label="نرخ بازدهی سرمایه‌گذاری جایگزین (% سالانه)"
          value={inputs.externalReturnRate * 100}
          onChange={(value) => handleChange('externalReturnRate', Number(value) / 100)}
          step={1}
          styles={inputStyles}
          hideControls
        />
        <Text size="xs" c={rallyColors.textSecondary} mt={4}>
          بازدهی سالانه‌ای که می‌توانید از سرمایه‌گذاری‌های دیگر بگیرید (مثلاً بورس، ملک)
        </Text>
      </Box>

      {/* Loan Repayment Period */}
      <Box>
        <NumberInput
          label="مدت بازپرداخت وام (ماه)"
          value={inputs.loanMonths}
          onChange={(value) => handleChange('loanMonths', Number(value))}
          min={6}
          max={120}
          styles={inputStyles}
          hideControls
        />
        <Text size="xs" c={rallyColors.textSecondary} mt={4}>
          دوره‌ای که می‌خواهید وام را بازپرداخت کنید
        </Text>
      </Box>

      {/* Commission */}
      <Box>
        <NumberInput
          label="کارمزد مورد انتظار (تومان)"
          value={inputs.commission}
          onChange={(value) => handleChange('commission', Number(value))}
          step={100000}
          styles={inputStyles}
          hideControls
        />
        <Text size="xs" c={rallyColors.textSecondary} mt={4}>
          حداکثر کارمزدی که حاضرید برای وام بپردازید: {formatCurrency(inputs.commission)}
        </Text>
      </Box>

      {/* Risk Tolerance */}
      <Box>
        <Text size="sm" fw={500} c={rallyColors.textSecondary} mb="sm">
          تحمل ریسک
        </Text>
        <SimpleGrid cols={3} spacing="sm">
          {(['low', 'medium', 'high'] as const).map((risk) => (
            <UnstyledButton
              key={risk}
              onClick={() => handleChange('riskTolerance', risk)}
              style={{
                padding: '12px 16px',
                borderRadius: 8,
                border: `2px solid ${
                  inputs.riskTolerance === risk
                    ? rallyColors.blue
                    : rallyColors.glassBorder
                }`,
                backgroundColor:
                  inputs.riskTolerance === risk
                    ? 'rgba(59, 130, 246, 0.15)'
                    : rallyColors.elevated,
                color:
                  inputs.riskTolerance === risk
                    ? rallyColors.blue
                    : rallyColors.textSecondary,
                textAlign: 'center',
                transition: 'all 0.2s ease',
              }}
            >
              {risk === 'low' && 'کم'}
              {risk === 'medium' && 'متوسط'}
              {risk === 'high' && 'زیاد'}
            </UnstyledButton>
          ))}
        </SimpleGrid>
        <Text size="xs" c={rallyColors.textSecondary} mt="sm">
          {inputs.riskTolerance === 'low' && 'اولویت با امنیت و پایین‌ترین هزینه'}
          {inputs.riskTolerance === 'medium' && 'تعادل بین امنیت و بازدهی'}
          {inputs.riskTolerance === 'high' && 'اولویت با حداکثر مبلغ وام و بازدهی'}
        </Text>
      </Box>
    </Stack>
  );
}

export default CalculatorForm;
