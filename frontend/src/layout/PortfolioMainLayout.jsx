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
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { IconHome } from '@tabler/icons-react';
import { portfolioMenuSections } from '../constants/portfolioNav';
import ChatDrawer from '../components/ChatDrawer';

const allPaths = portfolioMenuSections.flatMap((section) =>
  section.items.map((item) => ({ text: item.text, path: item.path })),
);

const ACCENT = '#3B82F6';

export default function PortfolioMainLayout() {
  const [opened, { toggle, close }] = useDisclosure(true);
  const isMobile = useMediaQuery('(max-width: 48em)');
  const navigate = useNavigate();
  const location = useLocation();
  const collapsed = !opened && !isMobile;

  const currentTitle =
    allPaths.find((i) => i.path === location.pathname)?.text || 'سبد سرمایه‌گذاری';

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
              سبد
            </Avatar>
            {!collapsed && (
              <Box>
                <Text fw={600} size="sm">
                  سبد سرمایه‌گذاری
                </Text>
                <Text size="xs" c="dimmed">
                  Portfolio
                </Text>
              </Box>
            )}
          </Group>
        </AppShell.Section>

        {/* Navigation */}
        <AppShell.Section grow component={ScrollArea} scrollbarSize={4}>
          {portfolioMenuSections.map((section) => (
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
                        color="blue"
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
                    color="blue"
                  />
                );
              })}
            </div>
          ))}
        </AppShell.Section>

        {/* Back to Landing */}
        <AppShell.Section>
          {collapsed ? (
            <Tooltip label="صفحه اصلی" position="left" withArrow>
              <NavLink
                label=""
                leftSection={<IconHome size={20} stroke={1.5} />}
                onClick={() => navigate('/')}
                color="blue"
                styles={{ root: { justifyContent: 'center', paddingInline: 0 } }}
              />
            </Tooltip>
          ) : (
            <NavLink
              label="صفحه اصلی"
              leftSection={<IconHome size={20} stroke={1.5} />}
              onClick={() => navigate('/')}
              color="blue"
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
