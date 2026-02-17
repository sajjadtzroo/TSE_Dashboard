/**
 * Loans List Component - Dark Theme
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoans, useNoGuarantorLoans } from '@/hooks';
import { LoanCard } from '@/components/cards';
import { LoadingPage, Empty, Button, Card } from '@/components/ui';
import { useLoanSelection } from '@/context/LoanSelectionContext';
import { LoanSelectionBar } from '../compare/components/LoanSelectionBar';
import { LoansTableView } from './components';
import { ViewModule, ViewList } from '@mui/icons-material';
import { IconButton, Tooltip, Box } from '@mui/material';

type FilterType = 'all' | 'no-guarantor';
type ViewType = 'grid' | 'table';

export function LoansList() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [viewType, setViewType] = useState<ViewType>('grid');
  const navigate = useNavigate();
  const { toggleLoan, isLoanSelected } = useLoanSelection();

  const { data: allLoans, isLoading: allLoading } = useLoans();
  const { data: noGuarantorLoans, isLoading: noGuarantorLoading } = useNoGuarantorLoans();

  const handleLoanClick = (bankId: string, loanId: string) => {
    navigate(`/loans/${bankId}/${loanId}`);
  };

  const isLoading = filter === 'all' ? allLoading : noGuarantorLoading;
  const loans = filter === 'all' ? allLoans : noGuarantorLoans;

  if (isLoading) {
    return <LoadingPage />;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card padding="sm" hover>
          <div className="flex items-center justify-between">
            <span className="text-gray-300 font-medium">کل وام‌ها</span>
            <span className="text-2xl font-bold text-gray-50">
              {allLoans?.length || 0}
            </span>
          </div>
        </Card>
        <Card padding="sm" hover>
          <div className="flex items-center justify-between">
            <span className="text-gray-300 font-medium">بدون ضامن</span>
            <span className="text-2xl font-bold text-secondary-500">
              {noGuarantorLoans?.length || 0}
            </span>
          </div>
        </Card>
      </div>

      {/* Filters and View Toggle */}
      <div className="flex gap-2 items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            همه وام‌ها
          </Button>
          <Button
            variant={filter === 'no-guarantor' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('no-guarantor')}
          >
            بدون ضامن
          </Button>
        </div>

        {/* View Toggle */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="نمایش شبکه‌ای">
            <IconButton
              size="small"
              onClick={() => setViewType('grid')}
              sx={{
                color: viewType === 'grid' ? 'primary.main' : 'text.secondary',
                bgcolor: viewType === 'grid' ? 'action.selected' : 'transparent',
              }}
            >
              <ViewModule />
            </IconButton>
          </Tooltip>
          <Tooltip title="نمایش جدولی">
            <IconButton
              size="small"
              onClick={() => setViewType('table')}
              sx={{
                color: viewType === 'table' ? 'primary.main' : 'text.secondary',
                bgcolor: viewType === 'table' ? 'action.selected' : 'transparent',
              }}
            >
              <ViewList />
            </IconButton>
          </Tooltip>
        </Box>
      </div>

      {/* Loans Display */}
      {loans?.length === 0 ? (
        <Empty title="وامی یافت نشد" />
      ) : viewType === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6">
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
        </div>
      ) : (
        <LoansTableView
          loans={loans || []}
          onToggleSelection={toggleLoan}
          isLoanSelected={isLoanSelected}
        />
      )}

      {/* Selection Bar */}
      <LoanSelectionBar />
    </div>
  );
}

export default LoansList;
