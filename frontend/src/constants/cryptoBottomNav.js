import {
  IconCurrencyBitcoin,
  IconChartTreemap,
  IconScale,
  IconChartPie,
} from '@tabler/icons-react';

export const cryptoBottomNavItems = [
  { label: '\u062F\u0627\u0634\u0628\u0648\u0631\u062F', icon: IconCurrencyBitcoin, path: '/crypto' },
  { label: '\u0646\u0642\u0634\u0647', icon: IconChartTreemap, path: '/crypto/heatmap' },
  { label: '\u0645\u0642\u0627\u06CC\u0633\u0647', icon: IconScale, path: '/crypto/compare' },
  { label: '\u0627\u0631\u0632\u0634 \u0628\u0627\u0632\u0627\u0631', icon: IconChartPie, path: '/crypto/market-cap' },
];
