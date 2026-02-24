import { useState } from 'react';
import {
  Badge, Box, Button, Center, Group, Loader, Stack, Text, Title,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import RallyMainCard from '../../components/RallyMainCard';
import RallyCandlestickChart from '../../components/charts/RallyCandlestickChart';
import IndicatorDrawer from '../../components/charts/IndicatorDrawer';
import { DURATION_OPTIONS } from '../../constants/stockDetail';
import { useTickOHLCV, isMarketOpen } from '../../hooks/useTickOHLCV';

/**
 * Candlestick chart with indicator toggles and duration selector.
 * When duration === 'live', switches to the intraday chart.
 *
 * Props:
 *   symbol             - TSE ticker symbol (needed for live mode)
 *   history            - OHLCV history array (daily data)
 *   historyLoading     - boolean
 *   duration           - selected duration value (string)
 *   onDurationChange   - callback when duration changes
 *   indicators         - indicator preferences object
 *   onIndicatorToggle  - callback to toggle an indicator
 */
export default function StockChartSection({
  symbol,
  history,
  historyLoading,
  duration,
  onDurationChange,
  indicators,
  onIndicatorToggle,
}) {
  const isMobile = useMediaQuery('(max-width: 48em)');
  const isLive = duration === 'live';
  const live   = isMarketOpen();
  const [liveInterval, setLiveInterval] = useState('1min');

  const { data: rawBars = [], isLoading: tickLoading } = useTickOHLCV(symbol, { interval: liveInterval });

  // Convert intraday bars to the same shape as history (d.date in unix-seconds, open/high/low/close/volume)
  const liveBars = rawBars
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

  const loading = isLive ? tickLoading : historyLoading;
  const chartData = isLive ? liveBars : history;
  const hasData = chartData.length > 0;

  const header = (
    <Stack gap={6} w="100%">
      {/* Row 1: Symbol badge + title + live status */}
      <Group justify="space-between" w="100%" wrap="wrap" gap="xs">
        <Group gap="xs">
          {symbol && (
            <Badge variant="outline" color="gray" size="sm" radius="sm">{symbol}</Badge>
          )}
          <Title order={4}>{isLive ? 'نمودار لحظه‌ای' : 'نمودار قیمت'}</Title>
          {isLive && live && hasData && (
            <Badge color="rally-green" variant="light" size="sm">● زنده</Badge>
          )}
          {isLive && !live && (
            <Badge color="gray" variant="outline" size="sm">بازار بسته</Badge>
          )}
        </Group>
      </Group>

      {/* Row 2: Toolbar — spacer left | controls right */}
      <Group justify="space-between" w="100%" wrap="wrap" gap="xs">
        <Box />
        <Group gap={6} wrap="wrap">
          {!isLive && <IndicatorDrawer prefs={indicators} onToggle={onIndicatorToggle} />}
          <Button.Group>
            {DURATION_OPTIONS.map(({ label, value }) => (
              <Button
                key={value}
                size="compact-xs"
                variant={duration === value ? 'filled' : 'subtle'}
                color={duration === value ? 'rally-green' : 'gray'}
                onClick={() => onDurationChange(value)}
                styles={{ root: { minWidth: 34, fontWeight: duration === value ? 700 : 400 } }}
              >
                {label}
              </Button>
            ))}
          </Button.Group>
          {isLive && (
            <Button.Group>
              {[{ label: '۱ دقیقه', value: '1min' }, { label: '۵ دقیقه', value: '5min' }].map(({ label, value }) => (
                <Button
                  key={value}
                  size="compact-xs"
                  variant={liveInterval === value ? 'filled' : 'subtle'}
                  color={liveInterval === value ? 'rally-green' : 'gray'}
                  onClick={() => setLiveInterval(value)}
                  styles={{ root: { minWidth: 52, fontWeight: liveInterval === value ? 700 : 400 } }}
                >
                  {label}
                </Button>
              ))}
            </Button.Group>
          )}
        </Group>
      </Group>
    </Stack>
  );

  return (
    <RallyMainCard title={header} mb="md" fullscreenable>
      {loading ? (
        <Center mih={isMobile ? 360 : 480}><Loader color="rally-green" size="sm" /></Center>
      ) : !hasData ? (
        <Center mih={isMobile ? 360 : 480} style={{ flexDirection: 'column', gap: 8 }}>
          <Text c="dimmed" size="sm">
            {isLive && live ? 'در حال بارگذاری داده‌های لحظه‌ای…' : 'داده نموداری موجود نیست'}
          </Text>
          {isLive && !live && (
            <Text c="dimmed" size="xs">ساعت بازار: شنبه تا چهارشنبه ۹:۰۰ – ۱۲:۳۰</Text>
          )}
        </Center>
      ) : (
        <RallyCandlestickChart
          data={chartData}
          activeIndicators={isLive ? {} : indicators}
          isLive={isLive}
          minHeight={isMobile ? 360 : undefined}
        />
      )}
    </RallyMainCard>
  );
}
