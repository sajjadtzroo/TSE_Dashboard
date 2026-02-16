import { useMemo } from 'react';
import { Table, Badge, Text, Alert, Group } from '@mantine/core';
import { IconTrendingUp, IconTrendingDown } from '@tabler/icons-react';
import RallyMainCard from '../RallyMainCard';
import rallyColors from '../../theme/rallyColors';
import { sma } from '../../utils/technicalIndicators';
import { formatNum, toPersianNum } from '../../utils/formatUtils';

const PERIODS = [10, 20, 50, 100, 200];

export default function MovingAverageCard({ history }) {
  const { rows, signal, goldenCross, deathCross } = useMemo(() => {
    if (!history || history.length < 20) return { rows: [], signal: null, goldenCross: false, deathCross: false };

    const closes = history.map((h) => h.close);
    const currentPrice = closes[closes.length - 1];

    const rows = PERIODS.map((period) => {
      if (closes.length < period) return { period, value: null, signal: 'neutral' };
      const values = sma(closes, period);
      const val = values[values.length - 1];
      let sig = 'neutral';
      if (val != null && currentPrice != null) {
        sig = currentPrice > val ? 'buy' : currentPrice < val ? 'sell' : 'neutral';
      }
      return { period, value: val, signal: sig };
    });

    // Golden Cross / Death Cross detection (SMA50 vs SMA200)
    const sma50 = sma(closes, 50);
    const sma200 = sma(closes, 200);
    let goldenCross = false;
    let deathCross = false;
    if (sma50.length >= 2 && sma200.length >= 2) {
      const prev50 = sma50[sma50.length - 2];
      const curr50 = sma50[sma50.length - 1];
      const prev200 = sma200[sma200.length - 2];
      const curr200 = sma200[sma200.length - 1];
      if (prev50 != null && curr50 != null && prev200 != null && curr200 != null) {
        if (prev50 < prev200 && curr50 >= curr200) goldenCross = true;
        if (prev50 > prev200 && curr50 <= curr200) deathCross = true;
      }
    }

    // Overall signal (majority vote)
    const buys = rows.filter((r) => r.signal === 'buy').length;
    const sells = rows.filter((r) => r.signal === 'sell').length;
    const signal = buys > sells ? 'buy' : sells > buys ? 'sell' : 'neutral';

    return { rows, signal, goldenCross, deathCross };
  }, [history]);

  if (!rows.length) return null;

  const signalBadge = {
    buy: { color: 'green', label: 'خرید' },
    sell: { color: 'red', label: 'فروش' },
    neutral: { color: 'gray', label: 'خنثی' },
  };

  return (
    <RallyMainCard title="سیگنال میانگین‌های متحرک" mb="md">
      <Group gap="sm" mb="sm">
        <Text size="sm" c="dimmed">سیگنال کلی:</Text>
        <Badge color={signalBadge[signal].color} variant="light">{signalBadge[signal].label}</Badge>
      </Group>

      {goldenCross && (
        <Alert color="green" variant="light" mb="xs" icon={<IconTrendingUp size={16} />}>
          تقاطع طلایی (Golden Cross) — SMA 50 بالاتر از SMA 200
        </Alert>
      )}
      {deathCross && (
        <Alert color="red" variant="light" mb="xs" icon={<IconTrendingDown size={16} />}>
          تقاطع مرگ (Death Cross) — SMA 50 پایین‌تر از SMA 200
        </Alert>
      )}

      <Table striped highlightOnHover withTableBorder={false} style={{ fontSize: '0.85rem' }}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>دوره</Table.Th>
            <Table.Th style={{ textAlign: 'end' }}>مقدار</Table.Th>
            <Table.Th style={{ textAlign: 'center' }}>سیگنال</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((r) => (
            <Table.Tr key={r.period}>
              <Table.Td>SMA({toPersianNum(r.period)})</Table.Td>
              <Table.Td style={{ textAlign: 'end' }}>{r.value != null ? formatNum(r.value) : '-'}</Table.Td>
              <Table.Td style={{ textAlign: 'center' }}>
                <Badge size="xs" color={signalBadge[r.signal].color} variant="light">
                  {signalBadge[r.signal].label}
                </Badge>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </RallyMainCard>
  );
}
