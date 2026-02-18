import {
  IconCurrencyBitcoin,
  IconChartCandle,
  IconChartTreemap,
  IconScale,
  IconChartPie,
} from '@tabler/icons-react';

export const cryptoMenuSections = [
  {
    label: '\u0628\u0627\u0632\u0627\u0631 \u0631\u0645\u0632\u0627\u0631\u0632',
    items: [
      { text: '\u062F\u0627\u0634\u0628\u0648\u0631\u062F', icon: IconCurrencyBitcoin, path: '/crypto' },
      { text: '\u0646\u0642\u0634\u0647 \u0628\u0627\u0632\u0627\u0631', icon: IconChartTreemap, path: '/crypto/heatmap' },
      { text: '\u0645\u0642\u0627\u06CC\u0633\u0647', icon: IconScale, path: '/crypto/compare' },
      { text: '\u0627\u0631\u0632\u0634 \u0628\u0627\u0632\u0627\u0631', icon: IconChartPie, path: '/crypto/market-cap' },
    ],
  },
];
