import { useNavigate, useLocation } from 'react-router-dom';
import { motion, useScroll, useTransform } from "motion/react";
import { Container, Group, Button, Avatar, Text, Box, UnstyledButton } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
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

  const navBg = useTransform(scrollY, [0, 100], ["rgba(0,0,0,0.3)", "rgba(0,0,0,0.85)"]);
  const navBorder = useTransform(scrollY, [0, 100], ["rgba(255,255,255,0)", "rgba(255,255,255,0.06)"]);

  const handleNavClick = (link) => {
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
        <Group h={64} justify="space-between">
          {/* Logo */}
          <UnstyledButton onClick={() => navigate('/')} aria-label="صفحه اصلی">
            <Group gap="sm">
              <Avatar
                color="rally-green"
                radius="md"
                size={38}
                styles={{ root: { fontWeight: 700, fontSize: 14 } }}
              >
                TSE
              </Avatar>
              <Box>
                <Text fw={700} size="sm" c={rallyColors.textPrimary} lh={1.2}>
                  TSETMC
                </Text>
                <Text size="xs" c={rallyColors.textDimmed} lh={1.2}>
                  داشبورد بورس
                </Text>
              </Box>
            </Group>
          </UnstyledButton>

          {/* Nav links — hidden on mobile */}
          <Group gap={4} visibleFrom="sm">
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

          {/* CTA */}
          <Button
            variant="light"
            color="rally-green"
            size="sm"
            radius={60}
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate('/dashboard')}
            className="landing-cta"
          >
            ورود به داشبورد
          </Button>
        </Group>
      </Container>
    </motion.nav>
  );
}
