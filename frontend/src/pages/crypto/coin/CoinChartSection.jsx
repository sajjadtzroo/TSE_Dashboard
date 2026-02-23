import { Badge, Center, Group, Loader, SegmentedControl, Text, Title } from '@mantine/core';
import RallyMainCard from '../../../components/RallyMainCard';
import RallyCandlestickChart from '../../../components/charts/RallyCandlestickChart';
import IndicatorToggle from '../../../components/IndicatorToggle';
import { CRYPTO_INTERVALS } from '../../../constants/crypto';
import { toPersianNum } from '../../../utils/formatUtils';

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
            <IndicatorToggle prefs={indicators} onToggle={onIndicatorToggle} />
            <SegmentedControl
              value={interval}
              onChange={onIntervalChange}
              data={CRYPTO_INTERVALS}
              size="xs"
            />
          </Group>
        </Group>
      }
      fullscreenable
      mb="md"
    >
      {loading ? (
        <Center mih={400}><Loader color="rally-green" size="sm" /></Center>
      ) : chartHistory.length > 0 ? (
        <RallyCandlestickChart
          data={chartHistory}
          height={400}
          activeIndicators={indicators}
        />
      ) : (
        <Center mih={400}><Text c="dimmed">داده نموداری موجود نیست</Text></Center>
      )}
    </RallyMainCard>
  );
}
