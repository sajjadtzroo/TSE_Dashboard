import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Brush,
} from 'recharts';
import rallyColors from '../../theme/rallyColors';
import ChartTooltip from './shared/ChartTooltip';
import { GRID_STROKE, CURSOR_STROKE, axisTick } from './shared/chartStyles';

export default function RallyAreaChart({
  data,
  fillColor = rallyColors.green,
  strokeColor,
  height = 300,
  xTickAngle = -45,
  xTickCount,
  yFormatter,
  xFormatter,
  tooltipFormatter,
  zoomable = false,
  brushHeight = 60,
}) {
  const stroke = strokeColor || fillColor;
  const gradientId = `area-grad-${fillColor.replace('#', '')}`;

  const chartData = useMemo(
    () => data.map((d) => ({ name: d.x, value: d.y })),
    [data],
  );

  return (
    <ResponsiveContainer width="100%" height={height + (zoomable ? brushHeight : 0)}>
      <AreaChart
        data={chartData}
        margin={{ top: 20, right: 20, bottom: 60, left: 60 }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColor} stopOpacity={0.4} />
            <stop offset="100%" stopColor={fillColor} stopOpacity={0.02} />
          </linearGradient>
        </defs>

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
          cursor={CURSOR_STROKE}
        />

        <Area
          type="monotone"
          dataKey="value"
          stroke={stroke}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
        />

        {zoomable && (
          <Brush
            dataKey="name"
            height={30}
            stroke={rallyColors.green}
            fill={rallyColors.card}
            travellerWidth={8}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}
