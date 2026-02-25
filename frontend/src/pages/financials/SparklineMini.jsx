/**
 * Standalone sparkline (not a table cell).
 * Mirrors SparklineCell rendering but as a plain <div>.
 */
import { scaleLinear } from 'd3-scale';
import { line, curveMonotoneX } from 'd3-shape';

const W = 72;
const H = 24;
const PAD_X = 3;
const PAD_Y = 3;

const COLOR_UP = '#22C55E';
const COLOR_DOWN = '#EF4444';
const COLOR_FLAT = '#6B7280';

function trendColor(values) {
  const valid = values.filter((v) => v != null && v !== 0);
  if (valid.length < 2) return COLOR_FLAT;
  const pct = Math.abs(valid[0]) > 0 ? (valid[valid.length - 1] - valid[0]) / Math.abs(valid[0]) : 0;
  if (pct > 0.02) return COLOR_UP;
  if (pct < -0.02) return COLOR_DOWN;
  return COLOR_FLAT;
}

export default function SparklineMini({ values }) {
  if (!values || values.length === 0) return null;

  const nonNull = values.map((v, i) => ({ v, i })).filter((d) => d.v != null);
  const color = trendColor(values);

  let pathD;
  let dotX = W - PAD_X;
  let dotY = H / 2;

  if (nonNull.length < 2) {
    pathD = `M${PAD_X},${H / 2} L${W - PAD_X},${H / 2}`;
  } else {
    const xScale = scaleLinear().domain([0, values.length - 1]).range([PAD_X, W - PAD_X]);
    const minVal = Math.min(...nonNull.map((d) => d.v));
    const maxVal = Math.max(...nonNull.map((d) => d.v));
    const range = maxVal - minVal;
    const yScale = scaleLinear()
      .domain([minVal - range * 0.1, maxVal + range * 0.1])
      .range([H - PAD_Y, PAD_Y])
      .clamp(true);

    const lineGen = line()
      .x((d) => xScale(d.i))
      .y((d) => yScale(d.v))
      .curve(curveMonotoneX);

    pathD = lineGen(nonNull);
    const last = nonNull[nonNull.length - 1];
    dotX = xScale(last.i);
    dotY = yScale(last.v);
  }

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={dotX} cy={dotY} r={2} fill={color} />
    </svg>
  );
}
