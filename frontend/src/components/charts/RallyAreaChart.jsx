import { useState, useCallback } from 'react';
import {
  VictoryChart,
  VictoryArea,
  VictoryAxis,
  VictoryTooltip,
  VictoryVoronoiContainer,
  createContainer,
  VictoryBrushContainer,
  VictoryLine,
} from 'victory';
import { ActionIcon, Group } from '@mantine/core';
import { IconZoomReset } from '@tabler/icons-react';
import victoryRallyTheme from './victoryRallyTheme';
import rallyColors from '../../theme/rallyColors';

const VictoryZoomVoronoiContainer = createContainer('zoom', 'voronoi');

const tooltipStyles = {
  flyoutStyle: {
    fill: rallyColors.elevated,
    stroke: rallyColors.border,
  },
  style: { fill: rallyColors.textPrimary, fontSize: 11 },
  cornerRadius: 4,
  flyoutPadding: { top: 6, bottom: 6, left: 10, right: 10 },
};

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
  const [zoomDomain, setZoomDomain] = useState(null);

  const handleZoomReset = useCallback(() => {
    setZoomDomain(null);
  }, []);

  const labelFn = ({ datum }) =>
    tooltipFormatter
      ? tooltipFormatter(datum)
      : `${datum.x}: ${datum.y?.toLocaleString()}`;

  const container = zoomable ? (
    <VictoryZoomVoronoiContainer
      zoomDimension="x"
      zoomDomain={zoomDomain || undefined}
      onZoomDomainChange={(domain) => setZoomDomain(domain)}
      labels={labelFn}
      labelComponent={<VictoryTooltip {...tooltipStyles} />}
    />
  ) : (
    <VictoryVoronoiContainer
      labels={labelFn}
      labelComponent={<VictoryTooltip {...tooltipStyles} />}
    />
  );

  const tickLabelStyle = {
    fontSize: 10,
    fill: rallyColors.textSecondary,
  };

  return (
    <div style={{ width: '100%' }}>
      <svg style={{ height: 0, position: 'absolute' }}>
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={fillColor} stopOpacity={0.4} />
            <stop offset="100%" stopColor={fillColor} stopOpacity={0.02} />
          </linearGradient>
        </defs>
      </svg>
      {zoomable && zoomDomain && (
        <Group justify="flex-end" px="xs" mb={-8}>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            onClick={handleZoomReset}
            title="Reset zoom"
          >
            <IconZoomReset size={16} />
          </ActionIcon>
        </Group>
      )}
      <VictoryChart
        theme={victoryRallyTheme}
        height={height}
        padding={{ top: 20, bottom: 60, left: 60, right: 20 }}
        containerComponent={container}
      >
        <VictoryAxis
          tickCount={xTickCount}
          tickFormat={xFormatter}
          style={{
            tickLabels: {
              angle: xTickAngle,
              textAnchor: 'end',
              ...tickLabelStyle,
            },
          }}
        />
        <VictoryAxis
          dependentAxis
          tickFormat={yFormatter}
          style={{
            tickLabels: {
              fontSize: 11,
              fill: rallyColors.textSecondary,
            },
          }}
        />
        <VictoryArea
          data={data}
          interpolation="monotoneX"
          style={{
            data: {
              fill: `url(#${gradientId})`,
              stroke,
              strokeWidth: 2,
            },
          }}
        />
      </VictoryChart>
      {zoomable && data.length > 50 && (
        <VictoryChart
          theme={victoryRallyTheme}
          height={brushHeight}
          padding={{ top: 0, bottom: 30, left: 60, right: 20 }}
          containerComponent={
            <VictoryBrushContainer
              brushDimension="x"
              brushDomain={zoomDomain || undefined}
              onBrushDomainChange={(domain) => setZoomDomain(domain)}
              brushStyle={{
                fill: rallyColors.green,
                fillOpacity: 0.15,
                stroke: rallyColors.green,
                strokeOpacity: 0.4,
              }}
            />
          }
        >
          <VictoryAxis
            tickFormat={xFormatter}
            style={{
              tickLabels: { fontSize: 8, fill: rallyColors.textDimmed },
            }}
          />
          <VictoryLine
            data={data}
            interpolation="monotoneX"
            style={{
              data: { stroke, strokeWidth: 1 },
            }}
          />
        </VictoryChart>
      )}
    </div>
  );
}
