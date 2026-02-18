import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppShell,
  NavLink,
  Burger,
  Group,
  Text,
  ScrollArea,
  Avatar,
  Box,
  Tooltip,
  Kbd,
  ActionIcon,
  Divider,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { IconSearch, IconHome } from '@tabler/icons-react';
import { spotlight } from '../components/GlobalSearch';
import { menuSections } from '../constants/navigation';
import MarketStatusBadge from '../components/MarketStatusBadge';
import ChatDrawer from '../components/ChatDrawer';
import SidebarMarketPulse from '../components/sidebar/SidebarMarketPulse';
import SidebarQuickStats from '../components/sidebar/SidebarQuickStats';
import BottomNavBar from '../components/mobile/BottomNavBar';
import rallyColors from '../theme/rallyColors';

const allPaths = menuSections.flatMap((section) =>
  section.items.map((item) => ({ text: item.text, path: item.path })),
);

export default function MainLayout() {
  const isMobile = useMediaQuery('(max-width: 48em)');
  const [opened, { toggle, close }] = useDisclosure(!isMobile);
  const navigate = useNavigate();
  const location = useLocation();
  const collapsed = !opened && !isMobile;

  const currentTitle =
    allPaths.find((i) => i.path === location.pathname)?.text ||
    (location.pathname.includes('/shareholders')
      ? 'سهامداران'
      : location.pathname.includes('/tick-trades')
        ? 'معاملات تیک'
        : location.pathname.startsWith('/dashboard/stock/')
          ? 'جزئیات نماد'
          : 'داشبورد');

  const handleNav = (path) => {
    navigate(path);
    if (isMobile) close();
  };

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{
        width: collapsed ? 70 : 260,
        breakpoint: 'sm',
        collapsed: { mobile: !opened, desktop: false },
      }}
      padding="md"
      transitionDuration={200}
    >
      {/* Header */}
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger opened={opened} onClick={toggle} size="sm" />
            <Text fw={600} size="lg">
              {currentTitle}
            </Text>
          </Group>
          <Group gap="xs">
            <Tooltip label="جستجوی نماد (Ctrl+K)">
              <ActionIcon variant="subtle" size="md" color="gray" onClick={() => spotlight.open()}>
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
          </Group>
        </Group>
      </AppShell.Header>

      {/* Navbar */}
      <AppShell.Navbar p="xs" style={{ transition: 'width 200ms ease', overflow: 'hidden' }}>
        {/* Logo */}
        <AppShell.Section>
          <Group p="xs" gap="sm" mb="xs" justify={collapsed ? 'center' : 'flex-start'}>
            <Avatar
              color="rally-green"
              radius="md"
              size={40}
              styles={{ root: { fontWeight: 700 } }}
            >
              TSE
            </Avatar>
            {!collapsed && (
              <Box>
                <Text fw={600} size="sm">
                  TSETMC
                </Text>
                <Text size="xs" c="dimmed">
                  داشبورد بورس
                </Text>
              </Box>
            )}
          </Group>
        </AppShell.Section>

        {/* Navigation with section grouping */}
        <AppShell.Section grow component={ScrollArea} scrollbarSize={4}>
          {menuSections.map((section) => (
            <div key={section.label}>
              {!collapsed && (
                <Text
                  size="xs"
                  c="dimmed"
                  tt="uppercase"
                  fw={500}
                  px="sm"
                  mb={4}
                  mt="sm"
                  style={{ letterSpacing: 1 }}
                >
                  {section.label}
                </Text>
              )}
              {section.items.map((item) => {
                if (collapsed) {
                  return (
                    <Tooltip key={item.text} label={item.text} position="left" withArrow>
                      <NavLink
                        label=""
                        leftSection={<item.icon size={20} stroke={1.5} />}
                        active={location.pathname === item.path}
                        onClick={() => handleNav(item.path)}
                        color="rally-green"
                        styles={{ root: { justifyContent: 'center', paddingInline: 0 } }}
                      />
                    </Tooltip>
                  );
                }

                return (
                  <NavLink
                    key={item.text}
                    label={item.text}
                    leftSection={<item.icon size={20} stroke={1.5} />}
                    active={location.pathname === item.path}
                    onClick={() => handleNav(item.path)}
                    color="rally-green"
                  />
                );
              })}
            </div>
          ))}
        </AppShell.Section>

        {/* Sidebar Market Widgets — desktop expanded only */}
        {!collapsed && !isMobile && (
          <AppShell.Section>
            <Box px="xs" py={4}>
              <Divider mb="xs" color={rallyColors.border} />
              <SidebarMarketPulse collapsed={collapsed} />
              <SidebarQuickStats collapsed={collapsed} />
            </Box>
          </AppShell.Section>
        )}

        {/* Back to Landing */}
        <AppShell.Section>
          {collapsed ? (
            <Tooltip label="صفحه اصلی" position="left" withArrow>
              <NavLink
                label=""
                leftSection={<IconHome size={20} stroke={1.5} />}
                onClick={() => navigate('/')}
                color="rally-green"
                styles={{ root: { justifyContent: 'center', paddingInline: 0 } }}
              />
            </Tooltip>
          ) : (
            <NavLink
              label="صفحه اصلی"
              leftSection={<IconHome size={20} stroke={1.5} />}
              onClick={() => navigate('/')}
              color="rally-green"
            />
          )}
        </AppShell.Section>
      </AppShell.Navbar>

      {/* Main */}
      <AppShell.Main style={isMobile ? { paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px))' } : undefined}>
        <Outlet />
      </AppShell.Main>

      {/* Bottom navigation — mobile only */}
      {isMobile && <BottomNavBar onMorePress={toggle} />}

      {/* Floating AI Chat — available on all pages */}
      <ChatDrawer />
    </AppShell>
  );
}
