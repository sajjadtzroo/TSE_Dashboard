import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useMediaQuery } from '@mantine/hooks';
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
  const isMobile = useMediaQuery('(max-width: 48em)');
  const chartData = data.map((d) => ({ name: d.x, value: d.y }));

  const margin = isMobile
    ? { top: 5, right: 8, bottom: 30, left: 35 }
    : { top: 20, right: 20, bottom: 60, left: 60 };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={margin}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis
          dataKey="name"
          tick={axisTick(isMobile ? 8 : 10)}
          angle={xTickAngle}
          textAnchor="end"
          tickCount={isMobile ? 4 : xTickCount}
          tickFormatter={xFormatter}
          interval={isMobile ? 'preserveStartEnd' : 'preserveEnd'}
        />
        <YAxis tickFormatter={yFormatter} tick={axisTick(isMobile ? 9 : 11)} />
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
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
