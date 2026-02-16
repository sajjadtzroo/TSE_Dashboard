import jalaali from 'jalaali-js';

/**
 * Convert a Gregorian date string (YYYY-MM-DD or YYYY/MM/DD) to Jalali format.
 * Returns "1404/11/28" style string, or the original value if parsing fails.
 */
export function toJalali(dateStr) {
  if (!dateStr) return '';
  const clean = String(dateStr).replace(/\//g, '-');
  const parts = clean.split('-');
  if (parts.length < 3) return dateStr;
  const gy = parseInt(parts[0], 10);
  const gm = parseInt(parts[1], 10);
  const gd = parseInt(parts[2], 10);
  if (isNaN(gy) || isNaN(gm) || isNaN(gd)) return dateStr;
  try {
    const { jy, jm, jd } = jalaali.toJalaali(gy, gm, gd);
    return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
  } catch {
    return dateStr;
  }
}

/**
 * Format a Gregorian date label (e.g. "MM-DD" or "YY-MM") to Jalali.
 * Handles partial dates by assuming current year/day defaults.
 */
export function toJalaliLabel(label, fullDate) {
  if (fullDate) return toJalali(fullDate);
  return label;
}
