import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppShell,
  NavLink,
  Burger,
  Group,
  Text,
  Badge,
  ScrollArea,
  Avatar,
  Box,
  Tooltip,
  Kbd,
  ActionIcon,
  Transition,
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
import rallyColors from '../theme/rallyColors';

const menuItems = [
  { text: 'Dashboard', icon: IconDashboard, path: '/' },
  { text: 'Market Overview', icon: IconChartBar, path: '/market' },
  { text: 'Heatmap', icon: IconGridDots, path: '/heatmap' },
  { text: 'Client Type', icon: IconUsers, path: '/client-type' },
  { text: 'Screener', icon: IconFilter, path: '/screener' },
  { text: 'Market Indices', icon: IconTrendingUp, path: '/market-indices' },
  { text: 'ETF NAV', icon: IconCoin, path: '/etf-nav' },
  { text: 'Market Prices', icon: IconCurrencyDollar, path: '/market-prices' },
  { text: 'Investment Funds', icon: IconBuildingBank, path: '/funds' },
  { text: 'Options', icon: IconArrowsExchange, path: '/options' },
  { text: 'Payoff Calculator', icon: IconCalculator, path: '/options-calculator' },
  { text: 'Options Explorer', icon: IconChartDonut, path: '/options-explorer' },
  { text: 'Codal', icon: IconFileText, path: '/codal' },
  { text: 'Watchlist', icon: IconStar, path: '/watchlist' },
  {
    text: 'IME',
    icon: IconFlame,
    children: [
      { text: 'IME Options', icon: IconFlame, path: '/ime-options' },
      { text: 'IME Futures', icon: IconTimeline, path: '/ime-futures' },
      { text: 'IME Certificates', icon: IconCertificate, path: '/ime-certificates' },
      { text: 'IME Funds', icon: IconWallet, path: '/ime-funds' },
      { text: 'IME Forwards', icon: IconArrowForward, path: '/ime-forwards' },
      { text: 'IME Physical', icon: IconTruck, path: '/ime-physical' },
    ],
  },
  { text: 'System', icon: IconServer, path: '/system' },
];

const allPaths = menuItems.flatMap((item) =>
  item.children
    ? item.children.map((c) => ({ text: c.text, path: c.path }))
    : [{ text: item.text, path: item.path }],
);

export default function MainLayout() {
  const [opened, { toggle, close }] = useDisclosure(true);
  const isMobile = useMediaQuery('(max-width: 48em)');
  const navigate = useNavigate();
  const location = useLocation();
  const [imeOpened, setImeOpened] = useState(false);
  const collapsed = !opened && !isMobile;

  const currentTitle =
    allPaths.find((i) => i.path === location.pathname)?.text ||
    (location.pathname.includes('/shareholders')
      ? 'Shareholders'
      : location.pathname.includes('/tick-trades')
        ? 'Tick Trades'
        : location.pathname.startsWith('/stock/')
          ? 'Stock Detail'
          : 'Dashboard');

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
            <Tooltip label="Search stocks (Ctrl+K)">
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
            <Badge
              color="rally-green"
              variant="filled"
              size="sm"
              styles={{ root: { color: '#0B0E14' } }}
            >
              Live
            </Badge>
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
                  Stock Market Dashboard
                </Text>
              </Box>
            )}
          </Group>
        </AppShell.Section>

        {/* Navigation */}
        <AppShell.Section grow component={ScrollArea} scrollbarSize={4}>
          {!collapsed && (
            <Text size="xs" c="dimmed" tt="uppercase" fw={500} px="sm" mb={4} style={{ letterSpacing: 1 }}>
              Navigation
            </Text>
          )}
          {menuItems.map((item) => {
            if (item.children) {
              const isAnyChildActive = item.children.some(
                (c) => location.pathname === c.path,
              );

              if (collapsed) {
                return item.children.map((child) => (
                  <Tooltip key={child.text} label={child.text} position="right" withArrow>
                    <NavLink
                      label=""
                      leftSection={<child.icon size={20} stroke={1.5} />}
                      active={location.pathname === child.path}
                      onClick={() => handleNav(child.path)}
                      color="rally-green"
                      styles={{ root: { justifyContent: 'center', paddingInline: 0 } }}
                    />
                  </Tooltip>
                ));
              }

              return (
                <NavLink
                  key={item.text}
                  label={item.text}
                  leftSection={<item.icon size={20} stroke={1.5} />}
                  opened={imeOpened}
                  onChange={() => setImeOpened(!imeOpened)}
                  active={isAnyChildActive}
                  color="rally-green"
                >
                  {item.children.map((child) => (
                    <NavLink
                      key={child.text}
                      label={child.text}
                      leftSection={<child.icon size={18} stroke={1.5} />}
                      active={location.pathname === child.path}
                      onClick={() => handleNav(child.path)}
                      color="rally-green"
                    />
                  ))}
                </NavLink>
              );
            }

            if (collapsed) {
              return (
                <Tooltip key={item.text} label={item.text} position="right" withArrow>
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
                Tehran Stock Exchange
              </Text>
              <Text size="xs" c="rgba(241, 245, 249, 0.7)">
                Real-time market data
              </Text>
            </Box>
          </AppShell.Section>
        )}
      </AppShell.Navbar>

      {/* Main */}
      <AppShell.Main>
        <Transition mounted transition="fade" duration={200}>
          {(styles) => (
            <div style={styles}>
              <Outlet />
            </div>
          )}
        </Transition>
      </AppShell.Main>
    </AppShell>
  );
}
