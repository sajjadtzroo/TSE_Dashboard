import { useMemo } from 'react';
import { SimpleGrid } from '@mantine/core';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { IconTrendingUp, IconPercentage, IconTarget } from '@tabler/icons-react';
import RallyMainCard from '../../../components/RallyMainCard';
import RallyKPICard from '../../../components/RallyKPICard';
import ChartTooltipV2 from '../../../components/charts/shared/ChartTooltipV2';
import ChartEmptyState from '../../../components/charts/shared/ChartEmptyState';
import { toPersianNum, formatPercent, formatTrillion } from '../../../utils/formatUtils';
import rallyColors from '../../../theme/rallyColors';
import { GRID_STROKE, axisTick, activeDotFor } from '../../../components/charts/shared/chartStyles';

export default function MonteCarloCard({ result, running }) {
  const chartData = useMemo(() => {
    if (!result?.percentiles) return [];
    const { p5, p25, p50, p75, p95 } = result.percentiles;
    return p50.map((_, i) => ({
      day: i,
      p5: p5[i],
      p25: p25[i],
      p50: p50[i],
      p75: p75[i],
      p95: p95[i],
    }));
  }, [result]);

  return (
    <RallyMainCard title="شبیه‌سازی مونت‌کارلو">
      {result && (
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="md">
          <RallyKPICard
            title="احتمال سود"
            value={formatPercent(result.probProfit * 100, 0)}
            icon={IconPercentage}
            color={result.probProfit > 0.5 ? rallyColors.green : rallyColors.red}
            compact
          />
          <RallyKPICard
            title="بازده مورد انتظار"
            value={formatPercent(result.expectedReturn * 100, 1)}
            icon={IconTrendingUp}
            color={result.expectedReturn >= 0 ? rallyColors.green : rallyColors.red}
            compact
          />
          <RallyKPICard
            title="ارزش میانه نهایی"
            value={formatTrillion(result.medianFinal)}
            icon={IconTarget}
            color={rallyColors.blue}
            compact
          />
        </SimpleGrid>
      )}

      {running ? (
        <ChartEmptyState height={300} message="در حال اجرای شبیه‌سازی..." />
      ) : chartData.length === 0 ? (
        <ChartEmptyState height={300} message="تنظیمات را وارد کنید و اجرا را بزنید" />
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 30, left: 10 }}>
            <defs>
              <linearGradient id="mc-p5-p95" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={rallyColors.blue} stopOpacity={0.15} />
                <stop offset="100%" stopColor={rallyColors.blue} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="mc-p25-p75" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={rallyColors.blue} stopOpacity={0.3} />
                <stop offset="100%" stopColor={rallyColors.blue} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis
              dataKey="day"
              tick={axisTick(9)}
              label={{ value: 'روز', position: 'bottom', offset: 15, fill: rallyColors.textDimmed, fontSize: 11 }}
            />
            <YAxis
              tick={axisTick()}
              tickFormatter={(v) => formatTrillion(v)}
            />
            <Tooltip
              content={
                <ChartTooltipV2
                  formatter={(v, name) => formatTrillion(v)}
                  labelFormatter={(l) => `روز ${toPersianNum(l)}`}
                />
              }
            />
            {/* Outer envelope p5-p95 */}
            <Area type="monotone" dataKey="p95" stroke="none" fill="url(#mc-p5-p95)" />
            <Area type="monotone" dataKey="p5" stroke="none" fill={rallyColors.card} />
            {/* Inner envelope p25-p75 */}
            <Area type="monotone" dataKey="p75" stroke="none" fill="url(#mc-p25-p75)" />
            <Area type="monotone" dataKey="p25" stroke="none" fill={rallyColors.card} />
            {/* Median line */}
            <Area
              type="monotone"
              dataKey="p50"
              stroke={rallyColors.blue}
              strokeWidth={2}
              fill="none"
              activeDot={activeDotFor(rallyColors.blue)}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </RallyMainCard>
  );
}
