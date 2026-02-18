import { useRef, useState, useCallback, useEffect } from 'react';
import { Box } from '@mantine/core';
import styles from './KPICarousel.module.css';

/**
 * Horizontal scroll-snap carousel for compact KPI cards on mobile.
 * Shows 2 cards at a time with dot indicators.
 */
export default function KPICarousel({ children }) {
  const scrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const childCount = Array.isArray(children) ? children.length : 0;
  const pageCount = Math.max(1, Math.ceil(childCount / 2));

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollLeft = el.scrollLeft;
    const cardWidth = el.scrollWidth / childCount;
    const idx = Math.round(scrollLeft / (cardWidth * 2));
    setActiveIndex(Math.min(idx, pageCount - 1));
  }, [childCount, pageCount]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return (
    <Box mb="md">
      <div ref={scrollRef} className={styles.carousel}>
        {Array.isArray(children) && children.map((child, i) => (
          <div key={i} className={styles.card}>
            {child}
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      {pageCount > 1 && (
        <div className={styles.dots}>
          {Array.from({ length: pageCount }).map((_, i) => (
            <div
              key={i}
              className={`${styles.dot} ${i === activeIndex ? styles.dotActive : ''}`}
            />
          ))}
        </div>
      )}
    </Box>
  );
}
