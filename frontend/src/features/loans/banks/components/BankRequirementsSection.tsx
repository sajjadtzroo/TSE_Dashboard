/**
 * Bank Requirements Section Component
 * Displays guarantor requirements, credit rating, process steps, and general requirements
 */

import { memo } from 'react';
import {
  Card,
  Group,
  SimpleGrid,
  Title,
  Text,
  Badge,
  Box,
  Table,
} from '@mantine/core';
import {
  IconUserCheck,
  IconShield,
  IconFileText,
  IconInfoCircle,
  IconCircleCheck,
} from '@tabler/icons-react';
import rallyColors from '../../../../theme/rallyColors';
import type { Bank } from '@/types';

interface BankRequirementsSectionProps {
  bank: Bank;
}

export const BankRequirementsSection = memo(function BankRequirementsSection({
  bank,
}: BankRequirementsSectionProps) {
  const hasGuarantorRequirements = !!bank.guarantorRequirements;
  const hasCreditRatingRequirements = !!bank.creditRatingRequirements;
  const hasProcess = bank.process && bank.process.length > 0;
  const hasGeneralRequirements =
    bank.requirements || bank.generalRequirements || bank.generalFeatures;

  if (
    !hasGuarantorRequirements &&
    !hasCreditRatingRequirements &&
    !hasProcess &&
    !hasGeneralRequirements
  ) {
    return null;
  }

  return (
    <>
      {/* Guarantor Requirements (Bank-level) */}
      {hasGuarantorRequirements && (
        <Card withBorder radius="md">
          <Group gap="xs" mb="md">
            <IconUserCheck size={20} color={rallyColors.yellow} />
            <Title order={4} c={rallyColors.textPrimary}>
              جدول تعداد ضامنین
            </Title>
          </Group>
          <Box style={{ overflowX: 'auto' }}>
            <Table striped={false} withTableBorder={false} fz="sm">
              <Table.Thead>
                <Table.Tr style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)' }}>
                  <Table.Th style={{ textAlign: 'right', color: rallyColors.yellow, padding: '8px 16px' }}>
                    سقف مبلغ
                  </Table.Th>
                  <Table.Th style={{ textAlign: 'right', color: rallyColors.yellow, padding: '8px 16px' }}>
                    تعداد ضامن
                  </Table.Th>
                  <Table.Th style={{ textAlign: 'right', color: rallyColors.yellow, padding: '8px 16px' }}>
                    توضیحات
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {bank.guarantorRequirements!.upTo300M && (
                  <Table.Tr style={{ backgroundColor: rallyColors.card }}>
                    <Table.Td style={{ padding: '8px 16px', color: rallyColors.textSecondary }}>
                      تا ۳۰۰ میلیون تومان
                    </Table.Td>
                    <Table.Td style={{ padding: '8px 16px', fontWeight: 700, color: rallyColors.yellow }}>
                      {bank.guarantorRequirements!.upTo300M.guarantors} نفر
                    </Table.Td>
                    <Table.Td style={{ padding: '8px 16px', color: rallyColors.textDimmed }}>
                      {bank.guarantorRequirements!.upTo300M.descriptionFA || '-'}
                    </Table.Td>
                  </Table.Tr>
                )}
                {bank.guarantorRequirements!['300Mto500M'] && (
                  <Table.Tr style={{ backgroundColor: 'rgba(245, 158, 11, 0.05)' }}>
                    <Table.Td style={{ padding: '8px 16px', color: rallyColors.textSecondary }}>
                      ۳۰۰ تا ۵۰۰ میلیون تومان
                    </Table.Td>
                    <Table.Td style={{ padding: '8px 16px', fontWeight: 700, color: rallyColors.yellow }}>
                      {bank.guarantorRequirements!['300Mto500M'].guarantors} نفر
                    </Table.Td>
                    <Table.Td style={{ padding: '8px 16px', color: rallyColors.textDimmed }}>
                      {bank.guarantorRequirements!['300Mto500M'].descriptionFA || '-'}
                    </Table.Td>
                  </Table.Tr>
                )}
                {bank.guarantorRequirements!['500Mto1B'] && (
                  <Table.Tr style={{ backgroundColor: rallyColors.card }}>
                    <Table.Td style={{ padding: '8px 16px', color: rallyColors.textSecondary }}>
                      ۵۰۰ میلیون تا ۱ میلیارد تومان
                    </Table.Td>
                    <Table.Td style={{ padding: '8px 16px', fontWeight: 700, color: rallyColors.yellow }}>
                      {bank.guarantorRequirements!['500Mto1B'].guarantors} نفر
                    </Table.Td>
                    <Table.Td style={{ padding: '8px 16px', color: rallyColors.textDimmed }}>
                      {bank.guarantorRequirements!['500Mto1B'].descriptionFA || '-'}
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Box>
          {bank.guarantorRequirements!.additionalGuarantee && (
            <Box
              mt="sm"
              style={{
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                padding: 12,
                borderRadius: 8,
              }}
            >
              <Text size="sm" c={rallyColors.yellow}>
                {bank.guarantorRequirements!.additionalGuarantee}
              </Text>
            </Box>
          )}
        </Card>
      )}

      {/* Credit Rating Requirements (Bank-level) */}
      {hasCreditRatingRequirements && (
        <Card withBorder radius="md">
          <Group gap="xs" mb="md">
            <IconShield size={20} color={rallyColors.blue} />
            <Title order={4} c={rallyColors.textPrimary}>
              شرایط بر اساس رتبه اعتباری
            </Title>
          </Group>
          <Box style={{ overflowX: 'auto' }}>
            <Table striped={false} withTableBorder={false} fz="sm">
              <Table.Thead>
                <Table.Tr style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)' }}>
                  <Table.Th style={{ textAlign: 'right', color: rallyColors.blue, padding: '8px 16px' }}>
                    رتبه اعتباری
                  </Table.Th>
                  <Table.Th style={{ textAlign: 'right', color: rallyColors.blue, padding: '8px 16px' }}>
                    سقف وام
                  </Table.Th>
                  <Table.Th style={{ textAlign: 'right', color: rallyColors.blue, padding: '8px 16px' }}>
                    شرایط ضامن
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {bank.creditRatingRequirements!.ratingA && (
                  <Table.Tr style={{ backgroundColor: rallyColors.card }}>
                    <Table.Td style={{ padding: '8px 16px' }}>
                      <Badge color="green" variant="light">رتبه A</Badge>
                    </Table.Td>
                    <Table.Td style={{ padding: '8px 16px', color: rallyColors.textSecondary }}>
                      {bank.creditRatingRequirements!.ratingA.maxLoanFA ||
                        bank.creditRatingRequirements!.ratingA.maxLoan ||
                        '-'}
                    </Table.Td>
                    <Table.Td style={{ padding: '8px 16px', color: rallyColors.textDimmed }}>
                      {bank.creditRatingRequirements!.ratingA.guarantorRequirement || '-'}
                    </Table.Td>
                  </Table.Tr>
                )}
                {bank.creditRatingRequirements!.ratingB && (
                  <Table.Tr style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)' }}>
                    <Table.Td style={{ padding: '8px 16px' }}>
                      <Badge color="blue" variant="light">رتبه B</Badge>
                    </Table.Td>
                    <Table.Td style={{ padding: '8px 16px', color: rallyColors.textSecondary }}>
                      {bank.creditRatingRequirements!.ratingB.maxLoanFA ||
                        bank.creditRatingRequirements!.ratingB.maxLoan ||
                        '-'}
                    </Table.Td>
                    <Table.Td style={{ padding: '8px 16px', color: rallyColors.textDimmed }}>
                      {bank.creditRatingRequirements!.ratingB.guarantorRequirement || '-'}
                    </Table.Td>
                  </Table.Tr>
                )}
                {bank.creditRatingRequirements!.ratingCandD && (
                  <Table.Tr style={{ backgroundColor: rallyColors.card }}>
                    <Table.Td style={{ padding: '8px 16px' }}>
                      <Badge color="yellow" variant="light">رتبه C و D</Badge>
                    </Table.Td>
                    <Table.Td style={{ padding: '8px 16px', color: rallyColors.textSecondary }}>
                      {bank.creditRatingRequirements!.ratingCandD.maxLoanFA ||
                        bank.creditRatingRequirements!.ratingCandD.maxLoan ||
                        '-'}
                    </Table.Td>
                    <Table.Td style={{ padding: '8px 16px', color: rallyColors.textDimmed }}>
                      {bank.creditRatingRequirements!.ratingCandD.guarantorRequirement || '-'}
                    </Table.Td>
                  </Table.Tr>
                )}
                {bank.creditRatingRequirements!.ratingE && (
                  <Table.Tr style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)' }}>
                    <Table.Td style={{ padding: '8px 16px' }}>
                      <Badge color="red" variant="light">رتبه E</Badge>
                    </Table.Td>
                    <Table.Td style={{ padding: '8px 16px', color: rallyColors.textSecondary }}>
                      {bank.creditRatingRequirements!.ratingE.maxLoanFA ||
                        bank.creditRatingRequirements!.ratingE.maxLoan ||
                        '-'}
                    </Table.Td>
                    <Table.Td style={{ padding: '8px 16px', color: rallyColors.textDimmed }}>
                      {bank.creditRatingRequirements!.ratingE.guarantorRequirement || '-'}
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Box>
        </Card>
      )}

      {/* Process Steps */}
      {hasProcess && (
        <Card withBorder radius="md">
          <Group gap="xs" mb="md">
            <IconFileText size={20} color={rallyColors.blue} />
            <Title order={4} c={rallyColors.textPrimary}>
              مراحل دریافت وام
            </Title>
          </Group>
          <Box component="ol" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {bank.process!.map((step, idx) => (
              <Group key={idx} gap="sm" align="flex-start" mb="sm" wrap="nowrap">
                <Box
                  style={{
                    flexShrink: 0,
                    width: 24,
                    height: 24,
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    color: rallyColors.blue,
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
                <Text c={rallyColors.textSecondary}>{step}</Text>
              </Group>
            ))}
          </Box>
        </Card>
      )}

      {/* General Requirements */}
      {hasGeneralRequirements && (
        <Card withBorder radius="md">
          <Group gap="xs" mb="md">
            <IconInfoCircle size={20} color={rallyColors.textDimmed} />
            <Title order={4} c={rallyColors.textPrimary}>
              شرایط و ویژگی‌های عمومی
            </Title>
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
            {bank.requirements?.guarantorFA && (
              <Group
                gap="xs"
                wrap="nowrap"
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  padding: 12,
                  borderRadius: 8,
                }}
              >
                <IconCircleCheck size={20} color={rallyColors.green} style={{ flexShrink: 0 }} />
                <Text c={rallyColors.green} size="sm">{bank.requirements.guarantorFA}</Text>
              </Group>
            )}
            {bank.requirements?.checkFA && (
              <Group
                gap="xs"
                wrap="nowrap"
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  padding: 12,
                  borderRadius: 8,
                }}
              >
                <IconCircleCheck size={20} color={rallyColors.green} style={{ flexShrink: 0 }} />
                <Text c={rallyColors.green} size="sm">{bank.requirements.checkFA}</Text>
              </Group>
            )}
            {bank.requirements?.promissoryNoteFA && (
              <Group
                gap="xs"
                wrap="nowrap"
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  padding: 12,
                  borderRadius: 8,
                }}
              >
                <IconCircleCheck size={20} color={rallyColors.green} style={{ flexShrink: 0 }} />
                <Text c={rallyColors.green} size="sm">{bank.requirements.promissoryNoteFA}</Text>
              </Group>
            )}
            {bank.requirements?.onlineCreditCheckFA && (
              <Group
                gap="xs"
                wrap="nowrap"
                style={{
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  padding: 12,
                  borderRadius: 8,
                }}
              >
                <IconInfoCircle size={20} color={rallyColors.blue} style={{ flexShrink: 0 }} />
                <Text c={rallyColors.blue} size="sm">{bank.requirements.onlineCreditCheckFA}</Text>
              </Group>
            )}
            {bank.requirements?.noBadChecksFA && (
              <Group
                gap="xs"
                wrap="nowrap"
                style={{
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  padding: 12,
                  borderRadius: 8,
                }}
              >
                <IconInfoCircle size={20} color={rallyColors.yellow} style={{ flexShrink: 0 }} />
                <Text c={rallyColors.yellow} size="sm">{bank.requirements.noBadChecksFA}</Text>
              </Group>
            )}
            {bank.requirements?.noOverduePaymentsFA && (
              <Group
                gap="xs"
                wrap="nowrap"
                style={{
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  padding: 12,
                  borderRadius: 8,
                }}
              >
                <IconInfoCircle size={20} color={rallyColors.yellow} style={{ flexShrink: 0 }} />
                <Text c={rallyColors.yellow} size="sm">{bank.requirements.noOverduePaymentsFA}</Text>
              </Group>
            )}
            {bank.requirements?.moneyNotBlockedFA && (
              <Group
                gap="xs"
                wrap="nowrap"
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  padding: 12,
                  borderRadius: 8,
                }}
              >
                <IconCircleCheck size={20} color={rallyColors.green} style={{ flexShrink: 0 }} />
                <Text c={rallyColors.green} size="sm">{bank.requirements.moneyNotBlockedFA}</Text>
              </Group>
            )}
            {bank.features?.earlyRepaymentBenefitFA && (
              <Group
                gap="xs"
                wrap="nowrap"
                style={{
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  padding: 12,
                  borderRadius: 8,
                }}
              >
                <IconInfoCircle size={20} color={rallyColors.blue} style={{ flexShrink: 0 }} />
                <Text c={rallyColors.blue} size="sm">{bank.features.earlyRepaymentBenefitFA}</Text>
              </Group>
            )}
            {bank.features?.zeroInterestOneMonthFA && (
              <Group
                gap="xs"
                wrap="nowrap"
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  padding: 12,
                  borderRadius: 8,
                }}
              >
                <IconCircleCheck size={20} color={rallyColors.green} style={{ flexShrink: 0 }} />
                <Text c={rallyColors.green} size="sm">{bank.features.zeroInterestOneMonthFA}</Text>
              </Group>
            )}
            {bank.features?.depositSpeedFA && (
              <Group
                gap="xs"
                wrap="nowrap"
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  padding: 12,
                  borderRadius: 8,
                }}
              >
                <IconInfoCircle size={20} color={rallyColors.green} style={{ flexShrink: 0 }} />
                <Text c={rallyColors.green} size="sm">{bank.features.depositSpeedFA}</Text>
              </Group>
            )}
            {bank.generalFeatures?.fullyOnlineFA && (
              <Group
                gap="xs"
                wrap="nowrap"
                style={{
                  backgroundColor: 'rgba(139, 92, 246, 0.1)',
                  border: '1px solid rgba(139, 92, 246, 0.25)',
                  padding: 12,
                  borderRadius: 8,
                }}
              >
                <IconCircleCheck size={20} color={rallyColors.purple} style={{ flexShrink: 0 }} />
                <Text c={rallyColors.purple} size="sm">{bank.generalFeatures.fullyOnlineFA}</Text>
              </Group>
            )}
          </SimpleGrid>
        </Card>
      )}
    </>
  );
});
