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
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Button,
  Typography,
  Chip,
  Stack,
  Tooltip,
} from '@mui/material';
import { Download } from '@mui/icons-material';
import type { LoanWithBank } from '../../../types';

interface InterestRatesTableProps {
  loans: LoanWithBank[];
  banks: Array<{ id: string; nameFA: string }>;
}

type SortField = 'bankName' | 'loanName' | 'rate' | 'category';
type SortOrder = 'asc' | 'desc';

const InterestRatesTable: React.FC<InterestRatesTableProps> = ({ loans, banks }) => {
  const [sortField, setSortField] = useState<SortField>('rate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [filterRate, setFilterRate] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Create a map of bank IDs to names
  const bankMap = useMemo(() => {
    const map: Record<string, string> = {};
    banks.forEach(bank => {
      map[bank.id] = bank.nameFA;
    });
    return map;
  }, [banks]);

  // Process loans with bank names and numeric rates
  const processedLoans = useMemo(() => {
    return loans.map(loan => {
      const bankName = bankMap[loan.bankId] || loan.bankId;

      // Extract numeric rate
      let numericRate = 0;
      if (loan.interestRateNumeric) {
        numericRate = loan.interestRateNumeric;
      } else if (loan.interestRate) {
        // Try to parse from string like "23%" or "15-23%"
        const match = loan.interestRate.match(/(\d+\.?\d*)/);
        if (match) {
          numericRate = parseFloat(match[1]);
        }
      }

      return {
        ...loan,
        bankName,
        numericRate,
      };
    });
  }, [loans, bankMap]);

  // Filter loans
  const filteredLoans = useMemo(() => {
    let filtered = processedLoans;

    // Apply rate filter
    if (filterRate !== 'all') {
      filtered = filtered.filter(loan => {
        const rate = loan.numericRate;
        if (filterRate === 'low') return rate > 0 && rate < 15;
        if (filterRate === 'medium') return rate >= 15 && rate <= 20;
        if (filterRate === 'high') return rate > 20;
        return true;
      });
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        loan =>
          loan.bankName.toLowerCase().includes(query) ||
          loan.nameFA.toLowerCase().includes(query) ||
          (loan.category && loan.category.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [processedLoans, filterRate, searchQuery]);

  // Sort loans
  const sortedLoans = useMemo(() => {
    const sorted = [...filteredLoans];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'bankName':
          comparison = a.bankName.localeCompare(b.bankName, 'fa');
          break;
        case 'loanName':
          comparison = a.nameFA.localeCompare(b.nameFA, 'fa');
          break;
        case 'rate':
          comparison = a.numericRate - b.numericRate;
          break;
        case 'category':
          comparison = (a.categoryFA || '').localeCompare(b.categoryFA || '', 'fa');
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [filteredLoans, sortField, sortOrder]);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Get color for rate
  const getRateColor = (rate: number): 'success' | 'warning' | 'error' | 'default' => {
    if (rate === 0) return 'default';
    if (rate < 15) return 'success';
    if (rate <= 20) return 'warning';
    return 'error';
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['بانک', 'نام وام', 'نرخ سود', 'دسته‌بندی', 'ضامن'];
    const rows = sortedLoans.map(loan => [
      loan.bankName,
      loan.nameFA,
      loan.interestRate || 'نامشخص',
      loan.categoryFA || '-',
      loan.guarantor ? 'دارد' : 'ندارد',
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `interest-rates-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <Box>
      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <TextField
            label="جستجو"
            variant="outlined"
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ minWidth: 200 }}
          />

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>فیلتر نرخ</InputLabel>
            <Select
              value={filterRate}
              label="فیلتر نرخ"
              onChange={(e) => setFilterRate(e.target.value)}
            >
              <MenuItem value="all">همه</MenuItem>
              <MenuItem value="low">کمتر از 15%</MenuItem>
              <MenuItem value="medium">15% - 20%</MenuItem>
              <MenuItem value="high">بیشتر از 20%</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ flexGrow: 1 }} />

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

        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          نمایش {sortedLoans.length} از {loans.length} وام
        </Typography>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} dir="rtl">
          <TableHead>
            <TableRow>
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
                  active={sortField === 'category'}
                  direction={sortField === 'category' ? sortOrder : 'asc'}
                  onClick={() => handleSort('category')}
                >
                  دسته‌بندی
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">ضامن</TableCell>
              <TableCell align="center">مبلغ حداکثر</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedLoans.map((loan) => (
              <TableRow
                key={`${loan.bankId}-${loan.id}`}
                hover
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell component="th" scope="row">
                  <Typography variant="body2" fontWeight="medium">
                    {loan.bankName}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{loan.nameFA}</Typography>
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
                    <Typography variant="body2" color="text.secondary">
                      نامشخص
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {loan.categoryFA || '-'}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={loan.guarantor ? 'دارد' : 'ندارد'}
                    color={loan.guarantor ? 'default' : 'success'}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {loan.maxAmountFA || loan.maxAmount || '-'}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
            {sortedLoans.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    هیچ وامی یافت نشد
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default InterestRatesTable;
