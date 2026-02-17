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
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import {
  IconDashboard,
  IconChartBar,
  IconBuildingBank,
  IconArrowsExchange,
  IconFlame,
  IconTimeline,
  IconTrendingUp,
  IconCoin,
  IconCurrencyDollar,
  IconFileText,
  IconCertificate,
  IconWallet,
  IconArrowForward,
  IconTruck,
  IconGridDots,
  IconUsers,
  IconFilter,
  IconServer,
  IconSearch,
  IconStar,
  IconCalculator,
  IconChartDonut,
} from '@tabler/icons-react';
import { spotlight } from '../components/GlobalSearch';
import MarketStatusBadge from '../components/MarketStatusBadge';
import ChatDrawer from '../components/ChatDrawer';
import rallyColors from '../theme/rallyColors';

// Sidebar menu with section grouping (Persian labels for RTL)
const menuSections = [
  {
    label: 'بازارها',
    items: [
      { text: 'داشبورد', icon: IconDashboard, path: '/' },
      { text: 'نمای بازار', icon: IconChartBar, path: '/market' },
      { text: 'نقشه بازار', icon: IconGridDots, path: '/heatmap' },
      { text: 'حقیقی و حقوقی', icon: IconUsers, path: '/client-type' },
      { text: 'فیلتر', icon: IconFilter, path: '/screener' },
      { text: 'شاخص‌ها', icon: IconTrendingUp, path: '/market-indices' },
      { text: 'NAV صندوق‌ها', icon: IconCoin, path: '/etf-nav' },
      { text: 'قیمت بازارها', icon: IconCurrencyDollar, path: '/market-prices' },
      { text: 'صندوق‌های سرمایه‌گذاری', icon: IconBuildingBank, path: '/funds' },
    ],
  },
  {
    label: 'اختیار معامله و مشتقات',
    items: [
      { text: 'اختیار معامله', icon: IconArrowsExchange, path: '/options' },
      { text: 'محاسبه‌گر سود/زیان', icon: IconCalculator, path: '/options-calculator' },
      { text: 'کاوشگر اختیار', icon: IconChartDonut, path: '/options-explorer' },
    ],
  },
  {
    label: 'بورس کالا',
    items: [
      { text: 'اختیار کالا', icon: IconFlame, path: '/ime-options' },
      { text: 'آتی کالا', icon: IconTimeline, path: '/ime-futures' },
      { text: 'گواهی سپرده', icon: IconCertificate, path: '/ime-certificates' },
      { text: 'صندوق کالایی', icon: IconWallet, path: '/ime-funds' },
      { text: 'سلف کالا', icon: IconArrowForward, path: '/ime-forwards' },
      { text: 'فیزیکی', icon: IconTruck, path: '/ime-physical' },
    ],
  },
  {
    label: 'ابزارها',
    items: [
      { text: 'کدال', icon: IconFileText, path: '/codal' },
      { text: 'دیده‌بان', icon: IconStar, path: '/watchlist' },
      { text: 'مقایسه', icon: IconChartBar, path: '/compare' },
    ],
  },
  {
    label: 'سیستم',
    items: [
      { text: 'سیستم', icon: IconServer, path: '/system' },
    ],
  },
];

const allPaths = menuSections.flatMap((section) =>
  section.items.map((item) => ({ text: item.text, path: item.path })),
);

export default function MainLayout() {
  const [opened, { toggle, close }] = useDisclosure(true);
  const isMobile = useMediaQuery('(max-width: 48em)');
  const navigate = useNavigate();
  const location = useLocation();
  const collapsed = !opened && !isMobile;

  const currentTitle =
    allPaths.find((i) => i.path === location.pathname)?.text ||
    (location.pathname.includes('/shareholders')
      ? 'سهامداران'
      : location.pathname.includes('/tick-trades')
        ? 'معاملات تیک'
        : location.pathname.startsWith('/stock/')
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

        {/* Footer card */}
        {!collapsed && (
          <AppShell.Section>
            <Box
              p="sm"
              m="xs"
              style={{
                borderRadius: 'var(--mantine-radius-md)',
                background: `linear-gradient(135deg, ${rallyColors.darkGreen} 0%, ${rallyColors.green} 100%)`,
              }}
            >
              <Text size="sm" fw={600} c={rallyColors.textPrimary}>
                بورس اوراق بهادار تهران
              </Text>
              <Text size="xs" c="rgba(241, 245, 249, 0.7)">
                داده‌های لحظه‌ای بازار
              </Text>
            </Box>
          </AppShell.Section>
        )}
      </AppShell.Navbar>

      {/* Main */}
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>

      {/* Floating AI Chat — available on all pages */}
      <ChatDrawer />
    </AppShell>
  );
}
