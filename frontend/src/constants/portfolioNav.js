import {
  IconBriefcase,
  IconChartLine,
  IconShieldCheck,
  IconAtom,
  IconUserCheck,
  IconTargetArrow,
  IconReceipt,
  IconCash,
} from '@tabler/icons-react';

export const portfolioMenuSections = [
  {
    label: 'سبد سرمایه‌گذاری',
    items: [
      { text: 'داشبورد', icon: IconBriefcase, path: '/portfolio' },
      { text: 'عملکرد', icon: IconChartLine, path: '/portfolio/performance' },
      { text: 'تحلیل ریسک', icon: IconShieldCheck, path: '/portfolio/risk' },
      { text: 'شبیه‌سازی', icon: IconAtom, path: '/portfolio/simulation' },
      { text: 'مشاور سرمایه‌گذاری', icon: IconUserCheck, path: '/portfolio/analyst' },
      { text: 'بهینه‌سازی سبد', icon: IconTargetArrow, path: '/portfolio/optimization' },
    ],
  },
  {
    label: 'حسابداری و گزارش',
    items: [
      { text: 'دفتر معاملات', icon: IconReceipt, path: '/portfolio/transactions' },
      { text: 'سود و زیان', icon: IconCash, path: '/portfolio/pnl' },
    ],
  },
];
