import {
  IconDashboard,
  IconChartBar,
  IconBuildingBank,
  IconArrowsExchange,
  IconFlame,
  IconTimeline,
  IconTrendingUp,
  IconCoin,
  IconCurrencyDollar,
  IconFileText,
  IconCertificate,
  IconWallet,
  IconArrowForward,
  IconTruck,
  IconGridDots,
  IconUsers,
  IconFilter,
  IconServer,
  IconStar,
  IconCalculator,
  IconChartDonut,
} from '@tabler/icons-react';

export const menuSections = [
  {
    label: 'بازارها',
    items: [
      { text: 'داشبورد', icon: IconDashboard, path: '/dashboard' },
      { text: 'نمای بازار', icon: IconChartBar, path: '/dashboard/market' },
      { text: 'نقشه بازار', icon: IconGridDots, path: '/dashboard/heatmap' },
      { text: 'حقیقی و حقوقی', icon: IconUsers, path: '/dashboard/client-type' },
      { text: 'فیلتر', icon: IconFilter, path: '/dashboard/screener' },
      { text: 'شاخص‌ها', icon: IconTrendingUp, path: '/dashboard/market-indices' },
      { text: 'NAV صندوق‌ها', icon: IconCoin, path: '/dashboard/etf-nav' },
      { text: 'قیمت بازارها', icon: IconCurrencyDollar, path: '/dashboard/market-prices' },
      { text: 'صندوق‌های سرمایه‌گذاری', icon: IconBuildingBank, path: '/dashboard/funds' },
    ],
  },
  {
    label: 'اختیار معامله و مشتقات',
    items: [
      { text: 'اختیار معامله', icon: IconArrowsExchange, path: '/dashboard/options' },
      { text: 'محاسبه‌گر سود/زیان', icon: IconCalculator, path: '/dashboard/options-calculator' },
      { text: 'کاوشگر اختیار', icon: IconChartDonut, path: '/dashboard/options-explorer' },
    ],
  },
  {
    label: 'بورس کالا',
    items: [
      { text: 'اختیار کالا', icon: IconFlame, path: '/dashboard/ime-options' },
      { text: 'آتی کالا', icon: IconTimeline, path: '/dashboard/ime-futures' },
      { text: 'گواهی سپرده', icon: IconCertificate, path: '/dashboard/ime-certificates' },
      { text: 'صندوق کالایی', icon: IconWallet, path: '/dashboard/ime-funds' },
      { text: 'سلف کالا', icon: IconArrowForward, path: '/dashboard/ime-forwards' },
      { text: 'فیزیکی', icon: IconTruck, path: '/dashboard/ime-physical' },
    ],
  },
  {
    label: 'ابزارها',
    items: [
      { text: 'کدال', icon: IconFileText, path: '/dashboard/codal' },
      { text: 'دیده‌بان', icon: IconStar, path: '/dashboard/watchlist' },
      { text: 'مقایسه', icon: IconChartBar, path: '/dashboard/compare' },
    ],
  },
  {
    label: 'سیستم',
    items: [
      { text: 'سیستم', icon: IconServer, path: '/dashboard/system' },
    ],
  },
];
