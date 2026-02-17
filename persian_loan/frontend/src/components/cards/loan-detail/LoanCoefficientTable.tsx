import { memo } from 'react';
import { Table, Group, Text, ScrollArea } from '@mantine/core';
import { IconTable } from '@tabler/icons-react';
import rallyColors from '../../../theme/rallyColors';
import type { LoanType } from '@/types';

interface LoanCoefficientTableProps {
  loan: LoanType;
}

export const LoanCoefficientTable = memo(function LoanCoefficientTable({
  loan,
}: LoanCoefficientTableProps) {
  const hasTable = loan.coefficientTable && loan.coefficientTable.length > 0;

  if (!hasTable) {
    return null;
  }

  const firstRow = loan.coefficientTable![0];

  const columns = [
    { key: 'depositMonths', label: 'مدت سپرده (ماه)' },
    { key: 'avgMonths', label: 'مدت معدل (ماه)' },
    { key: 'loanPercent', label: 'درصد وام', highlight: true },
    { key: 'coefficient', label: 'ضریب', highlight: true },
    { key: 'repaymentMonths', label: 'بازپرداخت (ماه)' },
    { key: 'interestRate', label: 'نرخ سود' },
    { key: 'repaymentMethod', label: 'روش بازپرداخت' },
    { key: 'pointsNoSupporter', label: 'امتیاز بدون حامی' },
    { key: 'pointsWithSupporter', label: 'امتیاز با حامی' },
    { key: 'creditRating', label: 'رتبه اعتباری' },
  ].filter((col) => firstRow[col.key as keyof typeof firstRow] !== undefined);

  return (
    <div>
      <Group gap={8} mb="sm">
        <IconTable size={20} color={rallyColors.textSecondary} />
        <Text fw={500} c={rallyColors.textSecondary}>
          جدول ضرایب
        </Text>
      </Group>
      <ScrollArea>
        <Table verticalSpacing="xs" horizontalSpacing="sm" fz="sm">
          <Table.Thead>
            <Table.Tr style={{ borderBottom: `1px solid ${rallyColors.glassBorder}` }}>
              {columns.map((col) => (
                <Table.Th
                  key={col.key}
                  style={{ color: rallyColors.textSecondary, fontSize: '0.8rem' }}
                >
                  {col.label}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {loan.coefficientTable!.map((row, idx) => (
              <Table.Tr
                key={idx}
                style={{ borderBottom: `1px solid ${rallyColors.glassBorder}` }}
              >
                {columns.map((col) => (
                  <Table.Td
                    key={col.key}
                    style={{
                      color: col.highlight
                        ? rallyColors.green
                        : rallyColors.textSecondary,
                      fontWeight: col.highlight ? 600 : 400,
                    }}
                  >
                    {row[col.key as keyof typeof row] ?? '-'}
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </div>
  );
});
