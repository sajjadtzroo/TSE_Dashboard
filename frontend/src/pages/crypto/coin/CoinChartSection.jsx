import { Badge, Group, SegmentedControl, Text } from '@mantine/core';
import RallyMainCard from '../../../components/RallyMainCard';
import RallyChartSkeleton from '../../../components/RallyChartSkeleton';
import RallyCandlestickChart from '../../../components/charts/RallyCandlestickChart';
import { CRYPTO_INTERVALS } from '../../../constants/crypto';

export default function CoinChartSection({ symbol, history, interval, onIntervalChange, detail }) {
  const chartData = (history || []).map(candle => ({
    time: Math.floor(new Date(candle.open_time).getTime() / 1000),
    open: Number(candle.open),
    high: Number(candle.high),
    low: Number(candle.low),
    close: Number(candle.close),
    volume: Number(candle.volume),
  })).sort((a, b) => a.time - b.time);

  const change = detail?.price_change_pct_24h;
  const changeColor = change > 0 ? 'green' : change < 0 ? 'red' : 'gray';

  return (
    <RallyMainCard
      title={
        <Group gap="xs">
          <Text>نمودار {symbol}</Text>
          {change != null && (
            <Badge color={changeColor} variant="light">
              {change > 0 ? '+' : ''}{change?.toFixed(2)}%
            </Badge>
          )}
        </Group>
      }
      secondary={
        <SegmentedControl
          value={interval}
          onChange={onIntervalChange}
          data={CRYPTO_INTERVALS}
          size="xs"
        />
      }
      fullscreenable
      mb="md"
    >
      {chartData.length > 0 ? (
        <RallyCandlestickChart data={chartData} height={400} showVolume />
      ) : (
        <RallyChartSkeleton height={400} />
      )}
    </RallyMainCard>
  );
}
