import { useEffect, useRef, useState } from 'react';
import { Badge, Center, Group, Loader, SegmentedControl, Text, Title } from '@mantine/core';
import { createChart, ColorType, CrosshairMode, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import RallyMainCard from '../RallyMainCard';
import rallyColors from '../../theme/rallyColors';
import { useTickOHLCV, isMarketOpen } from '../../hooks/useTickOHLCV';

/**
 * Intraday candlestick chart card powered by the TimescaleDB continuous aggregate.
 * Polls GET /api/ticks/{symbol}/ohlcv every 15 s during market hours.
 *
 * Props:
 *   symbol {string} - TSE ticker symbol
 */
export default function RealtimeChartCard({ symbol }) {
  const [interval, setInterval] = useState('1min');
  const live = isMarketOpen();

  const { data: rawBars = [], isLoading } = useTickOHLCV(symbol, { interval });

  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);

  // Build ascending chart-ready arrays whenever rawBars changes
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
      color: (b.close ?? 0) >= (b.open ?? 0) ? `${rallyColors.green}35` : `${rallyColors.red}35`,
    }));

  // Create chart once on mount, destroy on unmount
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      height: 320,
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
      localization: { timeFormatter: (ts) => {
        const d = new Date(ts * 1000);
        return d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tehran' });
      }},
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
  }, []);

  // Update chart data whenever bars or interval changes
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || !bars.length) return;
    candleSeriesRef.current.setData(bars);
    volumeSeriesRef.current.setData(volumeBars);
    chartRef.current?.timeScale().fitContent();
  }, [bars.length, interval]); // eslint-disable-line react-hooks/exhaustive-deps

  const header = (
    <Group justify="space-between" w="100%" wrap="wrap" gap="xs">
      <Group gap="xs">
        <Title order={4}>نمودار لحظه‌ای</Title>
        {live && bars.length > 0 && (
          <Badge color="rally-green" variant="light" size="sm">● زنده</Badge>
        )}
        {!live && (
          <Badge color="gray" variant="outline" size="sm">بازار بسته</Badge>
        )}
      </Group>
      <SegmentedControl
        size="xs"
        value={interval}
        onChange={setInterval}
        data={[
          { label: '۱ دقیقه', value: '1min' },
          { label: '۵ دقیقه', value: '5min' },
        ]}
      />
    </Group>
  );

  return (
    <RallyMainCard title={header} mb="md">
      {isLoading ? (
        <Center mih={320}><Loader color="rally-green" size="sm" /></Center>
      ) : bars.length > 0 ? (
        <div ref={chartContainerRef} style={{ width: '100%' }} />
      ) : (
        <Center mih={320} style={{ flexDirection: 'column', gap: 8 }}>
          <Text c="dimmed" size="sm">
            {live ? 'در حال بارگذاری داده‌های لحظه‌ای…' : 'داده‌ای برای امروز موجود نیست'}
          </Text>
          <Text c="dimmed" size="xs">ساعت بازار: شنبه تا چهارشنبه ۹:۰۰ – ۱۲:۳۰</Text>
        </Center>
      )}
    </RallyMainCard>
  );
}
