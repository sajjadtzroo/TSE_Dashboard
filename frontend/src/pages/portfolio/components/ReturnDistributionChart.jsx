import { useMemo } from 'react';
import { Group, Badge } from '@mantine/core';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import RallyMainCard from '../../../components/RallyMainCard';
import ChartTooltipV2 from '../../../components/charts/shared/ChartTooltipV2';
import ChartEmptyState from '../../../components/charts/shared/ChartEmptyState';
import { mean, stdDev, skewness, kurtosis } from '../../../utils/riskMetrics/descriptive.js';
import { toPersianNum } from '../../../utils/formatUtils';
import rallyColors from '../../../theme/rallyColors';
import { GRID_STROKE, axisTick, barGradientDef } from '../../../components/charts/shared/chartStyles';
import { usePortfolioContext } from '../PortfolioProvider';

function buildHistogram(returns, bins = 30) {
  if (!returns.length) return [];
  const min = Math.min(...returns);
  const max = Math.max(...returns);
  const range = max - min;
  if (range === 0) return [{ x: toPersianNum((min * 100).toFixed(1)), count: returns.length }];

  const binWidth = range / bins;
  const histogram = Array.from({ length: bins }, (_, i) => ({
    x: toPersianNum(((min + (i + 0.5) * binWidth) * 100).toFixed(2)),
    binStart: min + i * binWidth,
    binEnd: min + (i + 1) * binWidth,
    count: 0,
  }));

  for (const r of returns) {
    const idx = Math.min(Math.floor((r - min) / binWidth), bins - 1);
    histogram[idx].count++;
  }

  return histogram;
}

export default function ReturnDistributionChart() {
  const { portfolioReturns } = usePortfolioContext();

  const { histogram, stats } = useMemo(() => {
    const { returns } = portfolioReturns;
    if (returns.length < 20) {
      return { histogram: [], stats: null };
    }

    const m = mean(returns);
    const sd = stdDev(returns);
    const skew = skewness(returns);
    const kurt = kurtosis(returns);

    return {
      histogram: buildHistogram(returns, 30),
      stats: {
        mean: m,
        sd,
        skew,
        kurt,
        meanPct: m != null ? m * 100 : null,
        sdPct: sd != null ? sd * 100 : null,
      },
    };
  }, [portfolioReturns]);

  return (
    <RallyMainCard
      title="توزیع بازده روزانه"
      secondary={
        stats && (
          <Group gap={6}>
            <Badge variant="light" color="blue" size="sm">
              چولگی: {stats.skew != null ? toPersianNum(stats.skew.toFixed(2)) : '-'}
            </Badge>
            <Badge variant="light" color="violet" size="sm">
              کشیدگی: {stats.kurt != null ? toPersianNum(stats.kurt.toFixed(2)) : '-'}
            </Badge>
          </Group>
        )
      }
    >
      {histogram.length === 0 ? (
        <ChartEmptyState height={280} message="داده کافی موجود نیست" />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={histogram} margin={{ top: 10, right: 10, bottom: 40, left: 10 }}>
            <defs>
              {barGradientDef('dist-bar-grad', rallyColors.blue)}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis
              dataKey="x"
              tick={axisTick(9)}
              angle={-45}
              textAnchor="end"
              label={{ value: 'بازده٪', position: 'bottom', offset: 25, fill: rallyColors.textDimmed, fontSize: 11 }}
            />
            <YAxis
              tick={axisTick()}
              label={{ value: 'فراوانی', angle: -90, position: 'insideLeft', fill: rallyColors.textDimmed, fontSize: 11 }}
            />
            <Tooltip
              content={
                <ChartTooltipV2
                  colorIndicator={false}
                  formatter={(v) => toPersianNum(v)}
                  labelFormatter={(l) => `${toPersianNum(l)}٪`}
                />
              }
            />
            <Bar dataKey="count" fill="url(#dist-bar-grad)" radius={[2, 2, 0, 0]} />

            {stats?.meanPct != null && (
              <ReferenceLine
                x={toPersianNum(stats.meanPct.toFixed(2))}
                stroke={rallyColors.green}
                strokeWidth={2}
                strokeDasharray="4 2"
                label={{ value: 'μ', fill: rallyColors.green, fontSize: 12, position: 'top' }}
              />
            )}
            {stats?.meanPct != null && stats?.sdPct != null && (
              <>
                <ReferenceLine
                  x={toPersianNum((stats.meanPct + stats.sdPct).toFixed(2))}
                  stroke={rallyColors.yellow}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  label={{ value: '+1σ', fill: rallyColors.yellow, fontSize: 10, position: 'top' }}
                />
                <ReferenceLine
                  x={toPersianNum((stats.meanPct - stats.sdPct).toFixed(2))}
                  stroke={rallyColors.yellow}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  label={{ value: '-1σ', fill: rallyColors.yellow, fontSize: 10, position: 'top' }}
                />
              </>
            )}
            {stats?.meanPct != null && stats?.sdPct != null && (
              <>
                <ReferenceLine
                  x={toPersianNum((stats.meanPct + 2 * stats.sdPct).toFixed(2))}
                  stroke={rallyColors.red}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  label={{ value: '+2σ', fill: rallyColors.red, fontSize: 10, position: 'top' }}
                />
                <ReferenceLine
                  x={toPersianNum((stats.meanPct - 2 * stats.sdPct).toFixed(2))}
                  stroke={rallyColors.red}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  label={{ value: '-2σ', fill: rallyColors.red, fontSize: 10, position: 'top' }}
                />
              </>
            )}
          </BarChart>
        </ResponsiveContainer>
      )}
    </RallyMainCard>
  );
}
