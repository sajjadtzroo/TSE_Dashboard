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

/**
 * Convert a Jalali (Shamsi) date string to a JavaScript Date object.
 * Accepts "1404/11/29" or "1404-11-29" format.
 * @param {string} shamsiStr
 * @returns {Date|null} Gregorian Date, or null on failure
 */
export function fromJalali(shamsiStr) {
  if (!shamsiStr) return null;
  const parts = String(shamsiStr).replace(/\//g, '-').split('-');
  if (parts.length < 3) return null;
  const jy = parseInt(parts[0], 10);
  const jm = parseInt(parts[1], 10);
  const jd = parseInt(parts[2], 10);
  if (isNaN(jy) || isNaN(jm) || isNaN(jd)) return null;
  try {
    const { gy, gm, gd } = jalaali.toGregorian(jy, jm, jd);
    return new Date(gy, gm - 1, gd);
  } catch {
    return null;
  }
}

/**
 * Compute time-to-expiry in years from a Shamsi or Gregorian date string.
 * @param {string} expiryDate — e.g. "1404/11/29" (Shamsi) or "2026-02-18" (ISO)
 * @returns {number} years to expiry, or 0 if expired/invalid
 */
export function computeT(expiryDate) {
  if (!expiryDate) return 0;
  // Shamsi dates have year >= 1300; Gregorian dates have year >= 1900
  const year = parseInt(String(expiryDate).split(/[-/]/)[0], 10);
  const expiry = (year > 0 && year < 1800) ? fromJalali(expiryDate) : new Date(expiryDate);
  if (!expiry || isNaN(expiry.getTime())) return 0;
  const diffMs = expiry - new Date();
  if (diffMs <= 0) return 0;
  return diffMs / (365.25 * 24 * 60 * 60 * 1000);
}
