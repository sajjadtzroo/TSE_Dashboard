/**
 * Dashboard Summary Component - Dark Theme
 */

import { SimpleGrid, Box, Skeleton } from '@mantine/core';
import { IconBuildingBank, IconCreditCard, IconUsers, IconTrendingUp } from '@tabler/icons-react';
import { StatCard } from '@/components/loans/cards';
import { useSummary } from '@/hooks/loans';
import rallyColors from '../../../theme/rallyColors';

export function DashboardSummary() {
  const { data: summary, isLoading } = useSummary();

  if (isLoading) {
    return (
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4, '2xl': 5 } as any} spacing="md">
        {[...Array(4)].map((_, i) => (
          <Box
            key={i}
            p="lg"
            style={{
              backgroundColor: rallyColors.card,
              borderRadius: 'var(--mantine-radius-md)',
              border: `1px solid ${rallyColors.glassBorder}`,
            }}
          >
            <Skeleton height={64} radius="sm" />
          </Box>
        ))}
      </SimpleGrid>
    );
  }

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="md">
      <StatCard
        title="کل بانک‌ها"
        value={summary?.totalBanks || 0}
        icon={IconBuildingBank}
        color="blue"
      />
      <StatCard
        title="کل محصولات وام"
        value={summary?.totalLoans || 0}
        icon={IconCreditCard}
        color="green"
      />
      <StatCard
        title="وام‌های بدون ضامن"
        value={summary?.noGuarantorLoans || 0}
        icon={IconUsers}
        color="yellow"
      />
      <StatCard
        title="بانک‌های دیجیتال"
        value={summary?.digitalBanks || 0}
        icon={IconTrendingUp}
        color="purple"
      />
    </SimpleGrid>
  );
}

export default DashboardSummary;
