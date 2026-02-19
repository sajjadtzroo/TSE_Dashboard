import { useState, useEffect, useRef, useCallback } from 'react';

const HORIZONTAL_THRESHOLD = 50;
const VERTICAL_MAX = 30;

/**
 * Detects horizontal swipes and scrolls between dashboard sections.
 * @param {React.RefObject[]} sectionRefs - Array of refs to section elements
 * @param {{ enabled?: boolean }} options
 * @returns {{ currentSection: number, scrollToSection: (index: number) => void }}
 */
export default function useSwipeNavigation(sectionRefs, { enabled = true } = {}) {
  const [currentSection, setCurrentSection] = useState(0);
  const startX = useRef(0);
  const startY = useRef(0);

  const scrollToSection = useCallback((index) => {
    const ref = sectionRefs[index];
    if (ref?.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setCurrentSection(index);
    }
  }, [sectionRefs]);

  useEffect(() => {
    if (!enabled) return;

    const handleTouchStart = (e) => {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const diffX = endX - startX.current;
      const diffY = Math.abs(endY - startY.current);

      // Must be a horizontal swipe: sufficient X distance, minimal Y deviation
      if (Math.abs(diffX) < HORIZONTAL_THRESHOLD || diffY > VERTICAL_MAX) return;

      // RTL: swipe left (diffX < 0) = next section; swipe right (diffX > 0) = prev section
      if (diffX < 0 && currentSection < sectionRefs.length - 1) {
        scrollToSection(currentSection + 1);
      } else if (diffX > 0 && currentSection > 0) {
        scrollToSection(currentSection - 1);
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, currentSection, sectionRefs, scrollToSection]);

  // Track current visible section via IntersectionObserver
  useEffect(() => {
    if (!enabled) return;

    const observers = [];
    sectionRefs.forEach((ref, index) => {
      if (!ref?.current) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
            setCurrentSection(index);
          }
        },
        { threshold: 0.3 }
      );
      observer.observe(ref.current);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [enabled, sectionRefs]);

  return { currentSection, scrollToSection };
}
