import React, { useState, useMemo } from 'react';
import {
  Box,
  Table,
  Button,
  Text,
  Badge,
  Group,
  Tooltip,
  ActionIcon,
  Card,
} from '@mantine/core';
import { IconDownload, IconExternalLink } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import rallyColors from '../../../../theme/rallyColors';
import type { Bank, LoanWithBank } from '../../../../types';
import { toPersianNum } from '../../../../utils/formatUtils';
import SortableHeader from '../../components/SortableHeader';
import { exportToCSV } from '../../../../utils/csv';
import { extractAmount, extractRate } from '../../../../utils/loans/parsers';

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

  // Format amount
  const formatAmount = (amount: number): string => {
    if (amount === 0) return 'نامشخص';
    if (amount >= 1000000) {
      return `${toPersianNum((amount / 1000000).toFixed(0))} میلیون`;
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
    navigate(`/loans/banks/${bankId}`);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['نام بانک', 'دسته‌بندی', 'تعداد وام', 'وام بدون ضامن', 'میانگین نرخ سود', 'حداکثر مبلغ'];
    const rows = sortedSummaries.map(summary => [
      summary.nameFA,
      summary.categoryFA,
      summary.loanCount.toString(),
      summary.noGuarantorCount.toString(),
      summary.avgRate > 0 ? `${summary.avgRate.toFixed(1)}%` : 'نامشخص',
      summary.maxAmountFormatted,
    ]);
    exportToCSV(headers, rows, 'bank-summary');
  };

  // Get category color
  const getCategoryColor = (category: string): string => {
    return category === 'digital-banks' ? 'blue' : 'gray';
  };

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
            نمایش {sortedSummaries.length} بانک
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
                <SortableHeader label="نام بانک" field="name" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
              </Table.Th>
              <Table.Th style={{ textAlign: 'center' }}>
                <SortableHeader label="دسته‌بندی" field="category" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
              </Table.Th>
              <Table.Th style={{ textAlign: 'center' }}>
                <SortableHeader label="تعداد وام" field="loanCount" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
              </Table.Th>
              <Table.Th style={{ textAlign: 'center' }}>
                <SortableHeader label="بدون ضامن" field="noGuarantorCount" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
              </Table.Th>
              <Table.Th style={{ textAlign: 'center' }}>
                <SortableHeader label="میانگین نرخ" field="avgRate" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
              </Table.Th>
              <Table.Th style={{ textAlign: 'center' }}>
                <SortableHeader label="حداکثر مبلغ" field="maxAmount" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
              </Table.Th>
              <Table.Th style={{ textAlign: 'center' }}>
                <Text fw={500} size="sm" c={rallyColors.textPrimary}>عملیات</Text>
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sortedSummaries.map((summary) => (
              <Table.Tr
                key={summary.id}
                style={{ cursor: 'pointer' }}
                onClick={() => handleRowClick(summary.id)}
              >
                <Table.Td>
                  <Text size="sm" fw={500} c={rallyColors.textPrimary}>
                    {summary.nameFA}
                  </Text>
                </Table.Td>
                <Table.Td style={{ textAlign: 'center' }}>
                  <Badge
                    variant="outline"
                    color={getCategoryColor(summary.category)}
                    size="sm"
                  >
                    {summary.categoryFA}
                  </Badge>
                </Table.Td>
                <Table.Td style={{ textAlign: 'center' }}>
                  <Badge variant="light" color="gray" size="sm">
                    {summary.loanCount}
                  </Badge>
                </Table.Td>
                <Table.Td style={{ textAlign: 'center' }}>
                  <Badge
                    variant={summary.noGuarantorCount > 0 ? 'filled' : 'outline'}
                    color={summary.noGuarantorCount > 0 ? 'green' : 'gray'}
                    size="sm"
                  >
                    {summary.noGuarantorCount}
                  </Badge>
                </Table.Td>
                <Table.Td style={{ textAlign: 'center' }}>
                  <Text size="sm" c={rallyColors.textPrimary}>
                    {summary.avgRate > 0 ? `${toPersianNum(summary.avgRate.toFixed(1))}%` : 'نامشخص'}
                  </Text>
                </Table.Td>
                <Table.Td style={{ textAlign: 'center' }}>
                  <Text size="sm" c={rallyColors.textPrimary}>
                    {summary.maxAmountFormatted}
                  </Text>
                </Table.Td>
                <Table.Td style={{ textAlign: 'center' }}>
                  <Tooltip label="مشاهده جزئیات">
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowClick(summary.id);
                      }}
                    >
                      <IconExternalLink size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>
    </Box>
  );
};

export default BankSummaryTable;
