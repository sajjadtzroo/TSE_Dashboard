import { cryptoMenuSections } from '../constants/cryptoNav';
import SidebarCryptoPulse from '../components/sidebar/SidebarCryptoPulse';
import BaseLayout from './BaseLayout';

const ACCENT = '#F59E0B';

function resolveTitle(pathname) {
  if (pathname.startsWith('/crypto/coin/')) return 'جزئیات رمزارز';
  return null;
}

export default function CryptoMainLayout() {
  return (
    <BaseLayout
      menuSections={cryptoMenuSections}
      accentColor="yellow"
      logoText="BTC"
      logoHexAccent={ACCENT}
      logoLabel="رمزارزها"
      logoSubLabel="Crypto Market"
      defaultTitle="داشبورد رمزارز"
      resolveTitle={resolveTitle}
      sidebarWidgets={<SidebarCryptoPulse />}
    />
  );
}
