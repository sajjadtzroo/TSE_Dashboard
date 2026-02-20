// ── Quick filter preset definitions ────────────────────────────────────────
// Shared across TSE market pages to avoid duplicating preset arrays.

export const MARKET_QUICK_FILTERS = [
  { key: 'top-gainers', label: 'بیشترین رشد', icon: 'trending-up' },
  { key: 'top-losers', label: 'بیشترین افت', icon: 'trending-down' },
  { key: 'high-volume', label: 'حجم بالا', icon: 'volume' },
  { key: 'most-trades', label: 'معاملات بالا', icon: 'flame' },
];

export const FUND_QUICK_FILTERS = [
  { key: 'top-gainers', label: 'بیشترین رشد', icon: 'trending-up' },
  { key: 'top-losers', label: 'بیشترین افت', icon: 'trending-down' },
  { key: 'top-volume', label: 'بیشترین حجم', icon: 'volume' },
  { key: 'top-trades', label: 'بیشترین معاملات', icon: 'flame' },
];

export const ETF_QUICK_FILTERS = [
  { key: 'positive-bubble', label: 'حباب مثبت', icon: 'trending-up' },
  { key: 'negative-bubble', label: 'حباب منفی', icon: 'trending-down' },
  { key: 'highest-nav', label: 'بالاترین NAV', icon: 'chart' },
];

export const CLIENT_TYPE_QUICK_FILTERS = [
  { key: 'strong-real-buy', label: 'خرید قوی حقیقی', icon: 'trending-up' },
  { key: 'strong-legal-buy', label: 'خرید قوی حقوقی', icon: 'building' },
  { key: 'divergence', label: 'واگرایی حقیقی/حقوقی', icon: 'exchange' },
];
