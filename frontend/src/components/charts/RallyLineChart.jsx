import { useMemo } from 'react';
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
import ChartTooltipV2 from './shared/ChartTooltipV2';
import useChartBreakpoint from '../../hooks/useChartBreakpoint';
import { GRID_STROKE, axisTick, activeDotFor } from './shared/chartStyles';

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
  const { isMobile, fontSize, tickCount } = useChartBreakpoint();
  const chartData = useMemo(() => data.map((d) => ({ name: d.x, value: d.y })), [data]);

  const margin = isMobile
    ? { top: 5, right: 8, bottom: 30, left: 35 }
    : { top: 20, right: 20, bottom: 60, left: 60 };

  const tooltipContent = tooltipFormatter
    ? <ChartTooltipV2 formatter={(val, name, entry) => tooltipFormatter({ x: entry.payload.name, y: entry.payload.value })} colorIndicator={false} />
    : <ChartTooltipV2 colorIndicator={false} />;

  return (
    <ResponsiveContainer width="100%" height={height} minWidth={0}>
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
        <YAxis tickFormatter={yFormatter} tick={axisTick(fontSize)} />
        <Tooltip
          content={tooltipContent}
          cursor={{ stroke: rallyColors.textDimmed, strokeWidth: 1 }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={lineColor}
          strokeWidth={2}
          dot={false}
          activeDot={activeDotFor(lineColor)}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
