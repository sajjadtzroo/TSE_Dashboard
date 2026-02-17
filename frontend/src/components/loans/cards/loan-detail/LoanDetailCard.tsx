import { Card, Stack, Text, Box } from '@mantine/core';
import rallyColors from '../../../../theme/rallyColors';
import type { LoanType } from '@/types';
import { LoanDetailHeader } from './LoanDetailHeader';
import { LoanKeyInfoGrid } from './LoanKeyInfoGrid';
import { LoanFinancialInfo } from './LoanFinancialInfo';
import { LoanOptionsSection } from './LoanOptionsSection';
import { LoanGuarantorSection } from './LoanGuarantorSection';
import { LoanCoefficientTable } from './LoanCoefficientTable';
import { LoanRequirementsSection } from './LoanRequirementsSection';

interface LoanDetailCardProps {
  loan: LoanType;
  bankNameFA?: string;
}

export function LoanDetailCard({ loan, bankNameFA }: LoanDetailCardProps) {
  const hasGuarantor = loan.guarantor !== false;

  return (
    <Card
      padding={0}
      radius="md"
      style={{
        backgroundColor: rallyColors.glassBg,
        border: `1px solid ${rallyColors.glassBorder}`,
        backdropFilter: 'blur(12px)',
        overflow: 'hidden',
      }}
    >
      <LoanDetailHeader
        loan={loan}
        bankNameFA={bankNameFA}
        hasGuarantor={hasGuarantor}
      />

      <Stack gap="lg" p="md">
        {(loan.descriptionFA || loan.description) && (
          <Box
            p="sm"
            style={{
              backgroundColor: rallyColors.elevated,
              borderRadius: 8,
            }}
          >
            <Text size="sm" c={rallyColors.textSecondary} lh={1.8}>
              {loan.descriptionFA || loan.description}
            </Text>
          </Box>
        )}

        <LoanKeyInfoGrid loan={loan} hasGuarantor={hasGuarantor} />
        <LoanFinancialInfo loan={loan} />
        <LoanOptionsSection loan={loan} />
        <LoanGuarantorSection loan={loan} />
        <LoanCoefficientTable loan={loan} />
        <LoanRequirementsSection loan={loan} />
      </Stack>
    </Card>
  );
}

export default LoanDetailCard;
