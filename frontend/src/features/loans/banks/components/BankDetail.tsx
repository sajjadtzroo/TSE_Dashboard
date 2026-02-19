/**
 * Bank Detail Component (Refactored)
 * Main container that composes all bank detail sub-components
 */

import { Link } from 'react-router-dom';
import { Stack, Card, Group, Text, Box, Anchor, Badge, SimpleGrid } from '@mantine/core';
import {
  IconArrowLeft,
  IconInfoCircle,
  IconHome,
  IconPhone,
  IconMail,
  IconExternalLink,
  IconBrandAndroid,
  IconCalendar,
} from '@tabler/icons-react';
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

      {/* Contact & Links */}
      {bank.extraBankData && (() => {
        const extra = bank.extraBankData!;
        const contact = extra.contact as { phone?: string; email?: string; support?: string } | undefined;
        const appDownload = extra.appDownload as { android?: string[] } | undefined;
        const websitePortal = extra.websitePortal as string | undefined;
        const parentBankWebsite = extra.parentBankWebsite as string | undefined;
        const launchDateFA = extra.launchDateFA as string | undefined;
        const parentBankFA = (extra.parentBankFA as string | undefined) || bank.parentBankFA;

        const hasContact = contact && (contact.phone || contact.email);
        const hasLinks = websitePortal || parentBankWebsite;
        const hasApps = appDownload?.android && appDownload.android.length > 0;

        if (!hasContact && !hasLinks && !hasApps && !launchDateFA) return null;

        const STORE_LABELS: Record<string, string> = {
          'cafebazaar.ir': 'کافه‌بازار',
          'myket.ir': 'مایکت',
          'sibche.com': 'سیبچه',
        };

        function storeLabel(url: string): string {
          try {
            const host = new URL(url).hostname.replace('www.', '');
            return STORE_LABELS[host] || host;
          } catch {
            return url;
          }
        }

        return (
          <Card withBorder radius="md">
            <Text fw={600} size="md" c={rallyColors.textPrimary} mb="md">
              اطلاعات تماس و لینک‌ها
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              {hasContact && (
                <Stack gap="xs">
                  <Text size="xs" fw={600} c={rallyColors.textDimmed} tt="uppercase">
                    تماس
                  </Text>
                  {contact!.phone && (
                    <Group gap="xs">
                      <IconPhone size={15} color={rallyColors.textSecondary} />
                      <Anchor
                        href={`tel:${contact!.phone}`}
                        size="sm"
                        c={rallyColors.textSecondary}
                        underline="hover"
                        style={{ direction: 'ltr' }}
                      >
                        {contact!.phone}
                      </Anchor>
                    </Group>
                  )}
                  {contact!.email && (
                    <Group gap="xs">
                      <IconMail size={15} color={rallyColors.textSecondary} />
                      <Anchor
                        href={`mailto:${contact!.email}`}
                        size="sm"
                        c={rallyColors.textSecondary}
                        underline="hover"
                      >
                        {contact!.email}
                      </Anchor>
                    </Group>
                  )}
                </Stack>
              )}
              {(hasLinks || launchDateFA) && (
                <Stack gap="xs">
                  <Text size="xs" fw={600} c={rallyColors.textDimmed} tt="uppercase">
                    لینک‌ها
                  </Text>
                  {websitePortal && (
                    <Group gap="xs">
                      <IconExternalLink size={15} color={rallyColors.textSecondary} />
                      <Anchor
                        href={websitePortal}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="sm"
                        c={rallyColors.blue}
                        underline="hover"
                      >
                        درگاه تسهیلات
                      </Anchor>
                    </Group>
                  )}
                  {parentBankWebsite && (
                    <Group gap="xs">
                      <IconExternalLink size={15} color={rallyColors.textSecondary} />
                      <Anchor
                        href={parentBankWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="sm"
                        c={rallyColors.blue}
                        underline="hover"
                      >
                        {parentBankFA ? `وبسایت ${parentBankFA}` : 'بانک مادر'}
                      </Anchor>
                    </Group>
                  )}
                  {launchDateFA && (
                    <Group gap="xs">
                      <IconCalendar size={15} color={rallyColors.textSecondary} />
                      <Text size="sm" c={rallyColors.textSecondary}>
                        راه‌اندازی: {launchDateFA}
                      </Text>
                    </Group>
                  )}
                </Stack>
              )}
            </SimpleGrid>
            {hasApps && (
              <Box mt="md" pt="md" style={{ borderTop: `1px solid ${rallyColors.border}` }}>
                <Group gap="xs" align="center" mb="xs">
                  <IconBrandAndroid size={15} color={rallyColors.textSecondary} />
                  <Text size="xs" fw={600} c={rallyColors.textDimmed} tt="uppercase">
                    دانلود اپلیکیشن
                  </Text>
                </Group>
                <Group gap="xs" wrap="wrap">
                  {appDownload!.android!.map((url) => (
                    <Badge
                      key={url}
                      component="a"
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="outline"
                      color="blue"
                      size="sm"
                      style={{ cursor: 'pointer', textDecoration: 'none' }}
                    >
                      {storeLabel(url)}
                    </Badge>
                  ))}
                </Group>
              </Box>
            )}
          </Card>
        );
      })()}

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
