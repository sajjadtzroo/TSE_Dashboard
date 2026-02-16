import rallyColors from '../theme/rallyColors';

export const getChangeColor = (value) => {
  if (value == null) return undefined;
  if (value > 0) return rallyColors.green;
  if (value < 0) return rallyColors.orange;
  return undefined;
};

export const getRedGreenColor = (value) => {
  if (value == null) return undefined;
  if (value > 0) return rallyColors.green;
  if (value < 0) return rallyColors.red;
  return undefined;
};

export function interpolateColor(value, min, max) {
  // Clamp value to min/max range
  const v = Math.max(min, Math.min(max, value));
  const mid = 0;

  if (v >= mid) {
    // Positive side: Neutral → Vibrant Green
    const t = max > mid ? (v - mid) / (max - mid) : 0;
    // From dark blue-gray #1C2030 to vibrant green #10B981
    const r = Math.round(0x1C + t * (0x10 - 0x1C));
    const g = Math.round(0x20 + t * (0xB9 - 0x20));
    const b = Math.round(0x30 + t * (0x81 - 0x30));
    return `rgb(${r},${g},${b})`;
  } else {
    // Negative side: Neutral → Vibrant Red
    const t = min < mid ? (mid - v) / (mid - min) : 0;
    // From dark blue-gray #1C2030 to vibrant red #EF4444
    const r = Math.round(0x1C + t * (0xEF - 0x1C));
    const g = Math.round(0x20 + t * (0x44 - 0x20));
    const b = Math.round(0x30 + t * (0x44 - 0x30));
    return `rgb(${r},${g},${b})`;
  }
}
