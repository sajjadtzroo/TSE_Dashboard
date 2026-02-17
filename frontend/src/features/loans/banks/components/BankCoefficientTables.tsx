/**
 * Bank Coefficient Tables Component
 * Displays Vamino tables and coefficient tables with multiple fee scenarios
 */

import { memo } from 'react';
import { Card, Group, Stack, Title, Text, Box, Table } from '@mantine/core';
import { IconTable } from '@tabler/icons-react';
import rallyColors from '../../../../theme/rallyColors';
import type { Bank, CoefficientRow } from '@/types';

interface BankCoefficientTablesProps {
  bank: Bank;
}

export const BankCoefficientTables = memo(function BankCoefficientTables({
  bank,
}: BankCoefficientTablesProps) {
  const hasVaminoMonthly =
    bank.vaminoMonthlyTable && bank.vaminoMonthlyTable.length > 0;
  const hasVaminoInstallment =
    bank.vaminoInstallmentTable && bank.vaminoInstallmentTable.length > 0;
  const hasCoefficientTables =
    bank.coefficientTables && Object.keys(bank.coefficientTables).length > 0;

  if (!hasVaminoMonthly && !hasVaminoInstallment && !hasCoefficientTables) {
    return null;
  }

  return (
    <>
      {/* Vamino Monthly Table */}
      {hasVaminoMonthly && (
        <Card withBorder radius="md">
          <Group gap="xs" mb="md">
            <IconTable size={20} color={rallyColors.purple} />
            <Title order={4} c={rallyColors.textPrimary}>
              جدول وامینو ماهانه
            </Title>
          </Group>
          <Box style={{ overflowX: 'auto' }}>
            <Table striped={false} withTableBorder={false} fz="sm">
              <Table.Thead>
                <Table.Tr style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)' }}>
                  <Table.Th style={{ textAlign: 'right', color: rallyColors.purple, padding: '8px 16px' }}>
                    امتیاز مورد نیاز
                  </Table.Th>
                  <Table.Th style={{ textAlign: 'right', color: rallyColors.purple, padding: '8px 16px' }}>
                    مبلغ اعتبار
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {bank.vaminoMonthlyTable?.map((row, idx) => (
                  <Table.Tr
                    key={idx}
                    style={{
                      backgroundColor:
                        idx % 2 === 0
                          ? rallyColors.card
                          : 'rgba(139, 92, 246, 0.05)',
                    }}
                  >
                    <Table.Td style={{ padding: '8px 16px', color: rallyColors.textSecondary }}>
                      {row.points}
                    </Table.Td>
                    <Table.Td style={{ padding: '8px 16px', fontWeight: 500, color: rallyColors.purple }}>
                      {row.creditAmount}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Box>
        </Card>
      )}

      {/* Vamino Installment Table */}
      {hasVaminoInstallment && (
        <Card withBorder radius="md">
          <Group gap="xs" mb="md">
            <IconTable size={20} color={rallyColors.purple} />
            <Title order={4} c={rallyColors.textPrimary}>
              جدول وامینو اقساطی
            </Title>
          </Group>
          <Box style={{ overflowX: 'auto' }}>
            <Table striped={false} withTableBorder={false} fz="sm">
              <Table.Thead>
                <Table.Tr style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)' }}>
                  <Table.Th style={{ textAlign: 'right', color: rallyColors.purple, padding: '8px 12px' }}>
                    مبلغ
                  </Table.Th>
                  <Table.Th style={{ textAlign: 'right', color: rallyColors.purple, padding: '8px 12px' }}>
                    تعداد اقساط
                  </Table.Th>
                  <Table.Th style={{ textAlign: 'right', color: rallyColors.purple, padding: '8px 12px' }}>
                    امتیاز بدون حامی
                  </Table.Th>
                  <Table.Th style={{ textAlign: 'right', color: rallyColors.purple, padding: '8px 12px' }}>
                    امتیاز با حامی
                  </Table.Th>
                  <Table.Th style={{ textAlign: 'right', color: rallyColors.purple, padding: '8px 12px' }}>
                    رتبه اعتباری
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {bank.vaminoInstallmentTable?.map((row, idx) => (
                  <Table.Tr
                    key={idx}
                    style={{
                      backgroundColor:
                        idx % 2 === 0
                          ? rallyColors.card
                          : 'rgba(139, 92, 246, 0.05)',
                    }}
                  >
                    <Table.Td style={{ padding: '8px 12px', fontWeight: 500, color: rallyColors.textSecondary }}>
                      {row.amount}
                    </Table.Td>
                    <Table.Td style={{ padding: '8px 12px', color: rallyColors.textSecondary }}>
                      {row.months} ماه
                    </Table.Td>
                    <Table.Td style={{ padding: '8px 12px', color: rallyColors.textSecondary }}>
                      {row.pointsNoSupporter !== null
                        ? row.pointsNoSupporter?.toLocaleString()
                        : '-'}
                    </Table.Td>
                    <Table.Td style={{ padding: '8px 12px', fontWeight: 500, color: rallyColors.green }}>
                      {row.pointsWithSupporter?.toLocaleString()}
                    </Table.Td>
                    <Table.Td style={{ padding: '8px 12px', fontSize: '0.8rem', color: rallyColors.textDimmed }}>
                      {row.creditRating}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Box>
        </Card>
      )}

      {/* Coefficient Tables */}
      {hasCoefficientTables && (
        <Card withBorder radius="md">
          <Group gap="xs" mb="md">
            <IconTable size={20} color={rallyColors.green} />
            <Title order={4} c={rallyColors.textPrimary}>
              جداول ضرایب بر اساس کارمزد
            </Title>
          </Group>
          <Stack gap="lg">
            {Object.entries(bank.coefficientTables!).map(([feeKey, tableData]) => {
              const rows = tableData as CoefficientRow[];
              if (!rows || rows.length === 0) return null;

              const feeLabels: Record<string, string> = {
                zeroFee: 'بدون کارمزد (۰٪)',
                twoPercentFee: 'کارمزد ۲٪',
                fourPercentFee: 'کارمزد ۴٪',
              };

              return (
                <Box
                  key={feeKey}
                  style={{
                    border: `1px solid rgba(16, 185, 129, 0.25)`,
                    borderRadius: 8,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      padding: '8px 16px',
                      borderBottom: '1px solid rgba(16, 185, 129, 0.25)',
                    }}
                  >
                    <Text fw={500} c={rallyColors.green}>
                      {feeLabels[feeKey] || feeKey}
                    </Text>
                  </Box>
                  <Box style={{ overflowX: 'auto' }}>
                    <Table striped={false} withTableBorder={false} fz="sm">
                      <Table.Thead>
                        <Table.Tr style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                          {rows[0].depositMonths !== undefined && (
                            <Table.Th style={{ textAlign: 'right', color: rallyColors.green, padding: '8px 12px' }}>
                              مدت سپرده (ماه)
                            </Table.Th>
                          )}
                          {rows[0].avgMonths !== undefined && (
                            <Table.Th style={{ textAlign: 'right', color: rallyColors.green, padding: '8px 12px' }}>
                              مدت معدل (ماه)
                            </Table.Th>
                          )}
                          {rows[0].coefficient !== undefined && (
                            <Table.Th style={{ textAlign: 'right', color: rallyColors.green, padding: '8px 12px' }}>
                              ضریب
                            </Table.Th>
                          )}
                          {rows[0].loanPercent !== undefined && (
                            <Table.Th style={{ textAlign: 'right', color: rallyColors.green, padding: '8px 12px' }}>
                              درصد وام
                            </Table.Th>
                          )}
                          {rows[0].repaymentMonths !== undefined && (
                            <Table.Th style={{ textAlign: 'right', color: rallyColors.green, padding: '8px 12px' }}>
                              بازپرداخت (ماه)
                            </Table.Th>
                          )}
                          {rows[0].interestRate !== undefined && (
                            <Table.Th style={{ textAlign: 'right', color: rallyColors.green, padding: '8px 12px' }}>
                              نرخ سود
                            </Table.Th>
                          )}
                          {rows[0].repaymentMethod !== undefined && (
                            <Table.Th style={{ textAlign: 'right', color: rallyColors.green, padding: '8px 12px' }}>
                              روش بازپرداخت
                            </Table.Th>
                          )}
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {rows.map((row, idx) => (
                          <Table.Tr
                            key={idx}
                            style={{
                              backgroundColor:
                                idx % 2 === 0
                                  ? rallyColors.card
                                  : 'rgba(16, 185, 129, 0.05)',
                            }}
                          >
                            {row.depositMonths !== undefined && (
                              <Table.Td style={{ padding: '8px 12px', color: rallyColors.textSecondary }}>
                                {row.depositMonths}
                              </Table.Td>
                            )}
                            {row.avgMonths !== undefined && (
                              <Table.Td style={{ padding: '8px 12px', color: rallyColors.textSecondary }}>
                                {row.avgMonths}
                              </Table.Td>
                            )}
                            {row.coefficient !== undefined && (
                              <Table.Td style={{ padding: '8px 12px', fontWeight: 500, color: rallyColors.green }}>
                                {row.coefficient}
                              </Table.Td>
                            )}
                            {row.loanPercent !== undefined && (
                              <Table.Td style={{ padding: '8px 12px', fontWeight: 500, color: rallyColors.green }}>
                                {row.loanPercent}
                              </Table.Td>
                            )}
                            {row.repaymentMonths !== undefined && (
                              <Table.Td style={{ padding: '8px 12px', color: rallyColors.textSecondary }}>
                                {row.repaymentMonths}
                              </Table.Td>
                            )}
                            {row.interestRate !== undefined && (
                              <Table.Td style={{ padding: '8px 12px', color: rallyColors.textSecondary }}>
                                {row.interestRate}
                              </Table.Td>
                            )}
                            {row.repaymentMethod !== undefined && (
                              <Table.Td style={{ padding: '8px 12px', color: rallyColors.textSecondary }}>
                                {row.repaymentMethod}
                              </Table.Td>
                            )}
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </Card>
      )}
    </>
  );
});
