import {
  Center, Group, Loader, SegmentedControl, Title,Text,
} from '@mantine/core';
import RallyMainCard from '../../components/RallyMainCard';
import RallyCandlestickChart from '../../components/charts/RallyCandlestickChart';
import TechnicalSubChart from '../../components/charts/TechnicalSubChart';
import IndicatorToggle from '../../components/IndicatorToggle';
import { DURATION_OPTIONS } from '../../constants/stockDetail';

const INDEX_DURATION_OPTIONS = DURATION_OPTIONS.filter((d) => d.value !== 'live');

/**
 * Candlestick chart with technical indicators and sub-charts for index history.
 *
 * Props:
 *   history            - OHLCV array [{ date, open, high, low, close, volume }]
 *   historyLoading     - boolean
 *   duration           - selected duration value (string)
 *   onDurationChange   - callback when duration changes
 *   indicators         - indicator preferences object
 *   onIndicatorToggle  - callback to toggle an indicator
 *   overlays           - overlay data from useTechnicalIndicators
 *   activeSubCharts    - array of [key, chartData] entries
 */
export default function IndexChartSection({
  history,
  historyLoading,
  duration,
  onDurationChange,
  indicators,
  onIndicatorToggle,
  overlays,
  activeSubCharts,
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
        <>
          <RallyCandlestickChart
            data={history}
            height={400}
            showVolume
            activeIndicators={indicators}
            overlayData={overlays}
          />
          {(activeSubCharts || []).map(([key, chartData]) => (
            <TechnicalSubChart key={key} type={key} data={chartData} height={150} />
          ))}
        </>
      ) : (
        <Center mih={400}><Text c="dimmed">داده نموداری موجود نیست</Text></Center>
      )}
    </RallyMainCard>
  );
}
