import { useNavigate } from 'react-router-dom';
import { Box, Group, Text, ActionIcon, Anchor } from '@mantine/core';
import { IconBrandGithub } from '@tabler/icons-react';
import rallyColors from '../../../theme/rallyColors';

export default function LandingFooter() {
  const navigate = useNavigate();

  const LINKS = [
    { label: 'درباره ما',       route: '/about' },
    { label: 'تعرفه‌ها',        route: '/pricing' },
    { label: 'راهنمای استفاده', route: '/tutorial' },
  ];

  return (
    <Box
      py={20}
      style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
    >
      <Group justify="space-between" wrap="wrap" gap="sm">

        {/* Brand mark */}
        <Group gap={8}>
          <Box style={{
            width: 26, height: 26, borderRadius: 7,
            background: `linear-gradient(135deg, ${rallyColors.primary} 0%, ${rallyColors.darkPrimary} 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <rect x="2"  y="15" width="4.5" height="7"  rx="1.5" fill="rgba(255,255,255,0.5)" />
              <rect x="9.5" y="10" width="4.5" height="12" rx="1.5" fill="rgba(255,255,255,0.78)" />
              <rect x="17" y="5"  width="4.5" height="17" rx="1.5" fill="white" />
            </svg>
          </Box>
          <Text fw={700} size="sm" c={rallyColors.textPrimary}>فین‌هاب</Text>
        </Group>

        {/* 3 nav links */}
        <Group gap="lg">
          {LINKS.map((link) => (
            <Anchor
              key={link.label}
              size="sm"
              c={rallyColors.textSecondary}
              className="landing-footer-link"
              onClick={(e) => { e.preventDefault(); navigate(link.route); }}
              href={link.route}
              underline="never"
            >
              {link.label}
            </Anchor>
          ))}
        </Group>

        {/* Copyright + GitHub */}
        <Group gap="xs">
          <Text size="xs" c={rallyColors.textDimmed}>
            &copy; {new Date().getFullYear()} فین‌هاب
          </Text>
          <ActionIcon
            variant="subtle" color="gray" radius="xl" size="sm"
            component="a"
            href="https://github.com/sajjadtzroo/TSE_Dashboard"
            target="_blank" rel="noopener noreferrer"
            aria-label="گیت‌هاب"
          >
            <IconBrandGithub size={14} />
          </ActionIcon>
        </Group>

      </Group>
    </Box>
  );
}
