import { memo } from 'react';
import { Group, Text, Badge, Box } from '@mantine/core';
import rallyColors from '../../../../theme/rallyColors';
import type { LoanType } from '@/types';

interface LoanDetailHeaderProps {
  loan: LoanType;
  bankNameFA?: string;
  hasGuarantor: boolean;
}

export const LoanDetailHeader = memo(function LoanDetailHeader({
  loan,
  bankNameFA,
  hasGuarantor,
}: LoanDetailHeaderProps) {
  return (
    <Box
      p="md"
      style={{
        background: `linear-gradient(to left, rgba(16,185,129,0.1), ${rallyColors.card})`,
        borderBottom: `1px solid ${rallyColors.glassBorder}`,
      }}
    >
      <Group justify="space-between" align="flex-start">
        <div>
          <Text size="xl" fw={700} c={rallyColors.textPrimary}>
            {loan.nameFA}
          </Text>
          {loan.nameEN && (
            <Text size="sm" c={rallyColors.textDimmed} mt={4}>
              {loan.nameEN}
            </Text>
          )}
          {bankNameFA && (
            <Text size="sm" c={rallyColors.green} mt={4}>
              {bankNameFA}
            </Text>
          )}
        </div>
        <Group gap="xs">
          {!hasGuarantor && (
            <Badge color="teal" variant="light">
              بدون ضامن
            </Badge>
          )}
          {loan.category && (
            <Badge color="blue" variant="light">
              {loan.categoryFA || loan.category}
            </Badge>
          )}
          {loan.targetAudienceFA && (
            <Badge color="grape" variant="light">
              {loan.targetAudienceFA}
            </Badge>
          )}
        </Group>
      </Group>
    </Box>
  );
});
