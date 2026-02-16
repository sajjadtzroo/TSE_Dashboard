import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import rallyColors from '../../theme/rallyColors';
import ChartTooltip from './shared/ChartTooltip';
import { GRID_STROKE, axisTick } from './shared/chartStyles';

export default function RallyLineChart({
  data,
  lineColor = rallyColors.green,
  height = 300,
  xTickAngle = -45,
  xTickCount,
  yFormatter,
  xFormatter,
  tooltipFormatter,
}) {
  const chartData = data.map((d) => ({ name: d.x, value: d.y }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis
          dataKey="name"
          tick={axisTick(10)}
          angle={xTickAngle}
          textAnchor="end"
          tickCount={xTickCount}
          tickFormatter={xFormatter}
        />
        <YAxis tickFormatter={yFormatter} tick={axisTick()} />
        <Tooltip
          content={<ChartTooltip tooltipFormatter={tooltipFormatter} />}
          cursor={{ stroke: rallyColors.textDimmed, strokeWidth: 1 }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={lineColor}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
