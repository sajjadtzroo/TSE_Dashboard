import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import RallyMainCard from '../../../components/RallyMainCard';
import ChartEmptyState from '../../../components/charts/shared/ChartEmptyState';
import ChartTooltipV2 from '../../../components/charts/shared/ChartTooltipV2';
import { toPersianNum, formatNum } from '../../../utils/formatUtils';
import rallyColors from '../../../theme/rallyColors';
import { GRID_STROKE, axisTick } from '../../../components/charts/shared/chartStyles';

const BAR_COLORS = {
  'سرمایه اولیه': rallyColors.blue,
  'خرید': rallyColors.green,
  'فروش': rallyColors.red,
  'سود نقدی': rallyColors.purple,
  'کارمزد': rallyColors.yellow,
  'ارزش فعلی': rallyColors.green,
};

export default function WaterfallChart({ accounting, totalCost, totalValue }) {
  if (!accounting) return null;

  const data = [
    { name: 'سرمایه اولیه', value: Number(totalCost) || 0 },
    { name: 'سود تحقق‌یافته', value: Number(accounting.total_realized_pnl) || 0 },
    { name: 'سود نقدی', value: Number(accounting.total_dividends) || 0 },
    { name: 'کارمزد', value: -(Number(accounting.total_fees) || 0) },
    { name: 'ارزش فعلی', value: totalValue || 0 },
  ].filter((d) => d.value !== 0 || d.name === 'ارزش فعلی');

  if (data.length === 0) return null;

  return (
    <RallyMainCard title="نمودار آبشاری" fullscreenable>
      {data.length < 2 ? (
        <ChartEmptyState height={280} message="داده کافی نیست" />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis dataKey="name" tick={axisTick(10)} />
            <YAxis tick={axisTick()} tickFormatter={(v) => formatNum(Math.round(v))} />
            <Tooltip
              content={
                <ChartTooltipV2
                  formatter={(v) => formatNum(Math.round(Number(v)))}
                />
              }
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={BAR_COLORS[entry.name] || rallyColors.blue} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </RallyMainCard>
  );
}
