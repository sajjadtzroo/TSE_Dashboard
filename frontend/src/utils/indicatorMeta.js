/**
 * Indicator metadata — labels, colors, categories.
 */
const indicatorMeta = {
  sma10:  { label: 'SMA(10)', color: '#F59E0B', category: 'overlay', desc: 'میانگین متحرک ساده ۱۰' },
  sma20:  { label: 'SMA(20)', color: '#3B82F6', category: 'overlay', desc: 'میانگین متحرک ساده ۲۰' },
  sma50:  { label: 'SMA(50)', color: '#8B5CF6', category: 'overlay', desc: 'میانگین متحرک ساده ۵۰' },
  sma100: { label: 'SMA(100)', color: '#EC4899', category: 'overlay', desc: 'میانگین متحرک ساده ۱۰۰' },
  sma200: { label: 'SMA(200)', color: '#EF4444', category: 'overlay', desc: 'میانگین متحرک ساده ۲۰۰' },
  ema12:  { label: 'EMA(12)', color: '#06B6D4', category: 'overlay', desc: 'میانگین متحرک نمایی ۱۲' },
  ema26:  { label: 'EMA(26)', color: '#14B8A6', category: 'overlay', desc: 'میانگین متحرک نمایی ۲۶' },
  bollinger: { label: 'Bollinger', color: '#A78BFA', category: 'overlay', desc: 'باندهای بولینگر' },
  vwap:   { label: 'VWAP', color: '#FB923C', category: 'overlay', desc: 'میانگین وزنی حجمی' },
  rsi:    { label: 'RSI(14)', color: '#F59E0B', category: 'subchart', desc: 'شاخص قدرت نسبی' },
  macd:   { label: 'MACD', color: '#3B82F6', category: 'subchart', desc: 'واگرایی همگرایی میانگین متحرک' },
  stochastic: { label: 'Stochastic', color: '#8B5CF6', category: 'subchart', desc: 'اسیلاتور استوکستیک' },
  atr:    { label: 'ATR(14)', color: '#14B8A6', category: 'subchart', desc: 'میانگین محدوده واقعی' },
  obv:    { label: 'OBV', color: '#EC4899', category: 'subchart', desc: 'حجم تعادلی' },
};

export default indicatorMeta;
