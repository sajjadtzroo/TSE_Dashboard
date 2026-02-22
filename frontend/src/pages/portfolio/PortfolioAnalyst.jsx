import { useCallback } from 'react';
import { Tabs, Button, Group } from '@mantine/core';
import { IconClipboardList, IconBulb, IconUser, IconRefresh } from '@tabler/icons-react';
import PageHeader from '../../components/PageHeader';
import RiskQuestionnaire from './components/analyst/RiskQuestionnaire';
import SuggestedPortfolio from './components/analyst/SuggestedPortfolio';
import ProfileSummary from './components/analyst/ProfileSummary';
import useRiskProfile from '../../hooks/useRiskProfile';
import { usePortfolioContext } from './PortfolioProvider';
import rallyColors from '../../theme/rallyColors';

/**
 * مشاور سرمایه‌گذاری — Risk profiling, suggestions & profile summary.
 * Three tabs: ارزیابی ریسک | پیشنهاد سبد | پروفایل ریسک
 */
export default function PortfolioAnalyst() {
  const { profile, saveProfile, clearProfile, hasProfile } = useRiskProfile();
  const { enriched } = usePortfolioContext();

  const handleComplete = useCallback(
    (scoreResult, answers) => {
      saveProfile({
        answers,
        totalScore: scoreResult.totalScore,
        normalizedScore: scoreResult.normalizedScore,
        abilityScore: scoreResult.abilityScore,
        willingnessScore: scoreResult.willingnessScore,
        category: scoreResult.category,
      });
    },
    [saveProfile],
  );

  const handleRetake = useCallback(() => {
    clearProfile();
  }, [clearProfile]);

  return (
    <>
      <PageHeader title="مشاور سرمایه‌گذاری">
        {hasProfile && (
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconRefresh size={14} />}
            onClick={handleRetake}
            color="gray"
          >
            تکمیل مجدد پرسش‌نامه
          </Button>
        )}
      </PageHeader>

      <Tabs
        defaultValue="questionnaire"
        styles={{
          tab: {
            color: rallyColors.textSecondary,
            '&[data-active]': { color: rallyColors.textPrimary, borderColor: rallyColors.blue },
          },
          panel: { paddingTop: 'var(--mantine-spacing-md)' },
        }}
      >
        <Tabs.List>
          <Tabs.Tab value="questionnaire" leftSection={<IconClipboardList size={16} />}>
            ارزیابی ریسک
          </Tabs.Tab>
          <Tabs.Tab value="suggestions" leftSection={<IconBulb size={16} />} disabled={!hasProfile}>
            پیشنهاد سبد
          </Tabs.Tab>
          <Tabs.Tab value="profile" leftSection={<IconUser size={16} />} disabled={!hasProfile}>
            پروفایل ریسک
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="questionnaire">
          <RiskQuestionnaire onComplete={handleComplete} />
        </Tabs.Panel>

        <Tabs.Panel value="suggestions">
          <SuggestedPortfolio category={profile?.category} />
        </Tabs.Panel>

        <Tabs.Panel value="profile">
          <ProfileSummary profile={profile} enrichedHoldings={enriched} />
        </Tabs.Panel>
      </Tabs>
    </>
  );
}
