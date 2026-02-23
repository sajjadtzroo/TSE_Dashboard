/**
 * Indicator metadata — labels, colors, categories.
 */
const indicatorMeta = {
  // ── Overlay: Moving Averages ──────────────────────────────────────────
  sma10:  { label: 'SMA(10)', color: '#F59E0B', category: 'overlay', desc: 'میانگین متحرک ساده ۱۰' },
  sma20:  { label: 'SMA(20)', color: '#3B82F6', category: 'overlay', desc: 'میانگین متحرک ساده ۲۰' },
  sma50:  { label: 'SMA(50)', color: '#8B5CF6', category: 'overlay', desc: 'میانگین متحرک ساده ۵۰' },
  sma100: { label: 'SMA(100)', color: '#EC4899', category: 'overlay', desc: 'میانگین متحرک ساده ۱۰۰' },
  sma200: { label: 'SMA(200)', color: '#EF4444', category: 'overlay', desc: 'میانگین متحرک ساده ۲۰۰' },
  ema12:  { label: 'EMA(12)', color: '#06B6D4', category: 'overlay', desc: 'میانگین متحرک نمایی ۱۲' },
  ema26:  { label: 'EMA(26)', color: '#14B8A6', category: 'overlay', desc: 'میانگین متحرک نمایی ۲۶' },
  ema50:  { label: 'EMA(50)', color: '#D946EF', category: 'overlay', desc: 'میانگین متحرک نمایی ۵۰' },
  ema200: { label: 'EMA(200)', color: '#F43F5E', category: 'overlay', desc: 'میانگین متحرک نمایی ۲۰۰' },

  // ── Overlay: Bands & Cloud ────────────────────────────────────────────
  bollinger: { label: 'Bollinger', color: '#A78BFA', category: 'overlay', desc: 'باندهای بولینگر' },
  vwap:   { label: 'VWAP', color: '#FB923C', category: 'overlay', desc: 'میانگین وزنی حجمی' },
  ichimoku: { label: 'Ichimoku', color: '#22D3EE', category: 'overlay', desc: 'ابر ایچیموکو' },

  // ── Sub-chart: Momentum ───────────────────────────────────────────────
  rsi:    { label: 'RSI(14)', color: '#F59E0B', category: 'subchart', desc: 'شاخص قدرت نسبی' },
  macd:   { label: 'MACD', color: '#3B82F6', category: 'subchart', desc: 'واگرایی همگرایی میانگین متحرک' },
  stochastic: { label: 'Stochastic', color: '#8B5CF6', category: 'subchart', desc: 'اسیلاتور استوکستیک' },
  williamsR: { label: 'Williams %R', color: '#E879F9', category: 'subchart', desc: 'ویلیامز %R' },
  cci:    { label: 'CCI(20)', color: '#2DD4BF', category: 'subchart', desc: 'شاخص کانال کالا' },
  roc:    { label: 'ROC(12)', color: '#FB7185', category: 'subchart', desc: 'نرخ تغییر' },

  // ── Sub-chart: Trend & Volume ─────────────────────────────────────────
  adx:    { label: 'ADX(14)', color: '#FBBF24', category: 'subchart', desc: 'شاخص جهت‌دار میانگین' },
  mfi:    { label: 'MFI(14)', color: '#34D399', category: 'subchart', desc: 'شاخص جریان نقدینگی' },
  atr:    { label: 'ATR(14)', color: '#14B8A6', category: 'subchart', desc: 'میانگین محدوده واقعی' },
  obv:    { label: 'OBV', color: '#EC4899', category: 'subchart', desc: 'حجم تعادلی' },
};

export default indicatorMeta;
