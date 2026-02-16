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

function CustomTooltip({ active, payload, tooltipFormatter }) {
  if (!active || !payload || !payload.length) return null;

  const datum = { x: payload[0].payload.name, y: payload[0].value };
  const label = tooltipFormatter
    ? tooltipFormatter(datum)
    : `${datum.x}: ${datum.y}`;

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
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(148, 163, 184, 0.04)"
          />
          <XAxis
            type="number"
            tickFormatter={yFormatter}
            tick={{ fontSize: 11, fill: rallyColors.textSecondary }}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 10, fill: rallyColors.textSecondary }}
          />
          <Tooltip
            content={<CustomTooltip tooltipFormatter={tooltipFormatter} />}
            cursor={{ fill: 'rgba(148, 163, 184, 0.06)' }}
          />
          <Bar
            dataKey="value"
            radius={barRadius}
            barSize={barWidth}
            fill={rallyColors.green}
          >
            {autoColorByValue &&
              chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.value >= 0 ? '#10B981' : '#EF4444'}
                />
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
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(148, 163, 184, 0.04)"
        />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: rallyColors.textSecondary }}
          angle={xTickAngle}
          textAnchor="end"
        />
        <YAxis
          tickFormatter={yFormatter}
          tick={{ fontSize: 11, fill: rallyColors.textSecondary }}
        />
        <Tooltip
          content={<CustomTooltip tooltipFormatter={tooltipFormatter} />}
          cursor={{ fill: 'rgba(148, 163, 184, 0.06)' }}
        />
        <Bar
          dataKey="value"
          radius={barRadius}
          barSize={barWidth}
          fill={rallyColors.green}
        >
          {autoColorByValue &&
            chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.value >= 0 ? '#10B981' : '#EF4444'}
              />
            ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
