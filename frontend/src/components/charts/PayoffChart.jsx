import { useMemo } from 'react';
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
import { strategyPayoff, findBreakevens } from '../../utils/blackScholes';

/* ── Custom Tooltip ──────────────────────────────────────────── */

function PayoffTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null;

  const entry = payload.find((p) => p.dataKey === 'payoff') || payload[0];
  const price = entry?.payload?.price;
  const pnl = entry?.payload?.payoff;

  if (price == null || pnl == null) return null;

  return (
    <div
      style={{
        background: rallyColors.elevated,
        border: `1px solid ${rallyColors.border}`,
        borderRadius: 4,
        padding: '6px 10px',
        color: rallyColors.textPrimary,
        fontSize: 11,
        lineHeight: 1.5,
      }}
    >
      <div>قیمت: {price.toLocaleString()}</div>
      <div>
        سود/زیان: {pnl >= 0 ? '+' : ''}
        {pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </div>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────────── */

export default function PayoffChart({
  legs,
  stockPrice,
  priceRange,
  height = 350,
  steps = 500,
}) {
  const { data, yDomain } = useMemo(() => {
    const [lo, hi] = priceRange;
    const step = (hi - lo) / steps;

    // Build payoff data points
    const lineData = [];
    for (let i = 0; i <= steps; i++) {
      const x = lo + i * step;
      const y = strategyPayoff(legs, x);
      lineData.push({
        price: x,
        payoff: y,
        profit: y >= 0 ? y : 0,
        loss: y < 0 ? y : 0,
      });
    }

    // Breakeven points — find nearest data index and tag it
    const breakevens = findBreakevens(legs, priceRange, steps);
    for (const bx of breakevens) {
      let closestIdx = 0;
      let closestDist = Infinity;
      for (let i = 0; i < lineData.length; i++) {
        const dist = Math.abs(lineData[i].price - bx);
        if (dist < closestDist) {
          closestDist = dist;
          closestIdx = i;
        }
      }
      lineData[closestIdx].breakeven = 0;
    }

    // Strike markers — find nearest data index and tag it
    const strikes = [
      ...new Set(legs.filter((l) => l.type !== 'stock').map((l) => l.strike)),
    ];
    for (const k of strikes) {
      let closestIdx = 0;
      let closestDist = Infinity;
      for (let i = 0; i < lineData.length; i++) {
        const dist = Math.abs(lineData[i].price - k);
        if (dist < closestDist) {
          closestDist = dist;
          closestIdx = i;
        }
      }
      lineData[closestIdx].strike = strategyPayoff(legs, k);
    }

    // Y domain with padding
    const allY = lineData.map((d) => d.payoff);
    const minY = Math.min(...allY);
    const maxY = Math.max(...allY);
    const yPad = Math.max(Math.abs(maxY - minY) * 0.15, 1);

    return {
      data: lineData,
      yDomain: [minY - yPad, maxY + yPad],
    };
  }, [legs, stockPrice, priceRange, steps]);

  return (
    <div>
      <div style={{ width: '100%' }}>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart
            data={data}
            margin={{ top: 20, right: 20, bottom: 40, left: 70 }}
          >
            {/* Gradient definitions */}
            <defs>
              <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={rallyColors.green}
                  stopOpacity={0.12}
                />
                <stop
                  offset="100%"
                  stopColor={rallyColors.green}
                  stopOpacity={0.12}
                />
              </linearGradient>
              <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={rallyColors.red}
                  stopOpacity={0.12}
                />
                <stop
                  offset="100%"
                  stopColor={rallyColors.red}
                  stopOpacity={0.12}
                />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(148, 163, 184, 0.04)"
            />

            <XAxis
              dataKey="price"
              tickFormatter={(t) => t.toLocaleString()}
              tick={{ fontSize: 10, fill: rallyColors.textSecondary }}
              stroke={rallyColors.border}
            />
            <YAxis
              domain={yDomain}
              tickFormatter={(t) => t.toLocaleString()}
              tick={{ fontSize: 10, fill: rallyColors.textSecondary }}
              stroke={rallyColors.border}
            />

            <Tooltip content={<PayoffTooltip />} />

            {/* Profit zone (green) */}
            <Area
              type="monotone"
              dataKey="profit"
              stroke="transparent"
              fill="url(#profitGradient)"
              isAnimationActive={false}
            />

            {/* Loss zone (red) */}
            <Area
              type="monotone"
              dataKey="loss"
              stroke="transparent"
              fill="url(#lossGradient)"
              isAnimationActive={false}
            />

            {/* Zero line */}
            <ReferenceLine
              y={0}
              stroke="rgba(148, 163, 184, 0.2)"
              strokeDasharray="4 4"
            />

            {/* Current stock price vertical marker */}
            <ReferenceLine
              x={stockPrice}
              stroke={rallyColors.blue}
              strokeWidth={1.5}
              strokeDasharray="6 4"
            />

            {/* Main payoff curve */}
            <Line
              type="monotone"
              dataKey="payoff"
              stroke={rallyColors.green}
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />

            {/* Breakeven points */}
            <Scatter
              dataKey="breakeven"
              fill={rallyColors.yellow}
              r={5}
              isAnimationActive={false}
            />

            {/* Strike markers */}
            <Scatter
              dataKey="strike"
              fill={rallyColors.purple}
              r={4}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <Group gap="sm" mt={4} px="xs" justify="center">
        <Badge
          variant="dot"
          color="teal"
          size="sm"
          styles={{ root: { textTransform: 'none' } }}
        >
          منحنی سود/زیان
        </Badge>
        <Badge
          variant="dot"
          color="cyan"
          size="sm"
          styles={{ root: { textTransform: 'none' } }}
        >
          قیمت فعلی
        </Badge>
        <Badge
          variant="dot"
          color="yellow"
          size="sm"
          styles={{ root: { textTransform: 'none' } }}
        >
          سربه‌سر
        </Badge>
        <Badge
          variant="dot"
          color="grape"
          size="sm"
          styles={{ root: { textTransform: 'none' } }}
        >
          اعمال
        </Badge>
      </Group>
    </div>
  );
}
