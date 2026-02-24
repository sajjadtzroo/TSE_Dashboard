import { Group, Text, Stack, Divider } from '@mantine/core';
import RallyMainCard from '../RallyMainCard';
import OrderBookDepthChart from '../charts/OrderBookDepthChart';
import rallyColors from '../../theme/rallyColors';
import { formatNum, toPersianNum } from '../../utils/formatUtils';

export default function OrderBookCard({ orderBook }) {
  if (!orderBook || !orderBook.length) return null;

  const totalBidVol = orderBook.reduce((s, l) => s + (l.demand_volume || 0), 0);
  const totalAskVol = orderBook.reduce((s, l) => s + (l.supply_volume || 0), 0);

  const bestBid = orderBook[0]?.demand_price;
  const bestAsk = orderBook[0]?.supply_price;
  const spread = bestBid && bestAsk ? bestAsk - bestBid : null;
  const spreadPct = spread && bestBid ? (spread / bestBid) * 100 : null;

  return (
    <RallyMainCard title="عمق سفارشات" mb="md">
      <Group justify="space-between" mb="xs">
        <Stack gap={0}>
          <Text size="xs" c="dimmed">حجم تقاضا</Text>
          <Text size="sm" fw={600} c={rallyColors.green}>{formatNum(totalBidVol)}</Text>
        </Stack>
        <Stack gap={0} align="flex-end">
          <Text size="xs" c="dimmed">حجم عرضه</Text>
          <Text size="sm" fw={600} c={rallyColors.red}>{formatNum(totalAskVol)}</Text>
        </Stack>
      </Group>
      {spread != null && (
        <>
          <Divider mb="xs" color="#1E2234" />
          <Group justify="space-between">
            <Text size="xs" c="dimmed">اسپرد</Text>
            <Text size="xs" fw={500}>{formatNum(spread)} ({toPersianNum(spreadPct?.toFixed(2))}٪)</Text>
          </Group>
        </>
      )}
      <OrderBookDepthChart orderBook={orderBook} height={180} />
    </RallyMainCard>
  );
}
