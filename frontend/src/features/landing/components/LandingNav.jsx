import { useNavigate, useLocation } from 'react-router-dom';
import { motion, useScroll, useTransform } from "motion/react";
import { Container, Group, Button, Text, Box, UnstyledButton, Burger, Drawer, Stack, Menu, Avatar } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconLogin, IconUserPlus, IconUser, IconLogout, IconLayoutDashboard } from '@tabler/icons-react';
import { useAuth } from '../../../context/AuthContext';
import rallyColors from '../../../theme/rallyColors';

const NAV_LINKS = [
  { label: 'امکانات', scrollId: 'features' },
  { label: 'آموزش', route: '/tutorial' },
  { label: 'تعرفه‌ها', route: '/pricing' },
  { label: 'درباره ما', route: '/about' },
];

export default function LandingNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { scrollY } = useScroll();
  const { user, isAuthenticated, logout } = useAuth();
  const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] = useDisclosure(false);

  const navBg = useTransform(scrollY, [0, 100], ["rgba(0,0,0,0.3)", "rgba(0,0,0,0.85)"]);
  const navBorder = useTransform(scrollY, [0, 100], ["rgba(255,255,255,0)", "rgba(255,255,255,0.06)"]);

  const handleNavClick = (link) => {
    closeDrawer();
    if (link.route) {
      navigate(link.route);
    } else if (link.scrollId) {
      if (location.pathname === '/') {
        document.getElementById(link.scrollId)?.scrollIntoView({ behavior: 'smooth' });
      } else {
        navigate('/', { state: { scrollTo: link.scrollId } });
      }
    }
  };

  return (
    <>
      <motion.nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          backdropFilter: 'blur(20px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
          background: navBg,
          borderBottom: navBorder,
        }}
      >
        <Container size="lg">
          <Box style={{ position: 'relative', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Logo — left */}
            <UnstyledButton onClick={() => navigate('/')} aria-label="صفحه اصلی">
              <Group gap="xs" align="center">
                <Box
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: `linear-gradient(135deg, ${rallyColors.primary} 0%, ${rallyColors.darkPrimary} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: `0 0 12px rgba(41,98,255,0.35)`,
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    {/* Three ascending candlestick bodies */}
                    <rect x="2" y="15" width="4.5" height="7" rx="1.5" fill="rgba(255,255,255,0.5)" />
                    <rect x="9.5" y="10" width="4.5" height="12" rx="1.5" fill="rgba(255,255,255,0.78)" />
                    <rect x="17" y="5"  width="4.5" height="17" rx="1.5" fill="white" />
                    {/* Trend line */}
                    <path d="M4.25 14.5 L11.75 9 L19.25 4" stroke="rgba(255,255,255,0.38)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="1.5 2.5" />
                  </svg>
                </Box>
                <Box>
                  <Text fw={700} size="sm" c={rallyColors.textPrimary} lh={1.2}>
                    داشبورد بازار
                  </Text>
                  <Text size="xs" c={rallyColors.textDimmed} lh={1.2}>
                    بورس · رمزارز · وام
                  </Text>
                </Box>
              </Group>
            </UnstyledButton>

            {/* Nav links — absolutely centered, hidden on mobile */}
            <Group
              gap={4}
              visibleFrom="sm"
              style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}
            >
              {NAV_LINKS.map((link) => (
                <Button
                  key={link.label}
                  variant="subtle"
                  color="gray"
                  size="sm"
                  radius="xl"
                  onClick={() => handleNavClick(link)}
                  styles={{
                    root: {
                      color: rallyColors.textSecondary,
                      fontWeight: 500,
                      height: 36,
                      paddingInline: 14,
                      '&:hover': { color: rallyColors.textPrimary, background: 'rgba(255,255,255,0.05)' },
                    },
                  }}
                >
                  {link.label}
                </Button>
              ))}
            </Group>

            {/* Desktop auth buttons — right */}
            <Group gap="xs" visibleFrom="sm">
              {isAuthenticated ? (
                <Menu shadow="md" width={200} position="bottom-end" withArrow>
                  <Menu.Target>
                    <UnstyledButton aria-label="User account menu">
                      <Avatar
                        size={32}
                        radius="xl"
                        color="rally-primary"
                        styles={{ root: { fontWeight: 600, cursor: 'pointer' } }}
                      >
                        {user?.username?.[0]?.toUpperCase()}
                      </Avatar>
                    </UnstyledButton>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Label>{user?.username}</Menu.Label>
                    <Menu.Item leftSection={<IconLayoutDashboard size={14} />} onClick={() => navigate('/dashboard')}>
                      داشبورد
                    </Menu.Item>
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
                <>
                  <Button
                    variant="subtle"
                    color="gray"
                    size="sm"
                    radius="xl"
                    leftSection={<IconLogin size={16} />}
                    onClick={() => navigate('/login')}
                    styles={{
                      root: {
                        color: rallyColors.textSecondary,
                        fontWeight: 500,
                        height: 36,
                        '&:hover': { color: rallyColors.textPrimary, background: 'rgba(255,255,255,0.05)' },
                      },
                    }}
                  >
                    ورود
                  </Button>
                  <Button
                    size="sm"
                    radius="xl"
                    color="rally-primary"
                    leftSection={<IconUserPlus size={16} />}
                    onClick={() => navigate('/register')}
                    styles={{ root: { height: 36 } }}
                  >
                    ثبت‌نام
                  </Button>
                </>
              )}
            </Group>

            {/* Mobile burger */}
            <Burger
              opened={drawerOpened}
              onClick={toggleDrawer}
              hiddenFrom="sm"
              size="sm"
              color={rallyColors.textSecondary}
              aria-label="منوی ناوبری"
            />
          </Box>
        </Container>
      </motion.nav>

      {/* Mobile drawer */}
      <Drawer
        opened={drawerOpened}
        onClose={closeDrawer}
        size="xs"
        padding="md"
        title="منو"
        hiddenFrom="sm"
        zIndex={200}
      >
        <Stack gap="xs">
          {NAV_LINKS.map((link) => (
            <Button
              key={link.label}
              variant="subtle"
              color="gray"
              fullWidth
              justify="flex-start"
              onClick={() => handleNavClick(link)}
              styles={{
                root: {
                  color: rallyColors.textSecondary,
                  fontWeight: 500,
                  height: 44,
                  '&:hover': { color: rallyColors.textPrimary, background: 'rgba(255,255,255,0.05)' },
                },
              }}
            >
              {link.label}
            </Button>
          ))}
          {isAuthenticated ? (
            <>
              <Button
                color="rally-primary"
                fullWidth
                mt="sm"
                leftSection={<IconLayoutDashboard size={16} />}
                onClick={() => { closeDrawer(); navigate('/login'); }}
              >
                ورود به داشبورد
              </Button>
              <Button
                variant="light"
                color="gray"
                fullWidth
                leftSection={<IconUser size={16} />}
                onClick={() => { closeDrawer(); navigate('/profile'); }}
              >
                حساب کاربری
              </Button>
              <Button
                variant="subtle"
                color="red"
                fullWidth
                leftSection={<IconLogout size={16} />}
                onClick={() => { logout(); closeDrawer(); navigate('/'); }}
              >
                خروج
              </Button>
            </>
          ) : (
            <>
              <Button
                color="rally-primary"
                fullWidth
                mt="sm"
                leftSection={<IconLogin size={16} />}
                onClick={() => { closeDrawer(); navigate('/login'); }}
              >
                ورود
              </Button>
              <Button
                variant="light"
                color="rally-primary"
                fullWidth
                leftSection={<IconUserPlus size={16} />}
                onClick={() => { closeDrawer(); navigate('/register'); }}
              >
                ثبت‌نام
              </Button>
            </>
          )}
        </Stack>
      </Drawer>
    </>
  );
}
