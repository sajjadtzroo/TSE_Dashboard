import {
  IconHome,
  IconSearch,
  IconBuildingBank,
  IconCalculator,
  IconStars,
} from '@tabler/icons-react';

export const persianLoanMenuSections = [
  {
    label: 'وام‌یار',
    items: [
      { text: 'صفحه اصلی', icon: IconHome, path: '/persian-loan' },
      { text: 'جستجوی هوشمند', icon: IconStars, path: '/persian-loan/chat' },
    ],
  },
  {
    label: 'ابزارها',
    items: [
      { text: 'بانک‌ها و وام‌ها', icon: IconBuildingBank, path: '/loans/banks' },
      { text: 'ماشین‌حساب', icon: IconCalculator, path: '/loans/calculators' },
    ],
  },
];
