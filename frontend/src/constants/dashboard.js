export const DASHBOARD_SECTIONS = [
  { key: 'tedpix', label: 'شاخص کل' },
  { key: 'charts', label: 'نمودارها' },
  { key: 'indexCompare', label: 'مقایسه شاخص' },
  { key: 'heatmap', label: 'نقشه بازار' },
  { key: 'table', label: 'جدول' },
  { key: 'news', label: 'اخبار' },
];

export const AUTO_REFRESH_INTERVALS = [
  { label: 'خاموش', seconds: 0 },
  { label: '30s', seconds: 30 },
  { label: '1m', seconds: 60 },
  { label: '5m', seconds: 300 },
];

export const FILTER_OPTIONS = [
  { key: 'all', label: 'همه', colorClass: '' },
  { key: 'positive', label: 'مثبت', colorClass: 'filterPillPrimary' },
  { key: 'negative', label: 'منفی', colorClass: 'filterPillRed' },
  { key: 'gainers', label: 'برندگان (+۲٪)', colorClass: 'filterPillPrimary' },
  { key: 'losers', label: 'بازندگان (-۲٪)', colorClass: 'filterPillRed' },
  { key: 'high-volume', label: 'پرحجم', colorClass: 'filterPillBlue' },
];
