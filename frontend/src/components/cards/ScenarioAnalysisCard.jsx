import { Table, Text } from '@mantine/core';
import RallyMainCard from '../RallyMainCard';
import rallyColors from '../../theme/rallyColors';
import { toPersianNum, formatPercent, formatNum } from '../../utils/formatUtils';

export default function ScenarioAnalysisCard({ scenarios }) {
  if (!scenarios || !scenarios.length) return null;

  const rowColors = [rallyColors.green, rallyColors.textPrimary, rallyColors.red, rallyColors.red];

  return (
    <RallyMainCard title="تحلیل سناریو (بر اساس بتا)" mb="md">
      <Table striped highlightOnHover withTableBorder={false} style={{ fontSize: '0.85rem' }}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>سناریو</Table.Th>
            <Table.Th style={{ textAlign: 'end' }}>حرکت بازار</Table.Th>
            <Table.Th style={{ textAlign: 'end' }}>حرکت سهم</Table.Th>
            <Table.Th style={{ textAlign: 'end' }}>قیمت هدف</Table.Th>
            <Table.Th style={{ textAlign: 'end' }}>بازده</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {scenarios.map((s, i) => (
            <Table.Tr key={i} style={{ color: rowColors[i] || rallyColors.textPrimary }}>
              <Table.Td>{s.name}</Table.Td>
              <Table.Td style={{ textAlign: 'end' }}>{formatPercent(s.marketMove * 100)}</Table.Td>
              <Table.Td style={{ textAlign: 'end' }}>{formatPercent(s.stockMove * 100)}</Table.Td>
              <Table.Td style={{ textAlign: 'end' }}>{formatNum(Math.round(s.targetPrice))}</Table.Td>
              <Table.Td style={{ textAlign: 'end', color: s.returnPct >= 0 ? rallyColors.green : rallyColors.red }}>
                {formatPercent(s.returnPct * 100)}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </RallyMainCard>
  );
}
