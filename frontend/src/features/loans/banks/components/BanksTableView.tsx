import React, { useState, useMemo } from 'react';
import {
  Table,
  Badge,
  ActionIcon,
  Tooltip,
  Text,
  ScrollArea,
  UnstyledButton,
  Group,
  Center,
} from '@mantine/core';
import { IconExternalLink, IconArrowUp, IconArrowDown } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import rallyColors from '../../../../theme/rallyColors';
import type { Bank } from '../../../../types';

interface BanksTableViewProps {
  banks: Bank[];
}

type SortField = 'name' | 'category' | 'type' | 'loanCount';
type SortOrder = 'asc' | 'desc';

const BanksTableView: React.FC<BanksTableViewProps> = ({ banks }) => {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const navigate = useNavigate();

  // Sort banks
  const sortedBanks = useMemo(() => {
    const sorted = [...banks];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.nameFA.localeCompare(b.nameFA, 'fa');
          break;
        case 'category':
          const aCat = a.category === 'digital-banks' ? 'دیجیتال' : 'سنتی';
          const bCat = b.category === 'digital-banks' ? 'دیجیتال' : 'سنتی';
          comparison = aCat.localeCompare(bCat, 'fa');
          break;
        case 'type':
          comparison = (a.type || '').localeCompare(b.type || '', 'fa');
          break;
        case 'loanCount':
          comparison = (a.loansCount || 0) - (b.loansCount || 0);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [banks, sortField, sortOrder]);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Get category color
  const getCategoryColor = (category: string): string => {
    return category === 'digital-banks' ? 'violet' : 'blue';
  };

  // Get category label
  const getCategoryLabel = (category: string): string => {
    return category === 'digital-banks' ? 'بانک دیجیتال' : 'بانک سنتی';
  };

  // Get type label
  const getTypeLabel = (type?: string): string => {
    if (!type) return '-';
    const typeMap: Record<string, string> = {
      neobank: 'نئوبانک',
      public: 'دولتی',
      private: 'خصوصی',
      'semi-private': 'نیمه خصوصی',
    };
    return typeMap[type] || type;
  };

  // Handle row click
  const handleRowClick = (bankId: string) => {
    navigate(`/loans/banks/${bankId}`);
  };

  // Sort header helper
  const SortHeader = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <UnstyledButton onClick={() => handleSort(field)}>
      <Group gap={4} wrap="nowrap">
        <Text size="sm" fw={600} c={rallyColors.textSecondary}>
          {children}
        </Text>
        {sortField === field &&
          (sortOrder === 'asc' ? (
            <IconArrowUp size={14} color={rallyColors.textSecondary} />
          ) : (
            <IconArrowDown size={14} color={rallyColors.textSecondary} />
          ))}
      </Group>
    </UnstyledButton>
  );

  return (
    <ScrollArea>
      <Table
        withTableBorder
        withRowBorders
        highlightOnHover
        style={{ minWidth: 650, direction: 'rtl' }}
      >
        <Table.Thead>
          <Table.Tr style={{ backgroundColor: rallyColors.card }}>
            <Table.Th style={{ padding: '10px 16px' }}>
              <SortHeader field="name">نام بانک</SortHeader>
            </Table.Th>
            <Table.Th style={{ textAlign: 'center', padding: '10px 16px' }}>
              <SortHeader field="category">دسته‌بندی</SortHeader>
            </Table.Th>
            <Table.Th style={{ textAlign: 'center', padding: '10px 16px' }}>
              <SortHeader field="type">نوع</SortHeader>
            </Table.Th>
            <Table.Th style={{ textAlign: 'center', padding: '10px 16px' }}>
              <SortHeader field="loanCount">تعداد وام</SortHeader>
            </Table.Th>
            <Table.Th style={{ padding: '10px 16px' }}>
              <Text size="sm" fw={600} c={rallyColors.textSecondary}>
                وب‌سایت
              </Text>
            </Table.Th>
            <Table.Th style={{ textAlign: 'center', padding: '10px 16px' }}>
              <Text size="sm" fw={600} c={rallyColors.textSecondary}>
                عملیات
              </Text>
            </Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {sortedBanks.map((bank) => (
            <Table.Tr
              key={bank.id}
              style={{ cursor: 'pointer' }}
              onClick={() => handleRowClick(bank.id)}
            >
              <Table.Td style={{ padding: '10px 16px' }}>
                <Text fw={500} c={rallyColors.textPrimary}>
                  {bank.nameFA}
                </Text>
                {bank.nameEN && (
                  <Text size="xs" c={rallyColors.textDimmed} mt={2}>
                    {bank.nameEN}
                  </Text>
                )}
              </Table.Td>
              <Table.Td style={{ textAlign: 'center', padding: '10px 16px' }}>
                <Badge
                  color={getCategoryColor(bank.category)}
                  variant="outline"
                  size="sm"
                >
                  {getCategoryLabel(bank.category)}
                </Badge>
              </Table.Td>
              <Table.Td style={{ textAlign: 'center', padding: '10px 16px' }}>
                <Text c={rallyColors.textSecondary}>
                  {getTypeLabel(bank.type)}
                </Text>
              </Table.Td>
              <Table.Td style={{ textAlign: 'center', padding: '10px 16px' }}>
                <Badge color="gray" variant="light" size="sm">
                  {bank.loansCount || 0}
                </Badge>
              </Table.Td>
              <Table.Td style={{ padding: '10px 16px' }}>
                {bank.website ? (
                  <Text
                    component="a"
                    href={bank.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    size="sm"
                    c={rallyColors.blue}
                    style={{ textDecoration: 'none' }}
                  >
                    {bank.website.replace(/^https?:\/\//, '')}
                  </Text>
                ) : (
                  <Text c={rallyColors.textDimmed}>-</Text>
                )}
              </Table.Td>
              <Table.Td
                style={{ textAlign: 'center', padding: '10px 16px' }}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                <Tooltip label="مشاهده جزئیات">
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    onClick={() => handleRowClick(bank.id)}
                  >
                    <IconExternalLink size={16} />
                  </ActionIcon>
                </Tooltip>
              </Table.Td>
            </Table.Tr>
          ))}
          {sortedBanks.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={6}>
                <Center py="lg">
                  <Text c={rallyColors.textDimmed}>
                    هیچ بانکی یافت نشد
                  </Text>
                </Center>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );
};

export default BanksTableView;
