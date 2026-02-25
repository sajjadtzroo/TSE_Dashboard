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
import { IconHome, IconUser, IconLogout, IconLogin } from '@tabler/icons-react';
import ChatDrawer from '../components/ChatDrawer';
import KeyboardShortcutsModal from '../components/KeyboardShortcutsModal';
import { VoiceCallOverlay } from '../features/voice/components';
import useChatDrawer from '../hooks/useChatDrawer';
import { useAuth } from '../context/AuthContext';
import rallyColors from '../theme/rallyColors';

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
        {/* Logo */}
        <AppShell.Section>
          <Group p="xs" gap="sm" mb="xs" justify={collapsed ? 'center' : 'flex-start'}>
            <Avatar {...avatarProps}>{logoText}</Avatar>
            {!collapsed && (
              <Box>
                <Text fw={600} size="sm">{logoLabel}</Text>
                <Text size="xs" c="dimmed">{logoSubLabel}</Text>
              </Box>
            )}
          </Group>
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
