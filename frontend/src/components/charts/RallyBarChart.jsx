import { useMemo } from 'react';
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
import ChartTooltipV2 from './shared/ChartTooltipV2';
import useChartBreakpoint from '../../hooks/useChartBreakpoint';
import { GRID_STROKE, CURSOR_FILL, axisTick, barGradientDef, glowFilterDef } from './shared/chartStyles';

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
  'aria-label': ariaLabel,
}) {
  const { isMobile, margin: bpMargin, fontSize, tickCount } = useChartBreakpoint();
  const chartData = useMemo(() => data.map((d) => ({ name: d.x, value: d.y })), [data]);
  const fill = barColor || rallyColors.green;
  const gradId = `bar-grad-${fill.replace('#', '')}`;
  const glowId = `bar-glow-${fill.replace('#', '')}`;

  const barRadius = horizontal
    ? [0, cornerRadius, cornerRadius, 0]
    : [cornerRadius, cornerRadius, 0, 0];

  const resolvedYAxisWidth = yAxisWidth ?? (isMobile ? 72 : 110);
  const maxYLabelChars = isMobile ? 9 : 13;
  const HorizYTick = ({ x, y, payload }) => {
    const label = payload.value?.length > maxYLabelChars
      ? payload.value.slice(0, maxYLabelChars) + '…'
      : payload.value;
    return (
      <text x={x} y={y} dy={4} textAnchor="end" fontSize={isMobile ? 8 : 10} fill={rallyColors.textSecondary}>
        {label}
      </text>
    );
  };

  const tooltipContent = tooltipFormatter
    ? <ChartTooltipV2 formatter={(val, name, entry) => tooltipFormatter({ x: entry.payload.name, y: entry.payload.value })} colorIndicator={false} />
    : <ChartTooltipV2 colorIndicator={false} />;

  const activeBarStyle = {
    style: { filter: `drop-shadow(0 0 8px ${fill}50)` },
  };

  if (horizontal) {
    return (
      <div role="img" aria-label={ariaLabel || undefined}>
        <ResponsiveContainer width="100%" height={height} minWidth={0}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={isMobile ? { top: 10, right: 10, bottom: 10, left: 0 } : { top: 20, right: 20, bottom: 20, left: 0 }}
          >
            <defs>
              {barGradientDef(gradId, fill)}
              {glowFilterDef(glowId, fill)}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis type="number" tickFormatter={yFormatter} tick={axisTick(fontSize)} />
            <YAxis type="category" dataKey="name" width={resolvedYAxisWidth} tick={<HorizYTick />} />
            <Tooltip
              content={tooltipContent}
              cursor={CURSOR_FILL}
            />
            <Bar
              dataKey="value"
              radius={barRadius}
              barSize={barWidth}
              fill={autoColorByValue ? fill : `url(#${gradId})`}
              activeBar={activeBarStyle}
              isAnimationActive={false}
            >
              {autoColorByValue &&
                chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.value >= 0 ? rallyColors.green : rallyColors.red} />
                ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div role="img" aria-label={ariaLabel || undefined}>
      <ResponsiveContainer width="100%" height={height} minWidth={0}>
        <BarChart
          data={chartData}
          margin={isMobile ? { top: 10, right: 10, bottom: 30, left: 35 } : { top: 20, right: 20, bottom: 60, left: 60 }}
        >
          <defs>
            {barGradientDef(gradId, fill)}
            {glowFilterDef(glowId, fill)}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis dataKey="name" tick={axisTick(isMobile ? 8 : 10)} angle={xTickAngle} textAnchor="end" interval={isMobile ? 'preserveStartEnd' : 0} />
          <YAxis tickFormatter={yFormatter} tick={axisTick(fontSize)} />
          <Tooltip
            content={tooltipContent}
            cursor={CURSOR_FILL}
          />
          <Bar
            dataKey="value"
            radius={barRadius}
            barSize={barWidth}
            fill={autoColorByValue ? fill : `url(#${gradId})`}
            activeBar={activeBarStyle}
            isAnimationActive={false}
          >
            {autoColorByValue &&
              chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.value >= 0 ? rallyColors.green : rallyColors.red} />
              ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
