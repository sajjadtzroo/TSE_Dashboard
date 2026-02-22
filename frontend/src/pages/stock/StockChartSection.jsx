import { useEffect, useRef, useState } from 'react';
import {
  Badge, Center, Group, Loader, SegmentedControl, Text, Title,
} from '@mantine/core';
import { createChart, ColorType, CrosshairMode, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import RallyMainCard from '../../components/RallyMainCard';
import RallyCandlestickChart from '../../components/charts/RallyCandlestickChart';
import TechnicalSubChart from '../../components/charts/TechnicalSubChart';
import IndicatorToggle from '../../components/IndicatorToggle';
import { DURATION_OPTIONS } from '../../constants/stockDetail';
import { useTickOHLCV, isMarketOpen } from '../../hooks/useTickOHLCV';
import rallyColors from '../../theme/rallyColors';

/**
 * Candlestick chart with technical sub-charts, indicator toggles,
 * and duration selector. When duration === 'live', switches to the
 * intraday chart powered by the TimescaleDB continuous aggregate.
 *
 * Props:
 *   symbol             - TSE ticker symbol (needed for live mode)
 *   history            - OHLCV history array (daily data)
 *   historyLoading     - boolean
 *   duration           - selected duration value (string)
 *   onDurationChange   - callback when duration changes
 *   indicators         - indicator preferences object
 *   onIndicatorToggle  - callback to toggle an indicator
 *   overlays           - overlay data from useTechnicalIndicators
 *   activeSubCharts    - array of [key, chartData] entries for active sub-charts
 */
export default function StockChartSection({
  symbol,
  history,
  historyLoading,
  duration,
  onDurationChange,
  indicators,
  onIndicatorToggle,
  overlays,
  activeSubCharts,
}) {
  const isLive = duration === 'live';
  const live = isMarketOpen();
  const [liveInterval, setLiveInterval] = useState('1min');

  // Always fetch intraday data — only rendered when isLive
  const { data: rawBars = [], isLoading: tickLoading } = useTickOHLCV(symbol, { interval: liveInterval });

  // Convert API response (newest-first) to ascending Unix-second bars
  const bars = rawBars
    .slice()
    .reverse()
    .map((b) => ({
      time: Math.floor(new Date(b.bucket).getTime() / 1000),
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
    }));

  const volumeBars = rawBars
    .slice()
    .reverse()
    .map((b) => ({
      time: Math.floor(new Date(b.bucket).getTime() / 1000),
      value: b.volume ?? 0,
      color: (b.close ?? 0) >= (b.open ?? 0)
        ? `${rallyColors.green}35`
        : `${rallyColors.red}35`,
    }));

  // Refs for the lightweight-charts instance (live mode only)
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);

  // Create chart when entering live mode; destroy when leaving
  useEffect(() => {
    if (!isLive || !chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      height: 400,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: rallyColors.textSecondary,
        fontFamily: "'Poppins', sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(148,163,184,0.04)' },
        horzLines: { color: 'rgba(148,163,184,0.04)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(148,163,184,0.3)', labelBackgroundColor: rallyColors.elevated },
        horzLine: { color: 'rgba(148,163,184,0.3)', labelBackgroundColor: rallyColors.elevated },
      },
      rightPriceScale: { borderColor: 'rgba(148,163,184,0.1)', minimumWidth: 70 },
      timeScale: {
        borderColor: 'rgba(148,163,184,0.1)',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: { vertTouchDrag: false },
      localization: {
        timeFormatter: (ts) => {
          const d = new Date(ts * 1000);
          return d.toLocaleTimeString('fa-IR', {
            hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tehran',
          });
        },
      },
    });

    candleSeriesRef.current = chart.addSeries(CandlestickSeries, {
      upColor: rallyColors.green,
      downColor: rallyColors.red,
      borderUpColor: rallyColors.green,
      borderDownColor: rallyColors.red,
      wickUpColor: rallyColors.green,
      wickDownColor: rallyColors.red,
    });

    volumeSeriesRef.current = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });

    chartRef.current = chart;

    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        chart.applyOptions({ width: e.contentRect.width });
      }
    });
    ro.observe(chartContainerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [isLive]); // eslint-disable-line react-hooks/exhaustive-deps

  // Push new data into the live chart whenever bars or interval changes
  useEffect(() => {
    if (!isLive || !candleSeriesRef.current || !bars.length) return;
    candleSeriesRef.current.setData(bars);
    volumeSeriesRef.current?.setData(volumeBars);
    chartRef.current?.timeScale().fitContent();
  }, [isLive, bars.length, liveInterval]); // eslint-disable-line react-hooks/exhaustive-deps

  const header = (
    <Group justify="space-between" w="100%" wrap="wrap" gap="xs">
      <Group gap="xs">
        <Title order={4}>{isLive ? 'نمودار لحظه‌ای' : 'نمودار قیمت'}</Title>
        {isLive && live && bars.length > 0 && (
          <Badge color="rally-green" variant="light" size="sm">● زنده</Badge>
        )}
        {isLive && !live && (
          <Badge color="gray" variant="outline" size="sm">بازار بسته</Badge>
        )}
      </Group>
      <Group gap="xs" wrap="wrap">
        {!isLive && <IndicatorToggle prefs={indicators} onToggle={onIndicatorToggle} />}
        <SegmentedControl
          size="xs"
          value={duration}
          onChange={onDurationChange}
          data={DURATION_OPTIONS}
        />
        {isLive && (
          <SegmentedControl
            size="xs"
            value={liveInterval}
            onChange={setLiveInterval}
            data={[
              { label: '۱ دقیقه', value: '1min' },
              { label: '۵ دقیقه', value: '5min' },
            ]}
          />
        )}
      </Group>
    </Group>
  );

  return (
    <RallyMainCard title={header} mb="md">
      {isLive ? (
        <>
          {tickLoading && <Center mih={400}><Loader color="rally-green" size="sm" /></Center>}
          {!tickLoading && bars.length === 0 && (
            <Center mih={400} style={{ flexDirection: 'column', gap: 8 }}>
              <Text c="dimmed" size="sm">
                {live ? 'در حال بارگذاری داده‌های لحظه‌ای…' : 'داده‌ای برای امروز موجود نیست'}
              </Text>
              <Text c="dimmed" size="xs">ساعت بازار: شنبه تا چهارشنبه ۹:۰۰ – ۱۲:۳۰</Text>
            </Center>
          )}
          {/* Container is always mounted in live mode so the chart ref stays valid */}
          <div
            ref={chartContainerRef}
            style={{ width: '100%', display: !tickLoading && bars.length > 0 ? 'block' : 'none' }}
          />
        </>
      ) : historyLoading ? (
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
          {activeSubCharts.map(([key, chartData]) => (
            <TechnicalSubChart key={key} type={key} data={chartData} height={150} />
          ))}
        </>
      ) : (
        <Center mih={400}><Text c="dimmed">داده نموداری موجود نیست</Text></Center>
      )}
    </RallyMainCard>
  );
}
