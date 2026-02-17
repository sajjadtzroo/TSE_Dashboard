import { memo } from 'react';
import { Group, Text, Badge, Box, Table, ScrollArea } from '@mantine/core';
import { IconUserCheck, IconCreditCard, IconAlertCircle } from '@tabler/icons-react';
import rallyColors from '../../../../theme/rallyColors';
import type { LoanType } from '@/types';

interface LoanGuarantorSectionProps {
  loan: LoanType;
}

export const LoanGuarantorSection = memo(function LoanGuarantorSection({
  loan,
}: LoanGuarantorSectionProps) {
  const hasGuarantorRequirements = !!loan.guarantorRequirements;
  const hasCreditRatingRequirements = !!loan.creditRatingRequirements;
  const hasGuarantorNote = !!loan.guarantorNote;
  const hasCreditRatingRequired = loan.creditRatingRequired && loan.creditRatingRequired.length > 0;

  if (!hasGuarantorRequirements && !hasCreditRatingRequirements && !hasGuarantorNote && !hasCreditRatingRequired) {
    return null;
  }

  return (
    <>
      {hasGuarantorRequirements && (
        <div>
          <Group gap={8} mb="sm">
            <IconUserCheck size={20} color={rallyColors.textSecondary} />
            <Text fw={500} c={rallyColors.textSecondary}>جدول تعداد ضامنین</Text>
          </Group>
          <ScrollArea>
            <Table verticalSpacing="xs" horizontalSpacing="sm" fz="sm">
              <Table.Thead>
                <Table.Tr style={{ borderBottom: `1px solid ${rallyColors.glassBorder}` }}>
                  <Table.Th style={{ color: rallyColors.textSecondary }}>سقف مبلغ</Table.Th>
                  <Table.Th style={{ color: rallyColors.textSecondary }}>تعداد ضامن</Table.Th>
                  <Table.Th style={{ color: rallyColors.textSecondary }}>توضیحات</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {loan.guarantorRequirements!.upTo300M && (
                  <Table.Tr style={{ borderBottom: `1px solid ${rallyColors.glassBorder}` }}>
                    <Table.Td style={{ color: rallyColors.textSecondary }}>تا ۳۰۰ میلیون</Table.Td>
                    <Table.Td style={{ color: rallyColors.green, fontWeight: 600 }}>
                      {loan.guarantorRequirements!.upTo300M.guarantors} نفر
                    </Table.Td>
                    <Table.Td style={{ color: rallyColors.textDimmed }}>
                      {loan.guarantorRequirements!.upTo300M.descriptionFA || '-'}
                    </Table.Td>
                  </Table.Tr>
                )}
                {loan.guarantorRequirements!['300Mto500M'] && (
                  <Table.Tr style={{ borderBottom: `1px solid ${rallyColors.glassBorder}` }}>
                    <Table.Td style={{ color: rallyColors.textSecondary }}>۳۰۰ تا ۵۰۰ میلیون</Table.Td>
                    <Table.Td style={{ color: rallyColors.green, fontWeight: 600 }}>
                      {loan.guarantorRequirements!['300Mto500M'].guarantors} نفر
                    </Table.Td>
                    <Table.Td style={{ color: rallyColors.textDimmed }}>
                      {loan.guarantorRequirements!['300Mto500M'].descriptionFA || '-'}
                    </Table.Td>
                  </Table.Tr>
                )}
                {loan.guarantorRequirements!['500Mto1B'] && (
                  <Table.Tr style={{ borderBottom: `1px solid ${rallyColors.glassBorder}` }}>
                    <Table.Td style={{ color: rallyColors.textSecondary }}>۵۰۰ میلیون تا ۱ میلیارد</Table.Td>
                    <Table.Td style={{ color: rallyColors.green, fontWeight: 600 }}>
                      {loan.guarantorRequirements!['500Mto1B'].guarantors} نفر
                    </Table.Td>
                    <Table.Td style={{ color: rallyColors.textDimmed }}>
                      {loan.guarantorRequirements!['500Mto1B'].descriptionFA || '-'}
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </ScrollArea>
          {loan.guarantorRequirements!.additionalGuarantee && (
            <Box
              mt="xs"
              p="xs"
              style={{
                backgroundColor: 'rgba(234,179,8,0.1)',
                borderRadius: 6,
                border: '1px solid rgba(234,179,8,0.2)',
              }}
            >
              <Text size="xs" c="#eab308" opacity={0.8}>
                {loan.guarantorRequirements!.additionalGuarantee}
              </Text>
            </Box>
          )}
        </div>
      )}

      {hasCreditRatingRequirements && (
        <div>
          <Group gap={8} mb="sm">
            <IconCreditCard size={20} color={rallyColors.textSecondary} />
            <Text fw={500} c={rallyColors.textSecondary}>شرایط بر اساس رتبه اعتباری</Text>
          </Group>
          <ScrollArea>
            <Table verticalSpacing="xs" horizontalSpacing="sm" fz="sm">
              <Table.Thead>
                <Table.Tr style={{ borderBottom: `1px solid ${rallyColors.glassBorder}` }}>
                  <Table.Th style={{ color: rallyColors.textSecondary }}>رتبه اعتباری</Table.Th>
                  <Table.Th style={{ color: rallyColors.textSecondary }}>سقف وام</Table.Th>
                  <Table.Th style={{ color: rallyColors.textSecondary }}>شرایط ضامن</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {loan.creditRatingRequirements!.ratingA && (
                  <Table.Tr style={{ borderBottom: `1px solid ${rallyColors.glassBorder}` }}>
                    <Table.Td><Badge color="teal" variant="light" size="sm">رتبه A</Badge></Table.Td>
                    <Table.Td style={{ color: rallyColors.textSecondary }}>
                      {loan.creditRatingRequirements!.ratingA.maxLoanFA || loan.creditRatingRequirements!.ratingA.maxLoan || '-'}
                    </Table.Td>
                    <Table.Td style={{ color: rallyColors.textDimmed }}>
                      {loan.creditRatingRequirements!.ratingA.guarantorRequirement || '-'}
                    </Table.Td>
                  </Table.Tr>
                )}
                {loan.creditRatingRequirements!.ratingB && (
                  <Table.Tr style={{ borderBottom: `1px solid ${rallyColors.glassBorder}` }}>
                    <Table.Td><Badge color="blue" variant="light" size="sm">رتبه B</Badge></Table.Td>
                    <Table.Td style={{ color: rallyColors.textSecondary }}>
                      {loan.creditRatingRequirements!.ratingB.maxLoanFA || loan.creditRatingRequirements!.ratingB.maxLoan || '-'}
                    </Table.Td>
                    <Table.Td style={{ color: rallyColors.textDimmed }}>
                      {loan.creditRatingRequirements!.ratingB.guarantorRequirement || '-'}
                    </Table.Td>
                  </Table.Tr>
                )}
                {loan.creditRatingRequirements!.ratingCandD && (
                  <Table.Tr style={{ borderBottom: `1px solid ${rallyColors.glassBorder}` }}>
                    <Table.Td><Badge color="yellow" variant="light" size="sm">رتبه C و D</Badge></Table.Td>
                    <Table.Td style={{ color: rallyColors.textSecondary }}>
                      {loan.creditRatingRequirements!.ratingCandD.maxLoanFA || loan.creditRatingRequirements!.ratingCandD.maxLoan || '-'}
                    </Table.Td>
                    <Table.Td style={{ color: rallyColors.textDimmed }}>
                      {loan.creditRatingRequirements!.ratingCandD.guarantorRequirement || '-'}
                    </Table.Td>
                  </Table.Tr>
                )}
                {loan.creditRatingRequirements!.ratingE && (
                  <Table.Tr style={{ borderBottom: `1px solid ${rallyColors.glassBorder}` }}>
                    <Table.Td><Badge color="red" variant="light" size="sm">رتبه E</Badge></Table.Td>
                    <Table.Td style={{ color: rallyColors.textSecondary }}>
                      {loan.creditRatingRequirements!.ratingE.maxLoanFA || loan.creditRatingRequirements!.ratingE.maxLoan || '-'}
                    </Table.Td>
                    <Table.Td style={{ color: rallyColors.textDimmed }}>
                      {loan.creditRatingRequirements!.ratingE.guarantorRequirement || '-'}
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </div>
      )}

      {hasGuarantorNote && (
        <Box
          p="sm"
          style={{
            backgroundColor: 'rgba(234,179,8,0.1)',
            borderRadius: 8,
            border: '1px solid rgba(234,179,8,0.2)',
          }}
        >
          <Text size="sm" c="#fde047">{loan.guarantorNote}</Text>
        </Box>
      )}

      {hasCreditRatingRequired && (
        <Box
          p="md"
          style={{
            backgroundColor: 'rgba(234,179,8,0.1)',
            borderRadius: 8,
            border: '1px solid rgba(234,179,8,0.2)',
          }}
        >
          <Group gap={8} mb="xs">
            <IconAlertCircle size={20} color="#eab308" />
            <Text fw={500} c="#eab308">رتبه اعتباری مورد نیاز</Text>
          </Group>
          <Group gap="xs">
            {loan.creditRatingRequired!.map((rating, idx) => (
              <Badge key={idx} color="yellow" variant="light" size="sm">
                {rating}
              </Badge>
            ))}
          </Group>
          {loan.creditRatingRequiredFA && (
            <Text size="sm" c="#eab308" opacity={0.7} mt="xs">
              {loan.creditRatingRequiredFA}
            </Text>
          )}
        </Box>
      )}
    </>
  );
});
