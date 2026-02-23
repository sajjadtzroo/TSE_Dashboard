/**
 * Safe localStorage helpers — silently return fallback values on parse errors
 * or when localStorage is unavailable (e.g. SSR, private browsing).
 */

export function loadFromStorage(key, fallback = []) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

export function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore write errors (storage quota exceeded, private browsing, etc.)
  }
}
