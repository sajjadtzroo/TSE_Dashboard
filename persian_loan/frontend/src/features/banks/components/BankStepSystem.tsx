/**
 * Bank Step System Component
 * Displays step system with tiers (Hi Bank style)
 */

import { memo } from 'react';
import { Group, Stack, SimpleGrid, Title, Text, Box } from '@mantine/core';
import { IconStack2 } from '@tabler/icons-react';
import rallyColors from '../../../theme/rallyColors';
import type { Bank } from '@/types';

interface BankStepSystemProps {
  stepSystem: Bank['stepSystem'];
}

export const BankStepSystem = memo(function BankStepSystem({
  stepSystem,
}: BankStepSystemProps) {
  if (!stepSystem) {
    return null;
  }

  return (
    <>
      <Group gap="xs" mb="md">
        <IconStack2 size={20} color="#F97316" />
        <Title order={4} c={rallyColors.textPrimary}>
          سیستم پلکانی
        </Title>
      </Group>
      {stepSystem.descriptionFA && (
        <Text c={rallyColors.textSecondary} mb="md">
          {stepSystem.descriptionFA}
        </Text>
      )}
      <Stack gap="sm">
        {stepSystem.tiers?.map((tier, idx) => (
          <Box
            key={idx}
            style={{
              background: `linear-gradient(to left, rgba(249, 115, 22, 0.1), ${rallyColors.card})`,
              padding: 16,
              borderRadius: 8,
              borderRight: '4px solid #F97316',
            }}
          >
            <Group gap="xs" mb="xs">
              <Box
                style={{
                  backgroundColor: '#F97316',
                  color: '#fff',
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                }}
              >
                {idx + 1}
              </Box>
              <Text fw={700} c={rallyColors.textPrimary}>
                {tier.nameFA || tier.name}
              </Text>
            </Group>
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
              {tier.amount && (
                <div>
                  <Text span size="sm" c={rallyColors.textDimmed}>
                    مبلغ:{' '}
                  </Text>
                  <Text span size="sm" fw={500} c={rallyColors.textSecondary}>
                    {tier.amountFA || tier.amount}
                  </Text>
                </div>
              )}
              {tier.interestRate && (
                <div>
                  <Text span size="sm" c={rallyColors.textDimmed}>
                    نرخ سود:{' '}
                  </Text>
                  <Text span size="sm" fw={500} c={rallyColors.textSecondary}>
                    {tier.interestRate}
                  </Text>
                </div>
              )}
              {tier.timeToUnlock && (
                <div>
                  <Text span size="sm" c={rallyColors.textDimmed}>
                    زمان باز شدن:{' '}
                  </Text>
                  <Text span size="sm" fw={500} c={rallyColors.textSecondary}>
                    {tier.timeToUnlock}
                  </Text>
                </div>
              )}
            </SimpleGrid>
            {tier.requirementFA && (
              <Text size="xs" c={rallyColors.textDimmed} mt="xs">
                {tier.requirementFA}
              </Text>
            )}
          </Box>
        ))}
      </Stack>
    </>
  );
});
