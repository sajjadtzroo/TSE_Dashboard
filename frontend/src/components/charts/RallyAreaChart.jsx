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

function CustomTooltip({ active, payload, tooltipFormatter }) {
  if (!active || !payload || !payload.length) return null;

  const label = tooltipFormatter
    ? tooltipFormatter({ x: payload[0].payload.name, y: payload[0].value })
    : `${payload[0].payload.name}: ${payload[0].value?.toLocaleString()}`;

  return (
    <div
      style={{
        background: rallyColors.elevated,
        border: `1px solid ${rallyColors.border}`,
        color: rallyColors.textPrimary,
        borderRadius: 4,
        padding: '6px 10px',
        fontSize: 11,
      }}
    >
      {label}
    </div>
  );
}

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

        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(148, 163, 184, 0.04)"
        />

        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: rallyColors.textSecondary }}
          angle={xTickAngle}
          textAnchor="end"
          tickCount={xTickCount}
          tickFormatter={xFormatter}
        />

        <YAxis
          tickFormatter={yFormatter}
          tick={{ fontSize: 11, fill: rallyColors.textSecondary }}
        />

        <Tooltip
          content={<CustomTooltip tooltipFormatter={tooltipFormatter} />}
          cursor={{ stroke: rallyColors.textDimmed, strokeDasharray: '3 3' }}
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
