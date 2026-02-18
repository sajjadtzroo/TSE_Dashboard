import {
  Center, Group, Loader, SegmentedControl, Text, Title,
} from '@mantine/core';
import RallyMainCard from '../../components/RallyMainCard';
import RallyCandlestickChart from '../../components/charts/RallyCandlestickChart';
import TechnicalSubChart from '../../components/charts/TechnicalSubChart';
import IndicatorToggle from '../../components/IndicatorToggle';
import { DURATION_OPTIONS } from '../../constants/stockDetail';

/**
 * Candlestick chart with technical sub-charts, indicator toggles,
 * and duration selector.
 *
 * Props:
 *   history            - OHLCV history array
 *   historyLoading     - boolean
 *   duration           - selected duration value (string)
 *   onDurationChange   - callback when duration changes
 *   indicators         - indicator preferences object
 *   onIndicatorToggle  - callback to toggle an indicator
 *   overlays           - overlay data from useTechnicalIndicators
 *   activeSubCharts    - array of [key, chartData] entries for active sub-charts
 */
export default function StockChartSection({
  history,
  historyLoading,
  duration,
  onDurationChange,
  indicators,
  onIndicatorToggle,
  overlays,
  activeSubCharts,
}) {
  return (
    <RallyMainCard
      title={
        <Group justify="space-between" w="100%" wrap="wrap" gap="xs">
          <Title order={4}>نمودار قیمت</Title>
          <Group gap="xs">
            <IndicatorToggle prefs={indicators} onToggle={onIndicatorToggle} />
            <SegmentedControl
              size="xs"
              value={duration}
              onChange={onDurationChange}
              data={DURATION_OPTIONS}
            />
          </Group>
        </Group>
      }
      mb="md"
    >
      {historyLoading ? (
        <Center mih={400}><Loader color="rally-green" size="sm" /></Center>
      ) : history.length > 0 ? (
        <>
          <RallyCandlestickChart
            data={history}
            height={400}
            showVolume
            activeIndicators={indicators}
            overlayData={overlays}
          />
          {/* Sub-charts for RSI, MACD, Stochastic, ATR, OBV */}
          {activeSubCharts.map(([key, chartData]) => (
            <TechnicalSubChart
              key={key}
              type={key}
              data={chartData}
              height={150}
            />
          ))}
        </>
      ) : (
        <Center mih={400}><Text c="dimmed">داده نموداری موجود نیست</Text></Center>
      )}
    </RallyMainCard>
  );
}
