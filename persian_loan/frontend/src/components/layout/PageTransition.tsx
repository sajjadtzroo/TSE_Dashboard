import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * PageTransition component wraps page content with smooth fade + vertical animations
 *
 * Features:
 * - 200ms fade in/out with vertical movement
 * - Respects prefers-reduced-motion for accessibility
 * - Uses location.pathname as key for route changes
 * - mode="wait" prevents overlapping animations
 * - initial={false} prevents animation on first load
 *
 * Animation Specification:
 * - Initial: opacity 0, y +20px (below)
 * - Enter: opacity 1, y 0 (normal position)
 * - Exit: opacity 0, y -20px (above)
 * - Duration: 200ms with easeInOut easing
 */
export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();

  // If user prefers reduced motion, render without animations
  if (prefersReducedMotion) {
    return <>{children}</>;
  }

  // Animation variants for smooth page transitions
  const pageVariants = {
    initial: {
      opacity: 0,
      y: 20, // Start slightly below
    },
    enter: {
      opacity: 1,
      y: 0, // End at normal position
    },
    exit: {
      opacity: 0,
      y: -20, // Exit slightly above
    },
  };

  const pageTransition = {
    duration: 0.2, // 200ms
    ease: 'easeInOut' as const,
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="enter"
        exit="exit"
        variants={pageVariants}
        transition={pageTransition}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
