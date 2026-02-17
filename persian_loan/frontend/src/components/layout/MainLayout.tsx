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
  ActionIcon,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { IconHome } from '@tabler/icons-react';
import { navigationGroups } from '@/constants/navigation.constants';
import rallyColors from '@/theme/rallyColors';

const allNavItems = navigationGroups.flatMap((g) =>
  g.items.map((item) => ({ text: item.name, path: item.href })),
);

export function MainLayout() {
  const [opened, { toggle, close }] = useDisclosure(true);
  const isMobile = useMediaQuery('(max-width: 48em)');
  const navigate = useNavigate();
  const location = useLocation();
  const collapsed = !opened && !isMobile;

  const currentTitle =
    allNavItems.find((i) => i.path === location.pathname)?.text || 'داشبورد';

  const handleNav = (path: string) => {
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
          <Tooltip label="بازگشت به صفحه اصلی">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              component="a"
              href="/"
            >
              <IconHome size={20} stroke={1.5} />
            </ActionIcon>
          </Tooltip>
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
              PL
            </Avatar>
            {!collapsed && (
              <Box>
                <Text fw={600} size="sm">
                  وام‌یاب
                </Text>
                <Text size="xs" c="dimmed">
                  مقایسه وام بانک‌ها
                </Text>
              </Box>
            )}
          </Group>
        </AppShell.Section>

        {/* Navigation with section grouping */}
        <AppShell.Section grow component={ScrollArea} scrollbarSize={4}>
          {navigationGroups.map((section) => (
            <div key={section.id}>
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
                  {section.title}
                </Text>
              )}
              {section.items.map((item) => {
                const Icon = item.icon;
                if (collapsed) {
                  return (
                    <Tooltip key={item.name} label={item.name} position="left" withArrow>
                      <NavLink
                        label=""
                        leftSection={<Icon size={20} stroke={1.5} />}
                        active={location.pathname === item.href}
                        onClick={() => handleNav(item.href)}
                        color="rally-green"
                        styles={{ root: { justifyContent: 'center', paddingInline: 0 } }}
                      />
                    </Tooltip>
                  );
                }

                return (
                  <NavLink
                    key={item.name}
                    label={item.name}
                    leftSection={<Icon size={20} stroke={1.5} />}
                    active={location.pathname === item.href}
                    onClick={() => handleNav(item.href)}
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
                وام‌یاب ایران
              </Text>
              <Text size="xs" c="rgba(241, 245, 249, 0.7)">
                مقایسه هوشمند وام بانک‌ها
              </Text>
            </Box>
          </AppShell.Section>
        )}
      </AppShell.Navbar>

      {/* Main */}
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}

export default MainLayout;
