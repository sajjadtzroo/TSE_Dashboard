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

function RallyTooltipContent({ active, payload, tooltipFormatter }) {
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
          content={<RallyTooltipContent tooltipFormatter={tooltipFormatter} />}
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
