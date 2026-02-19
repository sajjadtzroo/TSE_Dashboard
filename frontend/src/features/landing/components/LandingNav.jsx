import { useNavigate, useLocation } from 'react-router-dom';
import { motion, useScroll, useTransform } from "motion/react";
import { Container, Group, Button, Text, Box, UnstyledButton, Burger, Drawer, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconChartBar } from '@tabler/icons-react';
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
                    background: `linear-gradient(135deg, ${rallyColors.green} 0%, ${rallyColors.darkGreen} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <IconChartBar size={20} color="#fff" stroke={1.8} />
                </Box>
                <Box>
                  <Text fw={700} size="sm" c={rallyColors.textPrimary} lh={1.2}>
                    Financial Dashboard
                  </Text>
                  <Text size="xs" c={rallyColors.textDimmed} lh={1.2}>
                    Tehran Stock Exchange
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
          <Button
            color="rally-green"
            fullWidth
            mt="sm"
            onClick={() => { closeDrawer(); navigate('/dashboard'); }}
          >
            ورود به داشبورد
          </Button>
        </Stack>
      </Drawer>
    </>
  );
}
