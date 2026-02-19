import {
  IconDashboard,
  IconGridDots,
  IconFilter,
  IconArrowsExchange,
  IconDotsVertical,
} from '@tabler/icons-react';

const BOTTOM_NAV_ITEMS = [
  { key: 'dashboard', label: 'داشبورد', icon: IconDashboard, path: '/dashboard' },
  { key: 'heatmap', label: 'نقشه', icon: IconGridDots, path: '/dashboard/heatmap' },
  { key: 'screener', label: 'فیلتر', icon: IconFilter, path: '/dashboard/screener' },
  { key: 'options', label: 'اختیار', icon: IconArrowsExchange, path: '/dashboard/options' },
  { key: 'more', label: 'بیشتر', icon: IconDotsVertical, path: null },
];

export default BOTTOM_NAV_ITEMS;
