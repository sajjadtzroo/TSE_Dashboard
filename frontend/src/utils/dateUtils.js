import jalaali from 'jalaali-js';

/**
 * Convert a Gregorian date string (YYYY-MM-DD or YYYY/MM/DD) to Jalali format.
 * Returns "1404/11/28" style string, or the original value if parsing fails.
 * @param {string | null | undefined} dateStr - Gregorian date string
 * @returns {string} Jalali date string or original value
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
 * Format a Gregorian date label to Jalali if a full date is provided.
 * @param {string} label - Short label (e.g. "MM-DD") used as fallback
 * @param {string | null | undefined} fullDate - Full Gregorian date for Jalali conversion
 * @returns {string} Jalali date or original label
 */
export function toJalaliLabel(label, fullDate) {
  if (fullDate) return toJalali(fullDate);
  return label;
}
