/**
 * Bank Statistics Card
 * Displays bank statistics (users, cities, loans disbursed, rating) as a grid
 */

import { Card, Text, SimpleGrid, Group, ThemeIcon } from '@mantine/core';
import {
  IconUsers,
  IconMapPin,
  IconCash,
  IconStar,
  IconMessages,
  IconTrophy,
} from '@tabler/icons-react';
import rallyColors from '../../../../theme/rallyColors';
import type { BankStatistics } from '@/types';

interface BankStatisticsCardProps {
  statistics: BankStatistics;
}

const STAT_CONFIG: {
  key: keyof BankStatistics;
  label: string;
  icon: typeof IconUsers;
  color: string;
}[] = [
  { key: 'users', label: 'کاربران', icon: IconUsers, color: rallyColors.blue },
  { key: 'cities', label: 'شهرها', icon: IconMapPin, color: rallyColors.primary },
  { key: 'loansDisbursed', label: 'وام پرداختی', icon: IconCash, color: '#f59e0b' },
  { key: 'rating', label: 'امتیاز', icon: IconStar, color: '#f59e0b' },
  { key: 'reviews', label: 'نظرات', icon: IconMessages, color: '#8b5cf6' },
  { key: 'topPosition', label: 'رتبه', icon: IconTrophy, color: '#22C55E' },
  { key: 'onlineLoans', label: 'وام آنلاین', icon: IconCash, color: '#06b6d4' },
  { key: 'farhangianCards', label: 'کارت فرهنگیان', icon: IconCash, color: '#ec4899' },
];

export function BankStatisticsCard({ statistics }: BankStatisticsCardProps) {
  const items = STAT_CONFIG.filter((s) => statistics[s.key]);

  if (items.length === 0 && !statistics.description) return null;

  return (
    <Card withBorder radius="md">
      <Text fw={600} size="md" c={rallyColors.textPrimary} mb="md">
        آمار و اطلاعات
      </Text>
      {items.length > 0 && (
        <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
          {items.map(({ key, label, icon: Icon, color }) => (
            <Group
              key={key}
              gap="sm"
              p="sm"
              style={{
                backgroundColor: `${color}11`,
                borderRadius: 8,
                border: `1px solid ${color}33`,
              }}
            >
              <ThemeIcon
                variant="transparent"
                size="md"
                style={{ color }}
              >
                <Icon size={20} />
              </ThemeIcon>
              <div>
                <Text size="xs" c={rallyColors.textDimmed}>
                  {label}
                </Text>
                <Text fw={600} c={rallyColors.textPrimary} size="sm">
                  {statistics[key]}
                </Text>
              </div>
            </Group>
          ))}
        </SimpleGrid>
      )}
      {statistics.description && (
        <Text size="sm" c={rallyColors.textSecondary} mt="md" lh={1.8}>
          {statistics.description}
        </Text>
      )}
    </Card>
  );
}
