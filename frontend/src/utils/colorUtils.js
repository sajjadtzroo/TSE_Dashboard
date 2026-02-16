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
  const v = Math.max(min, Math.min(max, value));
  const mid = 0;
  if (v >= mid) {
    const t = max > mid ? (v - mid) / (max - mid) : 0;
    const r = Math.round(0x47 + t * (0x10 - 0x47));
    const g = Math.round(0x55 + t * (0xB9 - 0x55));
    const b = Math.round(0x69 + t * (0x81 - 0x69));
    return `rgb(${r},${g},${b})`;
  } else {
    const t = min < mid ? (mid - v) / (mid - min) : 0;
    const r = Math.round(0x47 + t * (0xEF - 0x47));
    const g = Math.round(0x55 + t * (0x44 - 0x55));
    const b = Math.round(0x69 + t * (0x44 - 0x69));
    return `rgb(${r},${g},${b})`;
  }
}
