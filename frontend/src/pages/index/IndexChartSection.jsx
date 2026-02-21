import {
  Center, Group, Loader, SegmentedControl, Text, Title,
} from '@mantine/core';
import RallyMainCard from '../../components/RallyMainCard';
import RallyAreaChart from '../../components/charts/RallyAreaChart';
import { DURATION_OPTIONS } from '../../constants/stockDetail';
import { toJalali } from '../../utils/dateUtils';
import { formatNum } from '../../utils/formatUtils';

/**
 * Area chart with duration selector for index history.
 *
 * Props:
 *   history          - array of { date, index_value, ... }
 *   historyLoading   - boolean
 *   duration         - selected duration value (string)
 *   onDurationChange - callback when duration changes
 */
export default function IndexChartSection({
  history,
  historyLoading,
  duration,
  onDurationChange,
}) {
  const chartData = (history || []).map((d) => ({
    x: toJalali(d.date),
    y: d.index_value,
  }));

  return (
    <RallyMainCard
      title={
        <Group justify="space-between" w="100%" wrap="wrap" gap="xs">
          <Title order={4}>نمودار شاخص</Title>
          <SegmentedControl
            size="xs"
            value={duration}
            onChange={onDurationChange}
            data={DURATION_OPTIONS}
          />
        </Group>
      }
      mb="md"
    >
      {historyLoading ? (
        <Center mih={400}><Loader color="rally-green" size="sm" /></Center>
      ) : chartData.length > 0 ? (
        <RallyAreaChart
          data={chartData}
          height={400}
          zoomable={chartData.length > 100}
          yFormatter={formatNum}
        />
      ) : (
        <Center mih={400}><Text c="dimmed">داده نموداری موجود نیست</Text></Center>
      )}
    </RallyMainCard>
  );
}
