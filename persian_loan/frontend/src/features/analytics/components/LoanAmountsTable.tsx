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
} from '@mui/material';
import { Download } from '@mui/icons-material';
import type { LoanWithBank } from '../../../types';

interface LoanAmountsTableProps {
  loans: LoanWithBank[];
  banks: Array<{ id: string; nameFA: string }>;
}

type AmountBucket = {
  label: string;
  labelFA: string;
  min: number;
  max: number;
  loans: LoanWithBank[];
  count: number;
  avgAmount: number;
  minAmount: number;
  maxAmount: number;
  banks: Set<string>;
};

type SortField = 'range' | 'count' | 'avgAmount' | 'banks';
type SortOrder = 'asc' | 'desc';

const LoanAmountsTable: React.FC<LoanAmountsTableProps> = ({ loans, banks }) => {
  const [sortField, setSortField] = useState<SortField>('range');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Create a map of bank IDs to names
  const bankMap = useMemo(() => {
    const map: Record<string, string> = {};
    banks.forEach(bank => {
      map[bank.id] = bank.nameFA;
    });
    return map;
  }, [banks]);

  // Extract numeric amount from string
  const extractAmount = (amountStr?: string): number => {
    if (!amountStr) return 0;

    // Remove Persian/Arabic digits and convert to English
    const normalized = amountStr
      .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
      .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());

    // Extract number (looking for patterns like "300,000,000" or "۳۰۰ میلیون")
    const match = normalized.match(/(\d+(?:,\d+)*)/);
    if (match) {
      const num = parseFloat(match[1].replace(/,/g, ''));
      return num;
    }

    // Check for "میلیون" or "million" mentions
    if (normalized.includes('میلیون') || normalized.toLowerCase().includes('million')) {
      const numMatch = normalized.match(/(\d+)/);
      if (numMatch) {
        return parseFloat(numMatch[1]) * 1000000;
      }
    }

    return 0;
  };

  // Process loans and categorize into buckets
  const buckets = useMemo((): AmountBucket[] => {
    const bucketDefinitions = [
      { label: '0-50M', labelFA: '0 تا 50 میلیون', min: 0, max: 50000000 },
      { label: '50-100M', labelFA: '50 تا 100 میلیون', min: 50000000, max: 100000000 },
      { label: '100-200M', labelFA: '100 تا 200 میلیون', min: 100000000, max: 200000000 },
      { label: '200M+', labelFA: '200 میلیون به بالا', min: 200000000, max: Infinity },
    ];

    return bucketDefinitions.map(def => {
      // Filter loans that fall into this bucket
      const bucketLoans = loans.filter(loan => {
        const amount = extractAmount(loan.maxAmount || loan.maxAmountFA);
        return amount > def.min && amount <= def.max;
      });

      // Calculate stats
      const amounts = bucketLoans
        .map(loan => extractAmount(loan.maxAmount || loan.maxAmountFA))
        .filter(amt => amt > 0);

      const avgAmount = amounts.length > 0
        ? amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length
        : 0;

      const minAmount = amounts.length > 0 ? Math.min(...amounts) : 0;
      const maxAmount = amounts.length > 0 ? Math.max(...amounts) : 0;

      // Get unique banks
      const bankSet = new Set(bucketLoans.map(loan => bankMap[loan.bankId] || loan.bankId));

      return {
        ...def,
        loans: bucketLoans,
        count: bucketLoans.length,
        avgAmount,
        minAmount,
        maxAmount,
        banks: bankSet,
      };
    });
  }, [loans, bankMap]);

  // Sort buckets
  const sortedBuckets = useMemo(() => {
    const sorted = [...buckets];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'range':
          comparison = a.min - b.min;
          break;
        case 'count':
          comparison = a.count - b.count;
          break;
        case 'avgAmount':
          comparison = a.avgAmount - b.avgAmount;
          break;
        case 'banks':
          comparison = a.banks.size - b.banks.size;
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [buckets, sortField, sortOrder]);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Format amount
  const formatAmount = (amount: number): string => {
    if (amount === 0) return '-';
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(0)} میلیون`;
    }
    return amount.toLocaleString('fa-IR');
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['بازه مبلغ', 'تعداد وام', 'میانگین', 'حداقل', 'حداکثر', 'تعداد بانک'];
    const rows = sortedBuckets.map(bucket => [
      bucket.labelFA,
      bucket.count.toString(),
      formatAmount(bucket.avgAmount),
      formatAmount(bucket.minAmount),
      formatAmount(bucket.maxAmount),
      bucket.banks.size.toString(),
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `loan-amounts-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const totalLoans = buckets.reduce((sum, bucket) => sum + bucket.count, 0);

  return (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">
            مجموع {totalLoans} وام در {buckets.length} بازه مبلغی
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
                  active={sortField === 'range'}
                  direction={sortField === 'range' ? sortOrder : 'asc'}
                  onClick={() => handleSort('range')}
                >
                  بازه مبلغ
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={sortField === 'count'}
                  direction={sortField === 'count' ? sortOrder : 'asc'}
                  onClick={() => handleSort('count')}
                >
                  تعداد وام
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={sortField === 'avgAmount'}
                  direction={sortField === 'avgAmount' ? sortOrder : 'asc'}
                  onClick={() => handleSort('avgAmount')}
                >
                  میانگین مبلغ
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">حداقل مبلغ</TableCell>
              <TableCell align="center">حداکثر مبلغ</TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={sortField === 'banks'}
                  direction={sortField === 'banks' ? sortOrder : 'asc'}
                  onClick={() => handleSort('banks')}
                >
                  تعداد بانک
                </TableSortLabel>
              </TableCell>
              <TableCell>بانک‌ها</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedBuckets.map((bucket) => (
              <TableRow
                key={bucket.label}
                hover
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell component="th" scope="row">
                  <Chip
                    label={bucket.labelFA}
                    color="primary"
                    variant="outlined"
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2" fontWeight="bold">
                    {bucket.count}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2">
                    {formatAmount(bucket.avgAmount)}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2" color="text.secondary">
                    {formatAmount(bucket.minAmount)}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2" color="text.secondary">
                    {formatAmount(bucket.maxAmount)}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={bucket.banks.size}
                    color="secondary"
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {Array.from(bucket.banks).slice(0, 3).map((bank) => (
                      <Chip
                        key={bank}
                        label={bank}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                    {bucket.banks.size > 3 && (
                      <Chip
                        label={`+${bucket.banks.size - 3}`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default LoanAmountsTable;
