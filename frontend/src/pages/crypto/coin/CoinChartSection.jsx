import { useMemo } from 'react';
import { Badge, Box, Center, Group, Indicator, Loader, SegmentedControl, Text, Title } from '@mantine/core';
import RallyMainCard from '../../../components/RallyMainCard';
import RallyCandlestickChart from '../../../components/charts/RallyCandlestickChart';
import IndicatorToggle from '../../../components/IndicatorToggle';
import { CRYPTO_INTERVALS } from '../../../constants/crypto';
import { toPersianNum } from '../../../utils/formatUtils';
import useCryptoLive from '../../../hooks/useCryptoLive';
import rallyColors from '../../../theme/rallyColors';

const LIVE_VALUE = 'live';

export default function CoinChartSection({
  symbol,
  chartHistory,
  interval,
  onIntervalChange,
  detail,
  loading,
  indicators,
  onIndicatorToggle,
}) {
  const change = detail?.price_change_pct_24h;
  const changeColor = change > 0 ? 'green' : change < 0 ? 'red' : 'gray';
  const isLive = interval === LIVE_VALUE;

  // WebSocket live data
  const { getLiveCandle, getLivePrice, status: wsStatus } = useCryptoLive();
  const liveCandle = getLiveCandle(symbol);
  const livePrice = getLivePrice(symbol);

  // In live mode: append the live candle to the 1min history
  const displayData = useMemo(() => {
    if (!isLive) return chartHistory || [];
    if (!chartHistory?.length) return [];

    // Clone the data and update/append the live candle
    const points = chartHistory.map(d => ({ ...d }));
    if (liveCandle) {
      const liveTs = liveCandle.t;
      const last = points[points.length - 1];
      // If the last bar's timestamp matches the live candle, update it
      if (last && last.date === liveTs) {
        last.open = liveCandle.o;
        last.high = Math.max(last.high, liveCandle.h);
        last.low = Math.min(last.low, liveCandle.l);
        last.close = liveCandle.c;
        last.volume = liveCandle.v;
      } else {
        // Append as new bar
        points.push({
          date: liveTs,
          open: liveCandle.o,
          high: liveCandle.h,
          low: liveCandle.l,
          close: liveCandle.c,
          volume: liveCandle.v,
        });
      }
    }
    return points;
  }, [isLive, chartHistory, liveCandle]);

  const segmentData = [
    { value: LIVE_VALUE, label: 'زنده' },
    ...CRYPTO_INTERVALS,
  ];

  const wsConnected = wsStatus === 'connected';

  return (
    <RallyMainCard
      title={
        <Group justify="space-between" w="100%" wrap="wrap" gap="xs">
          <Group gap="xs">
            <Title order={4}>نمودار {symbol}</Title>
            {change != null && (
              <Badge color={changeColor} variant="light">
                {change > 0 ? '+' : ''}{toPersianNum(change?.toFixed(2))}%
              </Badge>
            )}
            {isLive && (
              <Group gap={4}>
                <Indicator color={wsConnected ? 'green' : 'yellow'} size={8} processing={!wsConnected}>
                  <Box />
                </Indicator>
                {livePrice != null && (
                  <Text size="sm" fw={700} c={rallyColors.textPrimary} style={{ direction: 'ltr' }}>
                    ${toPersianNum(Number(livePrice).toLocaleString(undefined, { maximumFractionDigits: livePrice >= 100 ? 0 : 2 }))}
                  </Text>
                )}
              </Group>
            )}
          </Group>
          <Group gap="xs" wrap="wrap">
            <IndicatorToggle prefs={indicators} onToggle={onIndicatorToggle} />
            <SegmentedControl
              value={interval}
              onChange={onIntervalChange}
              data={segmentData}
              size="xs"
            />
          </Group>
        </Group>
      }
      fullscreenable
      mb="md"
    >
      {loading ? (
        <Center mih={400}><Loader color="rally-primary" size="sm" /></Center>
      ) : displayData.length > 0 ? (
        <RallyCandlestickChart
          data={displayData}
          height={400}
          activeIndicators={indicators}
        />
      ) : (
        <Center mih={400}><Text c="dimmed">داده نموداری موجود نیست</Text></Center>
      )}
    </RallyMainCard>
  );
}
