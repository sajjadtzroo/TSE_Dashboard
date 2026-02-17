import {
  LayoutDashboard,
  BarChart3,
  Building2,
  CreditCard,
  GitCompare,
  Calculator,
  Upload,
  Bell,
  type LucideIcon,
} from 'lucide-react';

/**
 * Navigation item structure
 */
export interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

/**
 * Navigation group structure
 */
export interface NavigationGroup {
  title: string;
  id: string;
  items: NavigationItem[];
}

/**
 * Grouped sidebar navigation structure
 *
 * 4 logical groups:
 * 1. اصلی (Main) - Dashboard and Analytics
 * 2. جستجو و مقایسه (Search & Compare) - Banks, Loans, Compare
 * 3. ابزارها (Tools) - Calculators, Import
 * 4. شخصی (Personal) - My Loans/Alerts
 */
export const navigationGroups: NavigationGroup[] = [
  {
    title: 'اصلی',
    id: 'main',
    items: [
      { name: 'داشبورد', href: '/', icon: LayoutDashboard },
      { name: 'تحلیل وام‌ها', href: '/analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'جستجو و مقایسه',
    id: 'search-compare',
    items: [
      { name: 'بانک‌ها', href: '/banks', icon: Building2 },
      { name: 'وام‌ها', href: '/loans', icon: CreditCard },
      { name: 'مقایسه وام‌ها', href: '/compare', icon: GitCompare },
    ],
  },
  {
    title: 'ابزارها',
    id: 'tools',
    items: [
      { name: 'ماشین حساب‌ها', href: '/calculators', icon: Calculator },
      { name: 'واردات داده', href: '/import', icon: Upload },
    ],
  },
  {
    title: 'شخصی',
    id: 'personal',
    items: [
      { name: 'وام‌های من', href: '/my-loans', icon: Bell },
    ],
  },
];
