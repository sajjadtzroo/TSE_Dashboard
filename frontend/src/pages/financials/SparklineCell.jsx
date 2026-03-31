// NOTE: This is a d3-based sparkline for financial tables (renders <td>).
// A separate recharts-based SparklineCell exists at components/cells/SparklineCell.jsx.
// They have different APIs and rendering targets — not interchangeable.
import { Tooltip } from '@mantine/core';
import { scaleLinear } from 'd3-scale';
import { line, curveMonotoneX } from 'd3-shape';
import { formatNum } from '../../utils/formatUtils';

const W = 80;
const H = 24;
const PAD_X = 4;
const PAD_Y = 3;

const COLOR_UP = '#22C55E';
const COLOR_DOWN = '#EF4444';
const COLOR_FLAT = '#6B7280';

function computeColor(values) {
  const valid = values.filter((v) => v != null && v !== 0);
  if (valid.length < 2) return COLOR_FLAT;
  const first = valid[0];
  const last = valid[valid.length - 1];
  const pct = Math.abs(first) > 0 ? (last - first) / Math.abs(first) : 0;
  if (pct > 0.02) return COLOR_UP;
  if (pct < -0.02) return COLOR_DOWN;
  return COLOR_FLAT;
}

function computeYoY(values) {
  const valid = values.filter((v) => v != null);
  if (valid.length < 2) return null;
  const latest = valid[valid.length - 1];
  const prev = valid[valid.length - 2];
  if (!prev) return null;
  return ((latest - prev) / Math.abs(prev)) * 100;
}

export default function SparklineCell({ values }) {
  if (!values || values.length === 0) return <td />;

  const validValues = values.filter((v) => v != null);
  const allZeroOrNull = validValues.length === 0 || validValues.every((v) => v === 0);
  const color = allZeroOrNull ? COLOR_FLAT : computeColor(values);
  const yoy = computeYoY(values);

  const latest = validValues[validValues.length - 1];
  const tooltipLabel = latest != null
    ? `${formatNum(latest)}${yoy != null ? ` (${yoy >= 0 ? '+' : ''}${yoy.toFixed(1)}٪)` : ''}`
    : '-';

  let pathD = null;
  let dotX = null;
  let dotY = null;

  if (allZeroOrNull || values.length === 1) {
    // Flat horizontal dash at mid-height
    pathD = `M${PAD_X},${H / 2} L${W - PAD_X},${H / 2}`;
    dotX = W - PAD_X;
    dotY = H / 2;
  } else {
    const nonNullIndexed = values
      .map((v, i) => ({ v, i }))
      .filter((d) => d.v != null);

    const xScale = scaleLinear()
      .domain([0, values.length - 1])
      .range([PAD_X, W - PAD_X]);

    const minVal = Math.min(...nonNullIndexed.map((d) => d.v));
    const maxVal = Math.max(...nonNullIndexed.map((d) => d.v));
    const yRange = maxVal - minVal;

    const yScale = scaleLinear()
      .domain([minVal - yRange * 0.1, maxVal + yRange * 0.1])
      .range([H - PAD_Y, PAD_Y])
      .clamp(true);

    const lineGen = line()
      .x((d) => xScale(d.i))
      .y((d) => yScale(d.v))
      .curve(curveMonotoneX);

    pathD = lineGen(nonNullIndexed);

    const lastPoint = nonNullIndexed[nonNullIndexed.length - 1];
    dotX = xScale(lastPoint.i);
    dotY = yScale(lastPoint.v);
  }

  const yoyDisplay = yoy != null
    ? `${yoy >= 0 ? '+' : ''}${Math.round(yoy)}٪`
    : null;

  return (
    <Tooltip label={tooltipLabel} withArrow position="top">
      <td style={{ width: 96, textAlign: 'center', whiteSpace: 'nowrap', padding: '4px 6px' }}>
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          style={{ display: 'block', margin: '0 auto' }}
        >
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {dotX != null && (
            <circle cx={dotX} cy={dotY} r={2} fill={color} />
          )}
        </svg>
        {yoyDisplay && (
          <span
            style={{
              fontSize: 10,
              color,
              fontVariantNumeric: 'tabular-nums',
              display: 'block',
              lineHeight: 1,
              marginTop: 2,
            }}
          >
            {yoyDisplay}
          </span>
        )}
      </td>
    </Tooltip>
  );
}
