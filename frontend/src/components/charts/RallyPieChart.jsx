import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Group, Text, Box } from '@mantine/core';
import rallyColors from '../../theme/rallyColors';
import ChartTooltipV2 from './shared/ChartTooltipV2';
import useChartBreakpoint from '../../hooks/useChartBreakpoint';
import { toPersianNum } from '../../utils/formatUtils';

const RALLY_COLOR_SCALE = [
  rallyColors.primary, // #2962FF
  rallyColors.blue,    // #3B82F6
  rallyColors.purple,  // #8B5CF6
  rallyColors.yellow,  // #F59E0B
  rallyColors.red,     // #EF4444
];

export { RALLY_COLOR_SCALE };

export default function RallyPieChart({
  data,
  colorScale = RALLY_COLOR_SCALE,
  innerRadius = 70,
  centerLabel,
  centerValue,
  height = 300,
  width = 300,
}) {
  const [activeIndex, setActiveIndex] = useState(null);
  const { isMobile } = useChartBreakpoint();
  const maxLabelChars = isMobile ? 8 : 12;

  // Map { x, y } props to { name, value } for Recharts
  const chartData = useMemo(() => data.map((d) => ({ name: d.x, value: d.y })), [data]);
  const outerRadius = height / 2 - 20;
  const total = chartData.reduce((s, d) => s + (d.value || 0), 0);

  return (
    <div style={{ width: '100%' }}>
      <ResponsiveContainer width="100%" height={height} minWidth={0}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            isAnimationActive={false}
            onMouseEnter={(_, index) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            {chartData.map((_, i) => (
              <Cell
                key={`cell-${i}`}
                fill={colorScale[i % colorScale.length]}
                stroke="transparent"
                style={{
                  opacity: activeIndex !== null && activeIndex !== i ? 0.5 : 1,
                  transform: activeIndex === i ? 'scale(1.05)' : 'scale(1)',
                  transformOrigin: 'center',
                  transition: 'opacity 0.2s ease, transform 0.2s ease',
                  filter: activeIndex === i
                    ? `drop-shadow(0 0 8px ${colorScale[i % colorScale.length]}60)`
                    : 'none',
                }}
              />
            ))}
          </Pie>
          <Tooltip
            content={
              <ChartTooltipV2
                formatter={(val, name) => {
                  const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
                  return `${toPersianNum(String(val))} (${toPersianNum(pct)}٪)`;
                }}
              />
            }
          />
          {/* Center label and value rendered as custom SVG text */}
          {centerLabel && (
            <text
              x="50%"
              y="50%"
              dy={centerValue != null ? -8 : 0}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={rallyColors.textSecondary}
              fontSize={12}
              fontFamily="'PELAK', 'Poppins', sans-serif"
            >
              {centerLabel}
            </text>
          )}
          {centerValue != null && (
            <text
              x="50%"
              y="50%"
              dy={centerLabel ? 10 : 0}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={rallyColors.textPrimary}
              fontSize={18}
              fontWeight={700}
              fontFamily="'PELAK', 'Poppins', sans-serif"
            >
              {toPersianNum(String(centerValue))}
            </text>
          )}
        </PieChart>
      </ResponsiveContainer>
      {/* Legend below chart */}
      <Box
        mt="xs"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          justifyContent: 'center',
        }}
      >
        {data.map((d, i) => {
          const label = d.x.length > maxLabelChars ? d.x.slice(0, maxLabelChars) + '…' : d.x;
          return (
            <Group
              key={i}
              gap={4}
              style={{
                cursor: 'pointer',
                flex: '0 0 auto',
                maxWidth: isMobile ? '100%' : '50%',
                opacity: activeIndex !== null && activeIndex !== i ? 0.5 : 1,
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <Box
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  backgroundColor: colorScale[i % colorScale.length],
                  flexShrink: 0,
                }}
              />
              <Text size="xs" c="dimmed" title={d.x}>
                {label}
              </Text>
            </Group>
          );
        })}
      </Box>
    </div>
  );
}
