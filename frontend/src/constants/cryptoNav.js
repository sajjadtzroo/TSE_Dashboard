import {
  IconCurrencyBitcoin,
  IconChartTreemap,
  IconScale,
  IconChartPie,
  IconStar,
  IconChartLine,
  IconBinaryTree,
  IconShieldCheck,
  IconChartBar,
  IconTargetArrow,
  IconMathFunction,
  IconTrendingUp,
  IconFilter,
  IconChartCandle,
  IconArrowsExchange,
  IconNews,
} from '@tabler/icons-react';

export const cryptoMenuSections = [
  {
    label: 'بازار رمزارز',
    items: [
      { text: 'داشبورد', icon: IconCurrencyBitcoin, path: '/crypto' },
      { text: 'نقشه بازار', icon: IconChartTreemap, path: '/crypto/heatmap' },
      { text: 'مقایسه', icon: IconScale, path: '/crypto/compare' },
      { text: 'دیده‌بان', icon: IconStar, path: '/crypto/watchlist' },
      { text: 'ارزش بازار', icon: IconChartPie, path: '/crypto/market-cap' },
    ],
  },
  {
    label: 'تحلیل و فیلتر',
    items: [
      { text: 'فیلتر رمزارزها', icon: IconFilter, path: '/crypto/screener' },
      { text: 'تحلیل تکنیکال', icon: IconChartCandle, path: '/crypto/technical-analysis' },
      { text: 'چرخش دسته‌بندی', icon: IconArrowsExchange, path: '/crypto/category-rotation' },
      { text: 'تحلیل ریسک', icon: IconShieldCheck, path: '/crypto/risk-analytics' },
      { text: 'احساسات اخبار', icon: IconNews, path: '/crypto/news-sentiment' },
    ],
  },
  {
    label: 'اختیار معامله (Options)',
    items: [
      { text: 'جدول اختیار', icon: IconChartBar, path: '/crypto/options' },
      { text: 'کاوشگر اختیار', icon: IconTargetArrow, path: '/crypto/options/explorer' },
      { text: 'محاسبه‌گر اختیار', icon: IconMathFunction, path: '/crypto/options/calculator' },
      { text: 'تحلیل اختیار', icon: IconChartLine, path: '/crypto/options/analytics' },
      { text: 'درخت دوجمله‌ای', icon: IconBinaryTree, path: '/crypto/options/binomial' },
      { text: 'پوشش دلتا', icon: IconShieldCheck, path: '/crypto/options/hedging' },
    ],
  },
  {
    label: 'فیوچرز (Futures)',
    items: [
      { text: 'جدول فیوچرز', icon: IconTrendingUp, path: '/crypto/futures' },
      { text: 'محاسبه‌گر فیوچرز', icon: IconMathFunction, path: '/crypto/futures/calculator' },
    ],
  },
];
