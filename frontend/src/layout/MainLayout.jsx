import { useMediaQuery } from '@mantine/hooks';
import { Tooltip, ActionIcon, Group, Kbd, Text } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { spotlight } from '../components/GlobalSearch';
import { menuSections } from '../constants/navigation';
import MarketStatusBadge from '../components/MarketStatusBadge';
import SidebarMarketPulse from '../layouts/components/sidebar/SidebarMarketPulse';
import SidebarQuickStats from '../layouts/components/sidebar/SidebarQuickStats';
import BottomNavBar from '../components/mobile/BottomNavBar';
import BaseLayout from './BaseLayout';

function SearchHeader() {
  const isMobile = useMediaQuery('(max-width: 48em)');
  return (
    <>
      <Tooltip label="جستجوی نماد (Ctrl+K)">
        <ActionIcon variant="subtle" size="md" color="gray" onClick={() => spotlight.open()} aria-label="جستجوی نماد">
          <IconSearch size={18} />
        </ActionIcon>
      </Tooltip>
      {!isMobile && (
        <Group gap={4} style={{ cursor: 'pointer' }} onClick={() => spotlight.open()}>
          <Kbd size="xs">Ctrl</Kbd>
          <Text size="xs" c="dimmed">+</Text>
          <Kbd size="xs">K</Kbd>
        </Group>
      )}
      <MarketStatusBadge />
    </>
  );
}

function resolveTitle(pathname) {
  if (pathname.includes('/shareholders')) return 'سهامداران';
  if (pathname.includes('/tick-trades')) return 'معاملات تیک';
  if (pathname.startsWith('/dashboard/stock/')) return 'جزئیات نماد';
  return null;
}

export default function MainLayout() {
  const isMobile = useMediaQuery('(max-width: 48em)');

  return (
    <BaseLayout
      menuSections={menuSections}
      accentColor="rally-green"
      logoText="TSE"
      logoColor="rally-green"
      logoLabel="TSETMC"
      logoSubLabel="داشبورد بورس"
      defaultTitle="داشبورد"
      resolveTitle={resolveTitle}
      defaultOpened={!isMobile}
      headerExtra={<SearchHeader />}
      sidebarWidgets={
        <>
          <SidebarMarketPulse />
          <SidebarQuickStats />
        </>
      }
      mainPaddingMobile
      mobileExtra={({ toggle }) => isMobile ? <BottomNavBar onMorePress={toggle} /> : null}
    />
  );
}
