import rallyColors from '../../theme/rallyColors';

/* Chart data — same 20 values as old MOCK_BARS, normalized to SVG Y coords */
const DATA = [40, 55, 35, 65, 50, 70, 45, 60, 75, 50, 65, 80, 55, 70, 60, 85, 65, 75, 90, 70];

/* Convert bar % values → SVG path for area chart */
const chartY0 = 245; // baseline Y
const chartY1 = 145; // top Y
const chartX0 = 20;
const chartX1 = 600;
const step = (chartX1 - chartX0) / (DATA.length - 1);

const points = DATA.map((v, i) => {
  const x = chartX0 + i * step;
  const y = chartY0 - ((v / 100) * (chartY0 - chartY1));
  return [x, y];
});

/* Smooth curve via catmull-rom → cubic bezier */
function catmullRomToBezier(pts) {
  const d = [`M${pts[0][0]},${pts[0][1]}`];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d.push(`C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`);
  }
  return d.join(' ');
}

const linePath = catmullRomToBezier(points);
const areaPath = `${linePath} L${points[points.length - 1][0]},${chartY0} L${points[0][0]},${chartY0} Z`;

const STAT_PILLS = [
  { label: '\u0634\u0627\u062E\u0635 \u06A9\u0644', value: '\u06F2\u066C\u06F4\u06F5\u06F6\u066C\u06F0\u06F0\u06F0', up: true },
  { label: '\u0627\u0631\u0632\u0634 \u0645\u0639\u0627\u0645\u0644\u0627\u062A', value: '\u06F8\u066C\u06F5\u06F0\u06F0 B', up: true },
  { label: '\u062D\u062C\u0645', value: '\u06F1.\u06F2M', up: false },
];

export default function HeroVisual() {
  return (
    <div className="landing-hero-glow" style={{ maxWidth: 620, margin: '0 auto' }}>
      <svg
        viewBox="0 0 620 260"
        style={{
          width: '100%',
          display: 'block',
          borderRadius: 20,
          overflow: 'visible',
        }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={rallyColors.green} stopOpacity="0.3" />
            <stop offset="100%" stopColor={rallyColors.green} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="hero-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={rallyColors.bg} stopOpacity="0" />
            <stop offset="100%" stopColor={rallyColors.bg} stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Card background */}
        <rect
          x="0" y="0" width="620" height="260" rx="14"
          fill={rallyColors.glassBg}
          stroke={rallyColors.glassBorder}
          strokeWidth="1"
        />

        {/* Window chrome dots */}
        <circle cx="18" cy="14" r="4" fill="rgba(239,68,68,0.6)" />
        <circle cx="30" cy="14" r="4" fill="rgba(245,158,11,0.6)" />
        <circle cx="42" cy="14" r="4" fill="rgba(16,185,129,0.6)" />
        <text
          x="600" y="16"
          textAnchor="end"
          fill={rallyColors.textDimmed}
          fontSize="9"
          fontFamily="monospace"
        >
          TSETMC Dashboard
        </text>

        {/* Stat pills */}
        {STAT_PILLS.map((s, i) => {
          const x = 12 + i * 200;
          return (
            <g key={s.label}>
              <rect
                x={x} y="28" width="192" height="40" rx="8"
                fill={rallyColors.card}
                stroke={rallyColors.glassBorder}
                strokeWidth="0.5"
              />
              <text
                x={x + 96} y="44"
                textAnchor="middle"
                fill={rallyColors.textDimmed}
                fontSize="8"
                fontFamily="PELAK, sans-serif"
              >
                {s.label}
              </text>
              <text
                x={x + 96} y="59"
                textAnchor="middle"
                fill={rallyColors.textPrimary}
                fontSize="11"
                fontWeight="700"
                fontFamily="monospace"
              >
                {s.value}
              </text>
              <text
                x={x + 160} y="59"
                fill={s.up ? rallyColors.green : rallyColors.red}
                fontSize="9"
                fontFamily="monospace"
              >
                {s.up ? '\u25B2' : '\u25BC'}
              </text>
            </g>
          );
        })}

        {/* Chart area */}
        <rect
          x="8" y="76" width="604" height="176" rx="8"
          fill={rallyColors.card}
          stroke={rallyColors.glassBorder}
          strokeWidth="0.5"
        />

        {/* Area fill */}
        <path
          d={areaPath}
          fill="url(#chart-fill)"
          className="landing-chart-area"
        />

        {/* Line stroke with draw-in animation */}
        <path
          d={linePath}
          fill="none"
          stroke={rallyColors.green}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="landing-chart-line"
        />

        {/* Bottom fade */}
        <rect x="0" y="228" width="620" height="32" rx="0" fill="url(#hero-fade)" />
        {/* Bottom border radius mask */}
        <rect
          x="0" y="246" width="620" height="14" rx="14"
          fill={rallyColors.bg}
        />
      </svg>
    </div>
  );
}
