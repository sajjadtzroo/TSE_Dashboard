import { useMemo, useState } from 'react';
import { Badge, Button, Center, Group, Loader, SegmentedControl, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import RallyMainCard from '../../../components/RallyMainCard';
import RallyCandlestickChart from '../../../components/charts/RallyCandlestickChart';
import IndicatorToggle from '../../../components/IndicatorToggle';
import LiveDayPicker from '../../../components/charts/LiveDayPicker';
import { CRYPTO_INTERVALS } from '../../../constants/crypto';
import { toPersianNum } from '../../../utils/formatUtils';
import api from '../../../services/apiClient';

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
  const [isLive, setIsLive] = useState(false);
  const [liveInterval, setLiveInterval] = useState('1min');
  const [liveDay, setLiveDay] = useState(null);

  const { data: rawLive = [], isLoading: liveLoading } = useQuery({
    queryKey: ['crypto-live', symbol, liveInterval],
    queryFn: () => api.get(`/crypto/${encodeURIComponent(symbol)}/history`, {
      params: { interval: liveInterval, limit: 500 },
    }).then((r) => r.data),
    enabled: !!symbol && isLive,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  const change = detail?.price_change_pct_24h;
  const changeColor = change > 0 ? 'green' : change < 0 ? 'red' : 'gray';

  const liveBars = useMemo(() => rawLive
    .filter((b) => {
      if (!liveDay) return true;
      return b.open_time && new Date(b.open_time).toISOString().slice(0, 10) === liveDay;
    })
    .map((c) => ({
      date: (c.open_time || '').split('T')[0],
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
      volume: Number(c.volume),
    }))
    .filter((c) => c.date), [rawLive, liveDay]);

  const displayData = isLive ? liveBars : chartHistory;
  const displayLoading = isLive ? liveLoading : loading;

  const handleModeChange = (val) => {
    if (val === 'live') {
      setIsLive(true);
    } else {
      setIsLive(false);
      onIntervalChange(val);
    }
  };

  const segmentData = [
    { value: 'live', label: 'زنده' },
    ...CRYPTO_INTERVALS,
  ];

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
          </Group>
          <Group gap="xs" wrap="wrap">
            {!isLive && <IndicatorToggle prefs={indicators} onToggle={onIndicatorToggle} />}
            <SegmentedControl
              value={isLive ? 'live' : interval}
              onChange={handleModeChange}
              data={segmentData}
              size="xs"
            />
            {isLive && (
              <>
                <LiveDayPicker value={liveDay} onChange={setLiveDay} tradingDays={[0, 1, 2, 3, 4, 5, 6]} />
                <Button.Group>
                  {[{ label: '۱ دقیقه', value: '1min' }, { label: '۵ دقیقه', value: '5min' }].map(({ label, value }) => (
                    <Button
                      key={value}
                      size="compact-xs"
                      variant={liveInterval === value ? 'filled' : 'subtle'}
                      color={liveInterval === value ? 'rally-primary' : 'gray'}
                      onClick={() => setLiveInterval(value)}
                      styles={{ root: { minWidth: 52, fontWeight: liveInterval === value ? 700 : 400 } }}
                    >
                      {label}
                    </Button>
                  ))}
                </Button.Group>
              </>
            )}
          </Group>
        </Group>
      }
      fullscreenable
      mb="md"
    >
      {displayLoading ? (
        <Center mih={400}><Loader color="rally-primary" size="sm" /></Center>
      ) : displayData.length > 0 ? (
        <RallyCandlestickChart
          data={displayData}
          height={400}
          activeIndicators={isLive ? {} : indicators}
        />
      ) : (
        <Center mih={400}><Text c="dimmed">داده نموداری موجود نیست</Text></Center>
      )}
    </RallyMainCard>
  );
}
