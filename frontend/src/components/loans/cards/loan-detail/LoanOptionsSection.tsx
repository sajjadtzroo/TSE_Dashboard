import { memo } from 'react';
import { Group, Text, Box, Stack } from '@mantine/core';
import { IconStack2 } from '@tabler/icons-react';
import rallyColors from '../../../../theme/rallyColors';
import type { LoanType } from '@/types';

interface LoanOptionsSectionProps {
  loan: LoanType;
}

export const LoanOptionsSection = memo(function LoanOptionsSection({
  loan,
}: LoanOptionsSectionProps) {
  const hasLoanOptions = loan.loanOptions && loan.loanOptions.length > 0;
  const hasStepSystem = !!loan.stepSystem;

  if (!hasLoanOptions && !hasStepSystem) {
    return null;
  }

  return (
    <>
      {hasLoanOptions && (
        <div>
          <Group gap={8} mb="sm">
            <IconStack2 size={20} color={rallyColors.textSecondary} />
            <Text fw={500} c={rallyColors.textSecondary}>گزینه‌های وام</Text>
          </Group>
          <Stack gap="sm">
            {loan.loanOptions!.map((option, idx) => (
              <Box
                key={idx}
                p="sm"
                style={{
                  backgroundColor: rallyColors.elevated,
                  borderRadius: 8,
                  border: `1px solid ${rallyColors.glassBorder}`,
                }}
              >
                {(option.name || option.nameFA) && (
                  <Text fw={500} c={rallyColors.textPrimary} mb="xs">
                    {option.nameFA || option.name}
                  </Text>
                )}
                <Group gap="lg" wrap="wrap">
                  {option.amount && (
                    <Text size="sm">
                      <Text span c={rallyColors.textDimmed}>مبلغ: </Text>
                      <Text span c={rallyColors.textSecondary}>{option.amountFA || option.amount}</Text>
                    </Text>
                  )}
                  {option.interestRate && (
                    <Text size="sm">
                      <Text span c={rallyColors.textDimmed}>نرخ سود: </Text>
                      <Text span c={rallyColors.textSecondary}>{option.interestRate}</Text>
                    </Text>
                  )}
                  {option.repaymentPeriod && (
                    <Text size="sm">
                      <Text span c={rallyColors.textDimmed}>بازپرداخت: </Text>
                      <Text span c={rallyColors.textSecondary}>{option.repaymentPeriod}</Text>
                    </Text>
                  )}
                  {option.fee && (
                    <Text size="sm">
                      <Text span c={rallyColors.textDimmed}>کارمزد: </Text>
                      <Text span c={rallyColors.textSecondary}>{option.fee}</Text>
                    </Text>
                  )}
                </Group>
              </Box>
            ))}
          </Stack>
        </div>
      )}

      {hasStepSystem && (
        <div>
          <Group gap={8} mb="sm">
            <IconStack2 size={20} color={rallyColors.textSecondary} />
            <Text fw={500} c={rallyColors.textSecondary}>سیستم پلکانی</Text>
          </Group>
          {loan.stepSystem!.descriptionFA && (
            <Text size="sm" c={rallyColors.textDimmed} mb="sm">
              {loan.stepSystem!.descriptionFA}
            </Text>
          )}
          <Stack gap="xs">
            {loan.stepSystem!.tiers.map((tier, idx) => (
              <Box
                key={idx}
                p="sm"
                style={{
                  background: `linear-gradient(to left, rgba(16,185,129,0.1), ${rallyColors.card})`,
                  borderRadius: 8,
                  borderInlineEnd: `4px solid ${rallyColors.green}`,
                }}
              >
                <Text fw={500} c={rallyColors.textPrimary}>
                  {tier.nameFA || tier.name}
                </Text>
                <Group gap="lg" wrap="wrap" mt={4}>
                  {tier.amount && (
                    <Text size="sm">
                      <Text span c={rallyColors.textDimmed}>مبلغ: </Text>
                      <Text span c={rallyColors.textSecondary}>{tier.amountFA || tier.amount}</Text>
                    </Text>
                  )}
                  {tier.interestRate && (
                    <Text size="sm">
                      <Text span c={rallyColors.textDimmed}>نرخ: </Text>
                      <Text span c={rallyColors.textSecondary}>{tier.interestRate}</Text>
                    </Text>
                  )}
                  {tier.timeToUnlock && (
                    <Text size="sm">
                      <Text span c={rallyColors.textDimmed}>زمان باز شدن: </Text>
                      <Text span c={rallyColors.textSecondary}>{tier.timeToUnlock}</Text>
                    </Text>
                  )}
                </Group>
                {tier.requirementFA && (
                  <Text size="xs" c={rallyColors.textDimmed} mt={4}>
                    {tier.requirementFA}
                  </Text>
                )}
              </Box>
            ))}
          </Stack>
        </div>
      )}
    </>
  );
});
