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

/**
 * Format a USD value with $ prefix and thousand separators.
 * @param {number | null | undefined} v
 * @returns {string} e.g. "$12,345.67" or "-"
 */
export const formatUsd = (v) => {
  if (v == null) return '-';
  return '$' + Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 });
};

/**
 * Format a large USD value with T/B/M abbreviation.
 * @param {number | null | undefined} v
 * @returns {string} e.g. "$1.23T", "$456.7B", "$78.9M" or "-"
 */
export const formatBig = (v) => {
  if (!v) return '-';
  if (v >= 1e12) return '$' + (v / 1e12).toFixed(2) + 'T';
  if (v >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'M';
  return '$' + Number(v).toLocaleString();
};

/**
 * Format a volume/value with T/B/M/K abbreviation (alias: formatVol, formatVolume).
 * @param {number | null | undefined} v
 * @returns {string} e.g. "$1.2B", "$345.6M", "$78K" or "-"
 */
export const formatVol = (v) => {
  if (!v) return '-';
  if (v >= 1e9) return '$' + (v / 1e9).toFixed(1) + 'B';
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return '$' + (v / 1e3).toFixed(0) + 'K';
  return '$' + Number(v).toLocaleString();
};

/** Alias for formatVol — used in table-section contexts. */
export const formatVolume = formatVol;

/**
 * Format a market-cap USD value with T/B/M abbreviation (0 decimal places for M).
 * @param {number | null | undefined} v
 * @returns {string} e.g. "$1.23T", "$456.78B", "$789M" or "-"
 */
export const formatMarketCap = (v) => {
  if (!v) return '-';
  if (v >= 1e12) return '$' + (v / 1e12).toFixed(2) + 'T';
  if (v >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(0) + 'M';
  return '$' + Number(v).toLocaleString();
};

/**
 * Format a TSE stock symbol for human-readable display.
 *
 * TSE encodes instrument class as a numeric suffix on the ticker:
 *   suffix 2 (stock) → حق تقدم      e.g. فملی2  → فملی ح
 *   suffix 4 (stock) → ح استفاده‌نشده e.g. فملی4  → فملی ح.ا
 *   suffix 2 (fund)  → واحد نوع ۲   e.g. آسا2   → آسا (نوع ۲)
 *   suffix 4 (fund)  → واحد نوع ۴   e.g. آسا4   → آسا (نوع ۴)
 *
 * A full symbol→display dictionary will replace this once provided.
 * Falls back to the raw symbol when no suffix or unknown type.
 *
 * @param {string | null | undefined} symbol - Raw DB symbol (e.g. "فملی2")
 * @param {string | null | undefined} type   - Security type ("stock" | "fund" | ...)
 * @returns {string} Display-friendly symbol
 */
export const formatSymbol = (symbol, type) => {
  if (!symbol) return symbol;
  const match = symbol.match(/^(.+?)([24])$/);
  if (!match) return symbol;
  const [, base, suffix] = match;
  if (type === 'stock' || type === undefined || type === null) {
    if (suffix === '2') return `${base} ح`;
    if (suffix === '4') return `${base} ح.ا`;
  }
  if (type === 'fund') {
    if (suffix === '2') return `${base} (نوع ۲)`;
    if (suffix === '4') return `${base} (نوع ۴)`;
  }
  return symbol;
};

/**
 * Normalize a Codal PDF/file URL — prepends https://codal.ir/ if relative.
 * @param {string | null | undefined} url
 * @returns {string | null} Absolute URL or null
 */
export const codalPdfUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `https://codal.ir/${url.replace(/^\/+/, '')}`;
};
