import { useMemo } from 'react';
import { Grid } from '@mantine/core';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import RallyMainCard from '../RallyMainCard';
import RallyKPICard from '../RallyKPICard';
import rallyColors from '../../theme/rallyColors';
import { formatMetric, toPersianNum } from '../../utils/formatUtils';
import { computeDrawdown, calmarRatio } from '../../utils/riskMetrics/drawdown';
import { extractPrices, computeSimpleReturns } from '../../utils/riskMetrics/returns';
import { GRID_STROKE, axisTick } from '../charts/shared/chartStyles';

export default function DrawdownCard({ history }) {
  const dd = useMemo(() => {
    if (!history || history.length < 5) return null;
    const prices = extractPrices(history);
    const result = computeDrawdown(prices);
    const returns = computeSimpleReturns(history).map((r) => r.ret);
    result.calmar = calmarRatio(returns, result.maxDrawdown);
    return result;
  }, [history]);

  if (!dd) return null;

  const chartData = dd.drawdownSeries.map((d) => ({
    date: d.date,
    drawdown: +(d.drawdown * 100).toFixed(2),
  }));

  return (
    <RallyMainCard title="تحلیل افت سرمایه" mb="md">
      <Grid gutter="xs" mb="sm">
        <Grid.Col span={4}>
          <RallyKPICard title="حداکثر افت" value={formatMetric(dd.maxDrawdown * 100, 2, '٪')} animateValue color={rallyColors.red} />
        </Grid.Col>
        <Grid.Col span={4}>
          <RallyKPICard title="مدت افت (روز)" value={toPersianNum(dd.maxDrawdownDuration)} animateValue color={rallyColors.yellow} />
        </Grid.Col>
        <Grid.Col span={4}>
          <RallyKPICard title="نسبت کالمار" value={formatMetric(dd.calmar)} animateValue color={rallyColors.primary} />
        </Grid.Col>
      </Grid>
      <ResponsiveContainer width="100%" height={150}>
        <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis dataKey="date" tick={axisTick(9)} tickCount={6} />
          <YAxis tick={axisTick(10)} />
          <Tooltip
            formatter={(val) => toPersianNum(val.toFixed(2)) + '٪'}
            contentStyle={{ background: rallyColors.elevated, border: `1px solid ${rallyColors.border}`, borderRadius: 4, fontSize: 11 }}
          />
          <Area type="monotone" dataKey="drawdown" stroke={rallyColors.red} fill={rallyColors.red} fillOpacity={0.2} />
        </AreaChart>
      </ResponsiveContainer>
    </RallyMainCard>
  );
}
