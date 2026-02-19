import React, { useState, useMemo } from 'react';
import {
  Box,
  Table,
  Button,
  Text,
  Badge,
  Group,
  Tooltip,
  Card,
} from '@mantine/core';
import { IconDownload } from '@tabler/icons-react';
import rallyColors from '../../../../theme/rallyColors';
import type { LoanWithBank } from '../../../../types';
import { toPersianNum } from '../../../../utils/formatUtils';
import SortableHeader from '../../components/SortableHeader';
import { exportToCSV } from '../../../../utils/csv';
import { extractAmount } from '../../../../utils/loans/parsers';

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
      return `${toPersianNum((amount / 1000000).toFixed(0))} میلیون`;
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
    exportToCSV(headers, rows, 'loan-amounts');
  };

  const totalLoans = buckets.reduce((sum, bucket) => sum + bucket.count, 0);

  return (
    <Box>
      {/* Header */}
      <Card
        withBorder
        radius="md"
        p="sm"
        mb="sm"
        style={{ backgroundColor: rallyColors.card, borderColor: rallyColors.glassBorder }}
      >
        <Group justify="space-between">
          <Text size="sm" c={rallyColors.textSecondary}>
            مجموع {totalLoans} وام در {buckets.length} بازه مبلغی
          </Text>

          <Tooltip label="خروجی CSV">
            <Button
              variant="outline"
              leftSection={<IconDownload size={16} />}
              onClick={handleExportCSV}
              size="xs"
            >
              دانلود CSV
            </Button>
          </Tooltip>
        </Group>
      </Card>

      {/* Table */}
      <Card
        withBorder
        radius="md"
        p={0}
        style={{
          backgroundColor: rallyColors.card,
          borderColor: rallyColors.glassBorder,
          overflowX: 'auto',
        }}
      >
        <Table dir="rtl" highlightOnHover style={{ minWidth: 650 }}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>
                <SortableHeader label="بازه مبلغ" field="range" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
              </Table.Th>
              <Table.Th style={{ textAlign: 'center' }}>
                <SortableHeader label="تعداد وام" field="count" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
              </Table.Th>
              <Table.Th style={{ textAlign: 'center' }}>
                <SortableHeader label="میانگین مبلغ" field="avgAmount" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
              </Table.Th>
              <Table.Th style={{ textAlign: 'center' }}>
                <Text fw={500} size="sm" c={rallyColors.textPrimary}>حداقل مبلغ</Text>
              </Table.Th>
              <Table.Th style={{ textAlign: 'center' }}>
                <Text fw={500} size="sm" c={rallyColors.textPrimary}>حداکثر مبلغ</Text>
              </Table.Th>
              <Table.Th style={{ textAlign: 'center' }}>
                <SortableHeader label="تعداد بانک" field="banks" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
              </Table.Th>
              <Table.Th>
                <Text fw={500} size="sm" c={rallyColors.textPrimary}>بانک‌ها</Text>
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sortedBuckets.map((bucket) => (
              <Table.Tr key={bucket.label}>
                <Table.Td>
                  <Badge
                    variant="outline"
                    color="blue"
                    size="sm"
                  >
                    {bucket.labelFA}
                  </Badge>
                </Table.Td>
                <Table.Td style={{ textAlign: 'center' }}>
                  <Text size="sm" fw={700} c={rallyColors.textPrimary}>
                    {bucket.count}
                  </Text>
                </Table.Td>
                <Table.Td style={{ textAlign: 'center' }}>
                  <Text size="sm" c={rallyColors.textPrimary}>
                    {formatAmount(bucket.avgAmount)}
                  </Text>
                </Table.Td>
                <Table.Td style={{ textAlign: 'center' }}>
                  <Text size="sm" c={rallyColors.textSecondary}>
                    {formatAmount(bucket.minAmount)}
                  </Text>
                </Table.Td>
                <Table.Td style={{ textAlign: 'center' }}>
                  <Text size="sm" c={rallyColors.textSecondary}>
                    {formatAmount(bucket.maxAmount)}
                  </Text>
                </Table.Td>
                <Table.Td style={{ textAlign: 'center' }}>
                  <Badge color="violet" size="sm">
                    {bucket.banks.size}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap={4} wrap="wrap">
                    {Array.from(bucket.banks).slice(0, 3).map((bank) => (
                      <Badge
                        key={bank}
                        variant="outline"
                        size="sm"
                        color="gray"
                      >
                        {bank}
                      </Badge>
                    ))}
                    {bucket.banks.size > 3 && (
                      <Badge variant="outline" size="sm" color="gray">
                        +{bucket.banks.size - 3}
                      </Badge>
                    )}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>
    </Box>
  );
};

export default LoanAmountsTable;
