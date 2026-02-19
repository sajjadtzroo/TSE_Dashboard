import { portfolioMenuSections } from '../constants/portfolioNav';
import SidebarPortfolioSummary from '../layouts/components/sidebar/SidebarPortfolioSummary';
import BaseLayout from './BaseLayout';

const ACCENT = '#3B82F6';

export default function PortfolioMainLayout() {
  return (
    <BaseLayout
      menuSections={portfolioMenuSections}
      accentColor="blue"
      logoText="سبد"
      logoHexAccent={ACCENT}
      logoLabel="سبد سرمایه‌گذاری"
      logoSubLabel="Portfolio"
      defaultTitle="سبد سرمایه‌گذاری"
      sidebarWidgets={<SidebarPortfolioSummary />}
    />
  );
}
