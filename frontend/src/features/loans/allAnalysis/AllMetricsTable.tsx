/**
 * AllMetricsTable
 * Sortable, filterable table of all loan analysis results.
 */

import React, { useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Group,
  MultiSelect,
  Pagination,
  Progress,
  ScrollArea,
  Select,
  Slider,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import {
  IconCheck,
  IconSearch,
  IconSortAscending,
  IconSortDescending,
  IconX,
} from '@tabler/icons-react';
import rallyColors from '../../../theme/rallyColors';
import type { LoanAnalysisResult } from './loanAnalysisEngine';

interface AllMetricsTableProps {
  results: LoanAnalysisResult[];
}

type SortField =
  | 'bankName'
  | 'loanName'
  | 'method'
  | 'loanAmount'
  | 'irr'
  | 'npv'
  | 'monthlyPayment'
  | 'totalCost'
  | 'score'
  | 'guarantorRequired';

type SortDirection = 'asc' | 'desc';

const formatRials = (v: number): string => {
  if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B';
  if (v >= 1e6) return (v / 1e6).toFixed(0) + 'M';
  return v.toLocaleString('fa-IR');
};

const formatPct = (v: number | null): string => {
  if (v === null) return '—';
  return (v * 100).toFixed(2) + '٪';
};

const tableStyles = {
  table: { backgroundColor: rallyColors.card },
  th: {
    backgroundColor: rallyColors.bg,
    color: rallyColors.textSecondary,
    borderBottom: `1px solid ${rallyColors.border}`,
    padding: '10px 14px',
    whiteSpace: 'nowrap' as const,
  },
  td: {
    color: rallyColors.textPrimary,
    borderBottom: `1px solid ${rallyColors.border}`,
    padding: '10px 14px',
  },
};

const inputStyles = {
  input: {
    backgroundColor: rallyColors.elevated,
    borderColor: rallyColors.border,
    color: rallyColors.textPrimary,
  },
};

interface SortHeaderProps {
  field: SortField;
  currentField: SortField;
  direction: SortDirection;
  onSort: (field: SortField) => void;
  children: React.ReactNode;
}

const SortHeader: React.FC<SortHeaderProps> = ({ field, currentField, direction, onSort, children }) => (
  <Table.Th
    style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'right', whiteSpace: 'nowrap' }}
    onClick={() => onSort(field)}
  >
    <Group gap={4} justify="flex-end" wrap="nowrap">
      <Text size="xs" fw={600} c={rallyColors.textSecondary}>
        {children}
      </Text>
      {currentField === field &&
        (direction === 'asc' ? (
          <IconSortAscending size={13} color={rallyColors.textDimmed} />
        ) : (
          <IconSortDescending size={13} color={rallyColors.textDimmed} />
        ))}
    </Group>
  </Table.Th>
);

const AllMetricsTable: React.FC<AllMetricsTableProps> = ({ results }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);
  const [noGuarantorOnly, setNoGuarantorOnly] = useState(false);
  const [minScore, setMinScore] = useState(0);
  const [sortField, setSortField] = useState<SortField>('score');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Unique method values for MultiSelect
  const methodOptions = useMemo(() => {
    const methods = Array.from(new Set(results.map((r) => r.method).filter(Boolean)));
    return methods.map((m) => ({ value: m, label: m }));
  }, [results]);

  const filteredResults = useMemo(() => {
    let data = [...results];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(
        (r) =>
          r.bankName.toLowerCase().includes(q) ||
          r.loanName.toLowerCase().includes(q),
      );
    }

    if (selectedMethods.length > 0) {
      data = data.filter((r) => selectedMethods.includes(r.method));
    }

    if (noGuarantorOnly) {
      data = data.filter((r) => !r.guarantorRequired);
    }

    if (minScore > 0) {
      data = data.filter((r) => r.score >= minScore);
    }

    return data;
  }, [results, searchQuery, selectedMethods, noGuarantorOnly, minScore]);

  const sortedResults = useMemo(() => {
    const sorted = [...filteredResults];
    sorted.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal, 'fa')
          : bVal.localeCompare(aVal, 'fa');
      }
      if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
        return sortDirection === 'asc'
          ? Number(aVal) - Number(bVal)
          : Number(bVal) - Number(aVal);
      }
      const numA = Number(aVal ?? 0);
      const numB = Number(bVal ?? 0);
      return sortDirection === 'asc' ? numA - numB : numB - numA;
    });
    return sorted;
  }, [filteredResults, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedResults.length / pageSize);
  const pageData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedResults.slice(start, start + pageSize);
  }, [sortedResults, page, pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setPage(1);
  };

  const sortHeaderProps = { currentField: sortField, direction: sortDirection, onSort: handleSort };

  return (
    <Stack gap="md">
      {/* Filters */}
      <Box
        p="md"
        style={{
          backgroundColor: rallyColors.card,
          borderRadius: 10,
          border: `1px solid ${rallyColors.border}`,
        }}
      >
        <Stack gap="sm">
          <Group grow wrap="wrap">
            <TextInput
              placeholder="جستجوی بانک یا نام وام..."
              leftSection={<IconSearch size={15} />}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.currentTarget.value);
                setPage(1);
              }}
              styles={inputStyles}
            />
            <MultiSelect
              placeholder="فیلتر روش محاسبه"
              data={methodOptions}
              value={selectedMethods}
              onChange={(v) => {
                setSelectedMethods(v);
                setPage(1);
              }}
              clearable
              styles={inputStyles}
            />
          </Group>

          <Group gap="xl" wrap="wrap">
            <Switch
              label="بدون ضامن"
              checked={noGuarantorOnly}
              onChange={(e) => {
                setNoGuarantorOnly(e.currentTarget.checked);
                setPage(1);
              }}
              color="violet"
            />

            <Stack gap={4} style={{ flex: 1, minWidth: 200 }}>
              <Group justify="space-between">
                <Text size="xs" c={rallyColors.textSecondary}>
                  حداقل امتیاز
                </Text>
                <Text size="xs" fw={600} c="#BB86FC">
                  {minScore}
                </Text>
              </Group>
              <Slider
                value={minScore}
                onChange={(v) => {
                  setMinScore(v);
                  setPage(1);
                }}
                min={0}
                max={100}
                step={5}
                styles={{
                  bar: { background: 'linear-gradient(to right, #BB86FC, #9b59d0)' },
                  thumb: { borderColor: '#BB86FC', backgroundColor: '#BB86FC' },
                }}
              />
            </Stack>

            <Text size="sm" c={rallyColors.textDimmed}>
              {filteredResults.length.toLocaleString('fa-IR')} از {results.length.toLocaleString('fa-IR')} وام
            </Text>
          </Group>
        </Stack>
      </Box>

      {/* Table */}
      <Box
        style={{
          backgroundColor: rallyColors.card,
          borderRadius: 10,
          border: `1px solid ${rallyColors.border}`,
          overflow: 'hidden',
        }}
      >
        <ScrollArea>
          <Table
            striped={false}
            highlightOnHover
            withColumnBorders={false}
            styles={tableStyles}
          >
            <Table.Thead>
              <Table.Tr>
                <SortHeader field="bankName" {...sortHeaderProps}>بانک</SortHeader>
                <SortHeader field="loanName" {...sortHeaderProps}>نام وام</SortHeader>
                <SortHeader field="method" {...sortHeaderProps}>روش</SortHeader>
                <SortHeader field="loanAmount" {...sortHeaderProps}>مبلغ وام</SortHeader>
                <SortHeader field="irr" {...sortHeaderProps}>IRR سالانه</SortHeader>
                <SortHeader field="npv" {...sortHeaderProps}>NPV</SortHeader>
                <SortHeader field="monthlyPayment" {...sortHeaderProps}>قسط ماهانه</SortHeader>
                <SortHeader field="totalCost" {...sortHeaderProps}>هزینه کل</SortHeader>
                <SortHeader field="score" {...sortHeaderProps}>امتیاز</SortHeader>
                <SortHeader field="guarantorRequired" {...sortHeaderProps}>ضامن</SortHeader>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {pageData.map((row) => (
                <Table.Tr key={`${row.productId}-${row.bankName}`}>
                  <Table.Td style={{ textAlign: 'right', fontWeight: 500 }}>
                    {row.bankName}
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Text size="sm" c={rallyColors.textPrimary}>
                      {row.loanName}
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    {row.method ? (
                      <Badge
                        size="sm"
                        variant="light"
                        color="violet"
                        styles={{ root: { maxWidth: 120 } }}
                      >
                        {row.method}
                      </Badge>
                    ) : (
                      <Text size="sm" c={rallyColors.textDimmed}>—</Text>
                    )}
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right', fontWeight: 500 }}>
                    {formatRials(row.loanAmount)}
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    {row.irr !== null ? (
                      <Text
                        size="sm"
                        fw={600}
                        c={row.irr > 0 ? rallyColors.green : rallyColors.red}
                      >
                        {formatPct(row.irr)}
                      </Text>
                    ) : (
                      <Text size="sm" c={rallyColors.textDimmed}>—</Text>
                    )}
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Text
                      size="sm"
                      fw={500}
                      c={row.npv >= 0 ? rallyColors.green : rallyColors.red}
                    >
                      {formatRials(row.npv)}
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    {formatRials(row.monthlyPayment)}
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    {formatRials(row.totalCost)}
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right', minWidth: 110 }}>
                    <Stack gap={4}>
                      <Group justify="space-between">
                        <Text size="xs" fw={600} c={
                          row.score >= 70
                            ? rallyColors.green
                            : row.score >= 40
                            ? rallyColors.yellow
                            : rallyColors.red
                        }>
                          {Math.round(row.score)}
                        </Text>
                      </Group>
                      <Progress
                        value={row.score}
                        size="xs"
                        color={
                          row.score >= 70 ? 'teal' : row.score >= 40 ? 'yellow' : 'red'
                        }
                        styles={{ root: { backgroundColor: rallyColors.elevated } }}
                      />
                    </Stack>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'center' }}>
                    {row.guarantorRequired ? (
                      <IconCheck size={16} color={rallyColors.red} />
                    ) : (
                      <IconX size={16} color={rallyColors.green} />
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
              {pageData.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={10} style={{ textAlign: 'center', padding: '2rem' }}>
                    <Text c={rallyColors.textDimmed}>هیچ وامی با این فیلترها یافت نشد</Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Box>

      {/* Pagination */}
      <Group justify="space-between">
        <Group gap="sm">
          <Text size="sm" c={rallyColors.textDimmed}>تعداد در صفحه:</Text>
          <Select
            size="xs"
            value={String(pageSize)}
            onChange={(v) => {
              setPageSize(Number(v));
              setPage(1);
            }}
            data={['25', '50', '100']}
            style={{ width: 80 }}
            styles={inputStyles}
          />
        </Group>
        {totalPages > 1 && (
          <Pagination value={page} onChange={setPage} total={totalPages} size="sm" />
        )}
      </Group>
    </Stack>
  );
};

export default AllMetricsTable;
