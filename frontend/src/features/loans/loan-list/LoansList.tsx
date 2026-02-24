/**
 * Loans List Component - Dark Theme
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SimpleGrid,
  Group,
  Stack,
  Card,
  Text,
  Button,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import { IconLayoutGrid, IconList } from '@tabler/icons-react';
import { useLoans, useNoGuarantorLoans } from '@/hooks/loans';
import { LoanCard } from '@/components/loans/cards';
import { LoadingPage, Empty } from '@/components/loans/ui';
import { useLoanSelection } from '@/context/LoanSelectionContext';
import { LoanSelectionBar } from '../compare/components/LoanSelectionBar';
import { LoansTableView } from './components';
import rallyColors from '@/theme/rallyColors';

type FilterType = 'all' | 'no-guarantor' | 'zero-interest';
type ViewType = 'grid' | 'table';

export function LoansList() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [viewType, setViewType] = useState<ViewType>('grid');
  const navigate = useNavigate();
  const { toggleLoan, isLoanSelected } = useLoanSelection();

  const { data: allLoans, isLoading: allLoading } = useLoans();
  const { data: noGuarantorLoans, isLoading: noGuarantorLoading } = useNoGuarantorLoans();

  const handleLoanClick = (bankId: string, loanId: string) => {
    navigate(`/loans/list/${bankId}/${loanId}`);
  };

  const zeroInterestLoans = allLoans?.filter(
    (l: any) => l.calculationMethod === 'zero_interest' || l.interestRateNumeric === 0
  );

  const isLoading = filter === 'all' ? allLoading : (filter === 'no-guarantor' ? noGuarantorLoading : allLoading);
  const loans = filter === 'all' ? allLoans : filter === 'no-guarantor' ? noGuarantorLoans : zeroInterestLoans;

  if (isLoading) {
    return <LoadingPage />;
  }

  return (
    <Stack gap="lg">
      {/* Stats */}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <Card
          withBorder
          radius="md"
          p="sm"
          style={{
            backgroundColor: rallyColors.card,
            border: `1px solid ${rallyColors.glassBorder}`,
          }}
        >
          <Group justify="space-between">
            <Text fw={500} c={rallyColors.textSecondary}>
              کل وام‌ها
            </Text>
            <Text size="xl" fw={700} c={rallyColors.textPrimary}>
              {allLoans?.length || 0}
            </Text>
          </Group>
        </Card>
        <Card
          withBorder
          radius="md"
          p="sm"
          style={{
            backgroundColor: rallyColors.card,
            border: `1px solid ${rallyColors.glassBorder}`,
          }}
        >
          <Group justify="space-between">
            <Text fw={500} c={rallyColors.textSecondary}>
              بدون ضامن
            </Text>
            <Text size="xl" fw={700} c={rallyColors.primary}>
              {noGuarantorLoans?.length || 0}
            </Text>
          </Group>
        </Card>
      </SimpleGrid>

      {/* Filters and View Toggle */}
      <Group justify="space-between">
        <Group gap="xs">
          <Button
            variant={filter === 'all' ? 'filled' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            همه وام‌ها
          </Button>
          <Button
            variant={filter === 'no-guarantor' ? 'filled' : 'outline'}
            size="sm"
            onClick={() => setFilter('no-guarantor')}
          >
            بدون ضامن
          </Button>
          <Button
            variant={filter === 'zero-interest' ? 'filled' : 'outline'}
            size="sm"
            color="teal"
            onClick={() => setFilter('zero-interest')}
          >
            قرض‌الحسنه
          </Button>
        </Group>

        {/* View Toggle */}
        <Group gap={4}>
          <Tooltip label="نمایش شبکه‌ای">
            <ActionIcon
              size="sm"
              variant={viewType === 'grid' ? 'filled' : 'subtle'}
              onClick={() => setViewType('grid')}
            >
              <IconLayoutGrid size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="نمایش جدولی">
            <ActionIcon
              size="sm"
              variant={viewType === 'table' ? 'filled' : 'subtle'}
              onClick={() => setViewType('table')}
            >
              <IconList size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      {/* Loans Display */}
      {loans?.length === 0 ? (
        <Empty title="وامی یافت نشد" />
      ) : viewType === 'grid' ? (
        <SimpleGrid
          cols={{ base: 1, md: 2, lg: 3, xl: 4 }}
          spacing={{ base: 'md', md: 'lg' }}
        >
          {loans?.map((loan) => (
            <LoanCard
              key={`${loan.bankId}-${loan.id}`}
              loan={loan}
              showBank
              onClick={() => handleLoanClick(loan.bankId, loan.id)}
              selectable
              isSelected={isLoanSelected(loan.id)}
              onSelect={toggleLoan}
            />
          ))}
        </SimpleGrid>
      ) : (
        <LoansTableView
          loans={loans || []}
          onToggleSelection={toggleLoan}
          isLoanSelected={isLoanSelected}
        />
      )}

      {/* Selection Bar */}
      <LoanSelectionBar />
    </Stack>
  );
}

export default LoansList;
