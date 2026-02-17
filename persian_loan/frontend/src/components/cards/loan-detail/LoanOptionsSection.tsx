import { memo } from 'react';
import { Group, Text, Box, Stack } from '@mantine/core';
import { IconLayers } from '@tabler/icons-react';
import rallyColors from '../../../theme/rallyColors';
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
            <IconLayers size={20} color={rallyColors.TEXT_SECONDARY} />
            <Text fw={500} c={rallyColors.TEXT_SECONDARY}>گزینه‌های وام</Text>
          </Group>
          <Stack gap="sm">
            {loan.loanOptions!.map((option, idx) => (
              <Box
                key={idx}
                p="sm"
                style={{
                  backgroundColor: rallyColors.BG_ELEVATED,
                  borderRadius: 8,
                  border: `1px solid ${rallyColors.GLASS_BORDER}`,
                }}
              >
                {(option.name || option.nameFA) && (
                  <Text fw={500} c={rallyColors.TEXT_PRIMARY} mb="xs">
                    {option.nameFA || option.name}
                  </Text>
                )}
                <Group gap="lg" wrap="wrap">
                  {option.amount && (
                    <Text size="sm">
                      <Text span c={rallyColors.TEXT_DIMMED}>مبلغ: </Text>
                      <Text span c={rallyColors.TEXT_SECONDARY}>{option.amountFA || option.amount}</Text>
                    </Text>
                  )}
                  {option.interestRate && (
                    <Text size="sm">
                      <Text span c={rallyColors.TEXT_DIMMED}>نرخ سود: </Text>
                      <Text span c={rallyColors.TEXT_SECONDARY}>{option.interestRate}</Text>
                    </Text>
                  )}
                  {option.repaymentPeriod && (
                    <Text size="sm">
                      <Text span c={rallyColors.TEXT_DIMMED}>بازپرداخت: </Text>
                      <Text span c={rallyColors.TEXT_SECONDARY}>{option.repaymentPeriod}</Text>
                    </Text>
                  )}
                  {option.fee && (
                    <Text size="sm">
                      <Text span c={rallyColors.TEXT_DIMMED}>کارمزد: </Text>
                      <Text span c={rallyColors.TEXT_SECONDARY}>{option.fee}</Text>
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
            <IconLayers size={20} color={rallyColors.TEXT_SECONDARY} />
            <Text fw={500} c={rallyColors.TEXT_SECONDARY}>سیستم پلکانی</Text>
          </Group>
          {loan.stepSystem!.descriptionFA && (
            <Text size="sm" c={rallyColors.TEXT_DIMMED} mb="sm">
              {loan.stepSystem!.descriptionFA}
            </Text>
          )}
          <Stack gap="xs">
            {loan.stepSystem!.tiers.map((tier, idx) => (
              <Box
                key={idx}
                p="sm"
                style={{
                  background: `linear-gradient(to left, rgba(16,185,129,0.1), ${rallyColors.BG_CARD})`,
                  borderRadius: 8,
                  borderInlineEnd: `4px solid ${rallyColors.RALLY_GREEN}`,
                }}
              >
                <Text fw={500} c={rallyColors.TEXT_PRIMARY}>
                  {tier.nameFA || tier.name}
                </Text>
                <Group gap="lg" wrap="wrap" mt={4}>
                  {tier.amount && (
                    <Text size="sm">
                      <Text span c={rallyColors.TEXT_DIMMED}>مبلغ: </Text>
                      <Text span c={rallyColors.TEXT_SECONDARY}>{tier.amountFA || tier.amount}</Text>
                    </Text>
                  )}
                  {tier.interestRate && (
                    <Text size="sm">
                      <Text span c={rallyColors.TEXT_DIMMED}>نرخ: </Text>
                      <Text span c={rallyColors.TEXT_SECONDARY}>{tier.interestRate}</Text>
                    </Text>
                  )}
                  {tier.timeToUnlock && (
                    <Text size="sm">
                      <Text span c={rallyColors.TEXT_DIMMED}>زمان باز شدن: </Text>
                      <Text span c={rallyColors.TEXT_SECONDARY}>{tier.timeToUnlock}</Text>
                    </Text>
                  )}
                </Group>
                {tier.requirementFA && (
                  <Text size="xs" c={rallyColors.TEXT_DIMMED} mt={4}>
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
