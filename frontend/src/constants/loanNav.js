import {
  IconDashboard,
  IconChartPie,
  IconBuildingBank,
  IconCreditCard,
  IconArrowsExchange,
  IconCalculator,
  IconUpload,
  IconBell,
  IconReportAnalytics,
  IconStars,
  IconSearch,
} from '@tabler/icons-react';

export const loanMenuSections = [
  {
    label: 'وام‌یار',
    items: [
      { text: 'مشاور هوشمند', icon: IconStars, path: '/loans/advisor' },
      { text: 'جستجوی هوشمند', icon: IconSearch, path: '/loans/advisor/chat' },
    ],
  },
  {
    label: 'اصلی',
    items: [
      { text: 'داشبورد', icon: IconDashboard, path: '/loans' },
      { text: 'تحلیل وام‌ها', icon: IconChartPie, path: '/loans/analytics' },
    ],
  },
  {
    label: 'جستجو و مقایسه',
    items: [
      { text: 'بانک‌ها', icon: IconBuildingBank, path: '/loans/banks' },
      { text: 'وام‌ها', icon: IconCreditCard, path: '/loans/list' },
      { text: 'مقایسه وام‌ها', icon: IconArrowsExchange, path: '/loans/compare' },
    ],
  },
  {
    label: 'ابزارها',
    items: [
      { text: 'ماشین‌حساب‌ها', icon: IconCalculator, path: '/loans/calculators' },
      { text: 'تحلیل مالی کامل', icon: IconReportAnalytics, path: '/loans/all-metrics' },
      { text: 'واردات داده', icon: IconUpload, path: '/loans/import' },
    ],
  },
  {
    label: 'شخصی',
    items: [
      { text: 'وام‌های من', icon: IconBell, path: '/loans/my-loans' },
    ],
  },
];
