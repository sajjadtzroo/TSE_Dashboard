import { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Group, Text, Box } from '@mantine/core';
import rallyColors from '../../theme/rallyColors';
import ChartTooltip from './shared/ChartTooltip';
import { toPersianNum } from '../../utils/formatUtils';

const RALLY_COLOR_SCALE = [
  rallyColors.green,   // #10B981
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

  // Map { x, y } props to { name, value } for Recharts
  const chartData = data.map((d) => ({ name: d.x, value: d.y }));
  const outerRadius = height / 2 - 20;

  return (
    <div style={{ width: '100%' }}>
      <ResponsiveContainer width="100%" height={height}>
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
                }}
              />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip tooltipFormatter={(d) => `${d.x}: ${d.y}`} />} />
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
      <Group gap="xs" justify="center" mt="xs" wrap="wrap">
        {data.map((d, i) => (
          <Group
            key={i}
            gap={4}
            style={{
              cursor: 'pointer',
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
              {d.x.length > 10 ? d.x.slice(0, 10) + '…' : d.x} ({d.y})
            </Text>
          </Group>
        ))}
      </Group>
    </div>
  );
}
