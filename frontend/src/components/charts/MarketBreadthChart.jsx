import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { TOOLTIP_STYLE } from './shared/chartStyles';
import rallyColors from '../../theme/rallyColors';
import { toPersianNum } from '../../utils/formatUtils';

const COLORS = [rallyColors.green, rallyColors.red, rallyColors.yellow];

/**
 * Donut chart showing market breadth: advancers vs decliners vs unchanged.
 * @param {{ data: Array }} props — market-overview records
 */
export default function MarketBreadthChart({ data }) {
  const breadth = useMemo(() => {
    if (!data?.length) return [];
    let adv = 0, dec = 0, unch = 0;
    for (const s of data) {
      if (s.close_change_pct > 0) adv++;
      else if (s.close_change_pct < 0) dec++;
      else unch++;
    }
    return [
      { name: 'رشد', value: adv },
      { name: 'افت', value: dec },
      { name: 'بدون تغییر', value: unch },
    ];
  }, [data]);

  const total = breadth.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={breadth}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
          dataKey="value"
          stroke="none"
        >
          {breadth.map((_, i) => (
            <Cell key={i} fill={COLORS[i]} fillOpacity={0.85} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v, name) => [toPersianNum(v), name]}
        />
        <Legend
          formatter={(v) => v}
          wrapperStyle={{ fontSize: 12 }}
        />
        {/* Center label */}
        <text x="50%" y="48%" textAnchor="middle" fill={rallyColors.textPrimary} fontSize={20} fontWeight={800}>
          {toPersianNum(total)}
        </text>
        <text x="50%" y="58%" textAnchor="middle" fill={rallyColors.textSecondary} fontSize={11}>
          نماد
        </text>
      </PieChart>
    </ResponsiveContainer>
  );
}
