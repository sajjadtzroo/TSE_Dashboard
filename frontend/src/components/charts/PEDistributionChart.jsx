import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import { GRID_STROKE, axisTick, TOOLTIP_STYLE } from './shared/chartStyles';
import rallyColors from '../../theme/rallyColors';
import { toPersianNum } from '../../utils/formatUtils';

const BINS = [
  { lo: 0, hi: 5, label: '۰-۵' },
  { lo: 5, hi: 10, label: '۵-۱۰' },
  { lo: 10, hi: 15, label: '۱۰-۱۵' },
  { lo: 15, hi: 20, label: '۱۵-۲۰' },
  { lo: 20, hi: 30, label: '۲۰-۳۰' },
  { lo: 30, hi: 50, label: '۳۰-۵۰' },
  { lo: 50, hi: 100, label: '۵۰-۱۰۰' },
  { lo: 100, hi: 200, label: '۱۰۰+' },
];

/**
 * Histogram of stock P/E ratio distribution.
 * @param {{ data: Array }} props — market-overview array with pe_ratio field
 */
export default function PEDistributionChart({ data }) {
  const { chartData, median } = useMemo(() => {
    if (!data?.length) return { chartData: [], median: 0 };
    const validPEs = data.filter((s) => s.pe_ratio > 0 && s.pe_ratio < 500).map((s) => s.pe_ratio);
    if (!validPEs.length) return { chartData: [], median: 0 };

    const sorted = [...validPEs].sort((a, b) => a - b);
    const med = sorted[Math.floor(sorted.length / 2)];

    const bins = BINS.map((b) => ({
      label: b.label,
      count: validPEs.filter((pe) => pe >= b.lo && pe < (b.hi === 200 ? Infinity : b.hi)).length,
      midpoint: (b.lo + Math.min(b.hi, 100)) / 2,
    }));

    return { chartData: bins, median: Math.round(med * 10) / 10 };
  }, [data]);

  if (chartData.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 10, right: 20, bottom: 30, left: 30 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis
          dataKey="label"
          tick={axisTick(10)}
          label={{ value: 'بازه P/E', position: 'insideBottom', offset: -10, fontSize: 11, fill: rallyColors.textSecondary }}
        />
        <YAxis
          tick={axisTick(10)}
          label={{ value: 'تعداد نماد', angle: -90, position: 'insideLeft', offset: -15, fontSize: 11, fill: rallyColors.textSecondary }}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v) => [toPersianNum(v), 'تعداد']}
          labelFormatter={(v) => `P/E: ${v}`}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.midpoint < 15 ? rallyColors.green : entry.midpoint < 30 ? rallyColors.blue : rallyColors.red} fillOpacity={0.8} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
