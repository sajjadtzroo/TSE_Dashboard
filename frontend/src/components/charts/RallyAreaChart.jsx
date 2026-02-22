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
import ChartTooltipV2 from './shared/ChartTooltipV2';
import useChartBreakpoint from '../../hooks/useChartBreakpoint';
import { GRID_STROKE, CURSOR_STROKE, axisTick, activeDotFor } from './shared/chartStyles';

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
  const { isMobile, fontSize, tickCount } = useChartBreakpoint();
  const stroke = strokeColor || fillColor;
  const gradientId = `area-grad-${fillColor.replace('#', '')}`;

  const chartData = useMemo(
    () => data.map((d) => ({ name: d.x, value: d.y })),
    [data],
  );

  const margin = isMobile
    ? { top: 10, right: 10, bottom: 30, left: 35 }
    : { top: 20, right: 20, bottom: 60, left: 60 };

  const tooltipContent = tooltipFormatter
    ? <ChartTooltipV2 formatter={(val, name, entry) => tooltipFormatter({ x: entry.payload.name, y: entry.payload.value })} colorIndicator={false} />
    : <ChartTooltipV2 colorIndicator={false} />;

  return (
    <ResponsiveContainer width="100%" height={height + (zoomable ? brushHeight : 0)}>
      <AreaChart
        data={chartData}
        margin={margin}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColor} stopOpacity={0.35} />
            <stop offset="60%" stopColor={fillColor} stopOpacity={0.08} />
            <stop offset="100%" stopColor={fillColor} stopOpacity={0.01} />
          </linearGradient>
        </defs>

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
          cursor={CURSOR_STROKE}
        />

        <Area
          type="monotone"
          dataKey="value"
          stroke={stroke}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          activeDot={activeDotFor(stroke)}
          isAnimationActive={false}
        />

        {zoomable && (
          <Brush
            dataKey="name"
            height={30}
            stroke={rallyColors.green}
            fill={rallyColors.glassBg}
            travellerWidth={8}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}
