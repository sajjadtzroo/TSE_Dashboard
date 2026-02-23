import { useEffect, useRef, useState } from 'react';
import { init, dispose, registerYAxis } from 'klinecharts';
import { useViewportSize } from '@mantine/hooks';
import { ActionIcon, Group, SegmentedControl, Tooltip } from '@mantine/core';
import { IconMathFunction, IconZoomReset } from '@tabler/icons-react';
import rallyColors from '../../theme/rallyColors';
import indicatorMeta from '../../utils/indicatorMeta';
import DrawingToolbar from './drawing/DrawingToolbar';

registerYAxis('logYAxis', {
  realValueToDisplayValue: (v) => Math.log10(Math.max(v, 1e-10)),
  displayValueToRealValue: (v) => Math.pow(10, v),
  valueToRealValue:        (v) => v,
  realValueToValue:        (v) => v,
  displayValueToText:      (v, precision) => Math.pow(10, v).toFixed(precision),
});

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
      title: { color: rallyColors.textSecondary, size: 11 },
    },
  },
  indicator: {
    tooltip: {
      title: { color: rallyColors.textSecondary, size: 11 },
    },
  },
  xAxis: {
    axisLine: { color: 'rgba(148,163,184,0.1)', size: 1 },
    tickLine: { color: 'rgba(148,163,184,0.1)', size: 1 },
    tickText: { color: rallyColors.textSecondary, size: 11, family: "'Poppins', sans-serif" },
  },
  yAxis: {
    axisLine: { color: 'rgba(148,163,184,0.1)', size: 1 },
    tickLine: { color: 'rgba(148,163,184,0.1)', size: 1 },
    tickText: { color: rallyColors.textSecondary, size: 11, family: "'Poppins', sans-serif" },
  },
  separator: { color: 'rgba(148,163,184,0.08)', size: 1 },
  crosshair: {
    horizontal: {
      line: { color: 'rgba(148,163,184,0.3)', style: 'dashed', size: 1 },
      text: {
        color:           rallyColors.textPrimary,
        backgroundColor: rallyColors.elevated ?? '#1e1e2a',
        borderColor:     'rgba(255,255,255,0.08)',
        borderRadius:    4,
        borderSize:      1,
        paddingLeft:     6,
        paddingRight:    6,
      },
    },
    vertical: {
      line: { color: 'rgba(148,163,184,0.3)', style: 'dashed', size: 1 },
      text: {
        color:           rallyColors.textPrimary,
        backgroundColor: rallyColors.elevated ?? '#1e1e2a',
        borderColor:     'rgba(255,255,255,0.08)',
        borderRadius:    4,
        borderSize:      1,
        paddingLeft:     6,
        paddingRight:    6,
      },
    },
  },
};

const CHART_TYPES = [
  { label: 'شمعی',   value: 'candle_solid' },
  { label: 'خطی',    value: 'area'         },
  { label: 'میله‌ای', value: 'ohlc'         },
];

// Keys that belong to each grouped indicator
const SMA_KEYS = ['sma10', 'sma20', 'sma50', 'sma100', 'sma200'];
const EMA_KEYS = ['ema12', 'ema26', 'ema50', 'ema200'];
// Individual overlay keys (each maps to a unique klcId on the main pane)
const SOLO_OVERLAY_KEYS = ['bollinger', 'vwap'];
// Sub-chart keys (each gets its own sub-pane)
const SUB_CHART_KEYS = ['rsi', 'macd', 'stochastic', 'williamsR', 'cci', 'roc', 'adx', 'obv'];

export default function RallyCandlestickChart({
  data = [],
  activeIndicators = {},
  isLive = false,
}) {
  const containerRef  = useRef(null);
  const chartRef      = useRef(null);

  const { height: vh } = useViewportSize();
  const chartHeight = Math.max(400, Math.floor(vh * 0.58));
  // Tracks which indicators are currently added: key → pane ID
  const indicatorIds  = useRef({});

  const [candleType, setCandleType] = useState('candle_solid');
  const [isLogScale, setIsLogScale] = useState(false);

  const handleAutoscale = () => {
    chartRef.current?.scrollToRealTime();
  };

  // ── Effect 1: init chart once ────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = init(containerRef.current, {
      timezone: 'Asia/Tehran',
      styles: DARK_THEME,
    });
    if (!chart) return;

    chartRef.current = chart;

    // Add a volume sub-pane
    chart.createIndicator('VOL', false, { id: 'volume_pane', height: 80, minHeight: 60 });

    const ro = new ResizeObserver(() => { chart.resize(); });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      indicatorIds.current = {};
      dispose(containerRef.current);
      chartRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effect 2: load data ──────────────────────────────────────────────
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !data.length) return;

    const bars = data
      .filter((d) => d.date != null && d.open != null && d.close != null)
      .map((d) => ({
        timestamp: typeof d.date === 'string'
          ? new Date(d.date).getTime()        // 'YYYY-MM-DD' → ms
          : d.date * 1000,                    // Unix seconds → ms
        open:   +d.open,
        high:   +d.high,
        low:    +d.low,
        close:  +d.close,
        volume: +(d.volume ?? 0),
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    chart.applyNewData(bars);
  }, [data]);

  // ── Effect 3: candle type ────────────────────────────────────────────
  useEffect(() => {
    chartRef.current?.setStyles({ candle: { type: candleType } });
  }, [candleType]);

  // ── Effect 5: sync log scale ──────────────────────────────────────────
  useEffect(() => {
    chartRef.current?.setPaneOptions({
      id:   'candle_pane',
      axis: { name: isLogScale ? 'logYAxis' : 'yAxis' },
    });
  }, [isLogScale]);

  // ── Effect 4: sync indicators ────────────────────────────────────────
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    // ── MA (grouped: all active SMA periods in one indicator) ──────────
    const activeSmaPeriods = SMA_KEYS
      .filter((k) => activeIndicators[k])
      .map((k) => indicatorMeta[k].klcParams[0]);

    if (activeSmaPeriods.length > 0 && !indicatorIds.current._MA) {
      chart.createIndicator(
        { name: 'MA', calcParams: activeSmaPeriods },
        true,
        { id: 'candle_pane' },
      );
      indicatorIds.current._MA = 'candle_pane';
    } else if (activeSmaPeriods.length > 0 && indicatorIds.current._MA) {
      chart.overrideIndicator({ name: 'MA', calcParams: activeSmaPeriods }, 'candle_pane');
    } else if (activeSmaPeriods.length === 0 && indicatorIds.current._MA) {
      chart.removeIndicator('candle_pane', 'MA');
      delete indicatorIds.current._MA;
    }

    // ── EMA (grouped) ──────────────────────────────────────────────────
    const activeEmaPeriods = EMA_KEYS
      .filter((k) => activeIndicators[k])
      .map((k) => indicatorMeta[k].klcParams[0]);

    if (activeEmaPeriods.length > 0 && !indicatorIds.current._EMA) {
      chart.createIndicator(
        { name: 'EMA', calcParams: activeEmaPeriods },
        true,
        { id: 'candle_pane' },
      );
      indicatorIds.current._EMA = 'candle_pane';
    } else if (activeEmaPeriods.length > 0 && indicatorIds.current._EMA) {
      chart.overrideIndicator({ name: 'EMA', calcParams: activeEmaPeriods }, 'candle_pane');
    } else if (activeEmaPeriods.length === 0 && indicatorIds.current._EMA) {
      chart.removeIndicator('candle_pane', 'EMA');
      delete indicatorIds.current._EMA;
    }

    // ── Solo overlay indicators (BOLL, AVP) ────────────────────────────
    for (const key of SOLO_OVERLAY_KEYS) {
      const meta = indicatorMeta[key];
      const isOn  = !!activeIndicators[key];
      const wasOn = !!indicatorIds.current[key];
      if (isOn && !wasOn) {
        chart.createIndicator(
          { name: meta.klcId, calcParams: meta.klcParams.length ? meta.klcParams : undefined },
          true,
          { id: 'candle_pane' },
        );
        indicatorIds.current[key] = 'candle_pane';
      } else if (!isOn && wasOn) {
        chart.removeIndicator('candle_pane', meta.klcId);
        delete indicatorIds.current[key];
      }
    }

    // ── Sub-chart indicators (each gets its own pane) ──────────────────
    for (const key of SUB_CHART_KEYS) {
      const meta = indicatorMeta[key];
      const isOn  = !!activeIndicators[key];
      const wasOn = !!indicatorIds.current[key];
      if (isOn && !wasOn) {
        const paneId = chart.createIndicator(
          { name: meta.klcId, calcParams: meta.klcParams.length ? meta.klcParams : undefined },
          false,
        );
        indicatorIds.current[key] = paneId ?? key;
      } else if (!isOn && wasOn) {
        chart.removeIndicator(indicatorIds.current[key], meta.klcId);
        delete indicatorIds.current[key];
      }
    }
  }, [activeIndicators]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <Group
        justify="space-between"
        mb={4}
        pb={6}
        style={{ borderBottom: '1px solid rgba(148,163,184,0.08)' }}
        wrap="nowrap"
        gap="xs"
      >
        <DrawingToolbar chartRef={chartRef} />
        <Group gap={4} wrap="nowrap">
          <Tooltip label="بازگشت به نمای خودکار" position="top" withArrow>
            <ActionIcon
              variant="subtle"
              size="sm"
              color="gray"
              onClick={handleAutoscale}
              aria-label="autoscale"
            >
              <IconZoomReset size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={isLogScale ? 'غیرفعال کردن مقیاس لگاریتمی' : 'مقیاس لگاریتمی'} position="top" withArrow>
            <ActionIcon
              variant={isLogScale ? 'light' : 'subtle'}
              size="sm"
              color={isLogScale ? 'rally-green' : 'gray'}
              onClick={() => setIsLogScale((v) => !v)}
              aria-label="log scale"
            >
              <IconMathFunction size={14} />
            </ActionIcon>
          </Tooltip>
          <SegmentedControl
            size="xs"
            value={candleType}
            onChange={setCandleType}
            data={CHART_TYPES}
          />
        </Group>
      </Group>
      <div
        ref={containerRef}
        style={{ width: '100%', height: chartHeight + 80 }}
      />
    </div>
  );
}
