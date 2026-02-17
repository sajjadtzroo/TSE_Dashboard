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
  Button,
  Typography,
  Chip,
  Stack,
  Tooltip,
  IconButton,
} from '@mui/material';
import { Download, OpenInNew } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import type { Bank, LoanWithBank } from '../../../types';

interface BankSummaryTableProps {
  banks: Bank[];
  loans: LoanWithBank[];
}

type BankSummary = {
  id: string;
  nameFA: string;
  category: string;
  categoryFA: string;
  loanCount: number;
  noGuarantorCount: number;
  avgRate: number;
  maxAmount: number;
  maxAmountFormatted: string;
};

type SortField = 'name' | 'category' | 'loanCount' | 'noGuarantorCount' | 'avgRate' | 'maxAmount';
type SortOrder = 'asc' | 'desc';

const BankSummaryTable: React.FC<BankSummaryTableProps> = ({ banks, loans }) => {
  const [sortField, setSortField] = useState<SortField>('loanCount');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const navigate = useNavigate();

  // Extract numeric amount from string
  const extractAmount = (amountStr?: string): number => {
    if (!amountStr) return 0;

    // Remove Persian/Arabic digits and convert to English
    const normalized = amountStr
      .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
      .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());

    // Extract number
    const match = normalized.match(/(\d+(?:,\d+)*)/);
    if (match) {
      return parseFloat(match[1].replace(/,/g, ''));
    }

    // Check for "میلیون" mentions
    if (normalized.includes('میلیون')) {
      const numMatch = normalized.match(/(\d+)/);
      if (numMatch) {
        return parseFloat(numMatch[1]) * 1000000;
      }
    }

    return 0;
  };

  // Extract numeric rate
  const extractRate = (rateStr?: string, rateNum?: number): number => {
    if (rateNum) return rateNum;
    if (!rateStr) return 0;

    const match = rateStr.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
  };

  // Format amount
  const formatAmount = (amount: number): string => {
    if (amount === 0) return 'نامشخص';
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(0)} میلیون`;
    }
    return amount.toLocaleString('fa-IR');
  };

  // Group loans by bank
  const loansByBank = useMemo(() => {
    const grouped: Record<string, LoanWithBank[]> = {};
    loans.forEach(loan => {
      if (!grouped[loan.bankId]) {
        grouped[loan.bankId] = [];
      }
      grouped[loan.bankId].push(loan);
    });
    return grouped;
  }, [loans]);

  // Create bank summaries
  const bankSummaries = useMemo((): BankSummary[] => {
    return banks.map(bank => {
      const bankLoans = loansByBank[bank.id] || [];

      // Count loans without guarantor
      const noGuarantorCount = bankLoans.filter(loan => !loan.guarantor).length;

      // Calculate average interest rate
      const ratesWithValues = bankLoans
        .map(loan => extractRate(loan.interestRate, loan.interestRateNumeric))
        .filter(rate => rate > 0);

      const avgRate = ratesWithValues.length > 0
        ? ratesWithValues.reduce((sum, rate) => sum + rate, 0) / ratesWithValues.length
        : 0;

      // Find maximum amount
      const amounts = bankLoans
        .map(loan => extractAmount(loan.maxAmount || loan.maxAmountFA))
        .filter(amt => amt > 0);

      const maxAmount = amounts.length > 0 ? Math.max(...amounts) : 0;

      return {
        id: bank.id,
        nameFA: bank.nameFA,
        category: bank.category,
        categoryFA: bank.category === 'digital-banks' ? 'بانک دیجیتال' : 'بانک سنتی',
        loanCount: bankLoans.length,
        noGuarantorCount,
        avgRate,
        maxAmount,
        maxAmountFormatted: formatAmount(maxAmount),
      };
    });
  }, [banks, loansByBank]);

  // Sort summaries
  const sortedSummaries = useMemo(() => {
    const sorted = [...bankSummaries];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.nameFA.localeCompare(b.nameFA, 'fa');
          break;
        case 'category':
          comparison = a.categoryFA.localeCompare(b.categoryFA, 'fa');
          break;
        case 'loanCount':
          comparison = a.loanCount - b.loanCount;
          break;
        case 'noGuarantorCount':
          comparison = a.noGuarantorCount - b.noGuarantorCount;
          break;
        case 'avgRate':
          comparison = a.avgRate - b.avgRate;
          break;
        case 'maxAmount':
          comparison = a.maxAmount - b.maxAmount;
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [bankSummaries, sortField, sortOrder]);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'name' || field === 'category' ? 'asc' : 'desc');
    }
  };

  // Handle row click
  const handleRowClick = (bankId: string) => {
    navigate(`/banks/${bankId}`);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'نام بانک',
      'دسته‌بندی',
      'تعداد وام',
      'وام بدون ضامن',
      'میانگین نرخ سود',
      'حداکثر مبلغ'
    ];

    const rows = sortedSummaries.map(summary => [
      summary.nameFA,
      summary.categoryFA,
      summary.loanCount.toString(),
      summary.noGuarantorCount.toString(),
      summary.avgRate > 0 ? `${summary.avgRate.toFixed(1)}%` : 'نامشخص',
      summary.maxAmountFormatted,
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `bank-summary-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Get category color
  const getCategoryColor = (category: string): 'primary' | 'secondary' => {
    return category === 'digital-banks' ? 'primary' : 'secondary';
  };

  return (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">
            نمایش {sortedSummaries.length} بانک
          </Typography>

          <Tooltip title="خروجی CSV">
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleExportCSV}
              size="small"
            >
              دانلود CSV
            </Button>
          </Tooltip>
        </Stack>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} dir="rtl">
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'name'}
                  direction={sortField === 'name' ? sortOrder : 'asc'}
                  onClick={() => handleSort('name')}
                >
                  نام بانک
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={sortField === 'category'}
                  direction={sortField === 'category' ? sortOrder : 'asc'}
                  onClick={() => handleSort('category')}
                >
                  دسته‌بندی
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={sortField === 'loanCount'}
                  direction={sortField === 'loanCount' ? sortOrder : 'asc'}
                  onClick={() => handleSort('loanCount')}
                >
                  تعداد وام
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={sortField === 'noGuarantorCount'}
                  direction={sortField === 'noGuarantorCount' ? sortOrder : 'asc'}
                  onClick={() => handleSort('noGuarantorCount')}
                >
                  بدون ضامن
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={sortField === 'avgRate'}
                  direction={sortField === 'avgRate' ? sortOrder : 'asc'}
                  onClick={() => handleSort('avgRate')}
                >
                  میانگین نرخ
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={sortField === 'maxAmount'}
                  direction={sortField === 'maxAmount' ? sortOrder : 'asc'}
                  onClick={() => handleSort('maxAmount')}
                >
                  حداکثر مبلغ
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">عملیات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedSummaries.map((summary) => (
              <TableRow
                key={summary.id}
                hover
                sx={{
                  cursor: 'pointer',
                  '&:last-child td, &:last-child th': { border: 0 }
                }}
                onClick={() => handleRowClick(summary.id)}
              >
                <TableCell component="th" scope="row">
                  <Typography variant="body2" fontWeight="medium">
                    {summary.nameFA}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={summary.categoryFA}
                    color={getCategoryColor(summary.category)}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={summary.loanCount}
                    color="default"
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={summary.noGuarantorCount}
                    color={summary.noGuarantorCount > 0 ? 'success' : 'default'}
                    size="small"
                    variant={summary.noGuarantorCount > 0 ? 'filled' : 'outlined'}
                  />
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2">
                    {summary.avgRate > 0 ? `${summary.avgRate.toFixed(1)}%` : 'نامشخص'}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2">
                    {summary.maxAmountFormatted}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="مشاهده جزئیات">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowClick(summary.id);
                      }}
                    >
                      <OpenInNew fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default BankSummaryTable;
