import { useEffect, useRef } from 'react';
import { createChart, ColorType, LineSeries, HistogramSeries } from 'lightweight-charts';
import { Text } from '@mantine/core';
import rallyColors from '../../theme/rallyColors';
import { GRID_STROKE } from './shared/chartStyles';
import indicatorMeta from '../../utils/indicatorMeta';

/**
 * Generic sub-chart for technical indicators using lightweight-charts.
 * Supports RSI, MACD, Stochastic, Williams %R, CCI, ADX, MFI, ROC, ATR, OBV.
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

    const containerWidth = containerRef.current?.clientWidth ?? 800;
    const isMobileWidth = containerWidth < 480;

    const chart = createChart(containerRef.current, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: rallyColors.textSecondary,
        fontFamily: "'Poppins', sans-serif",
        fontSize: isMobileWidth ? 9 : 10,
      },
      grid: {
        vertLines: { color: GRID_STROKE },
        horzLines: { color: GRID_STROKE },
      },
      rightPriceScale: { borderColor: 'rgba(148, 163, 184, 0.1)' },
      timeScale: { borderColor: 'rgba(148, 163, 184, 0.1)', timeVisible: false },
      handleScroll: { vertTouchDrag: false },
      crosshair: {
        vertLine: { color: 'rgba(148, 163, 184, 0.3)', labelBackgroundColor: rallyColors.glassBg },
        horzLine: { color: 'rgba(148, 163, 184, 0.3)', labelBackgroundColor: rallyColors.glassBg },
      },
    });

    chartRef.current = chart;

    if (type === 'rsi') {
      const series = chart.addSeries(LineSeries, { color: meta.color, lineWidth: 1.5 });
      series.setData(data);
      // Reference lines at 70 and 30
      series.createPriceLine({ price: 70, color: 'rgba(239,68,68,0.4)', lineWidth: 1, lineStyle: 2, axisLabelVisible: false });
      series.createPriceLine({ price: 30, color: 'rgba(16,185,129,0.4)', lineWidth: 1, lineStyle: 2, axisLabelVisible: false });
      chart.priceScale('right').applyOptions({ autoScale: false, scaleMargins: { top: 0.05, bottom: 0.05 } });
      series.applyOptions({ priceScaleId: 'right' });
    } else if (type === 'macd') {
      const macdLine = chart.addSeries(LineSeries, { color: '#3B82F6', lineWidth: 1.5 });
      macdLine.setData(data.macd);
      const signalLine = chart.addSeries(LineSeries, { color: '#EF4444', lineWidth: 1 });
      signalLine.setData(data.signal);
      const histSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'price' },
      });
      histSeries.setData(data.histogram);
    } else if (type === 'stochastic') {
      const kLine = chart.addSeries(LineSeries, { color: '#8B5CF6', lineWidth: 1.5 });
      kLine.setData(data.k);
      const dLine = chart.addSeries(LineSeries, { color: '#F59E0B', lineWidth: 1 });
      dLine.setData(data.d);
      kLine.createPriceLine({ price: 80, color: 'rgba(239,68,68,0.4)', lineWidth: 1, lineStyle: 2, axisLabelVisible: false });
      kLine.createPriceLine({ price: 20, color: 'rgba(16,185,129,0.4)', lineWidth: 1, lineStyle: 2, axisLabelVisible: false });
    } else if (type === 'williamsR') {
      // Williams %R: -100 to 0 scale, reference lines at -20 and -80
      const series = chart.addSeries(LineSeries, { color: meta.color, lineWidth: 1.5 });
      series.setData(data);
      series.createPriceLine({ price: -20, color: 'rgba(239,68,68,0.4)', lineWidth: 1, lineStyle: 2, axisLabelVisible: false });
      series.createPriceLine({ price: -80, color: 'rgba(16,185,129,0.4)', lineWidth: 1, lineStyle: 2, axisLabelVisible: false });
    } else if (type === 'cci') {
      // CCI: reference lines at +100 and -100
      const series = chart.addSeries(LineSeries, { color: meta.color, lineWidth: 1.5 });
      series.setData(data);
      series.createPriceLine({ price: 100, color: 'rgba(239,68,68,0.4)', lineWidth: 1, lineStyle: 2, axisLabelVisible: false });
      series.createPriceLine({ price: -100, color: 'rgba(16,185,129,0.4)', lineWidth: 1, lineStyle: 2, axisLabelVisible: false });
      series.createPriceLine({ price: 0, color: 'rgba(148,163,184,0.2)', lineWidth: 1, lineStyle: 2, axisLabelVisible: false });
    } else if (type === 'adx') {
      // ADX with +DI and -DI lines
      const adxLine = chart.addSeries(LineSeries, { color: '#FBBF24', lineWidth: 2 });
      adxLine.setData(data.adx);
      const plusLine = chart.addSeries(LineSeries, { color: '#10B981', lineWidth: 1 });
      plusLine.setData(data.plusDI);
      const minusLine = chart.addSeries(LineSeries, { color: '#EF4444', lineWidth: 1 });
      minusLine.setData(data.minusDI);
      // Reference line at 25 (strong trend threshold)
      adxLine.createPriceLine({ price: 25, color: 'rgba(148,163,184,0.3)', lineWidth: 1, lineStyle: 2, axisLabelVisible: false });
    } else if (type === 'mfi') {
      // MFI: 0-100 scale like RSI, reference lines at 80 and 20
      const series = chart.addSeries(LineSeries, { color: meta.color, lineWidth: 1.5 });
      series.setData(data);
      series.createPriceLine({ price: 80, color: 'rgba(239,68,68,0.4)', lineWidth: 1, lineStyle: 2, axisLabelVisible: false });
      series.createPriceLine({ price: 20, color: 'rgba(16,185,129,0.4)', lineWidth: 1, lineStyle: 2, axisLabelVisible: false });
    } else if (type === 'roc') {
      // ROC: zero-centered, reference line at 0
      const series = chart.addSeries(LineSeries, { color: meta.color, lineWidth: 1.5 });
      series.setData(data);
      series.createPriceLine({ price: 0, color: 'rgba(148,163,184,0.3)', lineWidth: 1, lineStyle: 2, axisLabelVisible: false });
    } else if (type === 'atr' || type === 'obv') {
      const series = chart.addSeries(LineSeries, { color: meta.color, lineWidth: 1.5 });
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
