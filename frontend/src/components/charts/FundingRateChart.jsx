import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from 'recharts';
import { Text } from '@mantine/core';
import rallyColors from '../../theme/rallyColors';
import {
  GRID_STROKE,
  axisTick,
  TOOLTIP_STYLE,
  barGradientDef,
} from './shared/chartStyles';

function FundingTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const pct = (d.rate * 100).toFixed(4);
  const color = d.rate > 0 ? rallyColors.green : d.rate < 0 ? rallyColors.red : rallyColors.textPrimary;
  return (
    <div style={{ ...TOOLTIP_STYLE, minWidth: 140 }}>
      <Text size="xs" fw={600} mb={4}>{label}</Text>
      <Text size="xs">
        نرخ فاندینگ:{' '}
        <b style={{ color }}>{d.rate > 0 ? '+' : ''}{pct}%</b>
      </Text>
    </div>
  );
}

export default function FundingRateChart({ data }) {
  if (!data?.length) return null;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 10 }}>
        <defs>
          {barGradientDef('fundingGreen', rallyColors.green)}
          {barGradientDef('fundingRed', rallyColors.red)}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis
          dataKey="date"
          tick={axisTick(9)}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={axisTick(9)}
          tickFormatter={(v) => `${(v * 100).toFixed(4)}%`}
          width={80}
        />
        <Tooltip content={<FundingTooltip />} />
        <ReferenceLine
          y={0}
          stroke={rallyColors.yellow}
          strokeDasharray="4 4"
          strokeWidth={1.5}
        />
        <Bar dataKey="rate" name="نرخ فاندینگ" radius={[2, 2, 0, 0]}>
          {data.map((entry, idx) => (
            <Cell
              key={idx}
              fill={entry.rate >= 0 ? rallyColors.green : rallyColors.red}
              fillOpacity={0.8}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
