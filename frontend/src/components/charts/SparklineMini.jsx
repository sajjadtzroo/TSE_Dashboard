import { AreaChart, Area, ResponsiveContainer } from 'recharts';

/**
 * Pure sparkline — no axes, grid, or tooltip.
 * @param {{ data: number[], color?: string, width?: number, height?: number }} props
 */
export default function SparklineMini({ data = [], color = '#22C55E', width = 60, height = 24 }) {
  if (!data || data.length < 2) return null;

  const chartData = data.map((v, i) => ({ i, v }));
  const gradientId = `spark-${color.replace('#', '')}`;

  return (
    <div style={{ width, height, opacity: 0.6 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
