/**
 * Bank Scoring System Component
 * Displays scoring system formula, club name, calculation period, and max loan
 */

import { memo } from 'react';
import { Group, Stack, Title, Text, Box, Divider } from '@mantine/core';
import { IconCoins } from '@tabler/icons-react';
import rallyColors from '../../../../theme/rallyColors';
import type { Bank } from '@/types';

interface BankScoringSystemProps {
  scoringSystem: Bank['scoringSystem'];
}

export const BankScoringSystem = memo(function BankScoringSystem({
  scoringSystem,
}: BankScoringSystemProps) {
  if (!scoringSystem) {
    return null;
  }

  return (
    <>
      <Group gap="xs" mb="sm">
        <IconCoins size={20} color={rallyColors.yellow} />
        <Title order={4} c={rallyColors.textPrimary}>
          سیستم امتیازدهی
        </Title>
      </Group>
      <Divider mb="sm" color={rallyColors.border} />
      <Box
        style={{
          backgroundColor: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          padding: 16,
          borderRadius: 8,
        }}
      >
        <Stack gap="xs">
          {scoringSystem.formulaFA && (
            <Text c={rallyColors.yellow}>
              <Text span fw={700} c={rallyColors.textPrimary}>
                فرمول:
              </Text>{' '}
              {scoringSystem.formulaFA}
            </Text>
          )}
          {scoringSystem.clubName && (
            <Text c={rallyColors.yellow}>
              <Text span fw={700} c={rallyColors.textPrimary}>
                باشگاه:
              </Text>{' '}
              {scoringSystem.clubName}
            </Text>
          )}
          {scoringSystem.calculationPeriodFA && (
            <Text size="sm" c={rallyColors.yellow}>
              {scoringSystem.calculationPeriodFA}
            </Text>
          )}
          {scoringSystem.maxLoan && (
            <Text fw={700} c={rallyColors.textPrimary}>
              حداکثر وام: {scoringSystem.maxLoan}
            </Text>
          )}
        </Stack>
      </Box>
    </>
  );
});
