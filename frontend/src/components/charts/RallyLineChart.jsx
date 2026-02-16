import {
  VictoryChart,
  VictoryLine,
  VictoryAxis,
  VictoryTooltip,
  VictoryVoronoiContainer,
} from 'victory';
import victoryRallyTheme from './victoryRallyTheme';
import rallyColors from '../../theme/rallyColors';

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
  return (
    <div style={{ width: '100%' }}>
      <VictoryChart
        theme={victoryRallyTheme}
        height={height}
        padding={{ top: 20, bottom: 60, left: 60, right: 20 }}
        containerComponent={
          <VictoryVoronoiContainer
            labels={({ datum }) =>
              tooltipFormatter
                ? tooltipFormatter(datum)
                : `${datum.x}: ${datum.y?.toLocaleString()}`
            }
            labelComponent={
              <VictoryTooltip
                flyoutStyle={{
                  fill: '#1a1a1a',
                  stroke: 'rgba(238,238,238,0.1)',
                }}
                style={{ fill: '#EEEEEE', fontSize: 11 }}
                cornerRadius={4}
                flyoutPadding={{ top: 6, bottom: 6, left: 10, right: 10 }}
              />
            }
          />
        }
      >
        <VictoryAxis
          tickCount={xTickCount}
          tickFormat={xFormatter}
          style={{
            tickLabels: {
              angle: xTickAngle,
              textAnchor: 'end',
              fontSize: 10,
              fill: 'rgba(238,238,238,0.5)',
            },
          }}
        />
        <VictoryAxis
          dependentAxis
          tickFormat={yFormatter}
          style={{
            tickLabels: {
              fontSize: 11,
              fill: 'rgba(238,238,238,0.5)',
            },
          }}
        />
        <VictoryLine
          data={data}
          interpolation="monotoneX"
          style={{
            data: {
              stroke: lineColor,
              strokeWidth: 2,
            },
          }}
        />
      </VictoryChart>
    </div>
  );
}
