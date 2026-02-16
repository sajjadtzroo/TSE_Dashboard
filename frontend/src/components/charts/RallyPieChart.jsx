import { useState } from 'react';
import { VictoryPie, VictoryLabel, VictoryContainer } from 'victory';
import { Group, Stack, Text, Box } from '@mantine/core';
import { RALLY_COLOR_SCALE } from './victoryRallyTheme';

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

  return (
    <div style={{ width: '100%' }}>
      <div style={{ maxWidth: width, margin: '0 auto' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
          <VictoryPie
            standalone={false}
            data={data}
            colorScale={colorScale}
            innerRadius={innerRadius}
            padAngle={2}
            width={width}
            height={height}
            labels={() => ''}
            style={{
              data: {
                stroke: 'transparent',
                opacity: ({ index }) => activeIndex !== null && activeIndex !== index ? 0.5 : 1,
                transform: ({ index }) => activeIndex === index ? 'scale(1.05)' : 'scale(1)',
                transformOrigin: 'center',
                transition: 'opacity 0.2s ease, transform 0.2s ease',
              },
            }}
            events={[{
              target: 'data',
              eventHandlers: {
                onMouseEnter: (_, { index }) => {
                  setActiveIndex(index);
                  return [];
                },
                onMouseLeave: () => {
                  setActiveIndex(null);
                  return [];
                },
              },
            }]}
          />
          {centerLabel && (
            <VictoryLabel
              textAnchor="middle"
              verticalAnchor="middle"
              x={width / 2}
              y={height / 2 - 8}
              text={centerLabel}
              style={{
                fill: 'rgba(238,238,238,0.5)',
                fontSize: 12,
                fontFamily: "'Poppins', sans-serif",
              }}
            />
          )}
          {centerValue != null && (
            <VictoryLabel
              textAnchor="middle"
              verticalAnchor="middle"
              x={width / 2}
              y={height / 2 + 10}
              text={String(centerValue)}
              style={{
                fill: '#EEEEEE',
                fontSize: 18,
                fontWeight: 700,
                fontFamily: "'Poppins', sans-serif",
              }}
            />
          )}
        </svg>
      </div>
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
            <Text size="xs" c="dimmed">
              {d.x} ({d.y})
            </Text>
          </Group>
        ))}
      </Group>
    </div>
  );
}
