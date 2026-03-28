import { useMemo } from 'react';
import { Text, Table, ScrollArea } from '@mantine/core';
import RallyMainCard from '../../../components/RallyMainCard';
import { toPersianNum } from '../../../utils/formatUtils';
import rallyColors from '../../../theme/rallyColors';

const MONTHS = ['فر', 'ار', 'خر', 'تیر', 'مر', 'شه', 'مه', 'آب', 'آذ', 'دی', 'بم', 'اس'];

function cellBg(val) {
  if (val == null) return 'transparent';
  if (val >= 8) return 'rgba(34, 197, 94, 0.45)';
  if (val >= 4) return 'rgba(34, 197, 94, 0.3)';
  if (val >= 1) return 'rgba(34, 197, 94, 0.15)';
  if (val >= -1) return 'rgba(156, 163, 175, 0.08)';
  if (val >= -4) return 'rgba(239, 68, 68, 0.15)';
  if (val >= -8) return 'rgba(239, 68, 68, 0.3)';
  return 'rgba(239, 68, 68, 0.45)';
}

function cellColor(val) {
  if (val == null) return rallyColors.textDimmed;
  return val >= 0 ? rallyColors.green : rallyColors.red;
}

/**
 * @param {{ data: { year: string, months: (number|null)[], total: number }[] }} props
 */
export default function MonthlyReturnsHeatmap({ data = [] }) {
  if (!data.length) return null;

  return (
    <RallyMainCard title="بازدهی ماهانه (٪)">
      <ScrollArea>
        <Table withTableBorder style={{ minWidth: 600 }}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ textAlign: 'center', fontSize: 11, color: rallyColors.textDimmed }}>سال</Table.Th>
              {MONTHS.map((m, i) => (
                <Table.Th key={i} style={{ textAlign: 'center', fontSize: 10, color: rallyColors.textDimmed, padding: '4px 2px' }}>
                  {m}
                </Table.Th>
              ))}
              <Table.Th style={{ textAlign: 'center', fontSize: 11, color: rallyColors.textDimmed, fontWeight: 700 }}>کل</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.map((row) => (
              <Table.Tr key={row.year}>
                <Table.Td style={{ textAlign: 'center', fontWeight: 600, fontSize: 11, color: rallyColors.textSecondary }}>
                  {toPersianNum(row.year)}
                </Table.Td>
                {row.months.map((val, i) => (
                  <Table.Td
                    key={i}
                    style={{
                      textAlign: 'center',
                      fontSize: 10,
                      fontVariantNumeric: 'tabular-nums',
                      backgroundColor: cellBg(val),
                      color: cellColor(val),
                      borderRadius: 2,
                      padding: '3px 2px',
                    }}
                  >
                    {val != null ? (val > 0 ? '+' : '') + toPersianNum(val.toFixed(0)) : ''}
                  </Table.Td>
                ))}
                <Table.Td
                  style={{
                    textAlign: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    color: row.total >= 0 ? rallyColors.green : rallyColors.red,
                    backgroundColor: `${row.total >= 0 ? rallyColors.green : rallyColors.red}08`,
                  }}
                >
                  {row.total > 0 ? '+' : ''}{toPersianNum(row.total.toFixed(0))}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </RallyMainCard>
  );
}
