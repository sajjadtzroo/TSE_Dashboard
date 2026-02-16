import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from 'recharts';
import rallyColors from '../../theme/rallyColors';
import ChartTooltip from './shared/ChartTooltip';
import { GRID_STROKE, CURSOR_FILL, axisTick } from './shared/chartStyles';

export default function RallyBarChart({
  data,
  horizontal = false,
  autoColorByValue = false,
  height = 300,
  barWidth,
  cornerRadius = 3,
  xTickAngle = -45,
  yFormatter,
  tooltipFormatter,
}) {
  const chartData = data.map((d) => ({ name: d.x, value: d.y }));

  const barRadius = horizontal
    ? [0, cornerRadius, cornerRadius, 0]
    : [cornerRadius, cornerRadius, 0, 0];

  if (horizontal) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 20, right: 20, bottom: 20, left: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis type="number" tickFormatter={yFormatter} tick={axisTick()} />
          <YAxis type="category" dataKey="name" tick={axisTick(10)} />
          <Tooltip
            content={<ChartTooltip tooltipFormatter={tooltipFormatter} />}
            cursor={CURSOR_FILL}
          />
          <Bar dataKey="value" radius={barRadius} barSize={barWidth} fill={rallyColors.green}>
            {autoColorByValue &&
              chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.value >= 0 ? '#10B981' : '#EF4444'} />
              ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={chartData}
        margin={{ top: 20, right: 20, bottom: 60, left: 60 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis dataKey="name" tick={axisTick(10)} angle={xTickAngle} textAnchor="end" />
        <YAxis tickFormatter={yFormatter} tick={axisTick()} />
        <Tooltip
          content={<ChartTooltip tooltipFormatter={tooltipFormatter} />}
          cursor={CURSOR_FILL}
        />
        <Bar dataKey="value" radius={barRadius} barSize={barWidth} fill={rallyColors.green}>
          {autoColorByValue &&
            chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.value >= 0 ? '#10B981' : '#EF4444'} />
            ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
