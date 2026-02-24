/**
 * Calculator Results Component
 * Displays loan analysis results with charts and recommendations
 */

import React, { useState } from 'react';
import {
  Card,
  Text,
  Title,
  Badge,
  Group,
  Stack,
  SimpleGrid,
  Box,
  Table,
  UnstyledButton,
} from '@mantine/core';
import {
  IconTrendingUp,
  IconCurrencyDollar,
  IconAward,
  IconAlertCircle,
  IconChevronDown,
  IconChevronUp,
  IconActivity,
} from '@tabler/icons-react';
import rallyColors, { glassCard } from '@/theme/rallyColors';
import { formatCurrency } from '@/utils/loans/financialCalculations';
import { toPersianNum } from '@/utils/formatUtils';
import { LoanCFAMetrics } from '../loan-list/LoanCFAMetrics';
import type { LoanAnalysis, CalculatorInputs } from './types';
import type { LoanWithBank } from '@/types';

interface CalculatorResultsProps {
  results: LoanAnalysis[];
  inputs: CalculatorInputs;
}

export function CalculatorResults({ results, inputs }: CalculatorResultsProps) {
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);

  if (results.length === 0) {
    return (
      <Card padding="xl" radius="md" style={glassCard}>
        <Stack align="center" gap="md" py="xl">
          <IconAlertCircle size={64} color={rallyColors.textDimmed} />
          <Title order={4} c={rallyColors.textSecondary}>
            وامی پیدا نشد
          </Title>
          <Text size="sm" c={rallyColors.textSecondary}>
            با پارامترهای وارد شده، وام مناسبی یافت نشد. لطفاً مقادیر را تغییر دهید.
          </Text>
        </Stack>
      </Card>
    );
  }

  const topLoan = results[0];
  const bestIRR = results.reduce(
    (best, loan) => ((loan.irr || -999) > (best.irr || -999) ? loan : best),
    results[0]
  );
  const lowestCost = results.reduce(
    (best, loan) => (loan.totalCost < best.totalCost ? loan : best),
    results[0]
  );

  const toggleExpand = (loanId: string) => {
    setExpandedLoanId(expandedLoanId === loanId ? null : loanId);
  };

  return (
    <Stack gap="lg">
      {/* Summary Cards */}
      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
        {/* Best Overall */}
        <Card
          padding="sm"
          radius="md"
          style={{
            ...glassCard,
            border: `2px solid rgba(59, 130, 246, 0.5)`,
          }}
        >
          <Group gap="sm" align="flex-start">
            <Box
              style={{
                padding: 8,
                borderRadius: 8,
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
              }}
            >
              <IconAward size={20} color={rallyColors.blue} />
            </Box>
            <Box style={{ flex: 1 }}>
              <Text size="xs" c={rallyColors.textSecondary} mb={4}>
                بهترین توصیه
              </Text>
              <Text size="sm" fw={700} c={rallyColors.textPrimary}>
                {topLoan.loanNameFA}
              </Text>
              <Text size="xs" c={rallyColors.textSecondary} mt={4}>
                {topLoan.bankNameFA}
              </Text>
              <Group gap="sm" mt="sm">
                <Badge color="green" size="sm">
                  امتیاز: {Math.round(topLoan.score)}
                </Badge>
              </Group>
            </Box>
          </Group>
        </Card>

        {/* Best IRR */}
        <Card padding="sm" radius="md" style={glassCard}>
          <Group gap="sm" align="flex-start">
            <Box
              style={{
                padding: 8,
                borderRadius: 8,
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
              }}
            >
              <IconTrendingUp size={20} color={rallyColors.purple} />
            </Box>
            <Box style={{ flex: 1 }}>
              <Text size="xs" c={rallyColors.textSecondary} mb={4}>
                بیشترین IRR
              </Text>
              <Text size="sm" fw={700} c={rallyColors.textPrimary}>
                {bestIRR.loanNameFA}
              </Text>
              <Text size="xs" c={rallyColors.textSecondary} mt={4}>
                {bestIRR.bankNameFA}
              </Text>
              <Text size="lg" fw={700} c={rallyColors.purple} mt="sm">
                {bestIRR.irr ? `${toPersianNum((bestIRR.irr * 100).toFixed(1))}%` : 'N/A'}
              </Text>
            </Box>
          </Group>
        </Card>

        {/* Lowest Cost */}
        <Card padding="sm" radius="md" style={glassCard}>
          <Group gap="sm" align="flex-start">
            <Box
              style={{
                padding: 8,
                borderRadius: 8,
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
              }}
            >
              <IconCurrencyDollar size={20} color={rallyColors.green} />
            </Box>
            <Box style={{ flex: 1 }}>
              <Text size="xs" c={rallyColors.textSecondary} mb={4}>
                کمترین هزینه
              </Text>
              <Text size="sm" fw={700} c={rallyColors.textPrimary}>
                {lowestCost.loanNameFA}
              </Text>
              <Text size="xs" c={rallyColors.textSecondary} mt={4}>
                {lowestCost.bankNameFA}
              </Text>
              <Text size="xs" c={rallyColors.green} mt="sm">
                {formatCurrency(lowestCost.totalCost)}
              </Text>
            </Box>
          </Group>
        </Card>
      </SimpleGrid>

      {/* Top Recommendations */}
      <Card padding="md" radius="md" style={glassCard}>
        <Title order={4} c={rallyColors.textPrimary} mb="md">
          توصیه‌های برتر
        </Title>
        <Box style={{ overflowX: 'auto' }}>
          <Table
            striped
            highlightOnHover
            style={{ minWidth: '100%' }}
            styles={{
              table: { borderCollapse: 'separate', borderSpacing: 0 },
              thead: { backgroundColor: rallyColors.elevated },
              th: {
                color: rallyColors.textSecondary,
                fontSize: 12,
                fontWeight: 500,
                padding: '12px 16px',
              },
              td: { padding: '12px 16px', color: rallyColors.textSecondary },
              tr: {
                borderBottom: `1px solid ${rallyColors.glassBorder}`,
              },
            }}
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ textAlign: 'right' }}>رتبه</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>وام / بانک</Table.Th>
                <Table.Th style={{ textAlign: 'center' }}>مبلغ وام</Table.Th>
                <Table.Th style={{ textAlign: 'center' }}>نرخ بهره</Table.Th>
                <Table.Th style={{ textAlign: 'center' }}>IRR</Table.Th>
                <Table.Th style={{ textAlign: 'center' }}>MIRR</Table.Th>
                <Table.Th style={{ textAlign: 'center' }}>هزینه کل</Table.Th>
                <Table.Th style={{ textAlign: 'center' }}>قسط ماهانه</Table.Th>
                <Table.Th style={{ textAlign: 'center' }}>امتیاز</Table.Th>
                <Table.Th style={{ textAlign: 'center' }}>تحلیل CFA</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {results.slice(0, 10).map((loan, index) => {
                const isExpanded = expandedLoanId === loan.loanId;
                return (
                  <React.Fragment key={`${loan.bankId}-${loan.loanId}`}>
                    <Table.Tr>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text
                          size="sm"
                          fw={index < 3 ? 700 : undefined}
                          c={index < 3 ? rallyColors.blue : rallyColors.textSecondary}
                        >
                          #{index + 1}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="sm" fw={500} c={rallyColors.textPrimary}>
                          {loan.loanNameFA}
                        </Text>
                        <Text size="xs" c={rallyColors.textSecondary}>
                          {loan.bankNameFA}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>
                        <Text size="sm" c={rallyColors.textSecondary}>
                          {formatCurrency(loan.loanAmount)}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>
                        <Text size="sm" c={rallyColors.textSecondary}>
                          {toPersianNum((loan.interestRate * 100).toFixed(1))}%
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>
                        <Text
                          size="sm"
                          c={loan.irr && loan.irr > 0 ? rallyColors.green : rallyColors.red}
                        >
                          {loan.irr ? `${toPersianNum((loan.irr * 100).toFixed(1))}%` : 'N/A'}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>
                        <Text
                          size="sm"
                          c={loan.mirr && loan.mirr > 0 ? rallyColors.green : rallyColors.red}
                        >
                          {loan.mirr ? `${toPersianNum((loan.mirr * 100).toFixed(1))}%` : 'N/A'}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>
                        <Text size="sm" c={rallyColors.textSecondary}>
                          {formatCurrency(loan.totalCost)}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>
                        <Text size="sm" c={rallyColors.textSecondary}>
                          {formatCurrency(loan.monthlyPayment)}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>
                        <Badge
                          color={
                            loan.score >= 70
                              ? 'green'
                              : loan.score >= 50
                              ? 'blue'
                              : 'gray'
                          }
                          size="sm"
                        >
                          {Math.round(loan.score)}
                        </Badge>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>
                        <UnstyledButton
                          onClick={() => toggleExpand(loan.loanId)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '4px 12px',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            color: rallyColors.blue,
                            fontSize: 12,
                            fontWeight: 500,
                            borderRadius: 6,
                            transition: 'background-color 0.2s',
                          }}
                        >
                          <IconActivity size={12} />
                          {isExpanded ? (
                            <>
                              بستن
                              <IconChevronUp size={12} />
                            </>
                          ) : (
                            <>
                              مشاهده
                              <IconChevronDown size={12} />
                            </>
                          )}
                        </UnstyledButton>
                      </Table.Td>
                    </Table.Tr>
                    {isExpanded && (
                      <Table.Tr>
                        <Table.Td
                          colSpan={10}
                          style={{
                            padding: '24px 16px',
                            backgroundColor: rallyColors.bg,
                          }}
                        >
                          <LoanCFAMetrics
                            loan={loan as any as LoanWithBank}
                            depositAmount={inputs.depositAmount}
                            depositMonths={inputs.depositMonths}
                            loanMonths={inputs.loanMonths}
                            commission={inputs.commission}
                          />
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </React.Fragment>
                );
              })}
            </Table.Tbody>
          </Table>
        </Box>
      </Card>

      {/* Explanation */}
      <Card padding="sm" radius="md" style={glassCard}>
        <Stack gap="xs">
          <Title order={5} c={rallyColors.textPrimary}>
            راهنمای مفاهیم:
          </Title>
          <Box component="ul" style={{ paddingRight: 16, margin: 0 }}>
            <Text component="li" size="sm" c={rallyColors.textSecondary}>
              <strong>IRR (نرخ بازده داخلی):</strong> نرخ بازدهی که NPV را صفر می‌کند. بالاتر بهتر
              است.
            </Text>
            <Text component="li" size="sm" c={rallyColors.textSecondary}>
              <strong>MIRR (نرخ بازده داخلی اصلاح شده):</strong> نسخه بهبود یافته IRR با در نظر
              گرفتن بازده خارجی.
            </Text>
            <Text component="li" size="sm" c={rallyColors.textSecondary}>
              <strong>هزینه کل:</strong> مجموع سود و کارمزدهای پرداختی.
            </Text>
            <Text component="li" size="sm" c={rallyColors.textSecondary}>
              <strong>امتیاز:</strong> امتیاز کلی بر اساس تمام پارامترها (0-100). بالاتر بهتر است.
            </Text>
          </Box>
        </Stack>
      </Card>
    </Stack>
  );
}

export default CalculatorResults;
