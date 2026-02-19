/**
 * Banks List Component
 */

import { useState } from 'react';
import {
  Stack,
  Group,
  SimpleGrid,
  ActionIcon,
  Tooltip,
  Button,
} from '@mantine/core';
import { IconLayoutGrid, IconList } from '@tabler/icons-react';
import { useBanks } from '@/hooks/loans';
import { BankCard } from '@/components/loans/cards';
import { LoadingPage, Empty } from '@/components/loans/ui';
import { BanksTableView } from './components';
import type { BankCategory } from '@/types';

type ViewType = 'grid' | 'table';

export function BanksList() {
  const { data: banks, isLoading, error } = useBanks();
  const [filter, setFilter] = useState<BankCategory | 'all'>('all');
  const [viewType, setViewType] = useState<ViewType>('grid');

  if (isLoading) {
    return <LoadingPage />;
  }

  if (error) {
    return (
      <Empty
        title="خطا در بارگذاری"
        description="امکان دریافت اطلاعات بانک‌ها وجود ندارد"
      />
    );
  }

  const filteredBanks = banks?.filter((bank) => {
    if (filter === 'all') return true;
    return bank.category === filter;
  });

  return (
    <Stack gap="lg">
      {/* Filters and View Toggle */}
      <Group justify="space-between">
        <Group gap="xs">
          <Button
            variant={filter === 'all' ? 'filled' : 'outline'}
            size="xs"
            onClick={() => setFilter('all')}
          >
            همه ({banks?.length || 0})
          </Button>
          <Button
            variant={filter === 'traditional-banks' ? 'filled' : 'outline'}
            size="xs"
            onClick={() => setFilter('traditional-banks')}
          >
            سنتی ({banks?.filter((b) => b.category === 'traditional-banks').length || 0})
          </Button>
          <Button
            variant={filter === 'digital-banks' ? 'filled' : 'outline'}
            size="xs"
            onClick={() => setFilter('digital-banks')}
          >
            دیجیتال ({banks?.filter((b) => b.category === 'digital-banks').length || 0})
          </Button>
        </Group>

        {/* View Toggle */}
        <Group gap={4}>
          <Tooltip label="نمایش شبکه‌ای">
            <ActionIcon
              size="sm"
              variant={viewType === 'grid' ? 'filled' : 'subtle'}
              color={viewType === 'grid' ? undefined : 'gray'}
              onClick={() => setViewType('grid')}
              aria-label="نمایش شبکه‌ای"
            >
              <IconLayoutGrid size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="نمایش جدولی">
            <ActionIcon
              size="sm"
              variant={viewType === 'table' ? 'filled' : 'subtle'}
              color={viewType === 'table' ? undefined : 'gray'}
              onClick={() => setViewType('table')}
              aria-label="نمایش جدولی"
            >
              <IconList size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      {/* Banks Display */}
      {filteredBanks?.length === 0 ? (
        <Empty title="بانکی یافت نشد" />
      ) : viewType === 'grid' ? (
        <SimpleGrid
          cols={{ base: 1, sm: 2, md: 3, lg: 4, xl: 5 }}
          spacing={{ base: 'md', md: 'lg' }}
        >
          {filteredBanks?.map((bank) => (
            <BankCard key={bank.id} bank={bank} />
          ))}
        </SimpleGrid>
      ) : (
        <BanksTableView banks={filteredBanks || []} />
      )}
    </Stack>
  );
}

export default BanksList;
