import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';
import { CandlestickSeries, AreaSeries, HistogramSeries, LineSeries, BarSeries } from 'lightweight-charts';
import { Group, SegmentedControl, Tooltip } from '@mantine/core';
import rallyColors from '../../theme/rallyColors';
import { GRID_STROKE } from './shared/chartStyles';
import indicatorMeta from '../../utils/indicatorMeta';

export default function RallyCandlestickChart({
  data = [],
  height = 400,
  showVolume = true,
  activeIndicators = {},
  overlayData = {},
}) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const overlaySeriesRef = useRef(new Map());
  const [chartType, setChartType] = useState('candlestick');

  // Effect 1: Create chart instance + candlestick/area + volume
  useEffect(() => {
    if (!chartContainerRef.current || !data.length) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }
    overlaySeriesRef.current.clear();

    const containerWidth = chartContainerRef.current?.clientWidth ?? 800;
    const isMobileWidth = containerWidth < 480;

    const chart = createChart(chartContainerRef.current, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: rallyColors.textSecondary,
        fontFamily: "'Poppins', sans-serif",
        fontSize: isMobileWidth ? 9 : 11,
      },
      grid: {
        vertLines: { color: GRID_STROKE },
        horzLines: { color: GRID_STROKE },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: 'rgba(148, 163, 184, 0.3)',
          labelBackgroundColor: rallyColors.glassBg,
        },
        horzLine: {
          color: 'rgba(148, 163, 184, 0.3)',
          labelBackgroundColor: rallyColors.glassBg,
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(148, 163, 184, 0.1)',
        minimumWidth: isMobileWidth ? 50 : 70,
      },
      timeScale: {
        borderColor: 'rgba(148, 163, 184, 0.1)',
        timeVisible: false,
      },
      handleScroll: { vertTouchDrag: false },
    });

    chartRef.current = chart;

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
      chart.addSeries(CandlestickSeries, {
        upColor: rallyColors.green,
        downColor: rallyColors.red,
        borderDownColor: rallyColors.red,
        borderUpColor: rallyColors.green,
        wickDownColor: rallyColors.red,
        wickUpColor: rallyColors.green,
      }).setData(ohlcData);
    } else if (chartType === 'line') {
      chart.addSeries(LineSeries, {
        color: rallyColors.green,
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBackgroundColor: rallyColors.green,
      }).setData(ohlcData.map((d) => ({ time: d.time, value: d.close })));
    } else if (chartType === 'bar') {
      chart.addSeries(BarSeries, {
        upColor: rallyColors.green,
        downColor: rallyColors.red,
        thinBars: false,
      }).setData(ohlcData);
    } else {
      chart.addSeries(AreaSeries, {
        topColor: `${rallyColors.green}40`,
        bottomColor: `${rallyColors.green}05`,
        lineColor: rallyColors.green,
        lineWidth: 2,
      }).setData(ohlcData.map((d) => ({ time: d.time, value: d.close })));
    }

    if (showVolume) {
      const volumeData = data
        .filter((d) => d.date && d.volume)
        .map((d) => ({
          time: d.date,
          value: d.volume,
          color: d.close >= d.open ? `${rallyColors.green}30` : `${rallyColors.red}30`,
        }))
        .sort((a, b) => (a.time > b.time ? 1 : -1));

      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });
      chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });
      volumeSeries.setData(volumeData);
    }

    chart.timeScale().fitContent();

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
      overlaySeriesRef.current.clear();
    };
  }, [data, chartType, height, showVolume]);

  // Effect 2: Manage overlay line series for technical indicators
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const currentOverlays = overlaySeriesRef.current;
    const activeKeys = new Set();

    // Add/update overlays
    for (const [key, seriesData] of Object.entries(overlayData)) {
      if (!activeIndicators[key] || !seriesData) continue;
      activeKeys.add(key);
      const meta = indicatorMeta[key];

      if (key === 'bollinger' && seriesData.upper) {
        // Bollinger has 3 lines
        for (const band of ['upper', 'middle', 'lower']) {
          const bKey = `bollinger_${band}`;
          activeKeys.add(bKey);
          if (!currentOverlays.has(bKey)) {
            const lineStyle = band === 'middle' ? 0 : 2; // 0=Solid, 2=Dashed
            const series = chart.addSeries(LineSeries, {
              color: meta.color,
              lineWidth: band === 'middle' ? 1.5 : 1,
              lineStyle,
              priceLineVisible: false,
              lastValueVisible: false,
            });
            currentOverlays.set(bKey, series);
          }
          currentOverlays.get(bKey).setData(seriesData[band]);
        }
      } else if (key !== 'bollinger') {
        if (!currentOverlays.has(key)) {
          const series = chart.addSeries(LineSeries, {
            color: meta?.color || '#999',
            lineWidth: 1.5,
            priceLineVisible: false,
            lastValueVisible: false,
          });
          currentOverlays.set(key, series);
        }
        currentOverlays.get(key).setData(seriesData);
      }
    }

    // Remove overlays that are no longer active
    for (const [key, series] of currentOverlays.entries()) {
      if (!activeKeys.has(key)) {
        chart.removeSeries(series);
        currentOverlays.delete(key);
      }
    }
  }, [activeIndicators, overlayData]);

  return (
    <div>
      <Group justify="flex-end" mb="xs">
        <SegmentedControl
          size="xs"
          value={chartType}
          onChange={setChartType}
          data={[
            { label: 'شمعی', value: 'candlestick' },
            { label: 'خطی', value: 'line' },
            { label: 'میله‌ای', value: 'bar' },
            { label: 'ناحیه‌ای', value: 'area' },
          ]}
        />
      </Group>
      <div ref={chartContainerRef} style={{ width: '100%' }} />
    </div>
  );
}
