// Crypto coin categories for treemap/heatmap grouping
export const CRYPTO_CATEGORIES = {
  'Layer 1': ['BTC', 'ETH', 'SOL', 'ADA', 'AVAX', 'DOT', 'NEAR', 'APT', 'SUI', 'SEI', 'ATOM', 'HBAR', 'ICP', 'ETC', 'XLM', 'STX', 'TON', 'TRX'],
  'Layer 2': ['POL', 'ARB', 'OP', 'TIA'],
  'DeFi': ['UNI', 'AAVE', 'INJ', 'JUP', 'LINK', 'OM'],
  'AI': ['FET', 'RENDER', 'TAO', 'WLD'],
  'Meme': ['DOGE', 'PEPE', 'SHIB', 'BONK', 'APE'],
  'Storage': ['FIL'],
  'Other': ['BNB', 'XRP', 'LTC', 'BCH', 'USDT', 'XMR'],
};

export const CRYPTO_CATEGORY_LABELS = {
  'Layer 1': 'لایه ۱',
  'Layer 2': 'لایه ۲',
  'DeFi': 'دیفای',
  'AI': 'هوش مصنوعی',
  'Meme': 'میم‌کوین',
  'Storage': 'ذخیره‌سازی',
  'Other': 'سایر',
};

export function getCryptoCategory(symbol) {
  const sym = (symbol || '').toUpperCase();
  for (const [cat, symbols] of Object.entries(CRYPTO_CATEGORIES)) {
    if (symbols.includes(sym)) return cat;
  }
  return null;
}

export const CRYPTO_INTERVALS = [
  { value: '1hour', label: '۱ ساعت' },
  { value: '4hour', label: '۴ ساعت' },
  { value: '1day', label: '۱ روز' },
  { value: '1week', label: '۱ هفته' },
];

export const CRYPTO_TIMEFRAMES = [
  { value: '24h', label: '۲۴h', days: 1 },
  { value: '7d', label: '۷D', days: 7 },
  { value: '30d', label: '۳۰D', days: 30 },
  { value: '90d', label: '۹۰D', days: 90 },
  { value: '1y', label: '۱Y', days: 365 },
];

export const CRYPTO_RISK_FREE_RATE = 0.05; // USD-based risk-free rate (US T-bill proxy)
export const CRYPTO_REFRESH_INTERVAL = 30_000; // 30s
export const CRYPTO_OHLCV_STALE_TIME = 60_000; // 60s
export const CRYPTO_TICKER_STALE_TIME = 30_000; // 30s

// Sections removed from dashboard — now accessible via sidebar navigation:
// charts → /crypto/screener, category → /crypto/category-rotation,
// volatility → /crypto/risk-analytics, heatmap → /crypto/heatmap,
// deribit → /crypto/futures + /crypto/options
export const CRYPTO_DASHBOARD_SECTIONS = [];

// Fear & Greed labels in Persian
export const FEAR_GREED_LABELS = {
  'Extreme Fear': 'ترس شدید',
  'Fear': 'ترس',
  'Neutral': 'خنثی',
  'Greed': 'طمع',
  'Extreme Greed': 'طمع شدید',
};
