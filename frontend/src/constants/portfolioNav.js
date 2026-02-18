import {
  IconBriefcase,
  IconChartLine,
  IconShieldCheck,
  IconAtom,
} from '@tabler/icons-react';

export const portfolioMenuSections = [
  {
    label: 'سبد سرمایه‌گذاری',
    items: [
      { text: 'داشبورد', icon: IconBriefcase, path: '/portfolio' },
      { text: 'عملکرد', icon: IconChartLine, path: '/portfolio/performance' },
      { text: 'تحلیل ریسک', icon: IconShieldCheck, path: '/portfolio/risk' },
      { text: 'شبیه‌سازی', icon: IconAtom, path: '/portfolio/simulation' },
    ],
  },
];
