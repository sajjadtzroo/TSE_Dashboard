import rallyColors from '../theme/rallyColors';

/** Neutral midpoint for heatmap — brighter than BG_ELEVATED so 0% cells are visible */
export const HEATMAP_NEUTRAL = '#2A2F40';

/**
 * Get color for a change value: green (positive), orange (negative), undefined (zero/null).
 * @param {number | null | undefined} value
 * @returns {string | undefined} Hex color or undefined
 */
export const getChangeColor = (value) => {
  if (value == null) return undefined;
  if (value > 0) return rallyColors.green;
  if (value < 0) return rallyColors.orange;
  return undefined;
};

/**
 * Get color for a change value: green (positive), red (negative), undefined (zero/null).
 * @param {number | null | undefined} value
 * @returns {string | undefined} Hex color or undefined
 */
export const getRedGreenColor = (value) => {
  if (value == null) return undefined;
  if (value > 0) return rallyColors.green;
  if (value < 0) return rallyColors.red;
  return undefined;
};

/**
 * Interpolate between red (negative) → neutral → green (positive) based on value.
 * Used for heatmap cell backgrounds.
 * @param {number} value - The value to colorize
 * @param {number} min - Minimum range value (maps to full red)
 * @param {number} max - Maximum range value (maps to full green)
 * @returns {string} CSS rgb() color string
 */
export function interpolateColor(value, min, max) {
  // Clamp value to min/max range
  const v = Math.max(min, Math.min(max, value));
  const mid = 0;

  if (v >= mid) {
    // Positive side: Neutral → Vibrant Green
    const t = max > mid ? (v - mid) / (max - mid) : 0;
    // From #2A2F40 (brighter neutral) to vibrant green #22C55E
    const r = Math.round(0x2A + t * (0x22 - 0x2A));
    const g = Math.round(0x2F + t * (0xC5 - 0x2F));
    const b = Math.round(0x40 + t * (0x5E - 0x40));
    return `rgb(${r},${g},${b})`;
  } else {
    // Negative side: Neutral → Vibrant Red
    const t = min < mid ? (mid - v) / (mid - min) : 0;
    // From #2A2F40 (brighter neutral) to vibrant red #EF4444
    const r = Math.round(0x2A + t * (0xEF - 0x2A));
    const g = Math.round(0x2F + t * (0x44 - 0x2F));
    const b = Math.round(0x40 + t * (0x44 - 0x40));
    return `rgb(${r},${g},${b})`;
  }
}

/**
 * Percentile-based symmetric clamping for heatmap color ranges.
 * Prevents outliers (e.g. one -77% stock) from compressing the scale for the majority.
 * @param {number[]} values - Array of change percentages
 * @param {number} maxBound - Maximum absolute bound (default ±5%)
 * @returns {{ min: number, max: number, hasOutliers: boolean }}
 */
export function clampColorRange(values, maxBound = 5) {
  if (!values.length) return { min: -1, max: 1, hasOutliers: false };

  const sorted = [...values].sort((a, b) => a - b);
  const len = sorted.length;
  const p2 = sorted[Math.floor(len * 0.02)] ?? sorted[0];
  const p98 = sorted[Math.min(Math.ceil(len * 0.98), len - 1)] ?? sorted[len - 1];

  const rawMin = Math.min(p2, -1);
  const rawMax = Math.max(p98, 1);

  const min = Math.max(rawMin, -maxBound);
  const max = Math.min(rawMax, maxBound);

  const actualMin = sorted[0];
  const actualMax = sorted[len - 1];
  const hasOutliers = actualMin < min || actualMax > max;

  return { min, max, hasOutliers };
}

/**
 * WCAG-aware text color for a given background.
 * @param {string} rgbString - CSS rgb() string, e.g. "rgb(42,47,64)"
 * @returns {string} Light or dark text color hex
 */
export function getTextColorForBg(rgbString) {
  const match = rgbString.match(/(\d+)/g);
  if (!match || match.length < 3) return '#E8EAED';
  const [r, g, b] = match.map(Number);
  // Relative luminance (sRGB)
  const toLinear = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return L > 0.18 ? '#0B0E11' : '#E8EAED';
}
