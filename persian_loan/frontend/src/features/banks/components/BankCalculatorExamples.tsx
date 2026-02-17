/**
 * Bank Calculator Examples Component
 * Displays loan calculator examples in a responsive grid
 */

import { memo } from 'react';
import { Group, SimpleGrid, Stack, Title, Text, Box, Divider } from '@mantine/core';
import { IconCalculator } from '@tabler/icons-react';
import rallyColors from '../../../theme/rallyColors';
import type { Bank } from '@/types';

interface BankCalculatorExamplesProps {
  examples: Bank['loanCalculatorExamples'];
}

export const BankCalculatorExamples = memo(function BankCalculatorExamples({
  examples,
}: BankCalculatorExamplesProps) {
  if (!examples || examples.length === 0) {
    return null;
  }

  return (
    <>
      <Group gap="xs" mb="sm">
        <IconCalculator size={20} color={rallyColors.blue} />
        <Title order={4} c={rallyColors.textPrimary}>
          نمونه محاسبه وام
        </Title>
      </Group>
      <Divider mb="sm" color={rallyColors.border} />
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
        {examples.map((example, idx) => (
          <Box
            key={idx}
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              padding: 16,
              borderRadius: 8,
              transition: 'border-color 200ms ease',
            }}
          >
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm" fw={500} c={rallyColors.blue}>
                  مبلغ وام:
                </Text>
                <Text fw={700} c={rallyColors.textPrimary}>
                  {example.amount}
                </Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" fw={500} c={rallyColors.blue}>
                  مدت بازپرداخت:
                </Text>
                <Text c={rallyColors.textPrimary}>{example.repaymentPeriod}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" fw={500} c={rallyColors.blue}>
                  قسط ماهانه:
                </Text>
                <Text fw={700} c={rallyColors.textPrimary}>
                  {example.monthlyPayment}
                </Text>
              </Group>
              {example.interest && (
                <Group justify="space-between">
                  <Text size="sm" fw={500} c={rallyColors.blue}>
                    سود ({example.interestRate}):
                  </Text>
                  <Text c={rallyColors.textPrimary}>{example.interest}</Text>
                </Group>
              )}
              {example.digitalServiceFee && (
                <Group justify="space-between">
                  <Text size="sm" fw={500} c={rallyColors.blue}>
                    کارمزد خدمات:
                  </Text>
                  <Text c={rallyColors.textPrimary}>
                    {example.digitalServiceFee}
                  </Text>
                </Group>
              )}
              <Divider color="rgba(59, 130, 246, 0.3)" />
              <Group justify="space-between">
                <Text fw={500} c={rallyColors.blue}>
                  جمع بازپرداخت:
                </Text>
                <Text fw={700} c={rallyColors.textPrimary}>
                  {example.totalRepayment}
                </Text>
              </Group>
            </Stack>
          </Box>
        ))}
      </SimpleGrid>
    </>
  );
});
