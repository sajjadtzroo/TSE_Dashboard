/**
 * Crypto fundamentals page configuration — metric definitions & window options
 */

// ── Metric definitions (row order in table) ─────────────────────────────────

export const METRIC_DEFS = [
  { key: 'close',        label: 'قیمت پایانی',       format: 'usd' },
  { key: 'return_pct',   label: 'بازدهی ماهانه',      format: 'pct' },
  { key: 'high',         label: 'بیشترین قیمت',       format: 'usd' },
  { key: 'low',          label: 'کمترین قیمت',        format: 'usd' },
  { key: 'avg_volume',   label: 'میانگین حجم روزانه',  format: 'volume' },
  { key: 'total_volume', label: 'حجم کل',             format: 'volume' },
  { key: 'volatility',   label: 'نوسان‌پذیری سالانه',  format: 'pct' },
  { key: 'max_drawdown', label: 'حداکثر افت',          format: 'pct' },
];

// ── Hot metrics (bold/highlighted rows) ─────────────────────────────────────

export const HOT_METRICS = new Set([
  'close',
  'return_pct',
  'volatility',
  'max_drawdown',
]);

// ── Time window options ─────────────────────────────────────────────────────

export const WINDOW_OPTIONS = [
  { value: '6',  label: '۶ ماه' },
  { value: '12', label: '۱۲ ماه' },
  { value: '24', label: '۲۴ ماه' },
];
