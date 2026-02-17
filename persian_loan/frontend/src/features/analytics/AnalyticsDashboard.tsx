/**
 * Analytics Dashboard - Main Container
 * Comprehensive analytics with 5 specialized tabs
 */

import { useState } from 'react';
import { Tabs, Title, Text, Stack, Box } from '@mantine/core';
import {
  IconChartBar,
  IconTrendingUp,
  IconCash,
  IconCheckbox,
  IconGitCompare,
} from '@tabler/icons-react';
import rallyColors from '../../theme/rallyColors';
import { DashboardSummary } from './DashboardSummary';
import { OverviewTab } from './tabs/OverviewTab';
import { InterestRatesTab } from './tabs/InterestRatesTab';
import { LoanAmountsTab } from './tabs/LoanAmountsTab';
import { RequirementsTab } from './tabs/RequirementsTab';
import { ComparisonTab } from './tabs/ComparisonTab';

type TabType = 'overview' | 'rates' | 'amounts' | 'requirements' | 'comparison';

const TABS = [
  { id: 'overview' as TabType, label: 'نمای کلی', icon: IconChartBar },
  { id: 'rates' as TabType, label: 'نرخ سود', icon: IconTrendingUp },
  { id: 'amounts' as TabType, label: 'مبالغ وام', icon: IconCash },
  { id: 'requirements' as TabType, label: 'الزامات', icon: IconCheckbox },
  { id: 'comparison' as TabType, label: 'مقایسه بانک‌ها', icon: IconGitCompare },
];

export function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  return (
    <Box maw={1400} mx="auto" px="md" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Box mb="md">
          <Title order={1} c={rallyColors.textPrimary} mb="xs">
            تحلیل وام‌ها
          </Title>
          <Text c={rallyColors.textSecondary}>
            تحلیل جامع داده‌های وام بانک‌های ایران
          </Text>
        </Box>

        {/* Summary Stats */}
        <DashboardSummary />

        {/* Tabs Navigation */}
        <Tabs
          value={activeTab}
          onChange={(value) => setActiveTab(value as TabType)}
          variant="pills"
          styles={{
            root: {
              backgroundColor: rallyColors.card,
              borderRadius: 'var(--mantine-radius-md)',
              border: `1px solid ${rallyColors.glassBorder}`,
              padding: 8,
            },
            list: {
              gap: 8,
              flexWrap: 'nowrap',
              overflowX: 'auto',
            },
            tab: {
              fontWeight: 500,
              color: rallyColors.textSecondary,
              '&[data-active]': {
                backgroundColor: rallyColors.blue,
                color: '#fff',
                fontWeight: 600,
              },
              '&:hover:not([data-active])': {
                backgroundColor: rallyColors.elevated,
                color: rallyColors.textPrimary,
              },
            },
          }}
        >
          <Tabs.List>
            {TABS.map((tab) => (
              <Tabs.Tab
                key={tab.id}
                value={tab.id}
                leftSection={<tab.icon size={16} />}
              >
                {tab.label}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs>

        {/* Tab Content */}
        <Box>
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'rates' && <InterestRatesTab />}
          {activeTab === 'amounts' && <LoanAmountsTab />}
          {activeTab === 'requirements' && <RequirementsTab />}
          {activeTab === 'comparison' && <ComparisonTab />}
        </Box>
      </Stack>
    </Box>
  );
}

export default AnalyticsDashboard;
