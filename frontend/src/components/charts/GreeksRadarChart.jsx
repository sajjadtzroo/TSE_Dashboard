import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip,
} from 'recharts';
import { TOOLTIP_STYLE } from './shared/chartStyles';
import rallyColors from '../../theme/rallyColors';

const AXES = [
  { key: 'delta', label: 'دلتا', max: 1 },
  { key: 'gamma', label: 'گاما', max: 0.05 },
  { key: 'theta', label: 'تتا', max: 50 },
  { key: 'vega', label: 'وگا', max: 50 },
  { key: 'rho', label: 'رو', max: 50 },
];

/**
 * Radar chart showing normalized Greek values for a strategy.
 * @param {{ greeks: { delta, gamma, theta, vega, rho } }} props
 */
export default function GreeksRadarChart({ greeks }) {
  if (!greeks) return null;

  const data = AXES.map(({ key, label, max }) => {
    const raw = greeks[key] ?? 0;
    const normalized = Math.min(Math.abs(raw) / max, 1);
    return { metric: label, value: normalized, raw };
  });

  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={data} outerRadius={90}>
        <PolarGrid stroke="rgba(255,255,255,0.1)" />
        <PolarAngleAxis
          dataKey="metric"
          tick={({ x, y, payload, textAnchor }) => (
            <text x={x} y={y} textAnchor={textAnchor} fontSize={11} fill="#9ca3af" fontFamily="inherit" dy={4}>
              {payload.value}
            </text>
          )}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v, name, entry) => {
            const raw = entry?.payload?.raw;
            return [raw != null ? raw.toFixed(4) : v.toFixed(2), 'مقدار'];
          }}
          labelFormatter={(v) => v}
        />
        <Radar
          name="یونانی‌ها"
          dataKey="value"
          stroke={rallyColors.primary}
          fill={rallyColors.primary}
          fillOpacity={0.2}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
