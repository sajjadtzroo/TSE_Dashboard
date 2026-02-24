import { useEffect, useRef, useState } from 'react';
import { init, dispose, registerYAxis } from 'klinecharts';
import { useViewportSize } from '@mantine/hooks';
import { ActionIcon, Group, SegmentedControl, Text, Tooltip } from '@mantine/core';
import { IconMathFunction, IconZoomReset } from '@tabler/icons-react';
import rallyColors from '../../theme/rallyColors';
import indicatorMeta from '../../utils/indicatorMeta';
import DrawingToolbar from './drawing/DrawingToolbar';
import { formatNum } from '../../utils/formatUtils';

// v9 registerYAxis takes { name, createTicks } — not v10's value-transform callbacks.
// We use the data-transform approach: prices are log10-scaled before applyNewData,
// so range.from/to here are log10 values. createTicks converts back to original prices.
registerYAxis({
  name: 'logYAxis',
  createTicks: ({ range, bounding, defaultTicks }) => {
    const { from: logFrom, to: logTo } = range;
    if (!isFinite(logFrom) || !isFinite(logTo) || logTo <= logFrom) return defaultTicks;
    const height    = bounding.height;
    const logRange  = logTo - logFrom;
    const priceFrom = Math.pow(10, logFrom);
    const priceTo   = Math.pow(10, logTo);
    const priceRange = priceTo - priceFrom;
    // Pick a step that yields ~4-8 ticks
    const magnitude = Math.pow(10, Math.floor(Math.log10(priceRange / 6)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => priceRange / s <= 8) ?? magnitude * 10;
    const ticks = [];
    for (let price = Math.ceil(priceFrom / step) * step; price <= priceTo * 1.001; price += step) {
      if (price <= 0) continue;
      const coord = height - ((Math.log10(price) - logFrom) / logRange) * height;
      if (coord < 0 || coord > height) continue;
      ticks.push({
        coord: Math.round(coord),
        value: price,
        text:  price >= 1000 ? Math.round(price).toLocaleString('en-US') : Number(price.toPrecision(4)).toString(),
      });
    }
    return ticks.length >= 2 ? ticks : defaultTicks;
  },
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
  minHeight,
}) {
  const containerRef  = useRef(null);
  const chartRef      = useRef(null);

  const { height: vh } = useViewportSize();
  const chartHeight = Math.max(minHeight || 400, Math.floor(vh * 0.58));
  // Tracks which indicators are currently added: key → pane ID
  const indicatorIds  = useRef({});

  const [candleType, setCandleType] = useState('candle_solid');
  const [isLogScale, setIsLogScale] = useState(false);
  const [ohlcv, setOhlcv] = useState(null);
  // Ref so the crosshair handler (defined once in Effect 1) can read current log mode
  const isLogScaleRef = useRef(false);

  const handleAutoscale = () => {
    chartRef.current?.scrollToRealTime();
  };

  // Keep ref in sync so the crosshair handler (created once) always reads current mode
  useEffect(() => {
    isLogScaleRef.current = isLogScale;
  }, [isLogScale]);

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

    // Color volume bars green/red based on candle direction
    chart.overrideIndicator(
      {
        name: 'VOL',
        styles: {
          bars: [{
            style: 'fill',
            upColor: `${rallyColors.green}80`,
            downColor: `${rallyColors.red}80`,
          }],
        },
      },
      'volume_pane',
    );

    const crosshairHandler = ({ kLineData }) => {
      setOhlcv((prev) => {
        if (!kLineData) return prev;
        if (prev?.timestamp === kLineData.timestamp) return prev;
        // When log scale is on, chart data is log10(price) — convert back for display
        if (isLogScaleRef.current) {
          return {
            ...kLineData,
            open:  Math.pow(10, kLineData.open),
            high:  Math.pow(10, kLineData.high),
            low:   Math.pow(10, kLineData.low),
            close: Math.pow(10, kLineData.close),
          };
        }
        return kLineData;
      });
    };
    chart.subscribeAction('onCrosshairChange', crosshairHandler);

    const ro = new ResizeObserver(() => { chart.resize(); });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      indicatorIds.current = {};
      chart.unsubscribeAction('onCrosshairChange', crosshairHandler);
      dispose(containerRef.current);
      chartRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effect 2: load data ──────────────────────────────────────────────
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !data.length) return;

    const rawBars = data
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

    // For log scale: transform prices to log10 space so the chart renders logarithmically.
    // The custom logYAxis createTicks converts back to original price labels on the axis.
    const bars = isLogScale
      ? rawBars.map((b) => ({
          ...b,
          open:  Math.log10(Math.max(b.open,  1)),
          high:  Math.log10(Math.max(b.high,  1)),
          low:   Math.log10(Math.max(b.low,   1)),
          close: Math.log10(Math.max(b.close, 1)),
        }))
      : rawBars;

    chart.applyNewData(bars);

    // Seed OHLCV strip with original prices (never log-transformed)
    if (rawBars.length > 0) {
      const last = rawBars[rawBars.length - 1];
      setOhlcv({ open: last.open, high: last.high, low: last.low, close: last.close, volume: last.volume });
    }
  }, [data, isLogScale]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effect 3: candle type ────────────────────────────────────────────
  useEffect(() => {
    chartRef.current?.setStyles({ candle: { type: candleType } });
  }, [candleType]);

  // ── Effect 5: sync log scale ──────────────────────────────────────────
  useEffect(() => {
    chartRef.current?.setPaneOptions({
      id:          'candle_pane',
      axisOptions: { name: isLogScale ? 'logYAxis' : 'default' },
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
              color={isLogScale ? 'rally-primary' : 'gray'}
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
      {/* OHLCV readout — shows last or hovered bar values */}
      {ohlcv && (
        <Group gap="lg" px={2} pb={6} wrap="nowrap" style={{ fontSize: 11, opacity: 0.9 }}>
          <Group gap={4}>
            <Text size="xs" c="dimmed">O</Text>
            <Text size="xs" c={ohlcv.close >= ohlcv.open ? rallyColors.green : rallyColors.red} fw={500}>
              {formatNum(ohlcv.open)}
            </Text>
          </Group>
          <Group gap={4}>
            <Text size="xs" c="dimmed">H</Text>
            <Text size="xs" c={rallyColors.green} fw={500}>{formatNum(ohlcv.high)}</Text>
          </Group>
          <Group gap={4}>
            <Text size="xs" c="dimmed">L</Text>
            <Text size="xs" c={rallyColors.red} fw={500}>{formatNum(ohlcv.low)}</Text>
          </Group>
          <Group gap={4}>
            <Text size="xs" c="dimmed">C</Text>
            <Text size="xs" c={ohlcv.close >= ohlcv.open ? rallyColors.green : rallyColors.red} fw={500}>
              {formatNum(ohlcv.close)}
            </Text>
          </Group>
          <Group gap={4}>
            <Text size="xs" c="dimmed">V</Text>
            <Text size="xs" c={rallyColors.textSecondary}>{formatNum(ohlcv.volume)}</Text>
          </Group>
        </Group>
      )}
      <div
        ref={containerRef}
        style={{ width: '100%', height: chartHeight + 80 }}
      />
    </div>
  );
}
