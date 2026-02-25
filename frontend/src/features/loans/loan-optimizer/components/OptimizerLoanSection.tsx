import React from 'react';
import { Box, Text, Group, Stack } from '@mantine/core';
import { IconTrendingUp } from '@tabler/icons-react';
import rallyColors from '../../../../theme/rallyColors';
import CurrencyInput from '@/components/loans/inputs/CurrencyInput';
import OptimizerInfoTooltip from './OptimizerInfoTooltip';

interface OptimizerLoanSectionProps {
  loanAmountNeeded: number;
  errors: Record<string, string>;
  onLoanAmountChange: (val: number) => void;
}

const OptimizerLoanSection: React.FC<OptimizerLoanSectionProps> = ({
  loanAmountNeeded,
  errors,
  onLoanAmountChange,
}) => (
  <Box
    p="md"
    style={{
      backgroundColor: rallyColors.elevated,
      borderRadius: 8,
      border: `1px solid ${rallyColors.border}`,
    }}
  >
    <Group gap="xs" mb="md">
      <IconTrendingUp size={20} color="#BB86FC" />
      <Text size="sm" fw={600} c={rallyColors.textPrimary}>
        نیاز وام
      </Text>
      <OptimizerInfoTooltip text="مبلغ وامی که نیاز دارید دریافت کنید" />
    </Group>

    <Stack gap={4}>
      <CurrencyInput
        label="مبلغ وام مورد نیاز (تومان)"
        value={loanAmountNeeded}
        onChange={onLoanAmountChange}
        required
      />
      {errors.loanAmountNeeded && (
        <Text size="xs" c="#CF6679">{errors.loanAmountNeeded}</Text>
      )}
      <Text size="xs" c={rallyColors.textSecondary}>
        مثال: 50 میلیون تومان
      </Text>
    </Stack>
  </Box>
);

export default OptimizerLoanSection;
