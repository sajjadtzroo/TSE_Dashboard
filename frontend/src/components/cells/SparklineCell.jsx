import { LineChart, Line } from 'recharts';
import rallyColors from '../../theme/rallyColors';

export default function SparklineCell({ data = [], width = 60, height = 24 }) {
  if (!data || data.length < 2) return null;

  const points = data.map((val, i) => ({ x: i, y: val }));
  const isPositive = data[data.length - 1] >= data[0];

  return (
    <LineChart width={width} height={height} data={points} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
      <Line
        type="monotone"
        dataKey="y"
        stroke={isPositive ? rallyColors.green : rallyColors.red}
        strokeWidth={1.5}
        dot={false}
        isAnimationActive={false}
      />
    </LineChart>
  );
}
