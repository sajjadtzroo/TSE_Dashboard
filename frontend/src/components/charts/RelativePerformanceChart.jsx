import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import rallyColors from '../../theme/rallyColors';
import { GRID_STROKE, axisTick } from './shared/chartStyles';
import { toPersianNum } from '../../utils/formatUtils';

/**
 * Relative performance chart — stock vs benchmark normalized to cumulative %.
 */
export default function RelativePerformanceChart({ stockHistory, benchHistory, height = 250 }) {
  const chartData = useMemo(() => {
    if (!stockHistory?.length || !benchHistory?.length) return [];

    // Build date maps
    const stockMap = new Map();
    for (const h of stockHistory) {
      const price = h.adj_close || h.close;
      if (price) stockMap.set(h.date, price);
    }

    const benchMap = new Map();
    for (const h of benchHistory) {
      if (h.index_value) benchMap.set(h.date, h.index_value);
    }

    // Find common dates
    const dates = [...stockMap.keys()].filter((d) => benchMap.has(d)).sort();
    if (dates.length < 2) return [];

    const stockBase = stockMap.get(dates[0]);
    const benchBase = benchMap.get(dates[0]);

    return dates.map((date) => ({
      date: date.slice(5), // MM-DD format
      stock: +((stockMap.get(date) / stockBase - 1) * 100).toFixed(2),
      index: +((benchMap.get(date) / benchBase - 1) * 100).toFixed(2),
    }));
  }, [stockHistory, benchHistory]);

  if (chartData.length < 2) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis dataKey="date" tick={axisTick(9)} tickCount={8} />
        <YAxis tick={axisTick(10)} tickFormatter={(v) => v + '%'} />
        <Tooltip
          formatter={(val) => toPersianNum(val.toFixed(2)) + '٪'}
          contentStyle={{ background: rallyColors.elevated, border: `1px solid ${rallyColors.border}`, borderRadius: 4, fontSize: 11 }}
        />
        <Legend
          formatter={(value) => value === 'stock' ? 'سهم' : 'شاخص'}
          wrapperStyle={{ fontSize: 11 }}
        />
        <Line type="monotone" dataKey="stock" stroke={rallyColors.green} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="index" stroke={rallyColors.textDimmed} strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
