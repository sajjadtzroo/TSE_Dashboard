import {
  ComposedChart,
  Area,
  Line,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { Group, Badge } from '@mantine/core';
import rallyColors from '../../theme/rallyColors';
import ChartTooltipV2 from './shared/ChartTooltipV2';
import usePayoffData from '../../hooks/usePayoffData';
import { GRID_STROKE, axisTick, activeDotFor } from './shared/chartStyles';
import { toPersianNum } from '../../utils/formatUtils';

export default function PayoffChart({
  legs,
  stockPrice,
  priceRange,
  height = 350,
  steps = 500,
}) {
  const { data, yDomain } = usePayoffData(legs, priceRange, steps);

  return (
    <div>
      <div style={{ width: '100%' }}>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart
            data={data}
            margin={{ top: 20, right: 20, bottom: 40, left: 70 }}
          >
            <defs>
              <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={rallyColors.green} stopOpacity={0.12} />
                <stop offset="100%" stopColor={rallyColors.green} stopOpacity={0.12} />
              </linearGradient>
              <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={rallyColors.red} stopOpacity={0.12} />
                <stop offset="100%" stopColor={rallyColors.red} stopOpacity={0.12} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis
              dataKey="price"
              tickFormatter={(t) => t.toLocaleString()}
              tick={axisTick(10)}
              stroke={rallyColors.border}
            />
            <YAxis
              domain={yDomain}
              tickFormatter={(t) => t.toLocaleString()}
              tick={axisTick(10)}
              stroke={rallyColors.border}
            />

            <Tooltip
              content={
                <ChartTooltipV2
                  colorIndicator={false}
                  formatter={(val, name, entry) => {
                    if (name === 'payoff') {
                      const pnl = entry.payload.payoff;
                      return `${pnl >= 0 ? '+' : ''}${toPersianNum(pnl.toLocaleString(undefined, { maximumFractionDigits: 0 }))}`;
                    }
                    return toPersianNum(String(val));
                  }}
                  labelFormatter={(l) => `قیمت: ${toPersianNum(Number(l).toLocaleString())}`}
                />
              }
            />

            <Area type="monotone" dataKey="profit" stroke="transparent" fill="url(#profitGradient)" isAnimationActive={false} />
            <Area type="monotone" dataKey="loss" stroke="transparent" fill="url(#lossGradient)" isAnimationActive={false} />
            <ReferenceLine y={0} stroke="rgba(148, 163, 184, 0.2)" strokeDasharray="4 4" />
            <ReferenceLine x={stockPrice} stroke={rallyColors.blue} strokeWidth={1.5} strokeDasharray="6 4" />
            <Line type="monotone" dataKey="payoff" stroke={rallyColors.green} strokeWidth={2.5} dot={false} activeDot={activeDotFor(rallyColors.green)} isAnimationActive={false} />
            <Scatter dataKey="breakeven" fill={rallyColors.yellow} r={5} isAnimationActive={false} />
            <Scatter dataKey="strike" fill={rallyColors.purple} r={4} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <Group gap="sm" mt={4} px="xs" justify="center">
        <Badge variant="dot" color="teal" size="sm" styles={{ root: { textTransform: 'none' } }}>منحنی سود/زیان</Badge>
        <Badge variant="dot" color="cyan" size="sm" styles={{ root: { textTransform: 'none' } }}>قیمت فعلی</Badge>
        <Badge variant="dot" color="yellow" size="sm" styles={{ root: { textTransform: 'none' } }}>سربه‌سر</Badge>
        <Badge variant="dot" color="grape" size="sm" styles={{ root: { textTransform: 'none' } }}>اعمال</Badge>
      </Group>
    </div>
  );
}
