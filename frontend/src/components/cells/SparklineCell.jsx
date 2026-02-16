import { VictoryLine } from 'victory';
import rallyColors from '../../theme/rallyColors';

export default function SparklineCell({ data = [], width = 60, height = 24 }) {
  if (!data || data.length < 2) return null;

  const points = data.map((val, i) => ({ x: i, y: val }));
  const isPositive = data[data.length - 1] >= data[0];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <VictoryLine
        standalone={false}
        data={points}
        width={width}
        height={height}
        padding={0}
        interpolation="monotoneX"
        style={{
          data: {
            stroke: isPositive ? rallyColors.green : rallyColors.orange,
            strokeWidth: 1.5,
          },
        }}
      />
    </svg>
  );
}
