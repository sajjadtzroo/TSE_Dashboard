import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Legend, Tooltip,
} from 'recharts';
import { COMPARISON_COLORS } from '../../constants/chartColors';

const AXES = [
  { key: 'sharpe',    label: 'شارپ' },
  { key: 'sortino',   label: 'سورتینو' },
  { key: 'alpha',     label: 'آلفا' },
  { key: 'calmar',    label: 'کالمار' },
  { key: 'hitRate',   label: 'نرخ موفقیت' },
  { key: 'invMaxDD',  label: '۱ − MaxDD' },
];

/**
 * Normalize a set of values to [0, 1] for radar display.
 * Handles null values gracefully (maps to 0).
 */
function normalizeValues(allValues) {
  const realValues = allValues.filter((v) => v != null);
  if (!realValues.length) return allValues.map(() => 0.5);
  const min = Math.min(...realValues);
  const max = Math.max(...realValues);
  if (max === min) return allValues.map((v) => (v == null ? 0 : 0.5));
  return allValues.map((v) => (v == null ? 0 : (v - min) / (max - min)));
}

/**
 * @param {{ symbols: string[], metricsMap: Object }} props
 */
export default function ETFRadarChart({ symbols, metricsMap }) {
  if (!symbols.length) return null;

  // Build radar data: one object per axis, keyed by symbol
  const radarData = AXES.map(({ key, label }) => {
    const raw = symbols.map((sym) => {
      const m = metricsMap[sym];
      if (!m) return null;
      if (key === 'invMaxDD') return m.maxDrawdown != null ? 1 - Math.abs(m.maxDrawdown) : null;
      if (key === 'alpha')    return m.alpha;
      return m[key] ?? null;
    });
    const normed = normalizeValues(raw);
    const entry = { metric: label };
    symbols.forEach((sym, i) => { entry[sym] = normed[i]; });
    return entry;
  });

  return (
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart data={radarData} outerRadius={110}>
        <PolarGrid stroke="rgba(255,255,255,0.1)" />
        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#9ca3af', fontFamily: 'inherit' }} />
        {symbols.map((sym, i) => (
          <Radar
            key={sym}
            name={sym}
            dataKey={sym}
            stroke={COMPARISON_COLORS[i % COMPARISON_COLORS.length]}
            fill={COMPARISON_COLORS[i % COMPARISON_COLORS.length]}
            fillOpacity={0.15}
            strokeWidth={2}
          />
        ))}
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Tooltip formatter={(v) => v.toFixed(2)} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
