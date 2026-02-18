/**
 * Convert English/Arabic numerals to Persian numerals.
 * @param {string | number | null | undefined} str - Value to convert
 * @returns {string | null | undefined} String with Persian digits, or original nullish value
 */
export const toPersianNum = (str) => {
  if (str == null || str === '') return str;
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(str).replace(/\d/g, (digit) => persianDigits[parseInt(digit)]);
};

/**
 * Format number with Persian numerals and thousand separators.
 * @param {number | null | undefined} n - Number to format
 * @returns {string} Formatted string (e.g. "۱,۲۳۴.۵۶") or "-" for null
 */
export const formatNum = (n) => {
  if (n == null || n === '') return '-';
  if (n === Infinity || n === -Infinity) return 'نامحدود';

  // Format with locale (adds thousand separators)
  const formatted = n.toLocaleString('en-US', { maximumFractionDigits: 2 });

  // Convert to Persian numerals
  return toPersianNum(formatted);
};

/**
 * Format large numbers with abbreviated suffixes (T=trillion, B=billion, M=million).
 * @param {number | null | undefined} v - Value in base units
 * @returns {string} Abbreviated Persian string (e.g. "۱.۲۳T") or "-" for null
 */
export const formatTrillion = (v) => {
  if (v == null) return '-';

  const t = v / 1e12;
  if (Math.abs(t) >= 1) return toPersianNum(t.toFixed(2)) + 'T';

  const b = v / 1e9;
  if (Math.abs(b) >= 1) return toPersianNum(b.toFixed(1)) + 'B';

  const m = v / 1e6;
  return toPersianNum(m.toFixed(0)) + 'M';
};

/**
 * Format percentage with Persian numerals and ٪ suffix.
 * @param {number | null | undefined} n - Percentage value
 * @param {number} [decimals=2] - Decimal places
 * @returns {string} e.g. "۳.۱۴٪" or "-" for null
 */
export const formatPercent = (n, decimals = 2) => {
  if (n == null) return '-';
  const formatted = n.toFixed(decimals);
  return toPersianNum(formatted) + '٪';
};

/**
 * Format a metric value with optional suffix. Returns "N/A" for null/undefined/Infinity.
 * @param {number | null | undefined} value - Metric value
 * @param {number} [decimals=2] - Decimal places
 * @param {string} [suffix=''] - Suffix to append (e.g. "%", "x")
 * @returns {string} Formatted Persian string or "N/A"
 */
export const formatMetric = (value, decimals = 2, suffix = '') => {
  if (value == null || !isFinite(value)) return 'N/A';
  const formatted = value.toFixed(decimals);
  return toPersianNum(formatted) + suffix;
};
