import { commodityMenuSections } from '../constants/commodityNav';
import SidebarCommodityPulse from '../layouts/components/sidebar/SidebarCommodityPulse';
import BaseLayout from './BaseLayout';

const ACCENT = '#EA580C';

function resolveTitle(pathname) {
  if (/^\/commodity\/[A-Z]/.test(pathname)) return 'جزئیات کالا';
  return null;
}

export default function CommodityMainLayout() {
  return (
    <BaseLayout
      menuSections={commodityMenuSections}
      accentColor="orange"
      logoText="CMD"
      logoHexAccent={ACCENT}
      logoLabel="بازار کالا"
      logoSubLabel="Commodity Market"
      defaultTitle="داشبورد کالا"
      resolveTitle={resolveTitle}
      sidebarWidgets={<SidebarCommodityPulse />}
    />
  );
}
