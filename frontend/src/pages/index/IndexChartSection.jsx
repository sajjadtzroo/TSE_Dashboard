import {
  Center, Group, Loader, SegmentedControl, Title, Text,
} from '@mantine/core';
import RallyMainCard from '../../components/RallyMainCard';
import RallyCandlestickChart from '../../components/charts/RallyCandlestickChart';
import IndicatorToggle from '../../components/IndicatorToggle';
import { DURATION_OPTIONS } from '../../constants/stockDetail';

const INDEX_DURATION_OPTIONS = DURATION_OPTIONS.filter((d) => d.value !== 'live');

export default function IndexChartSection({
  history,
  historyLoading,
  duration,
  onDurationChange,
  indicators,
  onIndicatorToggle,
}) {
  const header = (
    <Group justify="space-between" w="100%" wrap="wrap" gap="xs">
      <Title order={4}>نمودار شاخص</Title>
      <Group gap="xs" wrap="wrap">
        <IndicatorToggle prefs={indicators} onToggle={onIndicatorToggle} />
        <SegmentedControl
          size="xs"
          value={duration}
          onChange={onDurationChange}
          data={INDEX_DURATION_OPTIONS}
        />
      </Group>
    </Group>
  );

  return (
    <RallyMainCard title={header} mb="md">
      {historyLoading ? (
        <Center mih={400}><Loader color="rally-green" size="sm" /></Center>
      ) : (history || []).length > 0 ? (
        <RallyCandlestickChart
          data={history}
          height={400}
          activeIndicators={indicators}
        />
      ) : (
        <Center mih={400}><Text c="dimmed">داده نموداری موجود نیست</Text></Center>
      )}
    </RallyMainCard>
  );
}
