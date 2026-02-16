import { useState, useCallback } from 'react';

const STORAGE_KEY = 'tse-indicator-prefs';

function loadPrefs() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

/**
 * localStorage-backed toggle state for technical indicators.
 * Follows useWatchlist.js pattern.
 */
export default function useIndicatorPrefs() {
  const [prefs, setPrefs] = useState(loadPrefs);

  const toggle = useCallback((key) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { prefs, toggle };
}
