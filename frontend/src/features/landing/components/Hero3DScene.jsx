import { useCallback, useEffect, useRef, useState } from 'react';
import { useMediaQuery, useReducedMotion } from '@mantine/hooks';
import { motion, useMotionValue, useTransform, useSpring } from 'motion/react';
import { AreaChart, Area, Tooltip, ResponsiveContainer, YAxis } from 'recharts';
import { formatNum, formatTrillion, formatPercent, toPersianNum } from '../../../utils/formatUtils';

/* ── Per-card glass styles ───────────────────────────────────────── */
const glassStyles = [
  { // Card 1 — Chart (foreground)
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.09)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderRadius: 20,
  },
  { // Card 2 — Pulse / Movers (tilted back)
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.07)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderRadius: 16,
  },
  { // Card 3 — LIVE badge pill
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.10)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderRadius: 40,
  },
  { // Card 4 — BTC
    background: 'rgba(255, 255, 255, 0.025)',
    border: '1px solid rgba(255, 255, 255, 0.065)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    borderRadius: 14,
  },
  { // Card 5 — ETH (furthest back)
    background: 'rgba(255, 255, 255, 0.018)',
    border: '1px solid rgba(255, 255, 255, 0.055)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: 12,
  },
];

/* ── Card configuration (3D transforms, hover targets, shadows) ─── */
const CARD_CONFIGS = [
  { // Card 1 — Chart (z:4, foreground)
    desktop: { rotateY: 8, rotateX: -3, z: 40 },
    mobile: { rotateY: 3, rotateX: -2, z: 20 },
    hover: { rotateY: 6, y: -10, scale: 1.035 },
    shadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(41,98,255,0.06)',
    hoverShadow: '0 28px 70px rgba(0, 0, 0, 0.55), 0 0 20px rgba(41,98,255,0.12)',
    delay: 0.15,
  },
  { // Card 2 — Pulse/Movers (z:2, tilted back)
    desktop: { rotateY: -12, rotateX: 5, z: -20 },
    mobile: { rotateY: -5, rotateX: 3, z: -10 },
    hover: { rotateY: -9, y: -7, scale: 1.025 },
    shadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
    hoverShadow: '0 16px 44px rgba(0, 0, 0, 0.4), 0 0 14px rgba(41,98,255,0.08)',
    delay: 0.35,
  },
  { // Card 3 — LIVE badge (z:5, closest)
    desktop: { rotateY: -5, rotateX: 0, z: 80 },
    mobile: { rotateY: -2, rotateX: 0, z: 40 },
    hover: { rotateY: -3, y: -6, scale: 1.06 },
    shadow: '0 12px 36px rgba(0, 0, 0, 0.4), 0 0 12px rgba(41,98,255,0.05)',
    hoverShadow: '0 18px 44px rgba(0, 0, 0, 0.45), 0 0 18px rgba(41,98,255,0.14)',
    delay: 0.7,
  },
  { // Card 4 — BTC (bottom-left, mid-depth)
    desktop: { rotateY: 9, rotateX: 6, z: -20 },
    mobile: { rotateY: 4, rotateX: 3, z: -10 },
    hover: { rotateY: 6, y: -12, scale: 1.04 },
    shadow: '0 10px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(247,147,26,0.07)',
    hoverShadow: '0 20px 52px rgba(0, 0, 0, 0.45), 0 0 22px rgba(247,147,26,0.16)',
    delay: 0.5,
  },
  { // Card 5 — ETH (bottom-right, mirrors ارزش معاملات lean)
    desktop: { rotateY: -8, rotateX: 6, z: -35 },
    mobile: { rotateY: 2, rotateX: 4, z: -22 },
    hover: { rotateY: -6, y: -10, scale: 1.035 },
    shadow: '0 6px 28px rgba(0, 0, 0, 0.32)',
    hoverShadow: '0 14px 40px rgba(0, 0, 0, 0.38), 0 0 18px rgba(98,126,234,0.14)',
    delay: 0.62,
  },
];

/* ── Coin accent colors ──────────────────────────────────────────── */
const COIN_META = {
  BTC: { color: '#F7931A', glow: 'rgba(247,147,26,0.12)', label: 'بیت‌کوین' },
  USD: { color: '#22C55E', glow: 'rgba(34,197,94,0.12)', label: 'دلار تهران' },
};

/* ── Inline coin SVG icons ───────────────────────────────────────── */
function BtcIcon({ size = 18, color = '#F7931A' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="11" fill={`${color}20`} stroke={`${color}55`} strokeWidth="1" />
      <text x="12" y="16.5" textAnchor="middle" fontSize="11" fontWeight="700"
        fill={color} fontFamily="monospace">₿</text>
    </svg>
  );
}

function EthIcon({ size = 18, color = '#627EEA' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="11" fill={`${color}20`} stroke={`${color}55`} strokeWidth="1" />
      <polygon points="12,4 17,12 12,14.5 7,12" fill={`${color}80`} />
      <polygon points="12,14.5 17,12 12,20 7,12" fill={color} opacity="0.7" />
    </svg>
  );
}

function UsdIcon({ size = 18, color = '#10B981' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="11" fill={`${color}20`} stroke={`${color}55`} strokeWidth="1" />
      <text x="12" y="16.5" textAnchor="middle" fontSize="12" fontWeight="700"
        fill={color} fontFamily="monospace">$</text>
    </svg>
  );
}

/* ── Shimmer placeholder ─────────────────────────────────────────── */
const ShimmerLine = ({ width = 80, height = 14 }) => (
  <div style={{
    width, height, borderRadius: 4,
    background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
  }} />
);

/* ── Tiny custom Recharts tooltip ────────────────────────────────── */
function HeroTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  if (val == null) return null;
  return (
    <div style={{
      background: 'rgba(15,23,42,0.88)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 6,
      padding: '4px 8px',
      fontSize: 10.5,
      color: '#9CA3AF',
      backdropFilter: 'blur(8px)',
    }}>
      {formatNum(Math.round(val))}
    </div>
  );
}

/* ── Count-up hook ───────────────────────────────────────────────── */
function useCountUp(target, duration = 1200) {
  const [value, setValue] = useState(null);
  const prevTarget = useRef(null);
  const reduced = useReducedMotion();

  const animate = useCallback((from, to, dur) => {
    const start = performance.now();
    const step = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / dur, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + (to - from) * eased);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    if (target == null) { setValue(null); return; }
    if (reduced) { setValue(target); return; }
    const from = prevTarget.current ?? 0;
    prevTarget.current = target;
    animate(from, target, duration);
  }, [target, duration, reduced, animate]);

  return value;
}

export default function Hero3DScene({
  tepixValue,
  tepixChangePct,
  tepixChangeAbs,
  totalValueToday,
  marketStatus,
  chartPoints,
  topMovers,
  breadth,
  cryptoCards,
  dollarCard,
  isLoading,
}) {
  const reduced = useReducedMotion();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const animatedTepix = useCountUp(tepixValue);
  const animatedTradeVal = useCountUp(totalValueToday);

  /* ── Mouse-tracking container parallax ─────────────────────────── */
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const containerRef = useRef(null);

  const rawRotateX = useTransform(mouseY, [0, 1], [3, -3]);
  const rawRotateY = useTransform(mouseX, [0, 1], [-3, 3]);
  const springRotateX = useSpring(rawRotateX, { stiffness: 80, damping: 30, mass: 0.5 });
  const springRotateY = useSpring(rawRotateY, { stiffness: 80, damping: 30, mass: 0.5 });

  const handleMouseMove = useCallback((e) => {
    if (reduced || isMobile) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  }, [reduced, isMobile, mouseX, mouseY]);

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  }, [mouseX, mouseY]);

  /* ── Hover border glow handlers ────────────────────────────────── */
  const hoverHandlers = (!reduced && !isMobile) ? {
    onMouseEnter: (e) => { e.currentTarget.style.borderColor = 'rgba(41, 98, 255, 0.18)'; },
    onMouseLeave: (e) => { e.currentTarget.style.borderColor = ''; },
  } : {};

  // Resolve displayed values
  const displayTepix = animatedTepix != null ? formatNum(Math.round(animatedTepix)) : null;
  const displayTradeVal = animatedTradeVal != null ? formatTrillion(animatedTradeVal) : null;

  // Change badge color
  const changeIsPositive = tepixChangePct != null ? tepixChangePct >= 0 : true;
  const changeColor = changeIsPositive ? '#22C55E' : '#EF4444';
  const changeBg = changeIsPositive ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)';

  // Market status
  const status = marketStatus?.status ?? 'closed';
  const statusLabel = status === 'open' ? 'LIVE' : status === 'pre-market' ? 'PRE' : '—';
  const statusSublabel = status === 'open' ? 'بازار باز' : status === 'pre-market' ? 'پیش‌گشایش' : 'بازار بسته';
  const statusColor = marketStatus?.color ?? 'rgba(124,140,162,0.5)';
  const statusIsDimmed = status === 'closed';

  const cfg1 = CARD_CONFIGS[0];
  const cfg2 = CARD_CONFIGS[1];
  const cfg3 = CARD_CONFIGS[2];
  const cfg4 = CARD_CONFIGS[3];
  const cfg5 = CARD_CONFIGS[4];

  // Chart data — use real points or fall back to empty (chart hides gracefully)
  const chartData = chartPoints?.length ? chartPoints : [];
  const hasChartData = chartData.length > 1;

  return (
    <div
      aria-hidden="true"
      style={{
        maxWidth: 'clamp(300px, 88vw, 920px)',
        margin: '0 auto',
        perspective: reduced ? 'none' : (isMobile ? 800 : 1200),
        position: 'relative',
        height: 'clamp(260px, 48vw, 480px)',
      }}
    >
      {/* Ambient glow behind cards */}
      <div style={{
        position: 'absolute',
        inset: '10% 5%',
        background: 'radial-gradient(ellipse, rgba(41,98,255,0.10) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(50px)',
        pointerEvents: 'none',
      }} />
      {/* Secondary glow — blue-ish offset */}
      <div style={{
        position: 'absolute', inset: '20% 30% 20% 10%',
        background: 'radial-gradient(ellipse, rgba(59,130,246,0.06) 0%, transparent 70%)',
        filter: 'blur(40px)', pointerEvents: 'none',
      }} />

      {/* Parallax-tracking inner container */}
      <motion.div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          position: 'absolute',
          inset: 0,
          transformStyle: 'preserve-3d',
          rotateX: (!reduced && !isMobile) ? springRotateX : 0,
          rotateY: (!reduced && !isMobile) ? springRotateY : 0,
        }}
      >

      {/* ── Card 1: Chart (wide, foreground) ─────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.92 }}
        animate={{
          opacity: 1, y: 0, scale: 1,
          rotateY: reduced ? 0 : (isMobile ? cfg1.mobile.rotateY : cfg1.desktop.rotateY),
          rotateX: reduced ? 0 : (isMobile ? cfg1.mobile.rotateX : cfg1.desktop.rotateX),
          z: reduced ? 0 : (isMobile ? cfg1.mobile.z : cfg1.desktop.z),
        }}
        transition={{
          duration: 0.8, delay: cfg1.delay, ease: [0.22, 1, 0.36, 1],
          rotateX: { type: 'spring', stiffness: 120, damping: 20 },
          rotateY: { type: 'spring', stiffness: 120, damping: 20 },
          z: { type: 'spring', stiffness: 120, damping: 20 },
        }}
        whileHover={(!reduced && !isMobile) ? {
          y: cfg1.hover.y,
          scale: cfg1.hover.scale,
          rotateY: cfg1.hover.rotateY,
          boxShadow: cfg1.hoverShadow,
          transition: { type: 'spring', stiffness: 300, damping: 20 },
        } : undefined}
        {...hoverHandlers}
        style={{
          ...glassStyles[0],
          position: 'absolute',
          top: isMobile ? '0%' : '10%',
          left: isMobile ? '3%' : '0%',
          width: isMobile ? '68%' : '50%',
          padding: isMobile ? '14px 15px' : '16px 18px',
          boxShadow: cfg1.shadow,
          zIndex: 4,
          transition: 'border-color 0.3s ease',
        }}
      >
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: statusIsDimmed ? 'rgba(124,140,162,0.4)' : '#22C55E',
            }} />
            <span style={{ fontSize: 12, color: 'rgba(156, 163, 175,0.55)', fontWeight: 600, letterSpacing: 0.5 }}>
              TEPIX
            </span>
          </div>
          <span style={{ fontSize: 9.5, color: 'rgba(156, 163, 175,0.35)' }}>
            {statusSublabel}
          </span>
        </div>

        {/* Big number */}
        <div style={{ fontSize: 'clamp(20px, 3.2vw, 30px)', fontWeight: 700, color: '#E8EAED', lineHeight: 1, marginBottom: 4 }}>
          {isLoading ? <ShimmerLine width={120} height={22} /> : (displayTepix ?? '—')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          {isLoading ? <ShimmerLine width={80} height={14} /> : (
            <>
              <span style={{
                fontSize: 11.5, fontWeight: 600, color: changeColor,
                background: changeBg, padding: '3px 10px', borderRadius: 6,
              }}>
                {tepixChangePct != null
                  ? (changeIsPositive ? '+' : '') + formatPercent(tepixChangePct)
                  : '—'}
              </span>
              {tepixChangeAbs != null && (
                <span style={{ fontSize: 10, color: 'rgba(156, 163, 175,0.4)' }}>
                  {(tepixChangeAbs >= 0 ? '+' : '') + formatNum(tepixChangeAbs)}
                </span>
              )}
            </>
          )}
        </div>

        {/* Recharts AreaChart — real TEPIX data */}
        {isLoading ? (
          <ShimmerLine width="100%" height={60} />
        ) : hasChartData ? (
          <div style={{ width: '100%', height: 60 }}>
            <ResponsiveContainer width="100%" height={60}>
              <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="hero-chart-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={changeColor} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={changeColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis domain={['auto', 'auto']} hide />
                <Tooltip content={<HeroTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={changeColor}
                  strokeWidth={1.8}
                  fill="url(#hero-chart-gradient)"
                  dot={false}
                  animationDuration={1200}
                  isAnimationActive={!reduced}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          /* Fallback decorative SVG when no historical data yet */
          <svg viewBox="0 0 180 60" style={{ width: '100%', display: 'block', overflow: 'visible' }}
            preserveAspectRatio="none">
            <defs>
              <linearGradient id="hero-fill-fallback" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={changeColor} stopOpacity="0.14" />
                <stop offset="100%" stopColor={changeColor} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0,52 C12,48 24,44 36,40 C48,36 60,46 72,38 C84,30 96,20 108,14 C120,8 132,16 144,10 C156,4 168,8 180,2 L180,60 L0,60 Z"
              fill="url(#hero-fill-fallback)"
            />
            <motion.path
              d="M0,52 C12,48 24,44 36,40 C48,36 60,46 72,38 C84,30 96,20 108,14 C120,8 132,16 144,10 C156,4 168,8 180,2"
              fill="none"
              stroke={changeColor} strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.4, delay: cfg1.delay + 0.2, ease: [0.22, 1, 0.36, 1] }}
            />
          </svg>
        )}
      </motion.div>

      {/* ── Card 2: Pulse — Trade value + Top Movers ─────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.92 }}
        animate={{
          opacity: 1, y: 0, scale: 1,
          rotateY: reduced ? 0 : (isMobile ? cfg2.mobile.rotateY : cfg2.desktop.rotateY),
          rotateX: reduced ? 0 : (isMobile ? cfg2.mobile.rotateX : cfg2.desktop.rotateX),
          z: reduced ? 0 : (isMobile ? cfg2.mobile.z : cfg2.desktop.z),
        }}
        transition={{
          duration: 0.8, delay: cfg2.delay, ease: [0.22, 1, 0.36, 1],
          rotateX: { type: 'spring', stiffness: 120, damping: 20 },
          rotateY: { type: 'spring', stiffness: 120, damping: 20 },
          z: { type: 'spring', stiffness: 120, damping: 20 },
        }}
        whileHover={(!reduced && !isMobile) ? {
          y: cfg2.hover.y,
          scale: cfg2.hover.scale,
          rotateY: cfg2.hover.rotateY,
          boxShadow: cfg2.hoverShadow,
          transition: { type: 'spring', stiffness: 300, damping: 20 },
        } : undefined}
        {...hoverHandlers}
        style={{
          ...glassStyles[1],
          position: 'absolute',
          top: isMobile ? '2%' : '2%',
          right: isMobile ? '3%' : '0%',
          width: isMobile ? '30%' : '32%',
          padding: isMobile ? '12px 13px' : '16px 16px',
          boxShadow: cfg2.shadow,
          zIndex: 2,
          transition: 'border-color 0.3s ease',
        }}
      >
        {/* Trade value KPI */}
        <div style={{ fontSize: 10.5, color: 'rgba(156, 163, 175,0.5)', marginBottom: 6, fontWeight: 600 }}>
          ارزش معاملات
        </div>
        <div style={{ fontSize: 'clamp(16px, 2.6vw, 24px)', fontWeight: 700, color: '#E8EAED', lineHeight: 1, marginBottom: 4 }}>
          {isLoading ? <ShimmerLine width={70} height={18} /> : (displayTradeVal ?? '—')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
          <svg width="11" height="10" viewBox="0 0 11 10" fill="none" style={{ flexShrink: 0 }}>
            <path d="M5.5 1 L10 9 H1 Z" fill="#22C55E" />
          </svg>
          <span style={{ fontSize: 10, color: 'rgba(156, 163, 175,0.4)', fontWeight: 600 }}>
            {toPersianNum('تومان')}
          </span>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 10 }} />

        {/* Top movers */}
        <div style={{ fontSize: 9.5, color: 'rgba(156, 163, 175,0.4)', marginBottom: 7, fontWeight: 600, letterSpacing: 0.3 }}>
          برترین نوسانات
        </div>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {[60, 52, 56].map((w, i) => <ShimmerLine key={i} width={w} height={12} />)}
          </div>
        ) : topMovers?.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {topMovers.map((m) => {
              const pos = m.changePct >= 0;
              const mColor = pos ? '#22C55E' : '#EF4444';
              const mBg = pos ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)';
              return (
                <div key={m.symbol} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 10.5, color: '#CBD5E1', fontWeight: 600, fontFamily: 'monospace' }}>
                    {m.symbol}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, color: mColor,
                    background: mBg, padding: '1.5px 6px', borderRadius: 4,
                  }}>
                    {(pos ? '+' : '') + m.changePct.toFixed(1)}٪
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Breadth bar */}
        {breadth && (breadth.gainers > 0 || breadth.losers > 0) && (
          <div style={{ marginTop: 10 }}>
            {/* Mini progress bar */}
            <div style={{
              height: 3, borderRadius: 2,
              background: 'rgba(239,68,68,0.25)',
              overflow: 'hidden',
              marginBottom: 4,
            }}>
              <div style={{
                height: '100%',
                width: `${Math.round(breadth.gainers / (breadth.gainers + breadth.losers) * 100)}%`,
                background: 'rgba(34,197,94,0.7)',
                borderRadius: 2,
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 9, color: 'rgba(34,197,94,0.6)', fontWeight: 600 }}>
                ▲ {toPersianNum(breadth.gainers)}
              </span>
              <span style={{ fontSize: 9, color: 'rgba(239,68,68,0.6)', fontWeight: 600 }}>
                ▼ {toPersianNum(breadth.losers)}
              </span>
            </div>
          </div>
        )}
      </motion.div>

      {/* ── Card 3: LIVE badge (floating pill) ───────────────────────── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7, y: 16 }}
        animate={{
          opacity: 1, scale: 1,
          y: reduced ? 0 : [0, -4, 0],
          rotateY: reduced ? 0 : (isMobile ? cfg3.mobile.rotateY : cfg3.desktop.rotateY),
          rotateX: reduced ? 0 : (isMobile ? cfg3.mobile.rotateX : cfg3.desktop.rotateX),
          z: reduced ? 0 : (isMobile ? cfg3.mobile.z : cfg3.desktop.z),
        }}
        transition={{
          opacity: { duration: 0.8, delay: cfg3.delay, ease: [0.34, 1.56, 0.64, 1] },
          scale: { duration: 0.8, delay: cfg3.delay, ease: [0.34, 1.56, 0.64, 1] },
          y: reduced ? { duration: 0.8, delay: cfg3.delay } : { duration: 3, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut', delay: 1.5 },
          rotateX: { type: 'spring', stiffness: 120, damping: 20 },
          rotateY: { type: 'spring', stiffness: 120, damping: 20 },
          z: { type: 'spring', stiffness: 120, damping: 20 },
        }}
        whileHover={(!reduced && !isMobile) ? {
          y: cfg3.hover.y,
          scale: cfg3.hover.scale,
          rotateY: cfg3.hover.rotateY,
          boxShadow: cfg3.hoverShadow,
          transition: { type: 'spring', stiffness: 300, damping: 20 },
        } : undefined}
        {...hoverHandlers}
        style={{
          ...glassStyles[2],
          position: 'absolute',
          ...(isMobile
            ? { bottom: '6%', right: '5%' }
            : { top: '56%', left: '32%' }),
          padding: '7px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          boxShadow: cfg3.shadow,
          zIndex: 5,
          transition: 'border-color 0.3s ease',
        }}
      >
        <div style={{ position: 'relative', width: 7, height: 7 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: statusColor,
            opacity: statusIsDimmed ? 0.4 : 1,
            position: 'absolute', inset: 0,
          }} />
          {!reduced && !statusIsDimmed && (
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: `${statusColor}66`,
              position: 'absolute', inset: 0,
              animation: 'hero-live-ping 2s ease-in-out infinite',
            }} />
          )}
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, fontFamily: 'monospace', letterSpacing: 1.5,
          color: statusIsDimmed ? 'rgba(156, 163, 175,0.35)' : statusColor,
        }}>
          {statusLabel}
        </span>
        <span style={{ fontSize: 10, color: 'rgba(156, 163, 175,0.45)' }}>
          {statusSublabel}
        </span>
      </motion.div>

      {/* ── Crypto Cards: BTC + Dollar Rate ────────────────────────── */}
      {[cfg4, cfg5].map((cfg, idx) => {
        const coin = idx === 0 ? (cryptoCards?.[0] ?? null) : null;
        const dollar = idx === 1 ? dollarCard : null;
        const sym = idx === 0 ? 'BTC' : 'USD';
        const meta = COIN_META[sym];
        const rawPct = idx === 0 ? coin?.changePct : dollar?.changePct;
        const pos = rawPct != null ? rawPct >= 0 : true;
        const pctColor = pos ? '#22C55E' : '#EF4444';
        const pctBg = pos ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)';
        const Icon = idx === 0 ? BtcIcon : UsdIcon;
        // BTC sways right, ETH sways left — opposite phase for organic feel
        const swayZ = idx === 0 ? [0, 0.5, 0] : [0, -0.4, 0];
        const floatY = idx === 0 ? [0, -7, 0] : [0, -5, 0];

        return (
          <motion.div
            key={sym}
            initial={{ opacity: 0, y: 55, scale: 0.82, rotateX: 18 }}
            animate={{
              opacity: 1, scale: 1,
              y: reduced ? 0 : floatY,
              rotateZ: reduced ? 0 : swayZ,
              rotateX: reduced ? 0 : (isMobile ? cfg.mobile.rotateX : cfg.desktop.rotateX),
              rotateY: reduced ? 0 : (isMobile ? cfg.mobile.rotateY : cfg.desktop.rotateY),
              z: reduced ? 0 : (isMobile ? cfg.mobile.z : cfg.desktop.z),
            }}
            transition={{
              opacity: { duration: 0.6, delay: cfg.delay },
              scale: { type: 'spring', stiffness: 90, damping: 14, delay: cfg.delay },
              rotateX: { type: 'spring', stiffness: 90, damping: 14, delay: cfg.delay },
              rotateY: { type: 'spring', stiffness: 90, damping: 14, delay: cfg.delay },
              rotateZ: reduced
                ? { type: 'spring', stiffness: 90, damping: 14, delay: cfg.delay }
                : { duration: 3.6 + idx * 0.5, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut', delay: 1.8 + idx * 0.3 },
              z: { type: 'spring', stiffness: 90, damping: 14, delay: cfg.delay },
              y: reduced
                ? { type: 'spring', stiffness: 90, damping: 14, delay: cfg.delay }
                : { duration: 3.2 + idx * 0.6, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut', delay: 1.8 + idx * 0.3 },
            }}
            whileHover={(!reduced && !isMobile) ? {
              y: cfg.hover.y,
              scale: cfg.hover.scale,
              rotateY: cfg.hover.rotateY,
              rotateZ: 0,
              boxShadow: cfg.hoverShadow,
              transition: { type: 'spring', stiffness: 280, damping: 18 },
            } : undefined}
            onMouseEnter={(!reduced && !isMobile) ? (e) => {
              e.currentTarget.style.borderColor = `${meta.color}45`;
              e.currentTarget.style.background = meta.glow;
            } : undefined}
            onMouseLeave={(!reduced && !isMobile) ? (e) => {
              e.currentTarget.style.borderColor = '';
              e.currentTarget.style.background = '';
            } : undefined}
            style={{
              ...glassStyles[3 + idx],
              position: 'absolute',
              ...(isMobile
                ? { display: 'none' }
                : idx === 0
                  ? { bottom: '3%', left: '1%', width: '30%' }
                  : { bottom: '3%', right: '2%', width: '27%' }),
              padding: '16px 18px',
              boxShadow: cfg.shadow,
              zIndex: 1,
              borderTop: `1.5px solid ${meta.color}45`,
              transition: 'border-color 0.3s ease, background 0.3s ease',
            }}
          >
            {/* Header: icon in glow ring + symbol + name + pulse dot */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 13 }}>
              {/* Icon wrapped in coin-colored glow ring */}
              <div style={{
                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                background: `radial-gradient(circle, ${meta.color}18 0%, transparent 70%)`,
                border: `1px solid ${meta.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={20} color={meta.color} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#E2E8F0', fontFamily: "'PELAK', 'Poppins', sans-serif", letterSpacing: 1 }}>
                  {sym}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(156, 163, 175,0.6)', marginTop: 2 }}>
                  {meta.label}
                </div>
              </div>
              {/* Pulsing dot with ping ring */}
              <div style={{ marginInlineStart: 'auto', position: 'relative', width: 7, height: 7 }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  width: 7, height: 7, borderRadius: '50%',
                  background: meta.color,
                  boxShadow: `0 0 6px ${meta.color}`,
                }} />
                {!reduced && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    width: 7, height: 7, borderRadius: '50%',
                    background: `${meta.color}55`,
                    animation: `hero-live-ping ${2 + idx * 0.4}s ease-in-out infinite`,
                  }} />
                )}
              </div>
            </div>

            {/* Price: $ for BTC, Toman for dollar rate */}
            <div style={{ marginBottom: 10 }}>
              {isLoading || (idx === 0 ? !coin : !dollar) ? (
                <ShimmerLine width={90} height={20} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                  <span style={{ fontSize: 11, color: meta.color, fontFamily: "'PELAK', 'Poppins', sans-serif", fontWeight: 600, opacity: 0.85 }}>
                    {idx === 0 ? '$' : ''}
                  </span>
                  <span style={{ fontSize: 'clamp(17px, 2.3vw, 27px)', fontWeight: 700, color: '#E8EAED', fontFamily: "'PELAK', 'Poppins', sans-serif", lineHeight: 1 }}>
                    {formatNum(Math.round(idx === 0 ? coin.price : dollar.price))}
                  </span>
                  {idx === 1 && (
                    <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.5)', marginInlineStart: 3, fontFamily: "'PELAK', sans-serif" }}>
                      ت
                    </span>
                  )}
                </div>
              )}
              <div style={{
                height: 1, width: '55%', marginTop: 5,
                background: `linear-gradient(90deg, ${meta.color}40, transparent)`,
              }} />
            </div>

            {/* 24h change badge with directional triangle + time label */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {isLoading || (idx === 0 ? !coin : !dollar) ? (
                <ShimmerLine width={60} height={14} />
              ) : (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  fontSize: 11.5, fontWeight: 600, color: pctColor,
                  background: pctBg, padding: '3px 9px', borderRadius: 5,
                  fontFamily: "'PELAK', 'Poppins', sans-serif",
                }}>
                  <span style={{ fontSize: 8 }}>{pos ? '▲' : '▼'}</span>
                  {Math.abs(rawPct ?? 0).toFixed(2)}%
                </span>
              )}
              <span style={{ fontSize: 9.5, color: 'rgba(156, 163, 175,0.3)', fontFamily: "'PELAK', 'Poppins', sans-serif" }}>
                24h
              </span>
            </div>
          </motion.div>
        );
      })}

      </motion.div>{/* end parallax container */}
    </div>
  );
}
