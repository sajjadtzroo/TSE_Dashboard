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
              fill: rallyColors.textSecondary,
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
                fill: rallyColors.elevated,
                stroke: rallyColors.border,
              }}
              style={{ fill: rallyColors.textPrimary, fontSize: 11 }}
              cornerRadius={4}
              flyoutPadding={{ top: 6, bottom: 6, left: 10, right: 10 }}
            />
          }
          style={{
            data: {
              fill: autoColorByValue
                ? ({ datum }) =>
                    datum.y >= 0 ? rallyColors.green : rallyColors.red
                : rallyColors.green,
            },
          }}
        />
      </VictoryChart>
    </div>
  );
}
