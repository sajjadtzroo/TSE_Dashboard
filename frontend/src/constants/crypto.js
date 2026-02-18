// Crypto coin categories for treemap/heatmap grouping
export const CRYPTO_CATEGORIES = {
  'Layer 1': ['BTC', 'ETH', 'SOL', 'ADA', 'AVAX', 'DOT', 'NEAR', 'APT', 'SUI', 'SEI', 'ATOM'],
  'Layer 2': ['MATIC', 'ARB', 'OP'],
  'DeFi': ['UNI', 'AAVE', 'INJ', 'JUP', 'LINK'],
  'AI': ['FET', 'RENDER', 'TAO', 'WLD'],
  'Meme': ['DOGE', 'PEPE'],
  'Storage': ['FIL'],
  'Other': ['BNB', 'XRP', 'LTC', 'TIA', 'LTC'],
};

export const CRYPTO_INTERVALS = [
  { value: '1hour', label: '\u06F1 \u0633\u0627\u0639\u062A' },
  { value: '4hour', label: '\u06F4 \u0633\u0627\u0639\u062A' },
  { value: '1day', label: '\u06F1 \u0631\u0648\u0632' },
  { value: '1week', label: '\u06F1 \u0647\u0641\u062A\u0647' },
];

export const CRYPTO_TIMEFRAMES = [
  { value: '24h', label: '\u06F2\u06F4h', days: 1 },
  { value: '7d', label: '\u06F7D', days: 7 },
  { value: '30d', label: '\u06F3\u06F0D', days: 30 },
  { value: '90d', label: '\u06F9\u06F0D', days: 90 },
  { value: '1y', label: '\u06F1Y', days: 365 },
];

export const CRYPTO_REFRESH_INTERVAL = 30_000; // 30s
export const CRYPTO_OHLCV_STALE_TIME = 60_000; // 60s
export const CRYPTO_TICKER_STALE_TIME = 30_000; // 30s

// Fear & Greed labels in Persian
export const FEAR_GREED_LABELS = {
  'Extreme Fear': '\u062A\u0631\u0633 \u0634\u062F\u06CC\u062F',
  'Fear': '\u062A\u0631\u0633',
  'Neutral': '\u062E\u0646\u062B\u06CC',
  'Greed': '\u0637\u0645\u0639',
  'Extreme Greed': '\u0637\u0645\u0639 \u0634\u062F\u06CC\u062F',
};
