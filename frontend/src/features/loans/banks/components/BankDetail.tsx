/**
 * Bank Detail Component (Refactored)
 * Main container that composes all bank detail sub-components
 */

import { Link } from 'react-router-dom';
import { Stack, Card, Group, Text, Box, Anchor, Badge, SimpleGrid, List, ThemeIcon } from '@mantine/core';
import {
  IconArrowLeft,
  IconInfoCircle,
  IconHome,
  IconPhone,
  IconMail,
  IconExternalLink,
  IconBrandAndroid,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconCalendar,
  IconClock,
  IconShieldCheck,
  IconLock,
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
import { BankStatisticsCard } from './BankStatisticsCard';
import { BankUserFeedbackCard } from './BankUserFeedback';
import { BankImageGallery } from './BankImageGallery';
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
      {(() => {
        const extra = bank.extraBankData || {};
        const contact = bank.contact || extra.contact as { phone?: string; email?: string; support?: string } | undefined;
        const appDownload = bank.appDownload || extra.appDownload as { android?: string[] } | undefined;
        const websitePortal = bank.websitePortal || extra.websitePortal as string | undefined;
        const parentBankWebsite = bank.parentBankWebsite || extra.parentBankWebsite as string | undefined;
        const launchDateFA = bank.launchDateFA || extra.launchDateFA as string | undefined;
        const parentBankFA = bank.parentBankFA || extra.parentBankFA as string | undefined;
        const socialMedia = bank.socialMedia || extra.socialMedia as { instagram?: string; linkedin?: string } | undefined;

        const hasContact = contact && (contact.phone || contact.email);
        const hasLinks = websitePortal || parentBankWebsite;
        const hasApps = appDownload?.android && appDownload.android.length > 0;
        const hasSocial = socialMedia && (socialMedia.instagram || socialMedia.linkedin);

        if (!hasContact && !hasLinks && !hasApps && !launchDateFA && !hasSocial) return null;

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
            {/* Social Media Links */}
            {hasSocial && (
              <Box mt="md" pt="md" style={{ borderTop: `1px solid ${rallyColors.border}` }}>
                <Text size="xs" fw={600} c={rallyColors.textDimmed} tt="uppercase" mb="xs">
                  شبکه‌های اجتماعی
                </Text>
                <Group gap="sm" wrap="wrap">
                  {socialMedia!.instagram && (
                    <Badge
                      component="a"
                      href={socialMedia!.instagram.startsWith('http') ? socialMedia!.instagram : `https://instagram.com/${socialMedia!.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="light"
                      color="pink"
                      size="md"
                      leftSection={<IconBrandInstagram size={14} />}
                      style={{ cursor: 'pointer', textDecoration: 'none' }}
                    >
                      {socialMedia!.instagram}
                    </Badge>
                  )}
                  {socialMedia!.linkedin && (
                    <Badge
                      variant="light"
                      color="blue"
                      size="md"
                      leftSection={<IconBrandLinkedin size={14} />}
                    >
                      {socialMedia!.linkedin}
                    </Badge>
                  )}
                </Group>
              </Box>
            )}
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

      {/* Bank Statistics */}
      {bank.statistics && (
        <BankStatisticsCard statistics={bank.statistics} />
      )}

      {/* Mandatory Requirements */}
      {bank.mandatoryRequirements && (() => {
        const req = bank.mandatoryRequirements;
        if (!req.minimumDepositFA && !req.minimumAccountHistoryFA && !req.depositBlockedFA) return null;
        return (
          <Card withBorder radius="md">
            <Text fw={600} size="md" c={rallyColors.textPrimary} mb="md">
              <IconLock size={18} style={{ verticalAlign: 'middle', marginLeft: 6 }} />
              الزامات اولیه
            </Text>
            <Stack gap="sm">
              {req.minimumDepositFA && (
                <Group gap="xs" align="flex-start">
                  <ThemeIcon variant="light" color="blue" size="sm" radius="xl">
                    <IconShieldCheck size={12} />
                  </ThemeIcon>
                  <Text size="sm" c={rallyColors.textSecondary}>{req.minimumDepositFA}</Text>
                </Group>
              )}
              {req.minimumAccountHistoryFA && (
                <Group gap="xs" align="flex-start">
                  <ThemeIcon variant="light" color="blue" size="sm" radius="xl">
                    <IconClock size={12} />
                  </ThemeIcon>
                  <Text size="sm" c={rallyColors.textSecondary}>{req.minimumAccountHistoryFA}</Text>
                </Group>
              )}
              {req.depositBlockedFA && (
                <Group gap="xs" align="flex-start">
                  <ThemeIcon variant="light" color="yellow" size="sm" radius="xl">
                    <IconLock size={12} />
                  </ThemeIcon>
                  <Text size="sm" c={rallyColors.textSecondary}>{req.depositBlockedFA}</Text>
                </Group>
              )}
            </Stack>
          </Card>
        );
      })()}

      {/* Processing Times */}
      {bank.processingTimes && (() => {
        const pt = bank.processingTimes;
        if (!pt.accountOpening && !pt.loanApprovalFA) return null;
        return (
          <Card withBorder radius="md">
            <Text fw={600} size="md" c={rallyColors.textPrimary} mb="md">
              <IconClock size={18} style={{ verticalAlign: 'middle', marginLeft: 6 }} />
              زمان‌بندی فرآیندها
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              {pt.accountOpening && (
                <Box p="sm" style={{ backgroundColor: 'rgba(34, 197, 94,0.08)', borderRadius: 8, border: '1px solid rgba(34, 197, 94,0.2)' }}>
                  <Text size="xs" c={rallyColors.textDimmed}>افتتاح حساب</Text>
                  <Text fw={600} c={rallyColors.textPrimary} size="sm">{pt.accountOpening}</Text>
                </Box>
              )}
              {pt.loanApprovalFA && (
                <Box p="sm" style={{ backgroundColor: 'rgba(59,130,246,0.08)', borderRadius: 8, border: '1px solid rgba(59,130,246,0.2)' }}>
                  <Text size="xs" c={rallyColors.textDimmed}>تایید وام</Text>
                  <Text fw={600} c={rallyColors.textPrimary} size="sm">{pt.loanApprovalFA}</Text>
                </Box>
              )}
            </SimpleGrid>
            {pt.noteFA && (
              <Text size="sm" c={rallyColors.yellow} mt="sm">{pt.noteFA}</Text>
            )}
          </Card>
        );
      })()}

      {/* Credit Rating System */}
      {bank.creditRatingSystem && (() => {
        const crs = bank.creditRatingSystem;
        return (
          <Card withBorder radius="md">
            <Text fw={600} size="md" c={rallyColors.textPrimary} mb="md">
              <IconShieldCheck size={18} style={{ verticalAlign: 'middle', marginLeft: 6 }} />
              سیستم اعتبارسنجی
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              {crs.systemUsed && (
                <Box>
                  <Text size="xs" c={rallyColors.textDimmed}>سیستم</Text>
                  <Text fw={600} c={rallyColors.textPrimary} size="sm">{crs.systemUsed}</Text>
                </Box>
              )}
              {crs.scoreRange && (
                <Box>
                  <Text size="xs" c={rallyColors.textDimmed}>بازه امتیاز</Text>
                  <Text fw={600} c={rallyColors.textPrimary} size="sm" style={{ direction: 'ltr', textAlign: 'right' }}>{crs.scoreRange}</Text>
                </Box>
              )}
            </SimpleGrid>
            {crs.descriptionFA && (
              <Text size="sm" c={rallyColors.textSecondary} mt="sm" lh={1.8}>{crs.descriptionFA}</Text>
            )}
            {crs.factors && crs.factors.length > 0 && (
              <Box mt="sm">
                <Text size="xs" fw={600} c={rallyColors.textDimmed} mb="xs">عوامل موثر</Text>
                <List spacing="xs" size="sm">
                  {crs.factors.map((factor, i) => (
                    <List.Item key={i}>
                      <Text size="sm" c={rallyColors.textSecondary}>{factor}</Text>
                    </List.Item>
                  ))}
                </List>
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

      {/* User Feedback */}
      {bank.userFeedback && (
        <BankUserFeedbackCard feedback={bank.userFeedback} />
      )}

      {/* Image Gallery */}
      {bank.images && bank.images.length > 0 && (
        <BankImageGallery images={bank.images} bankName={bank.nameFA} />
      )}

      {/* Loans Section */}
      <BankLoansSection loans={loans} />
    </Stack>
  );
}

export default BankDetailView;
