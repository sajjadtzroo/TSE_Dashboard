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
import { useMediaQuery } from '@mantine/hooks';
import rallyColors from '../../theme/rallyColors';
import ChartTooltip from './shared/ChartTooltip';
import { GRID_STROKE, CURSOR_FILL, axisTick } from './shared/chartStyles';

export default function RallyBarChart({
  data,
  horizontal = false,
  autoColorByValue = false,
  barColor,
  height = 300,
  barWidth,
  cornerRadius = 3,
  xTickAngle = -45,
  yFormatter,
  tooltipFormatter,
  yAxisWidth,
}) {
  const isMobile = useMediaQuery('(max-width: 48em)');
  const chartData = data.map((d) => ({ name: d.x, value: d.y }));

  const barRadius = horizontal
    ? [0, cornerRadius, cornerRadius, 0]
    : [cornerRadius, cornerRadius, 0, 0];

  const resolvedYAxisWidth = yAxisWidth ?? (isMobile ? 90 : 130);

  if (horizontal) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={isMobile ? { top: 10, right: 10, bottom: 10, left: 0 } : { top: 20, right: 20, bottom: 20, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis type="number" tickFormatter={yFormatter} tick={axisTick(isMobile ? 9 : 11)} />
          <YAxis type="category" dataKey="name" width={resolvedYAxisWidth} tick={axisTick(isMobile ? 8 : 10)} />
          <Tooltip
            content={<ChartTooltip tooltipFormatter={tooltipFormatter} />}
            cursor={CURSOR_FILL}
          />
          <Bar dataKey="value" radius={barRadius} barSize={barWidth} fill={barColor || rallyColors.green}>
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
        margin={isMobile ? { top: 10, right: 10, bottom: 30, left: 35 } : { top: 20, right: 20, bottom: 60, left: 60 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis dataKey="name" tick={axisTick(isMobile ? 8 : 10)} angle={xTickAngle} textAnchor="end" interval={isMobile ? 'preserveStartEnd' : 0} />
        <YAxis tickFormatter={yFormatter} tick={axisTick(isMobile ? 9 : 11)} />
        <Tooltip
          content={<ChartTooltip tooltipFormatter={tooltipFormatter} />}
          cursor={CURSOR_FILL}
        />
        <Bar dataKey="value" radius={barRadius} barSize={barWidth} fill={barColor || rallyColors.green}>
          {autoColorByValue &&
            chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.value >= 0 ? '#10B981' : '#EF4444'} />
            ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
