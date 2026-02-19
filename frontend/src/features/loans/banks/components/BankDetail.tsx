/**
 * Bank Detail Component (Refactored)
 * Main container that composes all bank detail sub-components
 */

import { Link } from 'react-router-dom';
import { Stack, Card, Group, Text, Box, Anchor } from '@mantine/core';
import { IconArrowLeft, IconInfoCircle, IconHome } from '@tabler/icons-react';
import { useBank, useBankLoans } from '@/hooks/loans';
import { LoadingPage, Empty, Breadcrumb } from '@/components/loans/ui';
import { BankHeader } from './BankHeader';
import { BankScoringSystem } from './BankScoringSystem';
import { BankCalculatorExamples } from './BankCalculatorExamples';
import { BankCoefficientTables } from './BankCoefficientTables';
import { BankStepSystem } from './BankStepSystem';
import { BankMainProgram } from './BankMainProgram';
import { BankRequirementsSection } from './BankRequirementsSection';
import { BankLoansSection } from './BankLoansSection';
import rallyColors from '../../../../theme/rallyColors';

interface BankDetailProps {
  bankId: string;
}

export function BankDetailView({ bankId }: BankDetailProps) {
  const { data: bank, isLoading: bankLoading } = useBank(bankId);
  const { data: loans, isLoading: loansLoading } = useBankLoans(bankId);

  if (bankLoading || loansLoading) {
    return <LoadingPage />;
  }

  if (!bank) {
    return (
      <Empty
        title="بانک یافت نشد"
        description="بانک مورد نظر در سیستم موجود نیست"
        action={
          <Anchor component={Link} to="/loans/banks" c={rallyColors.blue}>
            بازگشت به لیست بانک‌ها
          </Anchor>
        }
      />
    );
  }

  const isDigital = bank.category === 'digital-banks';

  return (
    <Stack gap="lg">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: 'خانه', href: '/loans', icon: IconHome },
          { label: 'بانک‌ها', href: '/loans/banks' },
          { label: bank.nameFA },
        ]}
      />

      {/* Back link */}
      <Anchor
        component={Link}
        to="/loans/banks"
        underline="never"
        c={rallyColors.textSecondary}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
      >
        <IconArrowLeft size={16} />
        <span>بازگشت به لیست بانک‌ها</span>
      </Anchor>

      {/* Bank Header */}
      <Card withBorder radius="md">
        <BankHeader bank={bank} isDigital={isDigital} />

        {/* Description */}
        {bank.descriptionFA && (
          <Box
            mt="md"
            pt="md"
            style={{ borderTop: `1px solid ${rallyColors.border}` }}
          >
            <Text c={rallyColors.textSecondary} style={{ lineHeight: 1.8 }}>
              {bank.descriptionFA}
            </Text>
          </Box>
        )}
      </Card>

      {/* Scoring System */}
      {bank.scoringSystem && (
        <Card withBorder radius="md">
          <BankScoringSystem scoringSystem={bank.scoringSystem} />
        </Card>
      )}

      {/* Loan Calculator Examples */}
      {bank.loanCalculatorExamples && bank.loanCalculatorExamples.length > 0 && (
        <Card withBorder radius="md">
          <BankCalculatorExamples examples={bank.loanCalculatorExamples} />
        </Card>
      )}

      {/* Coefficient Tables (includes Vamino tables) */}
      <BankCoefficientTables bank={bank} />

      {/* Step System (Hi Bank style) */}
      {bank.stepSystem && (
        <Card withBorder radius="md">
          <BankStepSystem stepSystem={bank.stepSystem} />
        </Card>
      )}

      {/* Main Program (Bank Iran Zamin style) */}
      {bank.mainProgram && (
        <Card withBorder radius="md">
          <BankMainProgram mainProgram={bank.mainProgram} />
        </Card>
      )}

      {/* Requirements Section (Guarantor, Credit Rating, Process, General) */}
      <BankRequirementsSection bank={bank} />

      {/* Important Note */}
      {(bank.importantNote || bank.note) && (
        <Box
          style={{
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            padding: 16,
            borderRadius: 8,
          }}
        >
          <Group gap="xs" align="flex-start" wrap="nowrap">
            <IconInfoCircle
              size={20}
              color={rallyColors.yellow}
              style={{ flexShrink: 0, marginTop: 2 }}
            />
            <Text c={rallyColors.yellow}>
              {bank.importantNote || bank.note}
            </Text>
          </Group>
        </Box>
      )}

      {/* Loans Section */}
      <BankLoansSection loans={loans} />
    </Stack>
  );
}

export default BankDetailView;
