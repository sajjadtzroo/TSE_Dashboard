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
  Tooltip,
  Divider,
  ActionIcon,
  Menu,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import {
  IconHome,
  IconUser,
  IconLogout,
  IconLogin,
  IconChartBar,
  IconCurrencyBitcoin,
  IconCoins,
  IconBuildingBank,
  IconBriefcase,
  IconFlame,
  IconChevronDown,
} from '@tabler/icons-react';
import ChatDrawer from '../components/ChatDrawer';
import KeyboardShortcutsModal from '../components/KeyboardShortcutsModal';
import { VoiceCallOverlay } from '../features/voice/components';
import useChatDrawer from '../hooks/useChatDrawer';
import { useAuth } from '../context/AuthContext';
import rallyColors from '../theme/rallyColors';

const MARKETS = [
  {
    label: 'بازار سهام',
    icon: IconChartBar,
    color: '#2962FF',
    href: '/dashboard',
    match: '/dashboard',
  },
  {
    label: 'ارزهای دیجیتال',
    icon: IconCurrencyBitcoin,
    color: '#F59E0B',
    href: '/crypto',
    match: '/crypto',
  },
  {
    label: 'تسهیلات بانکی',
    icon: IconBuildingBank,
    color: '#8B5CF6',
    href: '/loans',
    match: '/loans',
  },
  {
    label: 'بازار کالا',
    icon: IconFlame,
    color: '#EA580C',
    href: '/commodity',
    match: '/commodity',
  },
  {
    label: 'سبد سرمایه‌گذاری',
    icon: IconBriefcase,
    color: '#3B82F6',
    href: '/portfolio',
    match: '/portfolio',
  },
  {
    label: 'طلا و ارز',
    icon: IconCoins,
    color: '#6B7280',
    href: null,
    match: null,
    disabled: true,
  },
  {
    label: 'وام‌یار',
    icon: IconBuildingBank,
    color: '#0D9488',
    href: '/persian-loan',
    match: '/persian-loan',
  },
];

function SidebarMarketSwitcher({ navigate, pathname, collapsed }) {
  const active = MARKETS.find((m) => m.match && pathname.startsWith(m.match)) || MARKETS[0];
  const ActiveIcon = active.icon;

  if (collapsed) {
    return (
      <Menu shadow="md" width={220} position="right-start" withArrow>
        <Menu.Target>
          <Tooltip label="تغییر بازار" position="left" withArrow>
            <ActionIcon
              variant="subtle"
              size="xl"
              radius="md"
              aria-label="تغییر بازار"
              style={{ color: active.color, width: '100%' }}
            >
              <ActiveIcon size={22} stroke={1.8} />
            </ActionIcon>
          </Tooltip>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label style={{ direction: 'rtl' }}>انتخاب بازار</Menu.Label>
          {MARKETS.map((m) => {
            const isActive = m.match && pathname.startsWith(m.match);
            return (
              <Menu.Item
                key={m.label}
                leftSection={<m.icon size={16} stroke={1.8} color={m.disabled ? '#6B7280' : m.color} />}
                disabled={!!m.disabled}
                onClick={() => !m.disabled && navigate(m.href)}
                style={{
                  direction: 'rtl',
                  color: isActive ? m.color : undefined,
                  fontWeight: isActive ? 600 : undefined,
                  opacity: m.disabled ? 0.45 : 1,
                }}
              >
                {m.label}
                {m.disabled && (
                  <Text span size="xs" c="dimmed" ms={6}>به زودی</Text>
                )}
              </Menu.Item>
            );
          })}
        </Menu.Dropdown>
      </Menu>
    );
  }

  return (
    <Menu shadow="md" width={240} position="bottom-start" withArrow>
      <Menu.Target>
        <Box
          component="button"
          aria-label="تغییر بازار"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 12,
            cursor: 'pointer',
            direction: 'rtl',
            transition: 'border-color 0.3s ease',
          }}
        >
          <Box
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: `${active.color}18`,
              border: `1px solid ${active.color}25`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ActiveIcon size={18} stroke={1.8} color={active.color} />
          </Box>
          <Box style={{ flex: 1, textAlign: 'right' }}>
            <Text fw={600} size="sm" c={rallyColors.textPrimary} style={{ lineHeight: 1.3 }}>
              {active.label}
            </Text>
            <Text size="xs" c={rallyColors.textDimmed} style={{ lineHeight: 1.2 }}>
              تغییر بازار
            </Text>
          </Box>
          <IconChevronDown size={14} stroke={2} color={rallyColors.textDimmed} style={{ flexShrink: 0 }} />
        </Box>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label style={{ direction: 'rtl' }}>انتخاب بازار</Menu.Label>
        {MARKETS.map((m) => {
          const isActive = m.match && pathname.startsWith(m.match);
          return (
            <Menu.Item
              key={m.label}
              leftSection={<m.icon size={16} stroke={1.8} color={m.disabled ? '#6B7280' : m.color} />}
              disabled={!!m.disabled}
              onClick={() => !m.disabled && navigate(m.href)}
              style={{
                direction: 'rtl',
                color: isActive ? m.color : undefined,
                fontWeight: isActive ? 600 : undefined,
                opacity: m.disabled ? 0.45 : 1,
              }}
            >
              {m.label}
              {m.disabled && (
                <Text span size="xs" c="dimmed" ms={6}>به زودی</Text>
              )}
            </Menu.Item>
          );
        })}
      </Menu.Dropdown>
    </Menu>
  );
}

/**
 * Shared AppShell layout used by all section layouts.
 *
 * @param {object}    props
 * @param {object[]}  props.menuSections        - Array of { label, items: [{text, icon, path}] }
 * @param {string}    props.accentColor         - Mantine color name (e.g. 'rally-primary', 'yellow', 'violet', 'blue')
 * @param {string}    props.logoText            - Short text shown in the Avatar (e.g. 'TSE', 'BTC')
 * @param {string}    props.logoLabel           - Primary label below avatar
 * @param {string}    props.logoSubLabel        - Secondary/sub-label below avatar
 * @param {string}    [props.logoColor]         - Mantine color name for Avatar (uses accentColor if omitted)
 * @param {string}    [props.logoHexAccent]     - Raw hex accent for custom Avatar styling (bypasses logoColor)
 * @param {string}    props.defaultTitle        - Fallback header title
 * @param {Function}  [props.resolveTitle]      - Extra title resolver (pathname) => string | null
 * @param {boolean}   [props.showSearch]        - Show search button in header (default false)
 * @param {React.ReactNode} [props.headerExtra] - Extra elements injected into header
 * @param {React.ReactNode} [props.sidebarWidgets] - Widgets rendered above the home button
 * @param {Function}  [props.mobileExtra] - Render fn `({ toggle, isMobile }) => ReactNode` rendered after main
 * @param {boolean}   [props.defaultOpened]     - Initial navbar open state (default true)
 * @param {boolean}   [props.mainPaddingMobile] - Apply mobile padding-bottom for bottom nav
 */
export default function BaseLayout({
  menuSections,
  accentColor,
  logoText,
  logoLabel,
  logoSubLabel,
  logoColor,
  logoHexAccent,
  defaultTitle,
  resolveTitle,
  headerExtra,
  sidebarWidgets,
  mobileExtra,
  defaultOpened = true,
  mainPaddingMobile = false,
}) {
  const isMobile = useMediaQuery('(max-width: 48em)');
  const [opened, { toggle, close }] = useDisclosure(defaultOpened);
  const { open: chatOpen, setOpen: setChatOpen, toggle: toggleChat } = useChatDrawer();
  const navigate = useNavigate();
  const location = useLocation();
  const collapsed = !opened && !isMobile;
  const { user, isAuthenticated, logout } = useAuth();

  const navColor = accentColor;

  /* ── Title resolution ────────────────────────────────────────── */
  const allPaths = menuSections.flatMap((s) =>
    s.items.map((item) => ({ text: item.text, path: item.path })),
  );

  const currentTitle = (() => {
    const match = allPaths.find((i) => i.path === location.pathname)?.text;
    if (match) return match;
    if (resolveTitle) {
      const extra = resolveTitle(location.pathname);
      if (extra) return extra;
    }
    return defaultTitle;
  })();

  /* ── Nav handler ─────────────────────────────────────────────── */
  const handleNav = (path) => {
    navigate(path);
    if (isMobile) close();
  };

  /* ── Avatar styles ───────────────────────────────────────────── */
  const avatarProps = logoHexAccent
    ? {
        radius: 'md',
        size: 40,
        styles: {
          root: {
            fontWeight: 700,
            backgroundColor: `${logoHexAccent}18`,
            color: logoHexAccent,
            border: `1px solid ${logoHexAccent}25`,
          },
        },
      }
    : {
        color: logoColor || navColor,
        radius: 'md',
        size: 40,
        styles: { root: { fontWeight: 700 } },
      };

  return (
    <>
    <a href="#main-content" className="skip-link">Skip to main content</a>
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
      {/* ── Header ───────────────────────────────────────────── */}
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger opened={opened} onClick={toggle} size="sm" aria-label={opened ? "بستن منو" : "باز کردن منو"} aria-expanded={opened} />
            <Text fw={600} size="lg">
              {currentTitle}
            </Text>
          </Group>
          <Group gap="xs">
            {headerExtra}
            {isAuthenticated ? (
              <Menu shadow="md" width={180} position="bottom-end" withArrow>
                <Menu.Target>
                  <ActionIcon variant="subtle" size="lg" color="gray" radius="xl" aria-label="حساب کاربری">
                    <Avatar size={28} radius="xl" color={accentColor} styles={{ root: { fontWeight: 600, fontSize: 13, cursor: 'pointer' } }}>
                      {user?.username?.[0]?.toUpperCase()}
                    </Avatar>
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>{user?.username}</Menu.Label>
                  <Menu.Item leftSection={<IconUser size={14} />} onClick={() => navigate('/profile')}>
                    حساب کاربری
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item color="red" leftSection={<IconLogout size={14} />} onClick={() => { logout(); navigate('/'); }}>
                    خروج
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            ) : (
              <Tooltip label="ورود">
                <ActionIcon variant="subtle" size="md" color="gray" onClick={() => navigate('/login')} aria-label="ورود">
                  <IconLogin size={18} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        </Group>
      </AppShell.Header>

      {/* ── Navbar ───────────────────────────────────────────── */}
      <AppShell.Navbar p="xs" style={{ transition: 'width 200ms ease', overflow: 'hidden' }}>
        {/* Market Switcher */}
        <AppShell.Section>
          <Box p="xs" mb={4}>
            <SidebarMarketSwitcher navigate={navigate} pathname={location.pathname} collapsed={collapsed} />
          </Box>
        </AppShell.Section>

        {/* Navigation */}
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
                        aria-label={item.text}
                        leftSection={<item.icon size={20} stroke={1.5} />}
                        active={location.pathname === item.path}
                        onClick={() => handleNav(item.path)}
                        color={navColor}
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
                    color={navColor}
                  />
                );
              })}
            </div>
          ))}
        </AppShell.Section>

        {/* Sidebar widgets slot — desktop expanded only */}
        {sidebarWidgets && !collapsed && !isMobile && (
          <AppShell.Section>
            <Box px="xs" py={4}>
              <Divider mb="xs" color={rallyColors.border} />
              {sidebarWidgets}
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
                color={navColor}
                styles={{ root: { justifyContent: 'center', paddingInline: 0 } }}
                aria-label="صفحه اصلی"
              />
            </Tooltip>
          ) : (
            <NavLink
              label="صفحه اصلی"
              leftSection={<IconHome size={20} stroke={1.5} />}
              onClick={() => navigate('/')}
              color={navColor}
            />
          )}
        </AppShell.Section>
      </AppShell.Navbar>

      {/* ── Main ─────────────────────────────────────────────── */}
      <AppShell.Main
        id="main-content"
        style={
          mainPaddingMobile && isMobile
            ? { paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px))' }
            : undefined
        }
      >
        <PageTransition key={location.pathname}>
          <Outlet />
        </PageTransition>
      </AppShell.Main>

      {/* Mobile extra slot (e.g. BottomNavBar) — receives { toggle, isMobile } if function */}
      {typeof mobileExtra === 'function' ? mobileExtra({ toggle, isMobile }) : mobileExtra}

      {/* Floating AI Chat + Voice */}
      <ChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} onToggle={toggleChat} />
      <VoiceCallOverlay />
      <KeyboardShortcutsModal />
    </AppShell>
    </>
  );
}
