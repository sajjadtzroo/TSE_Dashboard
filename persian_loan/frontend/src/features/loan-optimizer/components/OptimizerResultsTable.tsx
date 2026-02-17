/**
 * Optimizer Results Table Component
 * Displays all analyzed loans in a sortable, filterable table using Mantine
 */

import React, { useMemo, memo, useState, useCallback } from 'react';
import {
  Box, Text, Badge, Collapse, Table, ScrollArea, Group,
  ActionIcon, TextInput, Stack, Pagination, Select,
} from '@mantine/core';
import {
  IconChevronDown, IconChevronUp, IconSearch,
  IconSortAscending, IconSortDescending,
} from '@tabler/icons-react';
import rallyColors from '../../../theme/rallyColors';
import type { LoanAnalysisResult } from '../types';
import { LoanCalculationDetail } from './LoanCalculationDetail';

interface OptimizerResultsTableProps {
  data: LoanAnalysisResult[];
  onlySuitable?: boolean;
}

const getPercentileColor = (percentile?: number): string => {
  if (percentile === undefined) return rallyColors.textSecondary;
  if (percentile < 0.1) return rallyColors.green;
  if (percentile > 0.9) return rallyColors.red;
  return rallyColors.textSecondary;
};

const getPercentileBgColor = (percentile?: number): string => {
  if (percentile === undefined) return 'transparent';
  if (percentile < 0.1) return 'rgba(16, 185, 129, 0.1)';
  if (percentile > 0.9) return 'rgba(239, 68, 68, 0.1)';
  return 'transparent';
};

const formatAmount = (amount: number): string => {
  return (amount / 1_000_000).toLocaleString('fa-IR', { maximumFractionDigits: 0 }) + ' م';
};

const formatPercent = (value: number): string => {
  return (value * 100).toLocaleString('fa-IR', { maximumFractionDigits: 2 }) + '%';
};

const RecommendationBadge: React.FC<{ recommendation: string }> = memo(({ recommendation }) => {
  const config = {
    'WAIT': { label: 'منتظر بمانید', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
    'BUY_PRIVILEGE': { label: 'خرید امتیاز', color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.1)' },
    'NEGOTIATE': { label: 'مذاکره کنید', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)' },
    'REJECT': { label: 'رد کنید', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' }
  }[recommendation] || { label: recommendation, color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.1)' };

  return (
    <Badge
      size="sm"
      styles={{
        root: { backgroundColor: config.bgColor, color: config.color, fontWeight: 500, fontSize: '0.75rem', height: 24 },
      }}
    >
      {config.label}
    </Badge>
  );
});

const StatusIndicator: React.FC<{ meetsRequirement: boolean }> = memo(({ meetsRequirement }) => (
  <Box
    style={{
      width: 12, height: 12, borderRadius: '50%',
      backgroundColor: meetsRequirement ? rallyColors.green : rallyColors.textDimmed,
      margin: '0 auto',
    }}
    title={meetsRequirement ? 'مناسب' : 'نامناسب'}
  />
));

type SortField = 'bankNameFA' | 'loanNameFA' | 'loanAmount' | 'npv' | 'irr' | 'monthlyPayment' | 'totalCost' | 'effectiveRate' | 'riskScore';
type SortDirection = 'asc' | 'desc';

const OptimizerResultsTable: React.FC<OptimizerResultsTableProps> = ({
  data,
  onlySuitable = false
}) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('riskScore');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const filteredData = useMemo(() => {
    let result = onlySuitable ? data.filter((loan) => loan.meetsRequirement) : data;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((loan) =>
        loan.bankNameFA.toLowerCase().includes(q) || loan.loanNameFA.toLowerCase().includes(q)
      );
    }
    return result;
  }, [data, onlySuitable, searchQuery]);

  const sortedData = useMemo(() => {
    const sorted = [...filteredData];
    sorted.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal, 'fa') : bVal.localeCompare(aVal, 'fa');
      }
      const numA = Number(aVal) || 0;
      const numB = Number(bVal) || 0;
      return sortDirection === 'asc' ? numA - numB : numB - numA;
    });
    return sorted;
  }, [filteredData, sortField, sortDirection]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, page, pageSize]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const toggleRowExpansion = useCallback((rowId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) newSet.delete(rowId);
      else newSet.add(rowId);
      return newSet;
    });
  }, []);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }, [sortField]);

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Table.Th
      style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'right', whiteSpace: 'nowrap' }}
      onClick={() => handleSort(field)}
    >
      <Group gap={4} justify="flex-end">
        <Text size="xs" fw={600} c={rallyColors.textSecondary}>{children}</Text>
        {sortField === field && (
          sortDirection === 'asc' ? <IconSortAscending size={14} /> : <IconSortDescending size={14} />
        )}
      </Group>
    </Table.Th>
  );

  if (filteredData.length === 0 && !searchQuery) {
    return (
      <Box p="xl" style={{ backgroundColor: rallyColors.card, borderRadius: 8, border: `1px solid ${rallyColors.border}`, textAlign: 'center' }}>
        <Text size="lg" c={rallyColors.textSecondary}>هیچ وامی یافت نشد</Text>
      </Box>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <TextInput
          placeholder="جستجوی بانک یا وام..."
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.currentTarget.value); setPage(1); }}
          style={{ minWidth: 280 }}
          styles={{ input: { backgroundColor: rallyColors.elevated, borderColor: rallyColors.border, color: rallyColors.textPrimary } }}
        />
        <Text size="sm" c={rallyColors.textDimmed}>
          تعداد: {filteredData.length.toLocaleString('fa-IR')} از {data.length.toLocaleString('fa-IR')}
        </Text>
      </Group>

      <Box style={{ backgroundColor: rallyColors.card, borderRadius: 8, border: `1px solid ${rallyColors.border}`, overflow: 'hidden' }}>
        <ScrollArea>
          <Table striped={false} highlightOnHover withColumnBorders={false}
            styles={{
              table: { backgroundColor: rallyColors.card },
              th: { backgroundColor: rallyColors.bg, color: rallyColors.textSecondary, borderBottom: `1px solid ${rallyColors.border}`, padding: '12px 16px' },
              td: { color: rallyColors.textPrimary, borderBottom: `1px solid ${rallyColors.border}`, padding: '12px 16px' },
              tr: { '&:hover': { backgroundColor: rallyColors.hover } },
            }}
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ width: 50, textAlign: 'center' }} />
                <SortHeader field="bankNameFA">بانک</SortHeader>
                <SortHeader field="loanNameFA">نام وام</SortHeader>
                <Table.Th style={{ textAlign: 'right' }}><Text size="xs" fw={600} c={rallyColors.textSecondary}>ضریب سپرده</Text></Table.Th>
                <SortHeader field="loanAmount">مبلغ وام</SortHeader>
                <SortHeader field="npv">NPV</SortHeader>
                <SortHeader field="irr">IRR</SortHeader>
                <SortHeader field="monthlyPayment">قسط ماهانه</SortHeader>
                <SortHeader field="totalCost">هزینه کل</SortHeader>
                <SortHeader field="effectiveRate">نرخ مؤثر</SortHeader>
                <SortHeader field="riskScore">امتیاز</SortHeader>
                <Table.Th style={{ textAlign: 'right' }}><Text size="xs" fw={600} c={rallyColors.textSecondary}>سر‌به‌سر</Text></Table.Th>
                <Table.Th style={{ textAlign: 'right' }}><Text size="xs" fw={600} c={rallyColors.textSecondary}>حداکثر انتظار</Text></Table.Th>
                <Table.Th style={{ textAlign: 'right' }}><Text size="xs" fw={600} c={rallyColors.textSecondary}>توصیه</Text></Table.Th>
                <Table.Th style={{ textAlign: 'center', width: 60 }}><Text size="xs" fw={600} c={rallyColors.textSecondary}>وضعیت</Text></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {paginatedData.map((loan) => {
                const rowId = `${loan.loanId}-${loan.bankNameFA}`;
                const isExpanded = expandedRows.has(rowId);
                return (
                  <React.Fragment key={rowId}>
                    <Table.Tr style={{ cursor: 'pointer' }} onClick={() => toggleRowExpansion(rowId)}>
                      <Table.Td style={{ textAlign: 'center' }}>
                        <ActionIcon variant="subtle" size="sm" style={{ color: rallyColors.green }}>
                          {isExpanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                        </ActionIcon>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>{loan.bankNameFA}</Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>{loan.loanNameFA}</Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="sm" fw={500} c={loan.depositMultiplier !== null ? rallyColors.green : rallyColors.textDimmed}>
                          {loan.depositRatioLabel}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right', fontWeight: 500 }}>{formatAmount(loan.loanAmount)}</Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <span style={{ color: getPercentileColor(loan.percentileNPV), backgroundColor: getPercentileBgColor(loan.percentileNPV), padding: '4px 8px', borderRadius: 4, fontWeight: loan.percentileNPV !== undefined && loan.percentileNPV < 0.1 ? 600 : 500 }}>
                          {formatAmount(loan.npv)}
                        </span>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <span style={{ color: getPercentileColor(loan.percentileIRR), backgroundColor: getPercentileBgColor(loan.percentileIRR), padding: '4px 8px', borderRadius: 4 }}>
                          {formatPercent(loan.irr)}
                        </span>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right', fontWeight: 500 }}>{formatAmount(loan.monthlyPayment)}</Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <span style={{ color: getPercentileColor(loan.percentileCost), backgroundColor: getPercentileBgColor(loan.percentileCost), padding: '4px 8px', borderRadius: 4, fontWeight: 500 }}>
                          {formatAmount(loan.totalCost)}
                        </span>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{formatPercent(loan.effectiveRate)}</Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Badge size="sm" styles={{ root: {
                          backgroundColor: loan.riskScore >= 70 ? 'rgba(16, 185, 129, 0.1)' : loan.riskScore >= 40 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: loan.riskScore >= 70 ? rallyColors.green : loan.riskScore >= 40 ? rallyColors.yellow : rallyColors.red,
                          fontWeight: 600, fontSize: '0.875rem',
                        }}}>
                          {loan.riskScore.toLocaleString('fa-IR', { maximumFractionDigits: 0 })}
                        </Badge>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="sm" fw={600} c={rallyColors.textPrimary}>{formatAmount(loan.breakEvenPrivilegePrice)}</Text>
                        <Text size="xs" c={rallyColors.textDimmed}>حداکثر قیمت خرید</Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="sm" fw={600} c={loan.canAffordCurrentWait ? rallyColors.green : rallyColors.red}>
                          {loan.maxWaitMonths.toLocaleString('fa-IR', { maximumFractionDigits: 1 })} ماه
                        </Text>
                        <Text size="xs" c={loan.canAffordCurrentWait ? rallyColors.green : rallyColors.red}>
                          {loan.canAffordCurrentWait ? '✓ قابل قبول' : '✗ بیش از حد'}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <RecommendationBadge recommendation={loan.recommendation} />
                        {loan.reasoning && (
                          <Text size="xs" c={rallyColors.textDimmed} mt={4} style={{ maxWidth: 160 }}>
                            {loan.reasoning}
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>
                        <StatusIndicator meetsRequirement={loan.meetsRequirement} />
                      </Table.Td>
                    </Table.Tr>
                    {isExpanded && (
                      <Table.Tr>
                        <Table.Td colSpan={15} style={{ padding: 0 }}>
                          <Collapse in={isExpanded} transitionDuration={300}>
                            <Box p="md">
                              <LoanCalculationDetail loan={loan} />
                            </Box>
                          </Collapse>
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </React.Fragment>
                );
              })}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Box>

      <Group justify="space-between">
        <Group gap="sm">
          <Text size="sm" c={rallyColors.textDimmed}>تعداد در صفحه:</Text>
          <Select
            size="xs"
            value={String(pageSize)}
            onChange={(val) => { setPageSize(Number(val)); setPage(1); }}
            data={['25', '50', '100']}
            style={{ width: 80 }}
            styles={{ input: { backgroundColor: rallyColors.elevated, borderColor: rallyColors.border, color: rallyColors.textPrimary } }}
          />
        </Group>
        {totalPages > 1 && (
          <Pagination value={page} onChange={setPage} total={totalPages} size="sm" />
        )}
      </Group>
    </Stack>
  );
};

export default memo(OptimizerResultsTable);
