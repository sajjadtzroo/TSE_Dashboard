import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer, Legend,
} from 'recharts';
import { GRID_STROKE, axisTick, TOOLTIP_STYLE } from './shared/chartStyles';
import rallyColors from '../../theme/rallyColors';
import { formatNum } from '../../utils/formatUtils';

/**
 * Cumulative OI distribution: cumulative callOI (green) vs putOI (red) by strike.
 * Shows where open interest concentration builds up.
 * @param {{ data: Array, underlyingPrice: number, formatStrike?: function }} props
 */
export default function CumulativeOIChart({ data, underlyingPrice, formatStrike }) {
  const fmtStrike = formatStrike || ((v) => formatNum(v));

  const cumData = useMemo(() => {
    if (!data?.length) return [];
    let cumCall = 0;
    let cumPut = 0;
    return data.map((d) => {
      cumCall += d.callOI || 0;
      cumPut += d.putOI || 0;
      return { strike: d.strike, cumCallOI: cumCall, cumPutOI: cumPut };
    });
  }, [data]);

  if (cumData.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={cumData} margin={{ top: 10, right: 20, bottom: 40, left: 40 }}>
        <defs>
          <linearGradient id="cumCallGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={rallyColors.green} stopOpacity={0.4} />
            <stop offset="100%" stopColor={rallyColors.green} stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="cumPutGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={rallyColors.red} stopOpacity={0.4} />
            <stop offset="100%" stopColor={rallyColors.red} stopOpacity={0.05} />
          </linearGradient>
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
          label={{ value: 'OI تجمعی', angle: -90, position: 'insideLeft', offset: -25, fontSize: 11, fill: rallyColors.textSecondary }}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v, name) => [formatNum(v), name === 'cumCallOI' ? 'OI تجمعی Call' : 'OI تجمعی Put']}
          labelFormatter={(v) => `اعمال: ${fmtStrike(v)}`}
        />
        <Legend formatter={(v) => (v === 'cumCallOI' ? 'OI تجمعی Call' : 'OI تجمعی Put')} />
        {underlyingPrice > 0 && (
          <ReferenceLine
            x={underlyingPrice}
            stroke={rallyColors.blue}
            strokeWidth={2}
            strokeDasharray="5 5"
          />
        )}
        <Area type="monotone" dataKey="cumCallOI" stroke={rallyColors.green} fill="url(#cumCallGrad)" strokeWidth={2} />
        <Area type="monotone" dataKey="cumPutOI" stroke={rallyColors.red} fill="url(#cumPutGrad)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
