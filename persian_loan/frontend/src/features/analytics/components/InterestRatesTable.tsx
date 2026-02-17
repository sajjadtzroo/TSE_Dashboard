import React, { useState, useMemo } from 'react';
import {
  Box,
  Table,
  TextInput,
  Select,
  Button,
  Text,
  Badge,
  Group,
  Tooltip,
  Card,
  UnstyledButton,
} from '@mantine/core';
import { IconDownload, IconSearch, IconArrowUp, IconArrowDown } from '@tabler/icons-react';
import rallyColors from '../../../theme/rallyColors';
import type { LoanWithBank } from '../../../types';

interface InterestRatesTableProps {
  loans: LoanWithBank[];
  banks: Array<{ id: string; nameFA: string }>;
}

type SortField = 'bankName' | 'loanName' | 'rate' | 'category';
type SortOrder = 'asc' | 'desc';

function SortableHeader({
  label,
  field,
  sortField,
  sortOrder,
  onSort,
}: {
  label: string;
  field: SortField;
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
}) {
  const isActive = sortField === field;
  return (
    <UnstyledButton onClick={() => onSort(field)}>
      <Group gap={4} wrap="nowrap">
        <Text fw={isActive ? 700 : 500} size="sm" c={rallyColors.textPrimary}>
          {label}
        </Text>
        {isActive &&
          (sortOrder === 'asc' ? (
            <IconArrowUp size={14} color={rallyColors.blue} />
          ) : (
            <IconArrowDown size={14} color={rallyColors.blue} />
          ))}
      </Group>
    </UnstyledButton>
  );
}

const InterestRatesTable: React.FC<InterestRatesTableProps> = ({ loans, banks }) => {
  const [sortField, setSortField] = useState<SortField>('rate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [filterRate, setFilterRate] = useState<string | null>('all');
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
    if (filterRate && filterRate !== 'all') {
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
  const getRateColor = (rate: number): string => {
    if (rate === 0) return 'gray';
    if (rate < 15) return 'green';
    if (rate <= 20) return 'yellow';
    return 'red';
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
      <Card
        withBorder
        radius="md"
        p="sm"
        mb="sm"
        style={{ backgroundColor: rallyColors.card, borderColor: rallyColors.glassBorder }}
      >
        <Group gap="md" wrap="wrap">
          <TextInput
            placeholder="جستجو"
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            size="sm"
            style={{ minWidth: 200 }}
          />

          <Select
            placeholder="فیلتر نرخ"
            value={filterRate}
            onChange={setFilterRate}
            size="sm"
            style={{ minWidth: 150 }}
            data={[
              { value: 'all', label: 'همه' },
              { value: 'low', label: 'کمتر از 15%' },
              { value: 'medium', label: '15% - 20%' },
              { value: 'high', label: 'بیشتر از 20%' },
            ]}
          />

          <Box style={{ flexGrow: 1 }} />

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

        <Text size="sm" c={rallyColors.textSecondary} mt="xs">
          نمایش {sortedLoans.length} از {loans.length} وام
        </Text>
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
                <SortableHeader label="بانک" field="bankName" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
              </Table.Th>
              <Table.Th>
                <SortableHeader label="نام وام" field="loanName" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
              </Table.Th>
              <Table.Th>
                <SortableHeader label="نرخ سود" field="rate" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
              </Table.Th>
              <Table.Th>
                <SortableHeader label="دسته‌بندی" field="category" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
              </Table.Th>
              <Table.Th style={{ textAlign: 'center' }}>
                <Text fw={500} size="sm" c={rallyColors.textPrimary}>ضامن</Text>
              </Table.Th>
              <Table.Th style={{ textAlign: 'center' }}>
                <Text fw={500} size="sm" c={rallyColors.textPrimary}>مبلغ حداکثر</Text>
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sortedLoans.map((loan) => (
              <Table.Tr key={`${loan.bankId}-${loan.id}`}>
                <Table.Td>
                  <Text size="sm" fw={500} c={rallyColors.textPrimary}>
                    {loan.bankName}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c={rallyColors.textPrimary}>{loan.nameFA}</Text>
                </Table.Td>
                <Table.Td>
                  {loan.numericRate > 0 ? (
                    <Badge
                      color={getRateColor(loan.numericRate)}
                      size="sm"
                      fw={700}
                    >
                      {loan.interestRate}
                    </Badge>
                  ) : (
                    <Text size="sm" c={rallyColors.textSecondary}>
                      نامشخص
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c={rallyColors.textSecondary}>
                    {loan.categoryFA || '-'}
                  </Text>
                </Table.Td>
                <Table.Td style={{ textAlign: 'center' }}>
                  <Badge
                    variant="outline"
                    color={loan.guarantor ? 'gray' : 'green'}
                    size="sm"
                  >
                    {loan.guarantor ? 'دارد' : 'ندارد'}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c={rallyColors.textPrimary}>
                    {loan.maxAmountFA || loan.maxAmount || '-'}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
            {sortedLoans.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={6} style={{ textAlign: 'center' }}>
                  <Text size="sm" c={rallyColors.textSecondary} py="lg">
                    هیچ وامی یافت نشد
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Card>
    </Box>
  );
};

export default InterestRatesTable;
