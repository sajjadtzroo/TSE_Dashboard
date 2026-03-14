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
import { useAuth } from '../context/AuthContext';

const ROLE_LEVEL = { admin: 3, trader: 2, viewer: 1 };

function filterSections(sections, userRole) {
  const level = ROLE_LEVEL[userRole] ?? 0;
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        const required = ROLE_LEVEL[item.minRole] ?? 0;
        return level >= required;
      }),
    }))
    .filter((section) => section.items.length > 0);
}

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
  const { user } = useAuth();
  const visibleSections = filterSections(menuSections, user?.role);

  return (
    <BaseLayout
      menuSections={visibleSections}
      accentColor="rally-primary"
      logoText="TSE"
      logoColor="rally-primary"
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
