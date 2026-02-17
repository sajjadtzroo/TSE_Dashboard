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
      { name: 'داشبورد', href: '/dashboard/loans', icon: IconDashboard },
      { name: 'تحلیل وام‌ها', href: '/dashboard/loans/analytics', icon: IconChartBar },
    ],
  },
  {
    title: 'جستجو و مقایسه',
    id: 'search-compare',
    items: [
      { name: 'بانک‌ها', href: '/dashboard/loans/banks', icon: IconBuildingBank },
      { name: 'وام‌ها', href: '/dashboard/loans/list', icon: IconCreditCard },
      { name: 'مقایسه وام‌ها', href: '/dashboard/loans/compare', icon: IconArrowsExchange },
    ],
  },
  {
    title: 'ابزارها',
    id: 'tools',
    items: [
      { name: 'ماشین حساب‌ها', href: '/dashboard/loans/calculators', icon: IconCalculator },
      { name: 'واردات داده', href: '/dashboard/loans/import', icon: IconUpload },
    ],
  },
  {
    title: 'شخصی',
    id: 'personal',
    items: [
      { name: 'وام‌های من', href: '/dashboard/loans/my-loans', icon: IconBell },
    ],
  },
];
