import { memo } from 'react';
import { Group, Text, List, Box, Badge, Stack, Center } from '@mantine/core';
import { IconListCheck, IconFileText, IconAlertCircle, IconCircleCheck } from '@tabler/icons-react';
import rallyColors from '../../../../theme/rallyColors';
import type { LoanType } from '@/types';

interface LoanRequirementsSectionProps {
  loan: LoanType;
}

export const LoanRequirementsSection = memo(function LoanRequirementsSection({
  loan,
}: LoanRequirementsSectionProps) {
  const hasRequirements = loan.requirements && loan.requirements.length > 0;
  const hasEligibility = loan.eligibilityRequirements && loan.eligibilityRequirements.length > 0;
  const hasFinancialBehavior = loan.financialBehaviorFactors && loan.financialBehaviorFactors.length > 0;
  const hasCreditCheckSystems = loan.creditCheckSystems && loan.creditCheckSystems.length > 0;
  const hasProcessingTime = !!loan.processingTime;

  if (!hasRequirements && !hasEligibility && !hasFinancialBehavior && !hasCreditCheckSystems && !hasProcessingTime) {
    return null;
  }

  return (
    <>
      {hasRequirements && (
        <div>
          <Group gap={8} mb="sm">
            <IconListCheck size={20} color={rallyColors.textSecondary} />
            <Text fw={500} c={rallyColors.textSecondary}>شرایط دریافت</Text>
          </Group>
          <List spacing="xs" size="sm" c={rallyColors.textSecondary}>
            {loan.requirements!.map((req, idx) => (
              <List.Item
                key={idx}
                icon={<IconCircleCheck size={16} color={rallyColors.primary} />}
              >
                {req}
              </List.Item>
            ))}
          </List>
        </div>
      )}

      {hasEligibility && (
        <div>
          <Group gap={8} mb="sm">
            <IconFileText size={20} color={rallyColors.textSecondary} />
            <Text fw={500} c={rallyColors.textSecondary}>شرایط واجدین شرایط</Text>
          </Group>
          <List spacing="xs" size="sm" c={rallyColors.textSecondary}>
            {loan.eligibilityRequirements!.map((req, idx) => (
              <List.Item
                key={idx}
                icon={<IconCircleCheck size={16} color={rallyColors.primary} />}
              >
                {req}
              </List.Item>
            ))}
          </List>
        </div>
      )}

      {hasFinancialBehavior && (
        <Box
          p="md"
          style={{
            backgroundColor: rallyColors.elevated,
            borderRadius: 8,
          }}
        >
          <Group gap={8} mb="sm">
            <IconAlertCircle size={20} color={rallyColors.textSecondary} />
            <Text fw={500} c={rallyColors.textSecondary}>عوامل موثر در رفتار مالی</Text>
          </Group>
          <Stack gap="xs">
            {loan.financialBehaviorFactors!.map((factor, idx) => (
              <Group key={idx} gap={6} align="flex-start">
                <Text c={rallyColors.textDimmed}>•</Text>
                <Text size="sm" c={rallyColors.textSecondary}>{factor}</Text>
              </Group>
            ))}
          </Stack>
          {loan.monthlyAssessment && (
            <Text
              size="xs"
              c={rallyColors.textDimmed}
              mt="sm"
              pt="sm"
              style={{ borderTop: `1px solid ${rallyColors.glassBorder}` }}
            >
              {loan.monthlyAssessment}
            </Text>
          )}
        </Box>
      )}

      {hasCreditCheckSystems && (
        <div>
          <Group gap={8} mb="sm">
            <IconFileText size={20} color={rallyColors.textSecondary} />
            <Text fw={500} c={rallyColors.textSecondary}>سامانه‌های استعلام</Text>
          </Group>
          <Group gap="xs" wrap="wrap">
            {loan.creditCheckSystems!.map((system, idx) => (
              <Badge key={idx} color="rally-green" variant="light" size="sm" radius="xl">
                {system}
              </Badge>
            ))}
          </Group>
        </div>
      )}

      {hasProcessingTime && (
        <Center>
          <Box
            p="sm"
            style={{
              backgroundColor: rallyColors.elevated,
              borderRadius: 8,
              textAlign: 'center',
            }}
          >
            <Text size="sm" c={rallyColors.textDimmed} span>زمان پردازش: </Text>
            <Text fw={700} c={rallyColors.textPrimary} span>{loan.processingTime}</Text>
          </Box>
        </Center>
      )}
    </>
  );
});
