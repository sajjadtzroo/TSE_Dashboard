import { useState, useEffect } from 'react';

/**
 * IntersectionObserver wrapper that tracks which section is currently visible.
 * @param {React.RefObject[]} sectionRefs - Array of refs for each section
 * @returns {{ activeIndex: number }}
 */
export default function useSectionObserver(sectionRefs) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const observers = [];
    const visibleMap = new Map();

    sectionRefs.forEach((ref, index) => {
      if (!ref.current) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          visibleMap.set(index, entry.intersectionRatio);

          // Pick the section with highest intersection ratio
          let bestIndex = 0;
          let bestRatio = 0;
          visibleMap.forEach((ratio, idx) => {
            if (ratio > bestRatio) {
              bestRatio = ratio;
              bestIndex = idx;
            }
          });

          if (bestRatio > 0) {
            setActiveIndex(bestIndex);
          }
        },
        {
          rootMargin: '-120px 0px -50% 0px',
          threshold: [0, 0.25, 0.5, 0.75, 1],
        },
      );

      observer.observe(ref.current);
      observers.push(observer);
    });

    return () => {
      observers.forEach((obs) => obs.disconnect());
    };
  }, [sectionRefs]);

  return { activeIndex };
}
