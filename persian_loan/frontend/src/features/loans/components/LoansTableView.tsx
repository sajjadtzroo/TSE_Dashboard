import React, { useState, useMemo } from 'react';
import {
  Table,
  Badge,
  ActionIcon,
  Tooltip,
  Checkbox,
  Text,
  Box,
  Group,
  UnstyledButton,
} from '@mantine/core';
import { IconEye, IconArrowsExchange, IconArrowUp, IconArrowDown } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import type { LoanWithBank } from '../../../types';
import rallyColors from '@/theme/rallyColors';

interface LoansTableViewProps {
  loans: LoanWithBank[];
  onToggleSelection: (loan: LoanWithBank) => void;
  isLoanSelected: (loanId: string) => boolean;
}

type SortField = 'bankName' | 'loanName' | 'rate' | 'amount' | 'category' | 'guarantor';
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
        <Text size="sm" fw={500} c={isActive ? rallyColors.textPrimary : rallyColors.textSecondary}>
          {label}
        </Text>
        {isActive &&
          (sortOrder === 'asc' ? (
            <IconArrowUp size={14} color={rallyColors.textPrimary} />
          ) : (
            <IconArrowDown size={14} color={rallyColors.textPrimary} />
          ))}
      </Group>
    </UnstyledButton>
  );
}

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
  const getRateColor = (rate: number): string => {
    if (rate === 0) return 'gray';
    if (rate < 15) return 'green';
    if (rate <= 20) return 'yellow';
    return 'red';
  };

  // Handle row click
  const handleRowClick = (loan: LoanWithBank) => {
    navigate(`/loans/${loan.bankId}/${loan.id}`);
  };

  return (
    <Table.ScrollContainer minWidth={650}>
      <Table
        verticalSpacing="sm"
        horizontalSpacing="sm"
        striped
        highlightOnHover
        style={{ direction: 'rtl' }}
      >
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ width: 40 }}>
              <Tooltip label="انتخاب برای مقایسه">
                <Box>
                  <IconArrowsExchange size={18} color={rallyColors.textSecondary} />
                </Box>
              </Tooltip>
            </Table.Th>
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
              <SortableHeader label="مبلغ حداکثر" field="amount" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
            </Table.Th>
            <Table.Th>
              <SortableHeader label="ضامن" field="guarantor" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
            </Table.Th>
            <Table.Th>
              <SortableHeader label="دسته‌بندی" field="category" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
            </Table.Th>
            <Table.Th style={{ textAlign: 'center' }}>
              <Text size="sm" fw={500} c={rallyColors.textSecondary}>عملیات</Text>
            </Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {sortedLoans.map((loan) => (
            <Table.Tr
              key={`${loan.bankId}-${loan.id}`}
              style={{
                cursor: 'pointer',
                backgroundColor: isLoanSelected(loan.id) ? `${rallyColors.blue}15` : undefined,
              }}
              onClick={() => handleRowClick(loan)}
            >
              <Table.Td onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={isLoanSelected(loan.id)}
                  onChange={() => onToggleSelection(loan)}
                />
              </Table.Td>
              <Table.Td>
                <Text size="sm" fw={500}>
                  {loan.bankNameFA || loan.bankId}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm">{loan.nameFA}</Text>
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
                  <Text size="sm" c={rallyColors.textSecondary}>نامشخص</Text>
                )}
              </Table.Td>
              <Table.Td>
                <Text size="sm">{loan.maxAmountFA || loan.maxAmount || '-'}</Text>
              </Table.Td>
              <Table.Td>
                <Badge
                  color={loan.guarantor ? 'gray' : 'green'}
                  size="sm"
                  variant="outline"
                >
                  {loan.guarantor ? 'دارد' : 'ندارد'}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Text size="sm" c={rallyColors.textSecondary}>
                  {loan.categoryFA || loan.category || '-'}
                </Text>
              </Table.Td>
              <Table.Td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                <Tooltip label="مشاهده جزئیات">
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    onClick={() => handleRowClick(loan)}
                  >
                    <IconEye size={16} />
                  </ActionIcon>
                </Tooltip>
              </Table.Td>
            </Table.Tr>
          ))}
          {sortedLoans.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={8}>
                <Text ta="center" py="lg" c={rallyColors.textSecondary}>
                  هیچ وامی یافت نشد
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
};

export default LoansTableView;
