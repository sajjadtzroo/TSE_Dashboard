import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer, Legend, Cell,
} from 'recharts';
import { GRID_STROKE, axisTick, TOOLTIP_STYLE, barGradientDef } from './shared/chartStyles';
import rallyColors from '../../theme/rallyColors';
import { formatNum } from '../../utils/formatUtils';

/**
 * Stacked bar chart: Call OI (green) vs Put OI (red) per strike.
 * @param {{ data: Array, underlyingPrice: number, formatStrike?: function }} props
 */
export default function OIByStrikeChart({ data, underlyingPrice, formatStrike }) {
  const fmtStrike = formatStrike || ((v) => formatNum(v));

  if (!data || data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 10, right: 20, bottom: 40, left: 40 }}>
        <defs>
          {barGradientDef('oiCallGrad', rallyColors.green)}
          {barGradientDef('oiPutGrad', rallyColors.red)}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis
          dataKey="strike"
          tick={axisTick(9)}
          tickFormatter={fmtStrike}
          label={{ value: 'اعمال', position: 'insideBottom', offset: -10, fontSize: 11, fill: rallyColors.textSecondary }}
        />
        <YAxis
          tick={axisTick(10)}
          tickFormatter={(v) => formatNum(v)}
          label={{ value: 'موقعیت باز', angle: -90, position: 'insideLeft', offset: -25, fontSize: 11, fill: rallyColors.textSecondary }}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v, name) => [formatNum(v), name === 'callOI' ? 'OI خرید' : 'OI فروش']}
          labelFormatter={(v) => `اعمال: ${fmtStrike(v)}`}
        />
        <Legend formatter={(v) => (v === 'callOI' ? 'OI خرید (Call)' : 'OI فروش (Put)')} />
        {underlyingPrice > 0 && (
          <ReferenceLine
            x={underlyingPrice}
            stroke={rallyColors.blue}
            strokeWidth={2}
            strokeDasharray="5 5"
            label={{ value: `قیمت: ${fmtStrike(underlyingPrice)}`, fill: rallyColors.blue, fontSize: 10 }}
          />
        )}
        <Bar dataKey="callOI" stackId="oi" fill="url(#oiCallGrad)" radius={[0, 0, 0, 0]} />
        <Bar dataKey="putOI" stackId="oi" fill="url(#oiPutGrad)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
