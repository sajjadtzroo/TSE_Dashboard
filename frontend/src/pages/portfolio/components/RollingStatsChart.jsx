import { useMemo, useState } from 'react';
import { SegmentedControl } from '@mantine/core';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import RallyMainCard from '../../../components/RallyMainCard';
import ChartTooltipV2 from '../../../components/charts/shared/ChartTooltipV2';
import ChartEmptyState from '../../../components/charts/shared/ChartEmptyState';
import { computeRollingMetrics } from '../../../utils/riskMetrics/rolling.js';
import { alignReturnSeries } from '../../../utils/riskMetrics/returns.js';
import { toPersianNum } from '../../../utils/formatUtils';
import rallyColors from '../../../theme/rallyColors';
import { GRID_STROKE, axisTick, activeDotFor } from '../../../components/charts/shared/chartStyles';
import { usePortfolioContext } from '../PortfolioProvider';

const WINDOW_OPTIONS = [
  { label: '۳۰ روز', value: '30' },
  { label: '۶۰ روز', value: '60' },
];

const METRIC_LABELS = {
  rollingSharpe: 'شارپ متحرک',
  rollingBeta: 'بتای متحرک',
  rollingVol: 'نوسان متحرک',
};

export default function RollingStatsChart() {
  const [window, setWindow] = useState('30');
  const { portfolioReturns, benchReturnSeries } = usePortfolioContext();

  const data = useMemo(() => {
    const { returns: portRets, dates: portDates } = portfolioReturns;
    if (portRets.length < 30 || !benchReturnSeries.length) return [];

    const portReturnObjs = portDates.map((d, i) => ({ date: d, ret: portRets[i] }));
    const aligned = alignReturnSeries(portReturnObjs, benchReturnSeries);

    if (aligned.stockReturns.length < 30) return [];

    return computeRollingMetrics(
      aligned.stockReturns,
      aligned.benchReturns,
      aligned.dates,
      Number(window),
    );
  }, [portfolioReturns, benchReturnSeries, window]);

  return (
    <RallyMainCard
      title="آمار متحرک"
      secondary={
        <SegmentedControl
          size="xs"
          data={WINDOW_OPTIONS}
          value={window}
          onChange={setWindow}
        />
      }
    >
      {data.length === 0 ? (
        <ChartEmptyState height={280} message="داده کافی موجود نیست" />
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 10, right: 10, bottom: 40, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis
              dataKey="date"
              tick={axisTick(9)}
              angle={-45}
              textAnchor="end"
              tickCount={6}
            />
            <YAxis
              yAxisId="left"
              tick={axisTick()}
              tickFormatter={(v) => toPersianNum(v.toFixed(1))}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={axisTick()}
              tickFormatter={(v) => toPersianNum(v.toFixed(2))}
            />
            <Tooltip
              content={
                <ChartTooltipV2
                  formatter={(v, name) => toPersianNum(Number(v).toFixed(3))}
                />
              }
            />
            <Legend
              formatter={(value) => METRIC_LABELS[value] || value}
              wrapperStyle={{ fontSize: 12, color: rallyColors.textSecondary }}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="rollingSharpe"
              stroke={rallyColors.blue}
              strokeWidth={2}
              dot={false}
              activeDot={activeDotFor(rallyColors.blue)}
              connectNulls
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="rollingBeta"
              stroke={rallyColors.green}
              strokeWidth={1.5}
              dot={false}
              activeDot={activeDotFor(rallyColors.green)}
              connectNulls
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="rollingVol"
              stroke={rallyColors.yellow}
              strokeWidth={1.5}
              strokeDasharray="4 2"
              dot={false}
              activeDot={activeDotFor(rallyColors.yellow)}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </RallyMainCard>
  );
}
