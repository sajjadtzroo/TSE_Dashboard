import { useState } from 'react';
import { Badge, Center, Group, Loader, SegmentedControl, Text, Title } from '@mantine/core';
import RallyMainCard from '../RallyMainCard';
import RallyCandlestickChart from '../charts/RallyCandlestickChart';
import { useTickOHLCV, isMarketOpen } from '../../hooks/useTickOHLCV';

/**
 * Intraday candlestick chart card powered by the TimescaleDB continuous aggregate.
 * Polls GET /api/ticks/{symbol}/ohlcv every 15 s during market hours.
 *
 * Props:
 *   symbol {string} - TSE ticker symbol
 */
export default function RealtimeChartCard({ symbol }) {
  const [interval, setInterval] = useState('1min');
  const live = isMarketOpen();

  const { data: rawBars = [], isLoading } = useTickOHLCV(symbol, { interval });

  // Convert to { date (unix seconds), open, high, low, close, volume } — same shape RallyCandlestickChart expects
  const bars = rawBars
    .slice()
    .reverse()
    .map((b) => ({
      date:   Math.floor(new Date(b.bucket).getTime() / 1000),
      open:   b.open,
      high:   b.high,
      low:    b.low,
      close:  b.close,
      volume: b.volume ?? 0,
    }));

  const header = (
    <Group justify="space-between" w="100%" wrap="wrap" gap="xs">
      <Group gap="xs">
        <Title order={4}>نمودار لحظه‌ای</Title>
        {live && bars.length > 0 && (
          <Badge color="rally-green" variant="light" size="sm">● زنده</Badge>
        )}
        {!live && (
          <Badge color="gray" variant="outline" size="sm">بازار بسته</Badge>
        )}
      </Group>
      <SegmentedControl
        size="xs"
        value={interval}
        onChange={setInterval}
        data={[
          { label: '۱ دقیقه', value: '1min' },
          { label: '۵ دقیقه', value: '5min' },
        ]}
      />
    </Group>
  );

  return (
    <RallyMainCard title={header} mb="md">
      {isLoading ? (
        <Center mih={320}><Loader color="rally-primary" size="sm" /></Center>
      ) : bars.length > 0 ? (
        <RallyCandlestickChart data={bars} isLive />
      ) : (
        <Center mih={320} style={{ flexDirection: 'column', gap: 8 }}>
          <Text c="dimmed" size="sm">
            {live ? 'در حال بارگذاری داده‌های لحظه‌ای…' : 'داده‌ای برای امروز موجود نیست'}
          </Text>
          <Text c="dimmed" size="xs">ساعت بازار: شنبه تا چهارشنبه ۹:۰۰ – ۱۲:۳۰</Text>
        </Center>
      )}
    </RallyMainCard>
  );
}
