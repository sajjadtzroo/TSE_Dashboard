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
  borderColor = '#10B981',
  glowColor = 'rgba(16, 185, 129, 0.55)',
  animationDuration = 0.6,
  pauseBetweenAnimations = 1.5,
}) => {
  const words = sentence.split(separator);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lastActiveIndex, setLastActiveIndex] = useState(null);
  const containerRef = useRef(null);
  const wordRefs = useRef([]);
  const [focusRect, setFocusRect] = useState({ x: 0, y: 0, width: 0, height: 0 });

  useEffect(() => {
    if (manualMode) return;
    const interval = setInterval(
      () => setCurrentIndex((prev) => (prev + 1) % words.length),
      (animationDuration + pauseBetweenAnimations) * 1000,
    );
    return () => clearInterval(interval);
  }, [manualMode, animationDuration, pauseBetweenAnimations, words.length]);

  useEffect(() => {
    if (currentIndex === null || currentIndex === -1) return;
    if (!wordRefs.current[currentIndex] || !containerRef.current) return;
    const parentRect = containerRef.current.getBoundingClientRect();
    const activeRect = wordRefs.current[currentIndex].getBoundingClientRect();
    setFocusRect({
      x: activeRect.left - parentRect.left,
      y: activeRect.top - parentRect.top,
      width: activeRect.width,
      height: activeRect.height,
    });
  }, [currentIndex, words.length]);

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

      <motion.div
        className="tf-frame"
        animate={{
          x: focusRect.x,
          y: focusRect.y,
          width: focusRect.width,
          height: focusRect.height,
          opacity: currentIndex >= 0 ? 1 : 0,
        }}
        transition={{ duration: animationDuration }}
        style={{ '--tf-border': borderColor, '--tf-glow': glowColor }}
      >
        <span className="tf-corner tf-tl" />
        <span className="tf-corner tf-tr" />
        <span className="tf-corner tf-bl" />
        <span className="tf-corner tf-br" />
      </motion.div>
    </div>
  );
};

export default TrueFocus;
