// Convert English/Arabic numerals to Persian numerals
export const toPersianNum = (str) => {
  if (str == null || str === '') return str;
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(str).replace(/\d/g, (digit) => persianDigits[parseInt(digit)]);
};

// Format number with Persian numerals and thousand separators
export const formatNum = (n) => {
  if (n == null || n === '') return '-';
  if (n === Infinity || n === -Infinity) return 'نامحدود';

  // Format with locale (adds thousand separators)
  const formatted = n.toLocaleString('en-US', { maximumFractionDigits: 2 });

  // Convert to Persian numerals
  return toPersianNum(formatted);
};

// Format large numbers with Persian letters (T, B, M)
export const formatTrillion = (v) => {
  if (v == null) return '-';

  const t = v / 1e12;
  if (Math.abs(t) >= 1) return toPersianNum(t.toFixed(2)) + 'T';

  const b = v / 1e9;
  if (Math.abs(b) >= 1) return toPersianNum(b.toFixed(1)) + 'B';

  const m = v / 1e6;
  return toPersianNum(m.toFixed(0)) + 'M';
};

// Format percentage with Persian numerals
export const formatPercent = (n, decimals = 2) => {
  if (n == null) return '-';
  const formatted = n.toFixed(decimals);
  return toPersianNum(formatted) + '٪';
};

// Format a metric value — returns "N/A" for null/undefined, else formats with decimals
export const formatMetric = (value, decimals = 2, suffix = '') => {
  if (value == null || !isFinite(value)) return 'N/A';
  const formatted = value.toFixed(decimals);
  return toPersianNum(formatted) + suffix;
};
