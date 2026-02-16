import {
  VictoryChart,
  VictoryLine,
  VictoryArea,
  VictoryAxis,
  VictoryScatter,
  VictoryTooltip,
  VictoryVoronoiContainer,
} from 'victory';
import { Group, Badge } from '@mantine/core';
import victoryRallyTheme from './victoryRallyTheme';
import rallyColors from '../../theme/rallyColors';
import { strategyPayoff, findBreakevens } from '../../utils/blackScholes';

export default function PayoffChart({
  legs,
  stockPrice,
  priceRange,
  height = 350,
  steps = 500,
}) {
  const [lo, hi] = priceRange;
  const step = (hi - lo) / steps;

  // Build payoff data points
  const profitData = [];
  const lossData = [];
  const lineData = [];

  for (let i = 0; i <= steps; i++) {
    const x = lo + i * step;
    const y = strategyPayoff(legs, x);
    lineData.push({ x, y });
    profitData.push({ x, y: y >= 0 ? y : 0 });
    lossData.push({ x, y: y < 0 ? y : 0 });
  }

  // Breakeven points
  const breakevens = findBreakevens(legs, priceRange, steps);
  const breakevenData = breakevens.map((bx) => ({ x: bx, y: 0 }));

  // Strike markers
  const strikes = [...new Set(legs.filter((l) => l.type !== 'stock').map((l) => l.strike))];
  const strikeData = strikes.map((k) => ({ x: k, y: strategyPayoff(legs, k) }));

  // Y domain with padding
  const allY = lineData.map((d) => d.y);
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);
  const yPad = Math.max(Math.abs(maxY - minY) * 0.15, 1);

  return (
    <div>
      <div style={{ width: '100%' }}>
        <VictoryChart
          theme={victoryRallyTheme}
          height={height}
          padding={{ top: 20, bottom: 40, left: 70, right: 20 }}
          domain={{ y: [minY - yPad, maxY + yPad] }}
          containerComponent={
            <VictoryVoronoiContainer
              labels={({ datum }) =>
                `Price: ${datum.x?.toLocaleString()}\nP&L: ${datum.y >= 0 ? '+' : ''}${datum.y?.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
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
            />
          }
        >
          <VictoryAxis
            tickFormat={(t) => t.toLocaleString()}
            style={{
              tickLabels: { fontSize: 10, fill: rallyColors.textSecondary },
            }}
          />
          <VictoryAxis
            dependentAxis
            tickFormat={(t) => t.toLocaleString()}
            style={{
              tickLabels: { fontSize: 10, fill: rallyColors.textSecondary },
            }}
          />

          {/* Profit zone (green) */}
          <VictoryArea
            data={profitData}
            interpolation="monotoneX"
            style={{
              data: {
                fill: rallyColors.green,
                fillOpacity: 0.12,
                stroke: 'transparent',
              },
            }}
          />

          {/* Loss zone (red) */}
          <VictoryArea
            data={lossData}
            interpolation="monotoneX"
            style={{
              data: {
                fill: rallyColors.red,
                fillOpacity: 0.12,
                stroke: 'transparent',
              },
            }}
          />

          {/* Zero line */}
          <VictoryLine
            data={[
              { x: lo, y: 0 },
              { x: hi, y: 0 },
            ]}
            style={{
              data: {
                stroke: 'rgba(148, 163, 184, 0.2)',
                strokeWidth: 1,
                strokeDasharray: '4,4',
              },
            }}
          />

          {/* Current stock price vertical marker */}
          <VictoryLine
            data={[
              { x: stockPrice, y: minY - yPad },
              { x: stockPrice, y: maxY + yPad },
            ]}
            style={{
              data: {
                stroke: rallyColors.blue,
                strokeWidth: 1.5,
                strokeDasharray: '6,4',
              },
            }}
          />

          {/* Main payoff curve */}
          <VictoryLine
            data={lineData}
            interpolation="monotoneX"
            style={{
              data: {
                stroke: rallyColors.green,
                strokeWidth: 2.5,
              },
            }}
          />

          {/* Breakeven points */}
          {breakevenData.length > 0 && (
            <VictoryScatter
              data={breakevenData}
              size={5}
              style={{
                data: { fill: rallyColors.yellow },
              }}
            />
          )}

          {/* Strike markers */}
          {strikeData.length > 0 && (
            <VictoryScatter
              data={strikeData}
              size={4}
              style={{
                data: { fill: rallyColors.purple },
              }}
            />
          )}
        </VictoryChart>
      </div>

      {/* Legend */}
      <Group gap="sm" mt={4} px="xs" justify="center">
        <Badge variant="dot" color="teal" size="sm" styles={{ root: { textTransform: 'none' } }}>
          Payoff Curve
        </Badge>
        <Badge variant="dot" color="cyan" size="sm" styles={{ root: { textTransform: 'none' } }}>
          Current Price
        </Badge>
        <Badge variant="dot" color="yellow" size="sm" styles={{ root: { textTransform: 'none' } }}>
          Breakeven
        </Badge>
        <Badge variant="dot" color="grape" size="sm" styles={{ root: { textTransform: 'none' } }}>
          Strike
        </Badge>
      </Group>
    </div>
  );
}
