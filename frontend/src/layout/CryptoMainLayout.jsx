import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import PageTransition from '../components/PageTransition';
import {
  AppShell,
  NavLink,
  Burger,
  Group,
  Text,
  ScrollArea,
  Avatar,
  Box,
  Divider,
  Tooltip,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { IconHome } from '@tabler/icons-react';
import { cryptoMenuSections } from '../constants/cryptoNav';
import ChatDrawer from '../components/ChatDrawer';
import SidebarCryptoPulse from '../components/sidebar/SidebarCryptoPulse';
import rallyColors from '../theme/rallyColors';

const allPaths = cryptoMenuSections.flatMap((section) =>
  section.items.map((item) => ({ text: item.text, path: item.path })),
);

export default function CryptoMainLayout() {
  const [opened, { toggle, close }] = useDisclosure(true);
  const isMobile = useMediaQuery('(max-width: 48em)');
  const navigate = useNavigate();
  const location = useLocation();
  const collapsed = !opened && !isMobile;

  const currentTitle =
    allPaths.find((i) => i.path === location.pathname)?.text ||
    (location.pathname.startsWith('/crypto/coin/')
      ? 'جزئیات رمزارز'
      : 'داشبورد رمزارز');

  const handleNav = (path) => {
    navigate(path);
    if (isMobile) close();
  };

  const ACCENT = '#F59E0B';

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
        </Group>
      </AppShell.Header>

      {/* Navbar */}
      <AppShell.Navbar p="xs" style={{ transition: 'width 200ms ease', overflow: 'hidden' }}>
        {/* Logo */}
        <AppShell.Section>
          <Group p="xs" gap="sm" mb="xs" justify={collapsed ? 'center' : 'flex-start'}>
            <Avatar
              radius="md"
              size={40}
              styles={{
                root: {
                  fontWeight: 700,
                  backgroundColor: `${ACCENT}18`,
                  color: ACCENT,
                  border: `1px solid ${ACCENT}25`,
                },
              }}
            >
              BTC
            </Avatar>
            {!collapsed && (
              <Box>
                <Text fw={600} size="sm">
                  رمزارزها
                </Text>
                <Text size="xs" c="dimmed">
                  Crypto Market
                </Text>
              </Box>
            )}
          </Group>
        </AppShell.Section>

        {/* Navigation */}
        <AppShell.Section grow component={ScrollArea} scrollbarSize={4}>
          {cryptoMenuSections.map((section) => (
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
                        color="yellow"
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
                    color="yellow"
                  />
                );
              })}
            </div>
          ))}
        </AppShell.Section>

        {/* Sidebar Crypto Widget — desktop expanded only */}
        {!collapsed && !isMobile && (
          <AppShell.Section>
            <Box px="xs" py={4}>
              <Divider mb="xs" color={rallyColors.border} />
              <SidebarCryptoPulse collapsed={collapsed} />
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
                color="yellow"
                styles={{ root: { justifyContent: 'center', paddingInline: 0 } }}
              />
            </Tooltip>
          ) : (
            <NavLink
              label="صفحه اصلی"
              leftSection={<IconHome size={20} stroke={1.5} />}
              onClick={() => navigate('/')}
              color="yellow"
            />
          )}
        </AppShell.Section>
      </AppShell.Navbar>

      {/* Main */}
      <AppShell.Main>
        <PageTransition key={location.pathname}>
          <Outlet />
        </PageTransition>
      </AppShell.Main>

      {/* Floating AI Chat */}
      <ChatDrawer />
    </AppShell>
  );
}
