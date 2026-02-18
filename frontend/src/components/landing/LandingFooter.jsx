import { useNavigate } from 'react-router-dom';
import { Box, Grid, Group, Avatar, Text, ActionIcon, Stack, Anchor } from '@mantine/core';
import { IconBrandGithub } from '@tabler/icons-react';
import rallyColors from '../../theme/rallyColors';

const QUICK_LINKS = [
  { label: 'داشبورد بازار', route: '/dashboard' },
  { label: 'اختیار معامله', route: '/dashboard/options-calculator' },
  { label: 'بورس کالا', route: '/dashboard/ime-options' },
  { label: 'تسهیلات بانکی', route: '/loans' },
  { label: 'پورتفولیو', route: '/portfolio' },
  { label: 'رمزارزها', route: '/crypto' },
];

const INFO_LINKS = [
  { label: 'درباره ما', route: '/about' },
  { label: 'تعرفه‌ها', route: '/pricing' },
  { label: 'راهنمای استفاده', route: '/tutorial' },
  { label: 'تحلیل تکنیکال', route: '/dashboard/screener' },
  { label: 'نقشه گرمایی', route: '/dashboard/heatmap' },
  { label: 'حقیقی-حقوقی', route: '/dashboard/client-type' },
  { label: 'محاسبه وام', route: '/loans/calculators' },
];

export default function LandingFooter() {
  const navigate = useNavigate();

  return (
    <Box py={48} style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
      <Grid gutter="xl">
        {/* Brand */}
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <Group gap="sm" mb="md">
            <Avatar
              color="rally-green"
              radius="md"
              size={34}
              styles={{ root: { fontWeight: 700, fontSize: 12 } }}
            >
              TSE
            </Avatar>
            <Text fw={700} size="sm" c={rallyColors.textPrimary}>
              TSETMC Dashboard
            </Text>
          </Group>
          <Text size="sm" c={rallyColors.textSecondary} lh={1.7} maw={260}>
            پلتفرم جامع تحلیل و پایش بازار بورس اوراق بهادار تهران
          </Text>
        </Grid.Col>

        {/* Quick Access */}
        <Grid.Col span={{ base: 6, sm: 4 }}>
          <Text fw={700} size="sm" c={rallyColors.textPrimary} mb="md">
            دسترسی سریع
          </Text>
          <Stack gap={8}>
            {QUICK_LINKS.map((link) => (
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
          </Stack>
        </Grid.Col>

        {/* Info & Features */}
        <Grid.Col span={{ base: 6, sm: 4 }}>
          <Text fw={700} size="sm" c={rallyColors.textPrimary} mb="md">
            درباره
          </Text>
          <Stack gap={8}>
            {INFO_LINKS.map((link) => (
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
          </Stack>
        </Grid.Col>
      </Grid>

      {/* Copyright bar */}
      <Box mt={40} pt={20} style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
        <Group justify="space-between">
          <Text size="xs" c={rallyColors.textDimmed}>
            &copy; {new Date().getFullYear()} TSETMC Dashboard — تمامی حقوق محفوظ است
          </Text>
          <ActionIcon
            variant="subtle"
            color="gray"
            radius="xl"
            size="md"
            component="a"
            href="https://github.com/sajjadtzroo/TSE_Dashboard"
            target="_blank"
            rel="noopener noreferrer"
          >
            <IconBrandGithub size={16} />
          </ActionIcon>
        </Group>
      </Box>
    </Box>
  );
}
