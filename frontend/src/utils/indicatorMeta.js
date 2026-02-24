/**
 * Indicator metadata — labels, colors, categories, KLineChart mapping.
 *
 * klcId       : KLineChart built-in indicator name
 * klcParams   : calcParams array passed to createIndicator
 * isOverlay   : true → stacked on main candle pane; false → new sub-pane
 */
const indicatorMeta = {
  // ── Overlay: Moving Averages ──────────────────────────────────────────
  sma10:  { label: 'SMA(10)',  color: '#F59E0B', category: 'overlay', desc: 'میانگین متحرک ساده ۱۰',  klcId: 'MA',   klcParams: [10],       isOverlay: true  },
  sma20:  { label: 'SMA(20)',  color: '#3B82F6', category: 'overlay', desc: 'میانگین متحرک ساده ۲۰',  klcId: 'MA',   klcParams: [20],       isOverlay: true  },
  sma50:  { label: 'SMA(50)',  color: '#8B5CF6', category: 'overlay', desc: 'میانگین متحرک ساده ۵۰',  klcId: 'MA',   klcParams: [50],       isOverlay: true  },
  sma100: { label: 'SMA(100)', color: '#EC4899', category: 'overlay', desc: 'میانگین متحرک ساده ۱۰۰', klcId: 'MA',   klcParams: [100],      isOverlay: true  },
  sma200: { label: 'SMA(200)', color: '#EF4444', category: 'overlay', desc: 'میانگین متحرک ساده ۲۰۰', klcId: 'MA',   klcParams: [200],      isOverlay: true  },
  ema12:  { label: 'EMA(12)',  color: '#06B6D4', category: 'overlay', desc: 'میانگین متحرک نمایی ۱۲', klcId: 'EMA',  klcParams: [12],       isOverlay: true  },
  ema26:  { label: 'EMA(26)',  color: '#14B8A6', category: 'overlay', desc: 'میانگین متحرک نمایی ۲۶', klcId: 'EMA',  klcParams: [26],       isOverlay: true  },
  ema50:  { label: 'EMA(50)',  color: '#D946EF', category: 'overlay', desc: 'میانگین متحرک نمایی ۵۰', klcId: 'EMA',  klcParams: [50],       isOverlay: true  },
  ema200: { label: 'EMA(200)', color: '#F43F5E', category: 'overlay', desc: 'میانگین متحرک نمایی ۲۰۰',klcId: 'EMA',  klcParams: [200],      isOverlay: true  },

  // ── Overlay: Bands ────────────────────────────────────────────────────
  bollinger: { label: 'Bollinger', color: '#A78BFA', category: 'overlay', desc: 'باندهای بولینگر',    klcId: 'BOLL', klcParams: [20, 2],    isOverlay: true  },
  vwap:      { label: 'VWAP',      color: '#FB923C', category: 'overlay', desc: 'میانگین وزنی حجمی', klcId: 'AVP',  klcParams: [],         isOverlay: true  },

  // ── Sub-chart: Momentum ───────────────────────────────────────────────
  rsi:        { label: 'RSI(14)',      color: '#F59E0B', category: 'subchart', desc: 'شاخص قدرت نسبی',                  klcId: 'RSI',  klcParams: [14],      isOverlay: false },
  macd:       { label: 'MACD',         color: '#3B82F6', category: 'subchart', desc: 'واگرایی همگرایی میانگین متحرک',   klcId: 'MACD', klcParams: [12,26,9], isOverlay: false },
  stochastic: { label: 'Stochastic',   color: '#8B5CF6', category: 'subchart', desc: 'اسیلاتور استوکستیک',             klcId: 'KDJ',  klcParams: [9,3,3],   isOverlay: false },
  williamsR:  { label: 'Williams %R',  color: '#E879F9', category: 'subchart', desc: 'ویلیامز %R',                      klcId: 'WR',   klcParams: [14],      isOverlay: false },
  cci:        { label: 'CCI(20)',       color: '#2DD4BF', category: 'subchart', desc: 'شاخص کانال کالا',                klcId: 'CCI',  klcParams: [20],      isOverlay: false },
  roc:        { label: 'ROC(12)',       color: '#FB7185', category: 'subchart', desc: 'نرخ تغییر',                       klcId: 'ROC',  klcParams: [12],      isOverlay: false },

  // ── Sub-chart: Trend & Volume ─────────────────────────────────────────
  adx: { label: 'ADX(14)', color: '#FBBF24', category: 'subchart', desc: 'شاخص جهت‌دار میانگین', klcId: 'DMI', klcParams: [14, 6], isOverlay: false },
  obv: { label: 'OBV',     color: '#EC4899', category: 'subchart', desc: 'حجم تعادلی',           klcId: 'OBV', klcParams: [],      isOverlay: false },
};

export default indicatorMeta;
