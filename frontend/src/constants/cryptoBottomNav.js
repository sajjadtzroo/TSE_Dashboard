import {
  IconCurrencyBitcoin,
  IconChartTreemap,
  IconScale,
  IconChartPie,
} from '@tabler/icons-react';

export const cryptoBottomNavItems = [
  { label: 'داشبورد', icon: IconCurrencyBitcoin, path: '/crypto' },
  { label: 'نقشه', icon: IconChartTreemap, path: '/crypto/heatmap' },
  { label: 'مقایسه', icon: IconScale, path: '/crypto/compare' },
  { label: 'ارزش بازار', icon: IconChartPie, path: '/crypto/market-cap' },
];
