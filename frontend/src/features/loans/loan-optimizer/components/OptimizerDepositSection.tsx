import React from 'react';
import { Box, Text, Group, Stack, SimpleGrid } from '@mantine/core';
import { IconBuildingBank } from '@tabler/icons-react';
import rallyColors from '../../../../theme/rallyColors';
import CurrencyInput from '@/components/loans/inputs/CurrencyInput';
import NumberInput from '@/components/loans/inputs/NumberInput';
import OptimizerInfoTooltip from './OptimizerInfoTooltip';

interface OptimizerDepositSectionProps {
  depositAmount: number;
  depositMonths: number;
  errors: Record<string, string>;
  onDepositAmountChange: (val: number) => void;
  onDepositMonthsChange: (val: number) => void;
}

const OptimizerDepositSection: React.FC<OptimizerDepositSectionProps> = ({
  depositAmount,
  depositMonths,
  errors,
  onDepositAmountChange,
  onDepositMonthsChange,
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
      <IconBuildingBank size={20} color="#BB86FC" />
      <Text size="sm" fw={600} c={rallyColors.textPrimary}>
        اطلاعات سپرده
      </Text>
      <OptimizerInfoTooltip text="مبلغ و مدت سپرده‌ای که قرار است در بانک بگذارید" />
    </Group>

    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
      <Stack gap={4}>
        <CurrencyInput
          label="مبلغ سپرده (تومان)"
          value={depositAmount}
          onChange={onDepositAmountChange}
          required
        />
        {errors.depositAmount && (
          <Text size="xs" c="#CF6679">{errors.depositAmount}</Text>
        )}
        <Text size="xs" c={rallyColors.textSecondary}>
          مثال: 10 میلیون تومان
        </Text>
      </Stack>

      <Stack gap={4}>
        <NumberInput
          label="مدت سپرده (ماه)"
          value={depositMonths}
          onChange={onDepositMonthsChange}
          min={1}
          max={60}
          required
        />
        {errors.depositMonths && (
          <Text size="xs" c="#CF6679">{errors.depositMonths}</Text>
        )}
        <Text size="xs" c={rallyColors.textSecondary}>
          بین 1 تا 60 ماه
        </Text>
      </Stack>
    </SimpleGrid>
  </Box>
);

export default OptimizerDepositSection;
