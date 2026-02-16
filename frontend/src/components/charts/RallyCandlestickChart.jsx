import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';
import { Group, SegmentedControl } from '@mantine/core';
import rallyColors from '../../theme/rallyColors';

export default function RallyCandlestickChart({
  data = [],
  height = 400,
  showVolume = true,
}) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const [chartType, setChartType] = useState('candlestick');

  useEffect(() => {
    if (!chartContainerRef.current || !data.length) return;

    // Clean up previous chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(chartContainerRef.current, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: rallyColors.textSecondary,
        fontFamily: "'Poppins', sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(148, 163, 184, 0.04)' },
        horzLines: { color: 'rgba(148, 163, 184, 0.04)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: 'rgba(148, 163, 184, 0.3)',
          labelBackgroundColor: rallyColors.elevated,
        },
        horzLine: {
          color: 'rgba(148, 163, 184, 0.3)',
          labelBackgroundColor: rallyColors.elevated,
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(148, 163, 184, 0.1)',
      },
      timeScale: {
        borderColor: 'rgba(148, 163, 184, 0.1)',
        timeVisible: false,
      },
      handleScroll: { vertTouchDrag: false },
    });

    chartRef.current = chart;

    // Prepare OHLC data sorted by date
    const ohlcData = data
      .filter((d) => d.date && d.open && d.high && d.low && d.close)
      .map((d) => ({
        time: d.date,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }))
      .sort((a, b) => (a.time > b.time ? 1 : -1));

    if (chartType === 'candlestick') {
      const candleSeries = chart.addCandlestickSeries({
        upColor: rallyColors.green,
        downColor: rallyColors.red,
        borderDownColor: rallyColors.red,
        borderUpColor: rallyColors.green,
        wickDownColor: rallyColors.red,
        wickUpColor: rallyColors.green,
      });
      candleSeries.setData(ohlcData);
    } else {
      // Area chart
      const areaSeries = chart.addAreaSeries({
        topColor: `${rallyColors.green}40`,
        bottomColor: `${rallyColors.green}05`,
        lineColor: rallyColors.green,
        lineWidth: 2,
      });
      areaSeries.setData(
        ohlcData.map((d) => ({ time: d.time, value: d.close })),
      );
    }

    // Volume histogram
    if (showVolume) {
      const volumeData = data
        .filter((d) => d.date && d.volume)
        .map((d) => ({
          time: d.date,
          value: d.volume,
          color:
            d.close >= d.open
              ? `${rallyColors.green}30`
              : `${rallyColors.red}30`,
        }))
        .sort((a, b) => (a.time > b.time ? 1 : -1));

      const volumeSeries = chart.addHistogramSeries({
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });

      chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });

      volumeSeries.setData(volumeData);
    }

    chart.timeScale().fitContent();

    // Handle resize
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.applyOptions({ width: entry.contentRect.width });
      }
    });
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [data, chartType, height, showVolume]);

  return (
    <div>
      <Group justify="flex-end" mb="xs">
        <SegmentedControl
          size="xs"
          value={chartType}
          onChange={setChartType}
          data={[
            { label: 'Candlestick', value: 'candlestick' },
            { label: 'Area', value: 'area' },
          ]}
        />
      </Group>
      <div ref={chartContainerRef} style={{ width: '100%' }} />
    </div>
  );
}
