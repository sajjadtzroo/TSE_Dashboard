import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { GRID_STROKE, axisTick, TOOLTIP_STYLE, activeDotFor } from './shared/chartStyles';
import rallyColors from '../../theme/rallyColors';
import { toPersianNum } from '../../utils/formatUtils';

const INDEX_COLORS = [rallyColors.primary, rallyColors.green, rallyColors.yellow];

/**
 * Normalized multi-index comparison line chart.
 * Rebases all indices to 100 at start for comparison.
 * @param {{ indices: Array<{ name: string, data: Array<{ date, close }> }> }} props
 */
export default function MultiIndexChart({ indices }) {
  const chartData = useMemo(() => {
    if (!indices?.length) return [];

    // Find the shortest data length for alignment
    const minLen = Math.min(...indices.map((idx) => idx.data?.length || 0));
    if (minLen < 2) return [];

    // Normalize: rebase to 100
    const baseValues = indices.map((idx) => idx.data[0]?.close || 1);

    const result = [];
    for (let i = 0; i < minLen; i++) {
      const point = { date: indices[0].data[i].date };
      indices.forEach((idx, j) => {
        const raw = idx.data[i]?.close || 0;
        point[idx.name] = Math.round((raw / baseValues[j]) * 10000) / 100; // normalized to 100
      });
      result.push(point);
    }
    return result;
  }, [indices]);

  if (chartData.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 30, left: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis
          dataKey="date"
          tick={axisTick(9)}
          tickFormatter={(v) => {
            if (!v) return '';
            const parts = v.split('-');
            return parts.length >= 2 ? `${parts[1]}/${parts[2] || ''}` : v;
          }}
        />
        <YAxis tick={axisTick(10)} domain={['auto', 'auto']} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v, name) => [toPersianNum(v.toFixed(1)), name]}
          labelFormatter={(v) => `تاریخ: ${v}`}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {indices?.map((idx, i) => (
          <Line
            key={idx.name}
            type="monotone"
            dataKey={idx.name}
            stroke={INDEX_COLORS[i % INDEX_COLORS.length]}
            strokeWidth={2}
            dot={false}
            activeDot={activeDotFor(INDEX_COLORS[i % INDEX_COLORS.length])}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
