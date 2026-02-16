import { useEffect, useRef } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import { Text } from '@mantine/core';
import rallyColors from '../../theme/rallyColors';
import indicatorMeta from '../../utils/indicatorMeta';

/**
 * Generic sub-chart for technical indicators using lightweight-charts.
 * Supports RSI, MACD, Stochastic, ATR, OBV.
 */
export default function TechnicalSubChart({ type, data, height = 150, mainChartRef }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const meta = indicatorMeta[type];

  useEffect(() => {
    if (!containerRef.current || !data) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: rallyColors.textSecondary,
        fontFamily: "'Poppins', sans-serif",
        fontSize: 10,
      },
      grid: {
        vertLines: { color: 'rgba(148, 163, 184, 0.04)' },
        horzLines: { color: 'rgba(148, 163, 184, 0.04)' },
      },
      rightPriceScale: { borderColor: 'rgba(148, 163, 184, 0.1)' },
      timeScale: { borderColor: 'rgba(148, 163, 184, 0.1)', timeVisible: false },
      handleScroll: { vertTouchDrag: false },
      crosshair: {
        vertLine: { color: 'rgba(148, 163, 184, 0.3)', labelBackgroundColor: rallyColors.elevated },
        horzLine: { color: 'rgba(148, 163, 184, 0.3)', labelBackgroundColor: rallyColors.elevated },
      },
    });

    chartRef.current = chart;

    if (type === 'rsi') {
      const series = chart.addLineSeries({ color: meta.color, lineWidth: 1.5 });
      series.setData(data);
      // Reference lines at 70 and 30
      series.createPriceLine({ price: 70, color: 'rgba(239,68,68,0.4)', lineWidth: 1, lineStyle: 2, axisLabelVisible: false });
      series.createPriceLine({ price: 30, color: 'rgba(16,185,129,0.4)', lineWidth: 1, lineStyle: 2, axisLabelVisible: false });
      chart.priceScale('right').applyOptions({ autoScale: false, scaleMargins: { top: 0.05, bottom: 0.05 } });
      series.applyOptions({ priceScaleId: 'right' });
    } else if (type === 'macd') {
      const macdLine = chart.addLineSeries({ color: '#3B82F6', lineWidth: 1.5 });
      macdLine.setData(data.macd);
      const signalLine = chart.addLineSeries({ color: '#EF4444', lineWidth: 1 });
      signalLine.setData(data.signal);
      const histSeries = chart.addHistogramSeries({
        priceFormat: { type: 'price' },
      });
      histSeries.setData(data.histogram);
    } else if (type === 'stochastic') {
      const kLine = chart.addLineSeries({ color: '#8B5CF6', lineWidth: 1.5 });
      kLine.setData(data.k);
      const dLine = chart.addLineSeries({ color: '#F59E0B', lineWidth: 1 });
      dLine.setData(data.d);
      kLine.createPriceLine({ price: 80, color: 'rgba(239,68,68,0.4)', lineWidth: 1, lineStyle: 2, axisLabelVisible: false });
      kLine.createPriceLine({ price: 20, color: 'rgba(16,185,129,0.4)', lineWidth: 1, lineStyle: 2, axisLabelVisible: false });
    } else if (type === 'atr' || type === 'obv') {
      const series = chart.addLineSeries({ color: meta.color, lineWidth: 1.5 });
      series.setData(Array.isArray(data) ? data : []);
    }

    chart.timeScale().fitContent();

    // Sync time scale with main chart
    if (mainChartRef?.current) {
      const mainTS = mainChartRef.current.timeScale();
      const subTS = chart.timeScale();

      const syncSub = () => {
        const range = mainTS.getVisibleRange();
        if (range) subTS.setVisibleRange(range);
      };
      mainTS.subscribeVisibleTimeRangeChange(syncSub);
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.applyOptions({ width: entry.contentRect.width });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [type, data, height]);

  return (
    <div style={{ marginTop: 4 }}>
      <Text size="xs" c="dimmed" mb={2}>{meta?.label || type}</Text>
      <div ref={containerRef} style={{ width: '100%' }} />
    </div>
  );
}
