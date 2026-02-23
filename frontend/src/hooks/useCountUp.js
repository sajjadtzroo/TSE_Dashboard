import { useState, useEffect, useRef } from 'react';

const PERSIAN_DIGITS = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];

function toPersianNum(n) {
  return String(n).replace(/\d/g, d => PERSIAN_DIGITS[d]);
}

function fromPersian(str) {
  return str.replace(/[۰-۹]/g, d => PERSIAN_DIGITS.indexOf(d));
}

function easeOutExpo(t) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export default function useCountUp(end, { duration = 800, enabled = true } = {}) {
  const [display, setDisplay] = useState(end);
  const rafRef = useRef(null);
  const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!enabled || reducedMotion || end == null || end === '' || end === '-') {
      setDisplay(end);
      return;
    }

    const raw = String(end);

    // Handle "X / Y" format
    if (raw.includes('/')) {
      const parts = raw.split('/').map(p => p.trim());
      const nums = parts.map(p => parseFloat(fromPersian(p).replace(/[,٬]/g, '')));
      if (nums.some(isNaN)) { setDisplay(raw); return; }

      const start = performance.now();
      const tick = (now) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeOutExpo(progress);
        const animated = nums.map(n =>
          toPersianNum(Math.round(n * eased).toLocaleString('en-US'))
        );
        setDisplay(animated.join(' / '));
        if (progress < 1) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }

    // Extract numeric part and suffix — strip thousand separators before parsing
    const latinized = fromPersian(raw).replace(/[,٬]/g, '');
    const match = latinized.match(/^([+-]?\s*)([\d.]+)(.*)$/);
    if (!match) { setDisplay(raw); return; }

    const [, prefix, numStr, suffix] = match;
    const target = parseFloat(numStr);
    if (isNaN(target)) { setDisplay(raw); return; }

    const decimals = numStr.includes('.') ? numStr.split('.')[1].length : 0;

    const startTime = performance.now();
    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutExpo(progress);
      const current = target * eased;
      const formatted = decimals > 0
        ? toPersianNum(current.toFixed(decimals))
        : toPersianNum(Math.round(current).toLocaleString('en-US'));
      setDisplay(prefix + formatted + suffix);
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [end, duration, enabled, reducedMotion]);

  return display;
}
