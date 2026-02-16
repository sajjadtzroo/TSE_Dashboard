import {
  VictoryChart,
  VictoryBar,
  VictoryAxis,
  VictoryTooltip,
  VictoryContainer,
} from 'victory';
import victoryRallyTheme from './victoryRallyTheme';
import rallyColors from '../../theme/rallyColors';

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
  return (
    <div style={{ width: '100%' }}>
      <VictoryChart
        theme={victoryRallyTheme}
        height={height}
        domainPadding={{ x: 20 }}
        padding={{ top: 20, bottom: 60, left: 60, right: 20 }}
        containerComponent={<VictoryContainer responsive={true} />}
      >
        <VictoryAxis
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
        <VictoryBar
          data={data}
          horizontal={horizontal}
          barWidth={barWidth}
          cornerRadius={{ top: cornerRadius }}
          labels={({ datum }) =>
            tooltipFormatter
              ? tooltipFormatter(datum)
              : `${datum.x}: ${datum.y}`
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
          style={{
            data: {
              fill: autoColorByValue
                ? ({ datum }) =>
                    datum.y >= 0 ? rallyColors.green : rallyColors.orange
                : rallyColors.green,
            },
          }}
        />
      </VictoryChart>
    </div>
  );
}
