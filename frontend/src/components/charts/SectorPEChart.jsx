import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import { GRID_STROKE, axisTick, TOOLTIP_STYLE, barGradientDef } from './shared/chartStyles';
import rallyColors from '../../theme/rallyColors';
import { toPersianNum } from '../../utils/formatUtils';

/**
 * Horizontal bar chart: average P/E ratio per sector.
 * @param {{ data: Array }} props — market-overview array with pe_ratio + sector_name_fa
 */
export default function SectorPEChart({ data }) {
  const chartData = useMemo(() => {
    if (!data?.length) return [];
    const sectors = {};
    for (const stock of data) {
      const sec = stock.sector_name_fa;
      const pe = stock.pe_ratio;
      if (!sec || pe == null || pe <= 0 || pe > 200) continue;
      if (!sectors[sec]) sectors[sec] = { sum: 0, count: 0 };
      sectors[sec].sum += pe;
      sectors[sec].count += 1;
    }
    return Object.entries(sectors)
      .map(([name, { sum, count }]) => ({ name, avgPE: Math.round((sum / count) * 10) / 10 }))
      .sort((a, b) => b.avgPE - a.avgPE)
      .slice(0, 15);
  }, [data]);

  const marketAvgPE = useMemo(() => {
    if (!chartData.length) return 0;
    const total = chartData.reduce((s, d) => s + d.avgPE, 0);
    return Math.round((total / chartData.length) * 10) / 10;
  }, [chartData]);

  if (chartData.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={Math.max(320, chartData.length * 32)}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 30, bottom: 10, left: 140 }}>
        <defs>
          {barGradientDef('sectorPEGrad', rallyColors.blue)}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
        <XAxis type="number" tick={axisTick(10)} />
        <YAxis
          type="category"
          dataKey="name"
          width={130}
          tick={(props) => {
            const { x, y, payload } = props;
            return (
              <text x={x} y={y} dy={4} textAnchor="end" fontSize={11} fill={rallyColors.textPrimary} fontFamily="inherit">
                {payload.value}
              </text>
            );
          }}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v) => [toPersianNum(v.toFixed(1)), 'میانگین P/E']}
          labelFormatter={(v) => v}
        />
        <ReferenceLine
          x={marketAvgPE}
          stroke={rallyColors.yellow}
          strokeDasharray="5 5"
          label={{ value: `میانگین: ${toPersianNum(marketAvgPE)}`, fill: rallyColors.yellow, fontSize: 10, position: 'top' }}
        />
        <Bar
          dataKey="avgPE"
          radius={[0, 4, 4, 0]}
          label={({ x, y, width, height, value }) => (
            <text
              x={x + width + 6}
              y={y + height / 2}
              dy={4}
              fontSize={11}
              fontWeight={600}
              fill={rallyColors.textPrimary}
              fontFamily="inherit"
            >
              {toPersianNum(value.toFixed(1))}
            </text>
          )}
        >
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.avgPE > marketAvgPE ? rallyColors.red : rallyColors.green} fillOpacity={0.8} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
