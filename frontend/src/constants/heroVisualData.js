/* ── Realistic TEPIX 30-day data ─────────────────────────────── */
export const TEPIX = [
  2302000, 2318000, 2310000, 2328000, 2345000, 2336000, 2358000, 2372000,
  2360000, 2348000, 2365000, 2382000, 2398000, 2384000, 2368000, 2354000,
  2342000, 2360000, 2378000, 2394000, 2408000, 2400000, 2416000, 2432000,
  2420000, 2438000, 2452000, 2444000, 2458000, 2462000,
];

/* Volume data (correlated) */
export const VOLUME = [
  55, 62, 40, 70, 58, 45, 80, 50, 48, 72, 60, 44, 38, 65, 52, 68,
  75, 42, 56, 48, 70, 63, 38, 44, 82, 55, 66, 50, 72, 88,
];

/* Static UI data */
export const STATS = [
  { label: 'شاخص کل',      value: '۲٬۴۶۲٬۰۰۰', delta: '+۱.۲٪', up: true  },
  { label: 'ارزش معاملات', value: '۸۵٬۲۰۰ B',   delta: '+۳.۵٪', up: true  },
  { label: 'حجم معاملات',  value: '۴.۲ B',       delta: '-۰.۸٪', up: false },
];

export const TABS = ['داشبورد', 'نقشه گرمایی', 'اختیار معامله'];

export const STOCKS = [
  { name: 'فارس',  price: '۱۲٬۴۵۰', pct: '+۲.۴٪', up: true,  bars: [0.40, 0.65, 0.92] },
  { name: 'خودرو', price: '۴٬۱۲۰',  pct: '+۱.۱٪', up: true,  bars: [0.52, 0.70, 0.85] },
  { name: 'شپنا',  price: '۷٬۸۵۰',  pct: '-۰.۸٪', up: false, bars: [0.88, 0.60, 0.38] },
  { name: 'وبملت', price: '۳٬۲۱۰',  pct: '+۰.۵٪', up: true,  bars: [0.44, 0.68, 0.88] },
];

export const TIME_LABELS = ['۱ بهمن', '۱۰ بهمن', '۲۰ بهمن', '۳۰ بهمن'];

/* Chart coordinate constants */
export const CHART = {
  CX0: 48, CX1: 458, CY0: 268, CY1: 97,
  VOL_TOP: 274, VOL_BOTTOM: 297,
};

/* Grid price levels for Y-axis */
export const GRID_LEVELS = [2320000, 2360000, 2400000, 2440000];
