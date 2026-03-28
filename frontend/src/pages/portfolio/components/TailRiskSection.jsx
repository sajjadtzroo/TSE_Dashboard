import { useMemo } from 'react';
import { SimpleGrid, Text } from '@mantine/core';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from 'recharts';
import RallyMainCard from '../../../components/RallyMainCard';
import RallyKPICard from '../../../components/RallyKPICard';
import ChartEmptyState from '../../../components/charts/shared/ChartEmptyState';
import { usePortfolioContext } from '../PortfolioProvider';
import { tailRatio, gainToLossRatio, hitRate, captureRatios } from '../../../utils/riskMetrics/tailRisk';
import { alignReturnSeries } from '../../../utils/riskMetrics/returns';
import { GRID_STROKE, axisTick, TOOLTIP_STYLE } from '../../../components/charts/shared/chartStyles';
import { toPersianNum } from '../../../utils/formatUtils';
import rallyColors from '../../../theme/rallyColors';
import { IconArrowUpRight, IconArrowDownRight, IconTarget, IconPercentage } from '@tabler/icons-react';

/**
 * Build histogram bins from returns for distribution chart.
 */
function buildHistogram(returns, bins = 30) {
  if (!returns.length) return [];
  const min = Math.min(...returns);
  const max = Math.max(...returns);
  const range = max - min || 0.01;
  const binWidth = range / bins;

  const histogram = Array.from({ length: bins }, (_, i) => ({
    binStart: min + i * binWidth,
    binEnd: min + (i + 1) * binWidth,
    binLabel: ((min + (i + 0.5) * binWidth) * 100).toFixed(1),
    count: 0,
  }));

  for (const r of returns) {
    const idx = Math.min(Math.floor((r - min) / binWidth), bins - 1);
    histogram[idx].count++;
  }

  // Mark positive/negative bins
  return histogram.map((h) => ({
    ...h,
    isPositive: h.binStart + h.binEnd > 0,
  }));
}

function HistogramTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div style={{ ...TOOLTIP_STYLE }}>
      <Text size="xs" c={rallyColors.textSecondary}>
        بازده: {d.binLabel}٪
      </Text>
      <Text size="xs" fw={600} c={rallyColors.textPrimary}>
        تعداد: {toPersianNum(String(d.count))}
      </Text>
    </div>
  );
}

export default function TailRiskSection() {
  const { portfolioReturns, benchReturnSeries } = usePortfolioContext();

  const metrics = useMemo(() => {
    const { returns: portRets, dates: portDates } = portfolioReturns;
    if (portRets.length < 20) return null;

    const tr = tailRatio(portRets);
    const glr = gainToLossRatio(portRets);
    const hr = hitRate(portRets);

    // Capture ratios need aligned benchmark
    const portReturnObjs = portDates.map((d, i) => ({ date: d, ret: portRets[i] }));
    const aligned = alignReturnSeries(portReturnObjs, benchReturnSeries);
    const capture = aligned.stockReturns.length >= 20
      ? captureRatios(aligned.stockReturns, aligned.benchReturns)
      : { upsideCapture: null, downsideCapture: null };

    const histogram = buildHistogram(portRets, 35);

    return { tr, glr, hr, capture, histogram };
  }, [portfolioReturns, benchReturnSeries]);

  if (!metrics) {
    return (
      <RallyMainCard title="تحلیل دُم توزیع">
        <ChartEmptyState height={200} message="داده کافی برای تحلیل دُم توزیع نیست" />
      </RallyMainCard>
    );
  }

  return (
    <>
      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md" mb="md">
        <RallyKPICard
          title="نسبت دُم"
          value={metrics.tr != null ? toPersianNum(metrics.tr.toFixed(2)) : '-'}
          subtitle={metrics.tr != null ? (metrics.tr > 1 ? 'چولگی مثبت' : 'چولگی منفی') : ''}
          icon={IconTarget}
          color={metrics.tr != null && metrics.tr >= 1 ? rallyColors.green : rallyColors.red}
        />
        <RallyKPICard
          title="نرخ برد"
          value={metrics.hr != null ? `${toPersianNum((metrics.hr * 100).toFixed(0))}٪` : '-'}
          icon={IconPercentage}
          color={metrics.hr != null && metrics.hr >= 0.5 ? rallyColors.green : rallyColors.red}
        />
        <RallyKPICard
          title="نسبت صعود"
          value={metrics.capture.upsideCapture != null ? `${toPersianNum(metrics.capture.upsideCapture.toFixed(0))}٪` : '-'}
          icon={IconArrowUpRight}
          color={rallyColors.green}
        />
        <RallyKPICard
          title="نسبت نزول"
          value={metrics.capture.downsideCapture != null ? `${toPersianNum(metrics.capture.downsideCapture.toFixed(0))}٪` : '-'}
          icon={IconArrowDownRight}
          color={rallyColors.red}
        />
      </SimpleGrid>

      <RallyMainCard title="توزیع بازده روزانه" fullscreenable>
        {metrics.histogram.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={metrics.histogram} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis
                dataKey="binLabel"
                tick={axisTick(9)}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}٪`}
                interval="preserveStartEnd"
              />
              <YAxis tick={axisTick()} tickLine={false} axisLine={false} />
              <Tooltip content={<HistogramTooltip />} />
              <ReferenceLine x="0.0" stroke={rallyColors.textDimmed} strokeDasharray="4 4" />
              <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={16}>
                {metrics.histogram.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.isPositive ? rallyColors.green : rallyColors.red}
                    fillOpacity={0.6}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ChartEmptyState height={280} message="داده‌ای برای نمودار توزیع وجود ندارد" />
        )}
      </RallyMainCard>
    </>
  );
}
