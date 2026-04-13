/**
 * Purpose-built financial KPI SVG icons — dual-tone design with 2px strokes
 * and filled accent shapes for visual weight on dark backgrounds.
 *
 * Each icon: 24×24 viewBox, accepts `size` and `color` props.
 */

const defaults = { size: 24, color: 'currentColor' };

/** Bar chart with upward trend overlay — Total market cap */
export function MarketCapIcon({ size = defaults.size, color = defaults.color, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" {...props}>
      <rect x="3" y="14" width="3" height="6" rx="0.5" fill={color} opacity="0.25" />
      <rect x="8" y="10" width="3" height="10" rx="0.5" fill={color} opacity="0.25" />
      <rect x="13" y="7" width="3" height="13" rx="0.5" fill={color} opacity="0.25" />
      <rect x="18" y="4" width="3" height="16" rx="0.5" fill={color} opacity="0.25" />
      <polyline points="3,13 8,9 13,6 21,3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="21" cy="3" r="1.5" fill={color} />
    </svg>
  );
}

/** Sound wave bars — Trading volume */
export function VolumeIcon({ size = defaults.size, color = defaults.color, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" {...props}>
      <rect x="2" y="13" width="2.5" height="5" rx="1" fill={color} opacity="0.3" />
      <rect x="6.5" y="10" width="2.5" height="8" rx="1" fill={color} opacity="0.5" />
      <rect x="11" y="6" width="2.5" height="12" rx="1" fill={color} opacity="0.7" />
      <rect x="15.5" y="4" width="2.5" height="14" rx="1" fill={color} opacity="0.85" />
      <rect x="20" y="2" width="2.5" height="16" rx="1" fill={color} />
      <line x1="1" y1="20" x2="23" y2="20" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
    </svg>
  );
}

/** Crown with filled accent — BTC dominance */
export function DominanceIcon({ size = defaults.size, color = defaults.color, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" {...props}>
      <path d="M4 17L2 8l5 4 5-6 5 6 5-4-2 9H4z" fill={color} opacity="0.2" />
      <path d="M4 17L2 8l5 4 5-6 5 6 5-4-2 9H4z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <rect x="4" y="18" width="16" height="2" rx="0.5" fill={color} />
      <circle cx="12" cy="11" r="1.5" fill={color} />
    </svg>
  );
}

/** Gauge/speedometer — Fear & Greed index */
export function FearGreedIcon({ size = defaults.size, color = defaults.color, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" {...props}>
      <path d="M4 16a8 8 0 1 1 16 0" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M6 16a6 6 0 0 1 12 0" fill={color} opacity="0.15" />
      <line x1="12" y1="16" x2="16" y2="10" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="12" cy="16" r="2" fill={color} />
      <circle cx="6" cy="16" r="1" fill={color} opacity="0.4" />
      <circle cx="18" cy="16" r="1" fill={color} opacity="0.4" />
      <circle cx="12" cy="8" r="1" fill={color} opacity="0.4" />
    </svg>
  );
}

/** Rocket with sparkle — Top gainer */
export function GainerIcon({ size = defaults.size, color = defaults.color, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" {...props}>
      <path d="M12 2C12 2 8 8 8 14l4-2 4 2c0-6-4-12-4-12z" fill={color} opacity="0.2" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <path d="M8 14l-2 4 4-1" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 14l2 4-4-1" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 22v-5" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <circle cx="19" cy="5" r="1" fill={color} />
      <line x1="19" y1="3" x2="19" y2="2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="21" y1="5" x2="22" y2="5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Bold down-arrow with warning dot — Top loser */
export function LoserIcon({ size = defaults.size, color = defaults.color, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" {...props}>
      <path d="M12 3v14" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M7 13l5 5 5-5" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 3h12" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <circle cx="19" cy="19" r="2.5" fill={color} opacity="0.3" />
      <circle cx="19" cy="19" r="1.5" fill={color} />
    </svg>
  );
}

/** Building columns with accent roof — Total securities */
export function BankIcon({ size = defaults.size, color = defaults.color, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" {...props}>
      <path d="M3 9l9-5 9 5" fill={color} opacity="0.2" />
      <path d="M3 9l9-5 9 5" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <rect x="5" y="10" width="2" height="8" fill={color} opacity="0.5" />
      <rect x="9" y="10" width="2" height="8" fill={color} opacity="0.5" />
      <rect x="13" y="10" width="2" height="8" fill={color} opacity="0.5" />
      <rect x="17" y="10" width="2" height="8" fill={color} opacity="0.5" />
      <rect x="3" y="18" width="18" height="2" rx="0.5" fill={color} />
      <circle cx="12" cy="7" r="1" fill={color} />
    </svg>
  );
}

/** Pulse/heartbeat line — Active today */
export function ActiveIcon({ size = defaults.size, color = defaults.color, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" {...props}>
      <path d="M2 13h4l2-6 3 12 3-9 2 3h6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="20" cy="13" r="2" fill={color} opacity="0.3" />
      <circle cx="20" cy="13" r="1" fill={color} />
    </svg>
  );
}

/** Stacked coins — Total value */
export function ValueIcon({ size = defaults.size, color = defaults.color, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" {...props}>
      <ellipse cx="12" cy="18" rx="8" ry="3" fill={color} opacity="0.15" />
      <ellipse cx="12" cy="18" rx="8" ry="3" stroke={color} strokeWidth="2" />
      <ellipse cx="12" cy="14" rx="8" ry="3" fill={color} opacity="0.2" />
      <ellipse cx="12" cy="14" rx="8" ry="3" stroke={color} strokeWidth="2" />
      <ellipse cx="12" cy="10" rx="8" ry="3" fill={color} opacity="0.25" />
      <ellipse cx="12" cy="10" rx="8" ry="3" stroke={color} strokeWidth="2" />
      <ellipse cx="12" cy="6" rx="8" ry="3" fill={color} opacity="0.3" stroke={color} strokeWidth="2" />
    </svg>
  );
}

/** Calendar with mini chart — Date/period */
export function CalendarIcon({ size = defaults.size, color = defaults.color, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" stroke={color} strokeWidth="2" fill={color} fillOpacity="0.1" />
      <path d="M3 9h18" stroke={color} strokeWidth="2" />
      <line x1="8" y1="3" x2="8" y2="6" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="3" x2="16" y2="6" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <polyline points="7,16 10,13 13,15 17,12" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Double arrow up+down — New highs/lows */
export function HighLowIcon({ size = defaults.size, color = defaults.color, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" {...props}>
      <path d="M8 4l-4 4h3v5H4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 4l4 4h-3v5h3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.35" />
      <path d="M16 20l4-4h-3v-5h3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 20l-4-4h3v-5h-3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.35" />
      <circle cx="8" cy="3" r="1" fill={color} />
      <circle cx="16" cy="21" r="1" fill={color} />
    </svg>
  );
}

/** Scale/balance — P/E ratio */
export function PERatioIcon({ size = defaults.size, color = defaults.color, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" {...props}>
      <line x1="12" y1="3" x2="12" y2="19" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="4" y1="7" x2="20" y2="7" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M4 7l-1 6h6l-1-6" stroke={color} strokeWidth="1.5" strokeLinejoin="round" fill={color} fillOpacity="0.2" />
      <path d="M16 7l-1 6h6l-1-6" stroke={color} strokeWidth="1.5" strokeLinejoin="round" fill={color} fillOpacity="0.2" />
      <path d="M3 13a3 3 0 0 0 6 0" stroke={color} strokeWidth="1.5" fill="none" />
      <path d="M15 13a3 3 0 0 0 6 0" stroke={color} strokeWidth="1.5" fill="none" />
      <rect x="9" y="19" width="6" height="2" rx="1" fill={color} opacity="0.4" />
      <circle cx="12" cy="4" r="1.5" fill={color} />
    </svg>
  );
}

/** Water droplet with fill level — Liquidity score */
export function LiquidityIcon({ size = defaults.size, color = defaults.color, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" {...props}>
      <path d="M12 2C12 2 6 10 6 15a6 6 0 0 0 12 0c0-5-6-13-6-13z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <path d="M6 15c0 3.3 2.7 6 6 6s6-2.7 6-6H6z" fill={color} opacity="0.25" />
      <line x1="7" y1="15" x2="17" y2="15" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2" />
      <path d="M10 18c0.5 0.5 1.2 0.8 2 0.8s1.5-0.3 2-0.8" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

/** Double-headed horizontal arrow — Bid-ask spread */
export function SpreadIcon({ size = defaults.size, color = defaults.color, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" {...props}>
      <rect x="8" y="8" width="8" height="8" rx="1" fill={color} opacity="0.15" />
      <line x1="3" y1="12" x2="21" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <polyline points="6,9 3,12 6,15" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="18,9 21,12 18,15" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="6" x2="12" y2="18" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2" opacity="0.55" />
    </svg>
  );
}

/** Zigzag lightning bolt — Volatility */
export function VolatilityIcon({ size = defaults.size, color = defaults.color, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" {...props}>
      <path d="M13 2L4 14h6l-2 8 11-12h-6l2-8z" fill={color} opacity="0.22" />
      <path d="M13 2L4 14h6l-2 8 11-12h-6l2-8z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
