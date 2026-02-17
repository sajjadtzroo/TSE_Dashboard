import {
  IconDashboard,
  IconChartBar,
  IconBuildingBank,
  IconCreditCard,
  IconArrowsExchange,
  IconCalculator,
  IconTrendingUp,
  IconUpload,
  IconBell,
  type TablerIcon,
} from '@tabler/icons-react';

export interface NavigationItem {
  name: string;
  href: string;
  icon: TablerIcon;
}

export interface NavigationGroup {
  title: string;
  id: string;
  items: NavigationItem[];
}

export const navigationGroups: NavigationGroup[] = [
  {
    title: 'اصلی',
    id: 'main',
    items: [
      { name: 'داشبورد', href: '/', icon: IconDashboard },
      { name: 'تحلیل وام‌ها', href: '/analytics', icon: IconChartBar },
    ],
  },
  {
    title: 'جستجو و مقایسه',
    id: 'search-compare',
    items: [
      { name: 'بانک‌ها', href: '/banks', icon: IconBuildingBank },
      { name: 'وام‌ها', href: '/loans', icon: IconCreditCard },
      { name: 'مقایسه وام‌ها', href: '/compare', icon: IconArrowsExchange },
    ],
  },
  {
    title: 'ابزارها',
    id: 'tools',
    items: [
      { name: 'ماشین حساب‌ها', href: '/calculators', icon: IconCalculator },
      { name: 'بهینه‌ساز وام', href: '/loan-optimizer', icon: IconTrendingUp },
      { name: 'واردات داده', href: '/import', icon: IconUpload },
    ],
  },
  {
    title: 'شخصی',
    id: 'personal',
    items: [
      { name: 'وام‌های من', href: '/my-loans', icon: IconBell },
    ],
  },
];
