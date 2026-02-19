import { useReducedMotion } from '@mantine/hooks';
import rallyColors from '../../../theme/rallyColors';
import { toPersianNum } from '../../../utils/formatUtils';
import { catmullRom } from '../../../utils/chartUtils';
import {
  TEPIX, VOLUME, STATS, TABS, STOCKS, TIME_LABELS, CHART, GRID_LEVELS,
} from '../../../constants/heroVisualData';

/* ── Font stacks ─────────────────────────────────────────────── */
const FA_FONT = "'PELAK', sans-serif";           // Persian labels
const NUM_FONT = "'PELAK', 'Poppins', monospace"; // Numbers (Persian digits need PELAK)
const EN_FONT = "monospace";                      // Pure English (TSETMC, LIVE)

/* ── Chart coordinate system ─────────────────────────────────── */
const { CX0, CX1, CY0, CY1, VOL_TOP, VOL_BOTTOM } = CHART;

const dMin  = Math.min(...TEPIX);
const dMax  = Math.max(...TEPIX);
const dRng  = dMax - dMin;
const STEP  = (CX1 - CX0) / (TEPIX.length - 1);

const pricePts = TEPIX.map((v, i) => [
  CX0 + i * STEP,
  CY0 - ((v - dMin) / dRng) * (CY0 - CY1),
]);

const linePath = catmullRom(pricePts);
const lastPt   = pricePts[pricePts.length - 1];
const areaPath = `${linePath} L${lastPt[0].toFixed(2)},${CY0} L${CX0},${CY0} Z`;

/* Grid lines mapped to real values */
const GRID_Y = GRID_LEVELS.map(v => CY0 - ((v - dMin) / dRng) * (CY0 - CY1));

/* ══ Component ═══════════════════════════════════════════════════ */

export default function HeroVisual() {
  const reducedMotion = useReducedMotion();

  return (
    <div className="landing-hero-glow" style={{ maxWidth: 'clamp(280px, 90vw, 680px)', margin: '0 auto' }}>
      <svg
        viewBox="0 0 660 310"
        style={{ width: '100%', display: 'block', borderRadius: 16 }}
        aria-hidden="true"
      >
        <defs>
          {/* Area fill gradient */}
          <linearGradient id="hv-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#10B981" stopOpacity="0.26" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0"    />
          </linearGradient>

          {/* Bottom page-blend fade */}
          <linearGradient id="hv-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#000" stopOpacity="0"    />
            <stop offset="100%" stopColor="#000" stopOpacity="0.97" />
          </linearGradient>

          {/* Card top inner highlight */}
          <linearGradient id="hv-shine" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.06)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)"    />
          </linearGradient>

          {/* Side panel separator */}
          <linearGradient id="hv-sep" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="rgba(16,185,129,0.22)" />
            <stop offset="50%"  stopColor="rgba(16,185,129,0.08)" />
            <stop offset="100%" stopColor="rgba(16,185,129,0.22)" />
          </linearGradient>

          {/* Glow filter — chart line + live dot */}
          <filter id="hv-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Ambient card shadow glow */}
          <filter id="hv-card-glow" x="-8%" y="-8%" width="116%" height="124%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" />
          </filter>

          {/* Chart clip — keeps area/line/volume within bounds */}
          <clipPath id="hv-chart-clip">
            <rect x="9" y="94" width="450" height="207" />
          </clipPath>
        </defs>

        {/* ── Ambient card glow ──────────────────────────────────── */}
        <rect x="4" y="4" width="652" height="302" rx="18"
          fill="rgba(16,185,129,0.06)"
          filter="url(#hv-card-glow)"
        />

        {/* ── Card background ────────────────────────────────────── */}
        <rect x="0" y="0" width="660" height="310" rx="16"
          fill="rgba(13,18,26,0.97)"
          stroke="rgba(255,255,255,0.09)"
          strokeWidth="1"
        />

        {/* Top inner highlight */}
        <rect x="1" y="1" width="658" height="50" rx="15"
          fill="url(#hv-shine)"
        />

        {/* ── Window chrome ──────────────────────────────────────── */}
        <circle cx="20" cy="14" r="4.5" fill="rgba(239,68,68,0.70)"  />
        <circle cx="34" cy="14" r="4.5" fill="rgba(245,158,11,0.70)" />
        <circle cx="48" cy="14" r="4.5" fill="rgba(16,185,129,0.70)" />

        <text x="649" y="18" textAnchor="end"
          fill="rgba(148,163,184,0.38)"
          fontSize="9" fontFamily={EN_FONT} letterSpacing="0.5">
          TSETMC
        </text>

        {/* LIVE indicator */}
        <circle cx="601" cy="14" r={4} fill="rgba(16,185,129,0.20)">
          {!reducedMotion && <>
            <animate attributeName="r"       values="4;9;4"     dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;0;0.7" dur="2.4s" repeatCount="indefinite" />
          </>}
        </circle>
        <circle cx="601" cy="14" r="3.5" fill="#10B981" filter="url(#hv-glow)" />
        <text x="609" y="18"
          fill="rgba(16,185,129,0.78)"
          fontSize="8.5" fontFamily={EN_FONT} letterSpacing="1">
          LIVE
        </text>

        {/* ── Tab bar ────────────────────────────────────────────── */}
        <rect x="0" y="24" width="660" height="1" fill="rgba(255,255,255,0.04)" />

        {TABS.map((tab, i) => {
          const active = i === 0;
          const tx = 16 + i * 110;
          return (
            <g key={tab}>
              <text
                x={tx + 40} y="39"
                textAnchor="middle"
                fill={active ? '#10B981' : 'rgba(148,163,184,0.36)'}
                fontSize="8.5"
                fontFamily={FA_FONT}
                fontWeight={active ? '600' : '400'}
              >
                {tab}
              </text>
              {active && (
                <rect x={tx} y="44" width="80" height="1.5" rx="0.75" fill="#10B981" />
              )}
            </g>
          );
        })}

        <rect x="0" y="46" width="660" height="1" fill="rgba(255,255,255,0.04)" />

        {/* ── Stat pills ─────────────────────────────────────────── */}
        {STATS.map((s, i) => {
          const pw = 207;
          const x  = 8 + i * (pw + 8);
          return (
            <g key={s.label}>
              <rect x={x} y="52" width={pw} height="38" rx="8"
                fill="rgba(255,255,255,0.04)"
                stroke="rgba(255,255,255,0.07)"
                strokeWidth="0.75"
              />
              <text x={x + 10} y="66"
                fill="rgba(148,163,184,0.55)"
                fontSize="7.5" fontFamily={FA_FONT}>
                {s.label}
              </text>
              <text x={x + 10} y="81"
                fill="#F1F5F9"
                fontSize="11.5" fontWeight="700" fontFamily={NUM_FONT}>
                {s.value}
              </text>
              {/* Delta badge */}
              <rect x={x + pw - 54} y="67" width="46" height="15" rx="4"
                fill={s.up ? 'rgba(16,185,129,0.14)' : 'rgba(239,68,68,0.14)'}
              />
              <text x={x + pw - 31} y="77.5"
                textAnchor="middle"
                fill={s.up ? '#10B981' : '#EF4444'}
                fontSize="7.5" fontFamily={NUM_FONT} fontWeight="600">
                {s.delta}
              </text>
            </g>
          );
        })}

        {/* ── Chart container ────────────────────────────────────── */}
        <rect x="8" y="94" width="452" height="208" rx="8"
          fill="rgba(0,0,0,0.25)"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="0.5"
        />

        {/* Horizontal grid lines + Y labels */}
        {GRID_LEVELS.map((level, i) => (
          <g key={level}>
            <line x1={CX0} y1={GRID_Y[i]} x2={CX1} y2={GRID_Y[i]}
              stroke="rgba(148,163,184,0.07)"
              strokeWidth="1"
              strokeDasharray="3,4"
            />
            <text x={CX0 - 4} y={GRID_Y[i] + 3}
              textAnchor="end"
              fill="rgba(148,163,184,0.28)"
              fontSize="6.5" fontFamily={NUM_FONT}>
              {toPersianNum((level / 1000).toFixed(0))}K
            </text>
          </g>
        ))}

        {/* X-axis time labels */}
        {TIME_LABELS.map((label, i) => {
          const x = CX0 + (i / (TIME_LABELS.length - 1)) * (CX1 - CX0);
          return (
            <text key={label}
              x={x} y={VOL_BOTTOM + 10}
              textAnchor="middle"
              fill="rgba(148,163,184,0.28)"
              fontSize="6.5" fontFamily={FA_FONT}>
              {label}
            </text>
          );
        })}

        {/* Area fill (clipped) */}
        <g clipPath="url(#hv-chart-clip)">
          <path d={areaPath} fill="url(#hv-fill)" className="landing-chart-area" />
        </g>

        {/* Line with draw-in animation and glow (clipped) */}
        <g clipPath="url(#hv-chart-clip)">
          <path
            d={linePath}
            fill="none"
            stroke="#10B981"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#hv-glow)"
            className="landing-chart-line"
          />
        </g>

        {/* Volume bars (clipped) */}
        <g clipPath="url(#hv-chart-clip)">
          {VOLUME.map((v, i) => {
            const bx   = CX0 + i * STEP;
            const bh   = (v / 100) * (VOL_BOTTOM - VOL_TOP);
            const by   = VOL_BOTTOM - bh;
            const isUp = i === 0 || TEPIX[i] >= TEPIX[i - 1];
            return (
              <rect key={i}
                x={bx - 4} y={by}
                width="8" height={bh}
                rx="1.5"
                fill={isUp ? 'rgba(16,185,129,0.42)' : 'rgba(239,68,68,0.34)'}
              />
            );
          })}
        </g>

        {/* Live pulse dot at last price */}
        <circle cx={lastPt[0]} cy={lastPt[1]} r="5" fill="rgba(16,185,129,0.15)">
          {!reducedMotion && <>
            <animate attributeName="r"       values="5;10;5"    dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;0;0.7" dur="2s" repeatCount="indefinite" />
          </>}
        </circle>
        <circle cx={lastPt[0]} cy={lastPt[1]} r="3.5" fill="#10B981" filter="url(#hv-glow)" />
        <circle cx={lastPt[0]} cy={lastPt[1]} r="1.5" fill="#fff" />

        {/* ── Side panel separator ───────────────────────────────── */}
        <line x1="464" y1="94" x2="464" y2="302"
          stroke="url(#hv-sep)" strokeWidth="1" />

        {/* Panel header */}
        <text x="474" y="110"
          fill="rgba(148,163,184,0.50)"
          fontSize="7.5" fontFamily={FA_FONT} fontWeight="600" letterSpacing="0.3">
          بازار امروز
        </text>
        <line x1="468" y1="114" x2="652" y2="114"
          stroke="rgba(255,255,255,0.05)" strokeWidth="0.75" />

        {/* Stock rows */}
        {STOCKS.map((s, i) => {
          const sy      = 122 + i * 46;
          const barMaxH = 16;
          const barBot  = sy + 34;
          return (
            <g key={s.name}>
              {/* Highlight first row */}
              {i === 0 && (
                <rect x="466" y={sy - 4} width="188" height="40" rx="6"
                  fill="rgba(16,185,129,0.06)"
                  stroke="rgba(16,185,129,0.12)"
                  strokeWidth="0.5"
                />
              )}

              {/* Mini 3-bar sparkline */}
              {s.bars.map((h, bi) => {
                const bh   = Math.round(h * barMaxH);
                const fill = s.up
                  ? bi === 2
                    ? '#10B981'
                    : `rgba(16,185,129,${0.30 + bi * 0.20})`
                  : bi === 0
                    ? '#EF4444'
                    : `rgba(239,68,68,${0.30 + (2 - bi) * 0.20})`;
                return (
                  <rect key={bi}
                    x={472 + bi * 10} y={barBot - bh}
                    width="8" height={bh}
                    rx="2" fill={fill}
                  />
                );
              })}

              {/* Name */}
              <text x="510" y={sy + 12}
                fill="#F1F5F9"
                fontSize="9.5" fontFamily={FA_FONT} fontWeight="700">
                {s.name}
              </text>

              {/* Price */}
              <text x="510" y={sy + 26}
                fill="rgba(148,163,184,0.52)"
                fontSize="8" fontFamily={NUM_FONT}>
                {s.price}
              </text>

              {/* % badge */}
              <rect x="612" y={sy + 6} width="40" height="17" rx="5"
                fill={s.up ? 'rgba(16,185,129,0.14)' : 'rgba(239,68,68,0.14)'}
              />
              <text x="632" y={sy + 17.5}
                textAnchor="middle"
                fill={s.up ? '#10B981' : '#EF4444'}
                fontSize="7.5" fontFamily={NUM_FONT} fontWeight="600">
                {s.pct}
              </text>
            </g>
          );
        })}

        {/* ── Bottom fade ────────────────────────────────────────── */}
        <rect x="0" y="248" width="660" height="62" fill="url(#hv-fade)" />
      </svg>
    </div>
  );
}
