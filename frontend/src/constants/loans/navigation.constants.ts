import {
  IconDashboard,
  IconChartBar,
  IconBuildingBank,
  IconCreditCard,
  IconArrowsExchange,
  IconCalculator,
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
      { name: 'داشبورد', href: '/loans', icon: IconDashboard },
      { name: 'تحلیل وام‌ها', href: '/loans/analytics', icon: IconChartBar },
    ],
  },
  {
    title: 'جستجو و مقایسه',
    id: 'search-compare',
    items: [
      { name: 'بانک‌ها', href: '/loans/banks', icon: IconBuildingBank },
      { name: 'وام‌ها', href: '/loans/list', icon: IconCreditCard },
      { name: 'مقایسه وام‌ها', href: '/loans/compare', icon: IconArrowsExchange },
    ],
  },
  {
    title: 'ابزارها',
    id: 'tools',
    items: [
      { name: 'ماشین حساب‌ها', href: '/loans/calculators', icon: IconCalculator },
      { name: 'واردات داده', href: '/loans/import', icon: IconUpload },
    ],
  },
  {
    title: 'شخصی',
    id: 'personal',
    items: [
      { name: 'وام‌های من', href: '/loans/my-loans', icon: IconBell },
    ],
  },
];
