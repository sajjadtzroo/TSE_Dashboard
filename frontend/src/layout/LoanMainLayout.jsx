import { loanMenuSections } from '../constants/loanNav';
import BaseLayout from './BaseLayout';

function resolveTitle(pathname) {
  if (pathname.startsWith('/loans/advisor/chat')) return 'جستجوی هوشمند وام';
  if (pathname.startsWith('/loans/advisor')) return 'وام‌یار — مشاور هوشمند تسهیلات';
  if (pathname.startsWith('/loans/banks/')) return 'جزئیات بانک';
  if (pathname.startsWith('/loans/list/')) return 'جزئیات وام';
  if (pathname.startsWith('/loans/calculators/')) return 'محاسبه‌گرها';
  return null;
}

export default function LoanMainLayout() {
  return (
    <BaseLayout
      menuSections={loanMenuSections}
      accentColor="violet"
      logoText="وام"
      logoColor="violet"
      logoLabel="تسهیلات بانکی"
      logoSubLabel="تسهیلات بانکی"
      defaultTitle="داشبورد وام"
      resolveTitle={resolveTitle}
    />
  );
}
