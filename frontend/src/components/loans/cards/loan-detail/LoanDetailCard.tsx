import { Card, Stack, Text, Box, Group, Anchor, Image } from '@mantine/core';
import { IconInfoCircle, IconExternalLink, IconPhoto } from '@tabler/icons-react';
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

        {/* Loan Note */}
        {loan.note && (
          <Box
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              padding: 12,
              borderRadius: 8,
            }}
          >
            <Group gap="xs" align="flex-start" wrap="nowrap">
              <IconInfoCircle
                size={18}
                color={rallyColors.yellow}
                style={{ flexShrink: 0, marginTop: 2 }}
              />
              <Text size="sm" c={rallyColors.yellow} lh={1.8}>
                {loan.note}
              </Text>
            </Group>
          </Box>
        )}

        {/* Source Links & Screenshots */}
        {loan.sources && (loan.sources.urls?.length || loan.sources.screenshots?.length) && (
          <Box>
            <Text fw={500} size="sm" c={rallyColors.textSecondary} mb="sm">
              منابع و مستندات
            </Text>
            {loan.sources.urls && loan.sources.urls.length > 0 && (
              <Stack gap={4} mb="sm">
                {loan.sources.urls.map((url, i) => (
                  <Group key={i} gap="xs">
                    <IconExternalLink size={14} color={rallyColors.blue} />
                    <Anchor
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="sm"
                      c={rallyColors.blue}
                      underline="hover"
                      style={{ direction: 'ltr', wordBreak: 'break-all' }}
                    >
                      {url}
                    </Anchor>
                  </Group>
                ))}
              </Stack>
            )}
            {loan.sources.screenshots && loan.sources.screenshots.length > 0 && (
              <Group gap="sm" wrap="wrap">
                {loan.sources.screenshots.map((src, i) => (
                  <Image
                    key={i}
                    src={src.startsWith('http') ? src : `/api/loan-images/${src}`}
                    alt={`منبع ${i + 1}`}
                    w={120}
                    h={80}
                    fit="cover"
                    radius="sm"
                    style={{ border: `1px solid ${rallyColors.glassBorder}` }}
                  />
                ))}
              </Group>
            )}
          </Box>
        )}
      </Stack>
    </Card>
  );
}

export default LoanDetailCard;
