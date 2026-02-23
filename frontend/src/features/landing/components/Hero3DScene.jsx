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
];

/* ── Card configuration (3D transforms, hover targets, shadows) ─── */
const CARD_CONFIGS = [
  { // Card 1 — Chart (z:4, foreground)
    desktop: { rotateY: 8, rotateX: -3, z: 40 },
    mobile: { rotateY: 3, rotateX: -2, z: 20 },
    hover: { rotateY: 6, y: -10, scale: 1.035 },
    shadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(16,185,129,0.06)',
    hoverShadow: '0 28px 70px rgba(0, 0, 0, 0.55), 0 0 20px rgba(16,185,129,0.12)',
    delay: 0.15,
  },
  { // Card 2 — Pulse/Movers (z:2, tilted back)
    desktop: { rotateY: -12, rotateX: 5, z: -20 },
    mobile: { rotateY: -5, rotateX: 3, z: -10 },
    hover: { rotateY: -9, y: -7, scale: 1.025 },
    shadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
    hoverShadow: '0 16px 44px rgba(0, 0, 0, 0.4), 0 0 14px rgba(16,185,129,0.08)',
    delay: 0.35,
  },
  { // Card 3 — LIVE badge (z:5, closest)
    desktop: { rotateY: -5, rotateX: 0, z: 80 },
    mobile: { rotateY: -2, rotateX: 0, z: 40 },
    hover: { rotateY: -3, y: -6, scale: 1.06 },
    shadow: '0 12px 36px rgba(0, 0, 0, 0.4), 0 0 12px rgba(16,185,129,0.05)',
    hoverShadow: '0 18px 44px rgba(0, 0, 0, 0.45), 0 0 18px rgba(16,185,129,0.14)',
    delay: 0.7,
  },
];

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
      color: '#94A3B8',
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
    onMouseEnter: (e) => { e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.18)'; },
    onMouseLeave: (e) => { e.currentTarget.style.borderColor = ''; },
  } : {};

  // Resolve displayed values
  const displayTepix = animatedTepix != null ? formatNum(Math.round(animatedTepix)) : null;
  const displayTradeVal = animatedTradeVal != null ? formatTrillion(animatedTradeVal) : null;

  // Change badge color
  const changeIsPositive = tepixChangePct != null ? tepixChangePct >= 0 : true;
  const changeColor = changeIsPositive ? '#10B981' : '#EF4444';
  const changeBg = changeIsPositive ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)';

  // Market status
  const status = marketStatus?.status ?? 'closed';
  const statusLabel = status === 'open' ? 'LIVE' : status === 'pre-market' ? 'PRE' : '—';
  const statusSublabel = status === 'open' ? 'بازار باز' : status === 'pre-market' ? 'پیش‌گشایش' : 'بازار بسته';
  const statusColor = marketStatus?.color ?? 'rgba(124,140,162,0.5)';
  const statusIsDimmed = status === 'closed';

  const cfg1 = CARD_CONFIGS[0];
  const cfg2 = CARD_CONFIGS[1];
  const cfg3 = CARD_CONFIGS[2];

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
        background: 'radial-gradient(ellipse, rgba(16,185,129,0.10) 0%, transparent 70%)',
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
          top: isMobile ? '0%' : '12%',
          left: isMobile ? '3%' : '0%',
          width: isMobile ? '68%' : '52%',
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
              background: statusIsDimmed ? 'rgba(124,140,162,0.4)' : '#10B981',
            }} />
            <span style={{ fontSize: 12, color: 'rgba(148,163,184,0.55)', fontWeight: 600, letterSpacing: 0.5 }}>
              TEPIX
            </span>
          </div>
          <span style={{ fontSize: 9.5, color: 'rgba(148,163,184,0.35)', fontFamily: 'monospace' }}>
            {statusSublabel}
          </span>
        </div>

        {/* Big number */}
        <div style={{ fontSize: 'clamp(20px, 3.2vw, 30px)', fontWeight: 700, color: '#F1F5F9', lineHeight: 1, marginBottom: 4 }}>
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
                <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.4)' }}>
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
          width: isMobile ? '30%' : '34%',
          padding: isMobile ? '12px 13px' : '16px 16px',
          boxShadow: cfg2.shadow,
          zIndex: 2,
          transition: 'border-color 0.3s ease',
        }}
      >
        {/* Trade value KPI */}
        <div style={{ fontSize: 10.5, color: 'rgba(148,163,184,0.5)', marginBottom: 6, fontWeight: 600 }}>
          ارزش معاملات
        </div>
        <div style={{ fontSize: 'clamp(16px, 2.6vw, 24px)', fontWeight: 700, color: '#F1F5F9', lineHeight: 1, marginBottom: 4 }}>
          {isLoading ? <ShimmerLine width={70} height={18} /> : (displayTradeVal ?? '—')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
          <svg width="11" height="10" viewBox="0 0 11 10" fill="none" style={{ flexShrink: 0 }}>
            <path d="M5.5 1 L10 9 H1 Z" fill="#10B981" />
          </svg>
          <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.4)', fontWeight: 600 }}>
            {toPersianNum('تومان')}
          </span>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 10 }} />

        {/* Top movers */}
        <div style={{ fontSize: 9.5, color: 'rgba(148,163,184,0.4)', marginBottom: 7, fontWeight: 600, letterSpacing: 0.3 }}>
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
              const mColor = pos ? '#10B981' : '#EF4444';
              const mBg = pos ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)';
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
                background: 'rgba(16,185,129,0.7)',
                borderRadius: 2,
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 9, color: 'rgba(16,185,129,0.6)', fontWeight: 600 }}>
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
            : { top: '56%', right: '4%' }),
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
          color: statusIsDimmed ? 'rgba(148,163,184,0.35)' : statusColor,
        }}>
          {statusLabel}
        </span>
        <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.45)' }}>
          {statusSublabel}
        </span>
      </motion.div>

      </motion.div>{/* end parallax container */}
    </div>
  );
}
