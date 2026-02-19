import {
  IconCurrencyBitcoin,
  IconChartCandle,
  IconChartTreemap,
  IconScale,
  IconChartPie,
  IconStar,
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
];
