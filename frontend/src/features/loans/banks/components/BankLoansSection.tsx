/**
 * Bank Loans Section Component
 * Displays the loans section with loan detail cards
 */

import { memo } from 'react';
import { Stack, Group, Title } from '@mantine/core';
import { IconCreditCard } from '@tabler/icons-react';
import { Empty } from '@/components/loans/ui';
import { LoanDetailCard } from '@/components/loans/cards';
import rallyColors from '../../../../theme/rallyColors';
import type { LoanType } from '@/types';

interface BankLoansSectionProps {
  loans?: LoanType[];
}

export const BankLoansSection = memo(function BankLoansSection({
  loans,
}: BankLoansSectionProps) {
  return (
    <div>
      <Group gap="xs" mb="md">
        <IconCreditCard size={24} color={rallyColors.blue} />
        <Title order={3} c={rallyColors.textPrimary}>
          محصولات وام ({loans?.length || 0})
        </Title>
      </Group>

      {loans?.length === 0 ? (
        <Empty title="محصول وامی یافت نشد" />
      ) : (
        <Stack gap="lg">
          {loans?.map((loan) => (
            <LoanDetailCard key={loan.id} loan={loan} />
          ))}
        </Stack>
      )}
    </div>
  );
});
