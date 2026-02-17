import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  SimpleGrid,
  Title,
  Text,
  Button,
  ThemeIcon,
  Group,
  Stack,
  Badge,
  Avatar,
} from '@mantine/core';
import {
  IconTrendingUp,
  IconBuildingBank,
  IconWorld,
  IconArrowLeft,
  IconShieldCheck,
  IconChartLine,
  IconCoin,
  IconCurrencyDollar,
  IconDiamond,
  IconChartBar,
  IconReceipt,
} from '@tabler/icons-react';
import rallyColors from '../theme/rallyColors';

const FEATURES = [
  {
    title: 'بازار ایران',
    subtitle: 'بورس اوراق بهادار تهران',
    description: 'داده‌های لحظه‌ای سهام، شاخص‌ها، نقشه بازار',
    icon: IconTrendingUp,
    accent: '#10B981',
    accentDark: '#059669',
    route: '/dashboard',
    bullets: [
      { icon: IconChartLine, text: 'نمودار شمعی و تحلیل تکنیکال' },
      { icon: IconChartBar, text: 'نقشه گرمایی و فیلتر پیشرفته' },
      { icon: IconCoin, text: 'حقیقی-حقوقی و جریان نقدینگی' },
    ],
  },
  {
    title: 'وام پارسیان',
    subtitle: 'محصولات مالی و تسهیلات',
    description: 'بررسی و مقایسه انواع تسهیلات بانکی',
    icon: IconBuildingBank,
    accent: '#8B5CF6',
    accentDark: '#7C3AED',
    route: '/dashboard/loans',
    bullets: [
      { icon: IconReceipt, text: 'محاسبه اقساط و سود تسهیلات' },
      { icon: IconShieldCheck, text: 'مقایسه شرایط بانک‌ها' },
      { icon: IconDiamond, text: 'پیشنهاد هوشمند بر اساس پروفایل' },
    ],
  },
  {
    title: 'بازار جهانی',
    subtitle: 'بازارهای بین‌المللی',
    description: 'ارزهای دیجیتال، فلزات گرانبها، شاخص‌های جهانی',
    icon: IconWorld,
    accent: '#3B82F6',
    accentDark: '#2563EB',
    comingSoon: true,
    bullets: [
      { icon: IconCurrencyDollar, text: 'نرخ ارز و طلای جهانی' },
      { icon: IconChartLine, text: 'شاخص‌های بورس جهانی' },
      { icon: IconCoin, text: 'رمزارزها و بازار کریپتو' },
    ],
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  const handleFeatureClick = (feature) => {
    if (feature.route) {
      navigate(feature.route);
    } else if (feature.href) {
      window.location.href = feature.href;
    }
  };

  return (
    <Box
      style={{
        minHeight: '100vh',
        background: rallyColors.bg,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background orbs */}
      <div className="landing-orb landing-orb--green" />
      <div className="landing-orb landing-orb--purple" />
      <div className="landing-orb landing-orb--blue" />

      {/* Grid pattern overlay */}
      <Box
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(148,163,184,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.03) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Navbar */}
      <Box
        component="nav"
        className="landing-enter landing-enter--d0"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          backdropFilter: 'blur(16px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(16px) saturate(1.4)',
          background: 'rgba(11, 14, 20, 0.6)',
          borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
        }}
      >
        <Container size="lg">
          <Group h={64} justify="space-between">
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
            <Button
              variant="light"
              color="rally-green"
              size="sm"
              radius="xl"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate('/dashboard')}
              className="landing-cta"
            >
              ورود به داشبورد
            </Button>
          </Group>
        </Container>
      </Box>

      {/* Hero */}
      <Container size="lg" style={{ position: 'relative', zIndex: 1 }}>
        <Stack
          align="center"
          justify="center"
          gap="lg"
          pt={160}
          pb={80}
          style={{ textAlign: 'center' }}
        >
          <Badge
            size="lg"
            variant="outline"
            color="rally-green"
            radius="xl"
            className="landing-enter landing-enter--d1"
            styles={{
              root: {
                borderColor: 'rgba(16, 185, 129, 0.3)',
                background: 'rgba(16, 185, 129, 0.06)',
                textTransform: 'none',
                fontWeight: 500,
              },
            }}
          >
            <Group gap={6}>
              <IconShieldCheck size={14} />
              پلتفرم هوشمند سرمایه‌گذاری
            </Group>
          </Badge>

          <Title
            order={1}
            className="landing-enter landing-enter--d2"
            style={{
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              fontWeight: 900,
              lineHeight: 1.25,
              color: rallyColors.textPrimary,
              maxWidth: 700,
            }}
          >
            از امروز{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #10B981 0%, #3B82F6 50%, #8B5CF6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              هوشمند
            </span>{' '}
            سرمایه‌گذاری کن
          </Title>

          <Text
            size="lg"
            c={rallyColors.textSecondary}
            maw={540}
            className="landing-enter landing-enter--d3"
            style={{ lineHeight: 1.7 }}
          >
            تحلیل لحظه‌ای بازار بورس تهران، ابزارهای پیشرفته تکنیکال و
            بنیادی، نقشه بازار و مدیریت پرتفوی در یک پلتفرم یکپارچه
          </Text>

          <Group
            gap="md"
            mt="sm"
            className="landing-enter landing-enter--d4"
          >
            <Button
              size="lg"
              radius="xl"
              onClick={() => navigate('/dashboard')}
              className="landing-cta"
              styles={{
                root: {
                  background: `linear-gradient(135deg, ${rallyColors.green} 0%, ${rallyColors.darkGreen} 100%)`,
                  border: 'none',
                  fontWeight: 700,
                  paddingInline: 32,
                  boxShadow: '0 0 32px rgba(16, 185, 129, 0.25)',
                },
              }}
              leftSection={<IconArrowLeft size={18} />}
            >
              ورود به داشبورد
            </Button>
          </Group>
        </Stack>

        {/* Feature Cards */}
        <SimpleGrid
          cols={{ base: 1, sm: 2, md: 3 }}
          spacing="lg"
          pb={80}
          className="landing-enter landing-enter--d4"
        >
          {FEATURES.map((feature) => {
            const isClickable = !feature.comingSoon;
            return (
              <Box
                key={feature.title}
                className="landing-feature-card"
                onClick={isClickable ? () => handleFeatureClick(feature) : undefined}
                style={{
                  background: rallyColors.glassBg,
                  backdropFilter: rallyColors.glassBlur,
                  WebkitBackdropFilter: rallyColors.glassBlur,
                  border: `1px solid ${rallyColors.glassBorder}`,
                  borderRadius: 16,
                  padding: 28,
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: isClickable ? 'pointer' : 'default',
                  opacity: feature.comingSoon ? 0.6 : 1,
                }}
              >
                {/* Accent top border gradient */}
                <Box
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: `linear-gradient(90deg, ${feature.accent}, ${feature.accentDark})`,
                    borderRadius: '16px 16px 0 0',
                  }}
                />

                <Group justify="space-between" align="flex-start">
                  <ThemeIcon
                    size={48}
                    radius="xl"
                    variant="light"
                    style={{
                      background: `rgba(${feature.accent === '#10B981' ? '16,185,129' : feature.accent === '#8B5CF6' ? '139,92,246' : '59,130,246'}, 0.1)`,
                      color: feature.accent,
                      marginBottom: 16,
                    }}
                  >
                    <feature.icon size={24} stroke={1.5} />
                  </ThemeIcon>
                  {feature.comingSoon && (
                    <Badge size="sm" variant="light" color="gray" radius="xl">
                      به‌زودی
                    </Badge>
                  )}
                  {isClickable && (
                    <IconArrowLeft
                      size={18}
                      color={feature.accent}
                      style={{ opacity: 0.6 }}
                    />
                  )}
                </Group>

                <Text fw={700} size="lg" c={rallyColors.textPrimary} mb={4}>
                  {feature.title}
                </Text>
                <Text size="sm" c={feature.accent} fw={500} mb={8}>
                  {feature.subtitle}
                </Text>
                <Text size="sm" c={rallyColors.textSecondary} mb={16} lh={1.6}>
                  {feature.description}
                </Text>

                <Stack gap={8}>
                  {feature.bullets.map((bullet) => (
                    <Group key={bullet.text} gap={8} wrap="nowrap">
                      <bullet.icon
                        size={15}
                        color={feature.accent}
                        style={{ flexShrink: 0 }}
                      />
                      <Text size="xs" c={rallyColors.textSecondary}>
                        {bullet.text}
                      </Text>
                    </Group>
                  ))}
                </Stack>
              </Box>
            );
          })}
        </SimpleGrid>

        {/* Footer */}
        <Box
          py="xl"
          style={{
            borderTop: `1px solid ${rallyColors.glassBorder}`,
            textAlign: 'center',
          }}
        >
          <Text size="xs" c={rallyColors.textDimmed}>
            &copy; {new Date().getFullYear()} TSETMC Dashboard — تمامی حقوق
            محفوظ است
          </Text>
        </Box>
      </Container>
    </Box>
  );
}
