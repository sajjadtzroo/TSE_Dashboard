import { persianLoanMenuSections } from '../constants/persianLoanNav';
import BaseLayout from './BaseLayout';

function resolveTitle(pathname) {
  if (pathname.startsWith('/persian-loan/chat')) return 'جستجوی هوشمند وام';
  return null;
}

export default function PersianLoanMainLayout() {
  return (
    <BaseLayout
      menuSections={persianLoanMenuSections}
      accentColor="teal"
      logoText="وام‌یار"
      logoColor="teal"
      logoLabel="مشاور تسهیلات"
      logoSubLabel="مشاور تسهیلات"
      defaultTitle="وام‌یار — مشاور هوشمند تسهیلات"
      resolveTitle={resolveTitle}
    />
  );
}
