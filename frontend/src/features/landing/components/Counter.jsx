import { useState, useEffect } from 'react';
import { useIntersection } from '@mantine/hooks';

export default function Counter({ end, suffix = '' }) {
  const [count, setCount] = useState(0);
  const { ref, entry } = useIntersection({ threshold: 0.5 });
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!started) {
      if (entry?.isIntersecting) {
        // Element is visible — animate from 0 to end
        setStarted(true);
        const duration = 1600;
        const t0 = Date.now();
        const tick = () => {
          const p = Math.min((Date.now() - t0) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 4);
          setCount(Math.floor(eased * end));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      } else if (entry !== undefined && end > 0) {
        // Observer has fired but element is not in view (user scrolled past
        // before live data loaded). Jump straight to final value so it's
        // correct when the user scrolls back.
        setCount(end);
        setStarted(true);
      }
    }
  }, [entry, started, end]);

  return (
    <span ref={ref} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {count.toLocaleString('fa-IR')}{suffix}
    </span>
  );
}
