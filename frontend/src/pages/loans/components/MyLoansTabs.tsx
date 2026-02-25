import React from 'react';
import { Tabs, Group, Badge } from '@mantine/core';
import { IconBell, IconCreditCard } from '@tabler/icons-react';

type TabType = 'loans' | 'alerts';

interface MyLoansTabsProps {
  activeTab: TabType;
  loansTotal: number | undefined;
  onChange: (tab: TabType) => void;
}

const MyLoansTabs: React.FC<MyLoansTabsProps> = ({ activeTab, loansTotal, onChange }) => {
  return (
    <Tabs
      value={activeTab}
      onChange={(val) => onChange(val as TabType)}
      color="rally-primary"
    >
      <Tabs.List>
        <Tabs.Tab value="loans" leftSection={<IconCreditCard size={16} />}>
          <Group gap={6}>
            وام‌ها
            {loansTotal !== undefined && (
              <Badge size="xs" variant="light" color="gray" circle>
                {loansTotal}
              </Badge>
            )}
          </Group>
        </Tabs.Tab>
        <Tabs.Tab value="alerts" leftSection={<IconBell size={16} />}>
          هشدارها
        </Tabs.Tab>
      </Tabs.List>
    </Tabs>
  );
};

export default MyLoansTabs;
