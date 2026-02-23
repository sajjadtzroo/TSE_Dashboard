import { useEffect, useRef, useState } from 'react';
import { init, dispose } from 'klinecharts';
import { Group, SegmentedControl } from '@mantine/core';
import rallyColors from '../../theme/rallyColors';
import indicatorMeta from '../../utils/indicatorMeta';
import DrawingToolbar from './drawing/DrawingToolbar';

/** KLineChart dark theme matching the project's design tokens */
const DARK_THEME = {
  grid: {
    horizontal: { color: 'rgba(148,163,184,0.04)', style: 'solid', size: 1 },
    vertical:   { color: 'rgba(148,163,184,0.04)', style: 'solid', size: 1 },
  },
  candle: {
    upColor:         rallyColors.green,
    downColor:       rallyColors.red,
    upBorderColor:   rallyColors.green,
    downBorderColor: rallyColors.red,
    upWickColor:     rallyColors.green,
    downWickColor:   rallyColors.red,
    tooltip: {
      rect: {
        color:        'rgba(18,18,24,0.88)',
        borderColor:  'rgba(255,255,255,0.06)',
        borderSize:   1,
        borderRadius: 6,
      },
      title:  { color: rallyColors.textSecondary },
      labels: [{ color: rallyColors.textSecondary }],
      values: [{ color: rallyColors.textPrimary }],
    },
  },
  indicator: {
    tooltip: {
      title:  { color: rallyColors.textSecondary },
      labels: [{ color: rallyColors.textSecondary }],
      values: [{ color: rallyColors.textPrimary }],
    },
  },
  xAxis: {
    axisLine:  { color: 'rgba(148,163,184,0.1)', size: 1 },
    tickLine:  { color: 'rgba(148,163,184,0.1)', size: 1 },
    tickText:  { color: rallyColors.textSecondary, size: 11, family: "'Poppins', sans-serif" },
  },
  yAxis: {
    axisLine:  { color: 'rgba(148,163,184,0.1)', size: 1 },
    tickLine:  { color: 'rgba(148,163,184,0.1)', size: 1 },
    tickText:  { color: rallyColors.textSecondary, size: 11, family: "'Poppins', sans-serif" },
  },
  separator: { color: 'rgba(148,163,184,0.08)', size: 1 },
  crosshair: {
    horizontal: {
      line: { color: 'rgba(148,163,184,0.3)', style: 'dashed', size: 1 },
      text: {
        color:        rallyColors.textPrimary,
        backgroundColor: rallyColors.elevated ?? '#1e1e2a',
        borderColor:  'rgba(255,255,255,0.08)',
        borderRadius: 4,
        borderSize:   1,
        paddingLeft:  6,
        paddingRight: 6,
      },
    },
    vertical: {
      line: { color: 'rgba(148,163,184,0.3)', style: 'dashed', size: 1 },
      text: {
        color:        rallyColors.textPrimary,
        backgroundColor: rallyColors.elevated ?? '#1e1e2a',
        borderColor:  'rgba(255,255,255,0.08)',
        borderRadius: 4,
        borderSize:   1,
        paddingLeft:  6,
        paddingRight: 6,
      },
    },
  },
};

const CHART_TYPES = [
  { label: 'شمعی',    value: 'candle_solid'  },
  { label: 'خطی',     value: 'area'          },
  { label: 'میله‌ای',  value: 'ohlc'          },
];

export default function RallyCandlestickChart({
  data = [],
  height = 400,
  activeIndicators = {},
  isLive = false,
}) {
  const containerRef  = useRef(null);
  const chartRef      = useRef(null);
  // Map of indicatorKey → indicator id used to remove it
  const indicatorIds  = useRef({});
  // Track previous indicator state so we can diff
  const prevIndicators = useRef({});

  const [candleType, setCandleType] = useState('candle_solid');

  // ── Effect 1: init chart (once) ─────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = init(containerRef.current, {
      timezone: 'Asia/Tehran',
      styles: DARK_THEME,
      layout: [
        { type: 'candle', options: { id: 'candle_pane', height } },
        { type: 'indicator', content: [{ name: 'VOL' }], options: { id: 'volume_pane', height: 80, minHeight: 60 } },
        { type: 'xAxis' },
      ],
    });

    chartRef.current = chart;

    // ResizeObserver for responsive width
    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.resize();
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      dispose(containerRef.current);
      chartRef.current  = null;
      indicatorIds.current  = {};
      prevIndicators.current = {};
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effect 2: load data ─────────────────────────────────────────────────
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !data.length) return;

    const bars = data
      .filter((d) => d.date && d.open != null && d.close != null)
      .map((d) => ({
        // d.date is 'YYYY-MM-DD' (daily) or Unix seconds (live)
        timestamp: typeof d.date === 'string'
          ? new Date(d.date).getTime()
          : d.date * 1000,
        open:   +d.open,
        high:   +d.high,
        low:    +d.low,
        close:  +d.close,
        volume: +(d.volume ?? 0),
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    chart.applyNewData(bars);
  }, [data]);

  // ── Effect 3: candle type ──────────────────────────────────────────────
  useEffect(() => {
    chartRef.current?.setStyles({ candle: { type: candleType } });
  }, [candleType]);

  // ── Effect 4: sync indicators ──────────────────────────────────────────
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const prev = prevIndicators.current;

    for (const [key, meta] of Object.entries(indicatorMeta)) {
      const isNowActive  = !!activeIndicators[key];
      const wasActive    = !!prev[key];

      if (isNowActive && !wasActive) {
        // Add indicator
        const paneOpts = meta.isOverlay ? { id: 'candle_pane' } : undefined;
        const indicatorDef = {
          name:        meta.klcId,
          id:          key,           // use our key as the stable id
          calcParams:  meta.klcParams.length ? meta.klcParams : undefined,
        };
        chart.createIndicator(indicatorDef, meta.isOverlay, paneOpts);
        indicatorIds.current[key] = key;
      } else if (!isNowActive && wasActive) {
        // Remove indicator by id
        chart.removeIndicator({ id: key });
        delete indicatorIds.current[key];
      }
    }

    prevIndicators.current = { ...activeIndicators };
  }, [activeIndicators]);

  return (
    <div>
      <Group justify="space-between" mb="xs" wrap="wrap" gap="xs">
        <DrawingToolbar chartRef={chartRef} />
        <SegmentedControl
          size="xs"
          value={candleType}
          onChange={setCandleType}
          data={CHART_TYPES}
        />
      </Group>
      <div
        ref={containerRef}
        style={{ width: '100%', height: height + 80 /* +volume pane */ }}
      />
    </div>
  );
}
