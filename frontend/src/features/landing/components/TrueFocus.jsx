import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

/**
 * TrueFocus — animated word-focus effect with corner brackets.
 * Adapted from reactbits.dev/text-animations/true-focus
 * CSS lives in global.css under "/* ── TrueFocus"
 */
const TrueFocus = ({
  sentence = 'فین هاب',
  separator = ' ',
  manualMode = false,
  blurAmount = 4,
  borderColor = '#2962FF',
  glowColor = 'rgba(41, 98, 255, 0.55)',
  animationDuration = 0.6,
  pauseBetweenAnimations = 1.5,
}) => {
  const words = sentence.split(separator);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lastActiveIndex, setLastActiveIndex] = useState(null);
  const containerRef = useRef(null);
  const wordRefs = useRef([]);
  const [focusRect, setFocusRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [hasMeasured, setHasMeasured] = useState(false);

  useEffect(() => {
    if (manualMode) return;
    const interval = setInterval(
      () => setCurrentIndex((prev) => (prev + 1) % words.length),
      (animationDuration + pauseBetweenAnimations) * 1000,
    );
    return () => clearInterval(interval);
  }, [manualMode, animationDuration, pauseBetweenAnimations, words.length]);

  // Extra space so Persian diacritic dots (e.g. ف) are not clipped by the frame
  const PAD = { top: 16, bottom: 6, x: 10 };

  useEffect(() => {
    if (currentIndex === null || currentIndex === -1) return;
    let raf;
    const measure = () => {
      if (!wordRefs.current[currentIndex] || !containerRef.current) return;
      const parentRect = containerRef.current.getBoundingClientRect();
      const activeRect = wordRefs.current[currentIndex].getBoundingClientRect();
      if (activeRect.width === 0) return; // font not yet loaded — skip
      setFocusRect({
        x: activeRect.left - parentRect.left - PAD.x,
        y: activeRect.top - parentRect.top - PAD.top,
        width: activeRect.width + PAD.x * 2,
        height: activeRect.height + PAD.top + PAD.bottom,
      });
      setHasMeasured(true);
    };
    raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, [currentIndex, words.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-measure once the real font is loaded (fixes stale fallback-font dimensions)
  useEffect(() => {
    document.fonts?.ready?.then(() => {
      const idx = currentIndex;
      if (!wordRefs.current[idx] || !containerRef.current) return;
      const parentRect = containerRef.current.getBoundingClientRect();
      const activeRect = wordRefs.current[idx].getBoundingClientRect();
      if (activeRect.width === 0) return;
      setFocusRect({
        x: activeRect.left - parentRect.left - PAD.x,
        y: activeRect.top - parentRect.top - PAD.top,
        width: activeRect.width + PAD.x * 2,
        height: activeRect.height + PAD.top + PAD.bottom,
      });
      setHasMeasured(true);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMouseEnter = (index) => {
    if (manualMode) { setLastActiveIndex(index); setCurrentIndex(index); }
  };
  const handleMouseLeave = () => {
    if (manualMode) setCurrentIndex(lastActiveIndex);
  };

  return (
    <div className="tf-container" ref={containerRef}>
      {words.map((word, index) => {
        const isActive = index === currentIndex;
        return (
          <span
            key={index}
            ref={(el) => (wordRefs.current[index] = el)}
            className="tf-word"
            style={{
              filter: isActive ? 'blur(0px)' : `blur(${blurAmount}px)`,
              '--tf-border': borderColor,
              '--tf-glow': glowColor,
              transition: `filter ${animationDuration}s ease`,
            }}
            onMouseEnter={() => handleMouseEnter(index)}
            onMouseLeave={handleMouseLeave}
          >
            {word}
          </span>
        );
      })}

      {hasMeasured && (
        <motion.div
          className="tf-frame"
          initial={{
            x: focusRect.x,
            y: focusRect.y,
            width: focusRect.width,
            height: focusRect.height,
            opacity: 0,
          }}
          animate={{
            x: focusRect.x,
            y: focusRect.y,
            width: focusRect.width,
            height: focusRect.height,
            opacity: 1,
          }}
          transition={{ duration: animationDuration }}
          style={{ '--tf-border': borderColor, '--tf-glow': glowColor }}
        >
          <span className="tf-corner tf-tl" />
          <span className="tf-corner tf-tr" />
          <span className="tf-corner tf-bl" />
          <span className="tf-corner tf-br" />
        </motion.div>
      )}
    </div>
  );
};

export default TrueFocus;
