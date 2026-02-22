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
import { IconTrendingDown, IconClock, IconChartLine } from '@tabler/icons-react';
import RallyMainCard from '../../../components/RallyMainCard';
import RallyKPICard from '../../../components/RallyKPICard';
import ChartTooltipV2 from '../../../components/charts/shared/ChartTooltipV2';
import ChartEmptyState from '../../../components/charts/shared/ChartEmptyState';
import { computeDrawdown, calmarRatio } from '../../../utils/riskMetrics/drawdown.js';
import { toPersianNum, formatPercent } from '../../../utils/formatUtils';
import rallyColors from '../../../theme/rallyColors';
import { GRID_STROKE, axisTick, activeDotFor } from '../../../components/charts/shared/chartStyles';
import { usePortfolioContext } from '../PortfolioProvider';

export default function PortfolioDrawdownChart() {
  const { portfolioReturns } = usePortfolioContext();

  const { chartData, maxDD, maxDDDuration, calmar } = useMemo(() => {
    const { returns, dates } = portfolioReturns;
    if (returns.length < 2) {
      return { chartData: [], maxDD: null, maxDDDuration: null, calmar: null };
    }

    let cumPrice = 100;
    const prices = [{ date: dates[0], price: cumPrice }];
    for (let i = 0; i < returns.length; i++) {
      cumPrice *= (1 + returns[i]);
      prices.push({ date: dates[i], price: cumPrice });
    }

    const dd = computeDrawdown(prices);
    const calmarVal = calmarRatio(returns, dd.maxDrawdown);

    return {
      chartData: dd.drawdownSeries,
      maxDD: dd.maxDrawdown,
      maxDDDuration: dd.maxDrawdownDuration,
      calmar: calmarVal,
    };
  }, [portfolioReturns]);

  return (
    <RallyMainCard title="افت سرمایه (Drawdown)">
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="md">
        <RallyKPICard
          title="حداکثر افت"
          value={maxDD != null ? formatPercent(maxDD * 100, 1) : '-'}
          icon={IconTrendingDown}
          color={rallyColors.red}
          compact
        />
        <RallyKPICard
          title="طول افت (روز)"
          value={maxDDDuration != null ? toPersianNum(maxDDDuration) : '-'}
          icon={IconClock}
          color={rallyColors.yellow}
          compact
        />
        <RallyKPICard
          title="نسبت کالمار"
          value={calmar != null ? toPersianNum(calmar.toFixed(2)) : '-'}
          icon={IconChartLine}
          color={rallyColors.blue}
          compact
        />
      </SimpleGrid>

      {chartData.length === 0 ? (
        <ChartEmptyState height={250} message="داده کافی موجود نیست" />
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 40, left: 10 }}>
            <defs>
              <linearGradient id="dd-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={rallyColors.red} stopOpacity={0.35} />
                <stop offset="60%" stopColor={rallyColors.red} stopOpacity={0.08} />
                <stop offset="100%" stopColor={rallyColors.red} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis
              dataKey="date"
              tick={axisTick(9)}
              angle={-45}
              textAnchor="end"
              tickCount={6}
            />
            <YAxis
              tick={axisTick()}
              tickFormatter={(v) => `${toPersianNum((v * 100).toFixed(0))}٪`}
              domain={['auto', 0]}
            />
            <Tooltip
              content={
                <ChartTooltipV2
                  colorIndicator={false}
                  formatter={(v) => formatPercent(v * 100, 2)}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="drawdown"
              stroke={rallyColors.red}
              strokeWidth={2}
              fill="url(#dd-gradient)"
              activeDot={activeDotFor(rallyColors.red)}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </RallyMainCard>
  );
}
