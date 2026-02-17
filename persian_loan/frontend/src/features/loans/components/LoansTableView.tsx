import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Chip,
  IconButton,
  Tooltip,
  Checkbox,
} from '@mui/material';
import { Visibility, CompareArrows } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import type { LoanWithBank } from '../../../types';

interface LoansTableViewProps {
  loans: LoanWithBank[];
  onToggleSelection: (loan: LoanWithBank) => void;
  isLoanSelected: (loanId: string) => boolean;
}

type SortField = 'bankName' | 'loanName' | 'rate' | 'amount' | 'category' | 'guarantor';
type SortOrder = 'asc' | 'desc';

const LoansTableView: React.FC<LoansTableViewProps> = ({
  loans,
  onToggleSelection,
  isLoanSelected,
}) => {
  const [sortField, setSortField] = useState<SortField>('bankName');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const navigate = useNavigate();

  // Process loans with numeric values for sorting
  const processedLoans = useMemo(() => {
    return loans.map(loan => {
      // Extract numeric rate
      let numericRate = 0;
      if (loan.interestRateNumeric) {
        numericRate = loan.interestRateNumeric;
      } else if (loan.interestRate) {
        const match = loan.interestRate.match(/(\d+\.?\d*)/);
        if (match) {
          numericRate = parseFloat(match[1]);
        }
      }

      // Extract numeric amount
      let numericAmount = 0;
      const amountStr = loan.maxAmount || loan.maxAmountFA || '';
      const amountMatch = amountStr.match(/(\d+(?:,\d+)*)/);
      if (amountMatch) {
        numericAmount = parseFloat(amountMatch[1].replace(/,/g, ''));
      }

      return {
        ...loan,
        numericRate,
        numericAmount,
      };
    });
  }, [loans]);

  // Sort loans
  const sortedLoans = useMemo(() => {
    const sorted = [...processedLoans];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'bankName':
          comparison = (a.bankNameFA || '').localeCompare(b.bankNameFA || '', 'fa');
          break;
        case 'loanName':
          comparison = a.nameFA.localeCompare(b.nameFA, 'fa');
          break;
        case 'rate':
          comparison = a.numericRate - b.numericRate;
          break;
        case 'amount':
          comparison = a.numericAmount - b.numericAmount;
          break;
        case 'category':
          comparison = (a.categoryFA || '').localeCompare(b.categoryFA || '', 'fa');
          break;
        case 'guarantor':
          comparison = (a.guarantor === b.guarantor ? 0 : a.guarantor ? 1 : -1);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [processedLoans, sortField, sortOrder]);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Get rate color
  const getRateColor = (rate: number): 'success' | 'warning' | 'error' | 'default' => {
    if (rate === 0) return 'default';
    if (rate < 15) return 'success';
    if (rate <= 20) return 'warning';
    return 'error';
  };

  // Handle row click
  const handleRowClick = (loan: LoanWithBank) => {
    navigate(`/loans/${loan.bankId}/${loan.id}`);
  };

  return (
    <TableContainer component={Paper} sx={{ bgcolor: 'background.paper' }}>
      <Table sx={{ minWidth: 650 }} dir="rtl">
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Tooltip title="انتخاب برای مقایسه">
                <CompareArrows />
              </Tooltip>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortField === 'bankName'}
                direction={sortField === 'bankName' ? sortOrder : 'asc'}
                onClick={() => handleSort('bankName')}
              >
                بانک
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortField === 'loanName'}
                direction={sortField === 'loanName' ? sortOrder : 'asc'}
                onClick={() => handleSort('loanName')}
              >
                نام وام
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortField === 'rate'}
                direction={sortField === 'rate' ? sortOrder : 'asc'}
                onClick={() => handleSort('rate')}
              >
                نرخ سود
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortField === 'amount'}
                direction={sortField === 'amount' ? sortOrder : 'asc'}
                onClick={() => handleSort('amount')}
              >
                مبلغ حداکثر
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortField === 'guarantor'}
                direction={sortField === 'guarantor' ? sortOrder : 'asc'}
                onClick={() => handleSort('guarantor')}
              >
                ضامن
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortField === 'category'}
                direction={sortField === 'category' ? sortOrder : 'asc'}
                onClick={() => handleSort('category')}
              >
                دسته‌بندی
              </TableSortLabel>
            </TableCell>
            <TableCell align="center">عملیات</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedLoans.map((loan) => (
            <TableRow
              key={`${loan.bankId}-${loan.id}`}
              hover
              sx={{
                cursor: 'pointer',
                '&:last-child td, &:last-child th': { border: 0 },
                bgcolor: isLoanSelected(loan.id) ? 'action.selected' : 'inherit',
              }}
              onClick={() => handleRowClick(loan)}
            >
              <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={isLoanSelected(loan.id)}
                  onChange={() => onToggleSelection(loan)}
                  color="primary"
                />
              </TableCell>
              <TableCell>
                <Box sx={{ fontWeight: 'medium' }}>
                  {loan.bankNameFA || loan.bankId}
                </Box>
              </TableCell>
              <TableCell>
                <Box>{loan.nameFA}</Box>
              </TableCell>
              <TableCell>
                {loan.numericRate > 0 ? (
                  <Chip
                    label={loan.interestRate}
                    color={getRateColor(loan.numericRate)}
                    size="small"
                    sx={{ fontWeight: 'bold' }}
                  />
                ) : (
                  <Box sx={{ color: 'text.secondary' }}>نامشخص</Box>
                )}
              </TableCell>
              <TableCell>
                <Box>{loan.maxAmountFA || loan.maxAmount || '-'}</Box>
              </TableCell>
              <TableCell>
                <Chip
                  label={loan.guarantor ? 'دارد' : 'ندارد'}
                  color={loan.guarantor ? 'default' : 'success'}
                  size="small"
                  variant="outlined"
                />
              </TableCell>
              <TableCell>
                <Box sx={{ color: 'text.secondary' }}>
                  {loan.categoryFA || loan.category || '-'}
                </Box>
              </TableCell>
              <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                <Tooltip title="مشاهده جزئیات">
                  <IconButton
                    size="small"
                    onClick={() => handleRowClick(loan)}
                  >
                    <Visibility fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
          {sortedLoans.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} align="center">
                <Box sx={{ py: 3, color: 'text.secondary' }}>
                  هیچ وامی یافت نشد
                </Box>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default LoansTableView;
