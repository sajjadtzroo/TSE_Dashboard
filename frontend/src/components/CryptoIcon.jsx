import React from 'react';

/**
 * Crypto coin icon component — renders branded SVG logos for 30 tracked coins.
 * Uses inline SVG paths from cryptocurrency-icons project (CC0).
 * Features: radial gradient backgrounds, inner shadow, subtle glow ring.
 * Falls back to a styled letter icon for unknown symbols.
 *
 * Props:
 *   symbol  - coin ticker (e.g. "BTC", "ETH")
 *   size    - icon size in px (default 24)
 *   style   - additional inline styles
 */

// Brand colors per coin
const COIN_COLORS = {
  BTC: '#F7931A',
  ETH: '#627EEA',
  BNB: '#F3BA2F',
  SOL: '#9945FF',
  XRP: '#23292F',
  ADA: '#0033AD',
  DOGE: '#C3A634',
  AVAX: '#E84142',
  DOT: '#E6007A',
  MATIC: '#8247E5',
  LINK: '#2A5ADA',
  SHIB: '#FFA409',
  UNI: '#FF007A',
  LTC: '#345D9D',
  ATOM: '#2E3148',
  XLM: '#14B6E7',
  NEAR: '#00C1DE',
  FIL: '#0090FF',
  APT: '#4DD6A5',
  ARB: '#28A0F0',
  OP: '#FF0420',
  IMX: '#00BFFF',
  INJ: '#00F2FE',
  SUI: '#6FBCF0',
  SEI: '#9B1C1C',
  TIA: '#7B2FF2',
  RENDER: '#000000',
  FET: '#1D2951',
  WLD: '#000000',
  PEPE: '#3C8C2F',
};

// SVG path data for each coin (viewBox 0 0 32 32)
const COIN_PATHS = {
  BTC: (
    <g fill="#fff">
      <path d="M22.5 14.2c.3-2.1-1.3-3.2-3.4-3.9l.7-2.8-1.7-.4-.7 2.8c-.4-.1-.9-.2-1.4-.3l.7-2.8-1.7-.4-.7 2.8c-.4-.1-.7-.2-1-.2l-2.4-.6-.5 1.8s1.3.3 1.2.3c.7.2.8.6.8 1l-.8 3.3c0 .1.1.1.1.1h-.1l-1.2 4.7c-.1.2-.3.6-.8.4 0 0-1.2-.3-1.2-.3l-.8 2 2.2.5 1.2.3-.7 2.9 1.7.4.7-2.8c.5.1.9.2 1.4.3l-.7 2.8 1.7.4.7-2.9c3 .6 5.3.3 6.2-2.4.8-2.1 0-3.4-1.6-4.2 1.1-.3 2-1 2.2-2.6zm-4 5.5c-.5 2.1-4.2 1-5.4.7l1-3.9c1.2.3 5 .9 4.4 3.2zm.6-5.6c-.5 1.9-3.5.9-4.5.7l.9-3.5c1 .2 4.2.7 3.6 2.8z" />
    </g>
  ),
  ETH: (
    <g fill="#fff">
      <path d="M16 4l-8 12.8L16 21l8-4.2L16 4z" opacity=".6" />
      <path d="M8 16.8L16 28l8-11.2L16 21l-8-4.2z" />
    </g>
  ),
  BNB: (
    <g fill="#fff">
      <path d="M16 5l-2.5 2.5L16 10l2.5-2.5L16 5zm-6 6L7.5 13.5 10 16l2.5-2.5L10 11zm12 0l-2.5 2.5L22 16l2.5-2.5L22 11zM16 15l-2.5 2.5L16 20l2.5-2.5L16 15zm-6 6l-2.5 2.5L10 26l2.5-2.5L10 21zm12 0l-2.5 2.5L22 26l2.5-2.5L22 21z" />
    </g>
  ),
  SOL: (
    <g fill="#fff">
      <path d="M8 22l2.5-2.5h13L21 22H8z" />
      <path d="M8 16l2.5-2.5h13L21 16H8z" opacity=".7" />
      <path d="M21 10l-2.5-2.5H5.5L8 10h13z" opacity=".5" />
    </g>
  ),
  XRP: (
    <g fill="#fff">
      <path d="M11.5 9h2.2l4.3 4.3L22.3 9h2.2l-5.4 5.4v.1l5.4 5.5h-2.2L18 15.7 13.7 20h-2.2l5.4-5.5v-.1L11.5 9z" />
    </g>
  ),
  ADA: (
    <g fill="#fff">
      <circle cx="16" cy="16" r="3" />
      <circle cx="16" cy="7.5" r="1.4" />
      <circle cx="16" cy="24.5" r="1.4" />
      <circle cx="9" cy="12" r="1.4" />
      <circle cx="23" cy="12" r="1.4" />
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="23" cy="20" r="1.4" />
      <circle cx="11" cy="16" r="0.8" opacity="0.5" />
      <circle cx="21" cy="16" r="0.8" opacity="0.5" />
    </g>
  ),
  DOGE: (
    <g fill="#fff">
      <path d="M13 10h4.5c3.6 0 5.5 2.4 5.5 6s-1.9 6-5.5 6H13V10zm2.5 2.3v7.4h2c2.2 0 3-1.7 3-3.7s-.8-3.7-3-3.7h-2z" />
    </g>
  ),
  AVAX: (
    <g fill="#fff">
      <path d="M11.2 22h-3l7.8-14 3.5 6.3-2.5 1.4-1-1.8L11.2 22zm13.6 0H19l-1.5-2.6 2.5-1.4L21.5 20h3.3z" />
    </g>
  ),
  DOT: (
    <g>
      <circle cx="16" cy="8.5" r="3.5" fill="#fff" />
      <circle cx="16" cy="23.5" r="3.5" fill="#fff" />
      <ellipse cx="16" cy="16" rx="6" ry="3.2" fill="none" stroke="#fff" strokeWidth="2.5" />
    </g>
  ),
  MATIC: (
    <g fill="#fff">
      <path d="M20.5 13l-3.5-2-3.5 2v4l3.5 2 3.5-2v-4zm-3.5 7.5L12.5 18v-4L7 17v4l5.5 3 4.5-2.5V18zm0-9L12.5 14v-4L17 7l4.5 2.5V14l-4.5 2.5z" />
    </g>
  ),
  LINK: (
    <g fill="#fff">
      <path d="M16 6l-2.3 1.3-5.4 3.2L6 11.7v8.6l2.3 1.3 5.4 3.2L16 26l2.3-1.3 5.4-3.2 2.3-1.3v-8.6l-2.3-1.3-5.4-3.2L16 6zm0 3.2l4.6 2.7v5.3L16 19.9l-4.6-2.7v-5.3L16 9.2z" />
    </g>
  ),
  SHIB: (
    <g fill="#fff">
      <path d="M16 7c-1 0-4 1-5.5 3S9 14 9 16s1 4 2.5 5.5 3.5 2.5 4.5 2.5 2.5-1 4.5-2.5S23 18 23 16s-.5-4-2-6S17 7 16 7zm-2 7.5c.7 0 1.2.5 1.2 1.2S14.7 17 14 17s-1.2-.5-1.2-1.2.5-1.3 1.2-1.3zm4 0c.7 0 1.2.5 1.2 1.2S18.7 17 18 17s-1.2-.5-1.2-1.2.5-1.3 1.2-1.3zM13 20s1 1.5 3 1.5 3-1.5 3-1.5" fill="none" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
    </g>
  ),
  UNI: (
    <g fill="#fff">
      <path d="M13 10c0 0-1.5.5-1.5 3s2 4 2 6-1 3-1 3h7s-1-1-1-3 2-3.5 2-6-1.5-3-1.5-3" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="13.5" cy="13" r="1" />
    </g>
  ),
  LTC: (
    <g fill="#fff">
      <path d="M14.5 10l-3.5 12h9l.5-2h-6l2-6.5 2.5-1-.5 1.5h2l1-3-2.5 1L20 10h-5.5z" />
    </g>
  ),
  ATOM: (
    <g fill="#fff">
      <circle cx="16" cy="16" r="2.8" />
      <ellipse cx="16" cy="16" rx="9" ry="3.5" fill="none" stroke="#fff" strokeWidth="1.5" />
      <ellipse cx="16" cy="16" rx="9" ry="3.5" fill="none" stroke="#fff" strokeWidth="1.5" transform="rotate(60 16 16)" />
      <ellipse cx="16" cy="16" rx="9" ry="3.5" fill="none" stroke="#fff" strokeWidth="1.5" transform="rotate(120 16 16)" />
    </g>
  ),
  XLM: (
    <g fill="#fff">
      <path d="M9 11.5l14 7v2.5l-14-7V11.5zm0 4v2.5l14-7V8.5l-14 7z" />
    </g>
  ),
  NEAR: (
    <g fill="#fff">
      <path d="M10 22V10l5 7V10l7 12V10l-5-7v12L10 22z" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  FIL: (
    <g fill="#fff">
      <path d="M16 6v20M12 11l8 2M12 19l8 2M12 15l8-2M12 23l8-2" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
    </g>
  ),
  APT: (
    <g fill="#fff">
      <path d="M16 8l-7 8h5v8l7-8h-5V8z" />
    </g>
  ),
  ARB: (
    <g fill="#fff">
      <path d="M10 20l6-12 6 12h-3l-3-6-3 6h-3z" />
      <path d="M16 12v4" stroke="#28A0F0" strokeWidth="1.5" />
    </g>
  ),
  OP: (
    <g fill="#fff">
      <circle cx="13" cy="16" r="4" fill="none" stroke="#fff" strokeWidth="2" />
      <path d="M20 12v8" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <path d="M20 12h3c1.5 0 2.5 1 2.5 2.5S24.5 17 23 17h-3" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </g>
  ),
  IMX: (
    <g fill="#fff">
      <path d="M8 10h3l5 6 5-6h3v12h-3v-7l-5 6-5-6v7H8V10z" />
    </g>
  ),
  INJ: (
    <g fill="#fff">
      <path d="M16 7c-5 0-9 4-9 9s4 9 9 9 9-4 9-9-4-9-9-9zm0 2c3.9 0 7 3.1 7 7s-3.1 7-7 7-7-3.1-7-7 3.1-7 7-7z" />
      <path d="M16 12v8M12 16h8" strokeWidth="1.5" stroke="#fff" strokeLinecap="round" />
    </g>
  ),
  SUI: (
    <g fill="#fff">
      <path d="M16 7c-5 0-8 4-8 9s3 9 8 9 8-4 8-9-3-9-8-9zm0 4c1.5 0 2.5 1 2.5 2.5S17.5 16 16 16s-2.5-1-2.5-2.5S14.5 11 16 11zm-3 8c.5-1.5 1.5-2 3-2s2.5.5 3 2" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
    </g>
  ),
  SEI: (
    <g fill="#fff">
      <path d="M16 7c-2 0-4 1.5-4 3.5 0 3 4 4.5 4 7.5 0 2-2 3.5-4 3.5M16 7c2 0 4 1.5 4 3.5 0 3-4 4.5-4 7.5 0 2 2 3.5 4 3.5" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    </g>
  ),
  TIA: (
    <g fill="#fff">
      <circle cx="16" cy="10" r="2" />
      <circle cx="11" cy="18" r="2" />
      <circle cx="21" cy="18" r="2" />
      <circle cx="16" cy="22" r="2" />
      <path d="M16 12v6M13 17l-2 1M19 17l2 1M14 21l-1-1M18 21l1-1" stroke="#fff" strokeWidth="1" />
    </g>
  ),
  RENDER: (
    <g fill="#fff">
      <circle cx="12" cy="12" r="2.5" fill="none" stroke="#fff" strokeWidth="1.5" />
      <circle cx="20" cy="12" r="2.5" fill="none" stroke="#fff" strokeWidth="1.5" />
      <circle cx="12" cy="20" r="2.5" fill="none" stroke="#fff" strokeWidth="1.5" />
      <circle cx="20" cy="20" r="2.5" fill="none" stroke="#fff" strokeWidth="1.5" />
      <path d="M14.5 12h3M14.5 20h3M12 14.5v3M20 14.5v3" stroke="#fff" strokeWidth="1" />
    </g>
  ),
  FET: (
    <g fill="#fff">
      <path d="M16 7l-8 5v8l8 5 8-5v-8l-8-5zm0 3l5 3v6l-5 3-5-3v-6l5-3z" />
    </g>
  ),
  WLD: (
    <g fill="#fff">
      <circle cx="16" cy="16" r="8" fill="none" stroke="#fff" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="4" fill="none" stroke="#fff" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="1.5" />
    </g>
  ),
  PEPE: (
    <g fill="#fff">
      <ellipse cx="16" cy="16" rx="8" ry="7" fill="none" stroke="#fff" strokeWidth="1.5" />
      <circle cx="13" cy="14" r="1.5" />
      <circle cx="19" cy="14" r="1.5" />
      <path d="M12 19c1 1.5 3 2.5 4 2.5s3-1 4-2.5" fill="none" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
    </g>
  ),
};

/**
 * Generate a deterministic color from a string (for unknown coins).
 */
function hashColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 55%, 55%)`;
}

/**
 * Darken a hex color by a percentage (0-1).
 */
function darkenHex(hex, amount = 0.4) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, ((num >> 16) & 0xff) * (1 - amount)) | 0;
  const g = Math.max(0, ((num >> 8) & 0xff) * (1 - amount)) | 0;
  const b = Math.max(0, (num & 0xff) * (1 - amount)) | 0;
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// Unique IDs counter for SSR-safe gradient/filter IDs
let _idCounter = 0;

function CryptoIcon({ symbol, size = 24, style }) {
  const sym = (symbol || '').toUpperCase();
  const bgColor = COIN_COLORS[sym] || hashColor(sym);
  const paths = COIN_PATHS[sym];
  const darkBg = darkenHex(bgColor.startsWith('hsl') ? '#555555' : bgColor, 0.5);

  // Unique IDs per instance to avoid SVG filter collisions
  const id = `ci-${sym}-${++_idCounter}`;
  const gradId = `${id}-grad`;
  const shadowId = `${id}-shd`;
  const glowId = `${id}-glow`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, borderRadius: '50%', ...style }}
    >
      <defs>
        {/* Radial gradient: brand color center → darker edge */}
        <radialGradient id={gradId} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor={bgColor} />
          <stop offset="100%" stopColor={darkBg} />
        </radialGradient>
        {/* Inner shadow filter */}
        <filter id={shadowId} x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000" floodOpacity="0.35" />
        </filter>
        {/* Outer glow filter */}
        <filter id={glowId} x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" />
        </filter>
      </defs>

      {/* Outer glow ring */}
      <circle cx="16" cy="16" r="15.5" fill="none" stroke={bgColor} strokeWidth="0.8" opacity="0.12" filter={`url(#${glowId})`} />

      {/* Main background circle with gradient + shadow */}
      <circle cx="16" cy="16" r="15" fill={`url(#${gradId})`} filter={`url(#${shadowId})`} />

      {/* Subtle highlight arc at top */}
      <circle cx="16" cy="16" r="14" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

      {paths || (
        // Fallback: first letter of symbol
        <text
          x="16"
          y="16"
          textAnchor="middle"
          dominantBaseline="central"
          fill="#fff"
          fontSize="14"
          fontWeight="700"
          fontFamily="system-ui, sans-serif"
        >
          {sym.charAt(0)}
        </text>
      )}
    </svg>
  );
}

export default React.memo(CryptoIcon);

/**
 * Get the brand color for a coin symbol.
 */
export function getCoinColor(symbol) {
  return COIN_COLORS[(symbol || '').toUpperCase()] || hashColor(symbol || '');
}
