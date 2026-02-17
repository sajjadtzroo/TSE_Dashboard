import { useEffect, useState } from 'react';

/**
 * Hook to detect user's motion preferences for accessibility
 * Returns true if user prefers reduced motion (animations should be disabled)
 *
 * Respects the prefers-reduced-motion media query which users can set in:
 * - System Preferences → Accessibility → Display → Reduce Motion (macOS)
 * - Settings → Accessibility → Remove Animations (Windows)
 * - Settings → Accessibility → Remove Animations (Android/iOS)
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    // Check if window is available (SSR safety)
    if (typeof window === 'undefined') {
      return false;
    }

    // Check user's motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    return mediaQuery.matches;
  });

  useEffect(() => {
    // Check if window is available (SSR safety)
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Handler for media query changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    // Legacy browsers (Safari < 14)
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  return prefersReducedMotion;
}
