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
  Grid,
  ActionIcon,
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
  IconDatabase,
  IconBolt,
  IconClock24,
  IconLogin2,
  IconSearch,
  IconChartAreaLine,
  IconChevronDown,
  IconBrandGithub,
} from '@tabler/icons-react';
import rallyColors from '../theme/rallyColors';
import RallyKPICard from '../components/RallyKPICard';
import Reveal from '../components/landing/Reveal';
import Counter from '../components/landing/Counter';
import HeroVisual from '../components/landing/HeroVisual';
import BackgroundOrbs from '../components/landing/BackgroundOrbs';

/* ── Data ────────────────────────────────────────────────────── */

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
    route: '/loans',
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

const STATS = [
  { icon: IconDatabase, value: 3000, suffix: '+', label: 'نماد بورسی' },
  { icon: IconBolt, value: 500, suffix: '+', label: 'داده روزانه' },
  { icon: IconClock24, value: 24, suffix: '/۷', label: 'پایش مداوم' },
  { icon: IconChartAreaLine, value: 50, suffix: '+', label: 'ابزار تحلیلی' },
];

const STEPS = [
  {
    icon: IconLogin2,
    title: 'ورود به داشبورد',
    description: 'بدون نیاز به ثبت‌نام وارد شوید',
  },
  {
    icon: IconSearch,
    title: 'جستجوی نماد',
    description: 'نماد مورد نظرتان را پیدا کنید',
  },
  {
    icon: IconChartAreaLine,
    title: 'تحلیل و تصمیم‌گیری',
    description: 'با ابزارهای پیشرفته تحلیل کنید',
  },
];

/* ── Helpers ─────────────────────────────────────────────────── */

const accentToRgb = (accent) =>
  accent === '#10B981'
    ? '16,185,129'
    : accent === '#8B5CF6'
      ? '139,92,246'
      : '59,130,246';

const accentToName = (accent) =>
  accent === '#10B981' ? 'green' : accent === '#8B5CF6' ? 'purple' : 'blue';

/* ── Section header ──────────────────────────────────────────── */

function SectionHeader({ badge, title, subtitle }) {
  return (
    <Stack align="center" mb={40} gap="sm" style={{ textAlign: 'center' }}>
      <Text
        size="xs"
        fw={600}
        c={rallyColors.green}
        tt="uppercase"
        style={{ letterSpacing: '0.08em' }}
      >
        {badge}
      </Text>
      <Title order={2} c={rallyColors.textPrimary} fw={800} fz={{ base: 24, sm: 30 }}>
        {title}
      </Title>
      {subtitle && (
        <Text size="md" c={rallyColors.textSecondary} maw={440}>
          {subtitle}
        </Text>
      )}
    </Stack>
  );
}

/* ══ Main Component ══════════════════════════════════════════════ */

export default function LandingPage() {
  const navigate = useNavigate();

  const handleFeatureClick = (feature) => {
    if (feature.route) navigate(feature.route);
    else if (feature.href) window.location.href = feature.href;
  };

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
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
      {/* Background orbs — single SVG layer */}
      <BackgroundOrbs />

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

      {/* ── Navbar ─────────────────────────────────────────── */}
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

      {/* ── Content ────────────────────────────────────────── */}
      <Container size="lg" style={{ position: 'relative', zIndex: 1 }}>

        {/* ── Hero ─────────────────────────────────────────── */}
        <Stack
          align="center"
          justify="center"
          gap="lg"
          pt={160}
          pb={48}
          style={{ textAlign: 'center' }}
        >
          <Group gap={6} className="landing-enter landing-enter--d1">
            <IconShieldCheck size={14} color={rallyColors.green} />
            <Text size="sm" fw={500} c={rallyColors.textSecondary}>
              پلتفرم هوشمند سرمایه‌گذاری
            </Text>
          </Group>

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
                background:
                  'linear-gradient(135deg, #10B981 0%, #3B82F6 50%, #8B5CF6 100%)',
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

          {/* Dual CTAs */}
          <Group gap="md" mt="xs" className="landing-enter landing-enter--d4">
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
                  boxShadow: '0 0 32px rgba(16, 185, 129, 0.2)',
                },
              }}
              leftSection={<IconArrowLeft size={18} />}
            >
              ورود به داشبورد
            </Button>
            <Button
              size="lg"
              radius="xl"
              variant="outline"
              color="gray"
              className="landing-cta-ghost"
              onClick={scrollToFeatures}
              leftSection={<IconChevronDown size={18} />}
            >
              مشاهده امکانات
            </Button>
          </Group>
        </Stack>

        {/* ── Hero Visual (SVG dashboard mockup) ─────────── */}
        <Box py={32} className="landing-enter landing-enter--d4">
          <HeroVisual />
        </Box>

        {/* ── Stats Strip ──────────────────────────────────── */}
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" pt={24} pb={96}>
          {STATS.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 0.08}>
              <RallyKPICard
                title={stat.label}
                value={<Counter end={stat.value} suffix={stat.suffix} />}
                icon={stat.icon}
                color={rallyColors.green}
                variant="accent-bar"
              />
            </Reveal>
          ))}
        </SimpleGrid>

        {/* ── Features ─────────────────────────────────────── */}
        <Box id="features" pb={96}>
          <Reveal>
            <SectionHeader
              badge="امکانات"
              title="هر آنچه برای تحلیل نیاز دارید"
              subtitle="ابزارهای حرفه‌ای تحلیل بازار سرمایه در دسترس شما"
            />
          </Reveal>

          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
            {FEATURES.map((feature, i) => {
              const isClickable = !feature.comingSoon;
              return (
                <Reveal key={feature.title} delay={i * 0.1}>
                  <Box
                    className="landing-feature-card"
                    data-accent={accentToName(feature.accent)}
                    onClick={
                      isClickable
                        ? () => handleFeatureClick(feature)
                        : undefined
                    }
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
                      opacity: feature.comingSoon ? 0.55 : 1,
                      height: '100%',
                    }}
                  >
                    {/* Top accent line */}
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
                          background: `rgba(${accentToRgb(feature.accent)}, 0.1)`,
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
                          style={{ opacity: 0.5 }}
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
                </Reveal>
              );
            })}
          </SimpleGrid>
        </Box>

        {/* ── How It Works ─────────────────────────────────── */}
        <Box pb={96}>
          <Reveal>
            <SectionHeader badge="شروع کنید" title="در سه قدم ساده" />
          </Reveal>

          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xl">
            {STEPS.map((step, i) => (
              <Reveal key={step.title} delay={i * 0.12}>
                <Stack align="center" gap="md" style={{ textAlign: 'center' }}>
                  <Box style={{ position: 'relative' }}>
                    <ThemeIcon
                      size={64}
                      radius="50%"
                      variant="light"
                      color="rally-green"
                      style={{
                        background: 'rgba(16,185,129,0.07)',
                        border: '2px solid rgba(16,185,129,0.15)',
                      }}
                    >
                      <step.icon size={28} />
                    </ThemeIcon>
                    <Box
                      style={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${rallyColors.green}, ${rallyColors.darkGreen})`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 800,
                        color: '#fff',
                      }}
                    >
                      {(i + 1).toLocaleString('fa-IR')}
                    </Box>
                  </Box>

                  <Text fw={700} size="md" c={rallyColors.textPrimary}>
                    {step.title}
                  </Text>
                  <Text size="sm" c={rallyColors.textSecondary} maw={220} lh={1.6}>
                    {step.description}
                  </Text>
                </Stack>
              </Reveal>
            ))}
          </SimpleGrid>
        </Box>

        {/* ── CTA Banner ───────────────────────────────────── */}
        <Reveal>
          <Box
            mb={96}
            style={{
              background:
                'linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(59,130,246,0.06) 100%)',
              border: '1px solid rgba(16,185,129,0.12)',
              borderRadius: 20,
              padding: '48px 32px',
              textAlign: 'center',
            }}
          >
            <Title order={3} c={rallyColors.textPrimary} fw={800} mb="xs">
              آماده‌اید شروع کنید؟
            </Title>
            <Text
              size="md"
              c={rallyColors.textSecondary}
              mb="lg"
              maw={380}
              mx="auto"
            >
              همین حالا وارد داشبورد شوید و تحلیل بازار را شروع کنید
            </Text>
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
                  paddingInline: 40,
                  boxShadow: '0 0 40px rgba(16, 185, 129, 0.25)',
                },
              }}
              leftSection={<IconArrowLeft size={18} />}
            >
              ورود به داشبورد
            </Button>
          </Box>
        </Reveal>

        {/* ── Footer ───────────────────────────────────────── */}
        <Box py={48} style={{ borderTop: `1px solid ${rallyColors.glassBorder}` }}>
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
                {[
                  { label: 'داشبورد بازار', route: '/dashboard' },
                  { label: 'اختیار معامله', route: '/dashboard/options' },
                  { label: 'بورس کالا', route: '/dashboard/ime' },
                  { label: 'تسهیلات بانکی', route: '/loans' },
                ].map((link) => (
                  <Text
                    key={link.label}
                    size="sm"
                    c={rallyColors.textSecondary}
                    className="landing-footer-link"
                    onClick={() => navigate(link.route)}
                  >
                    {link.label}
                  </Text>
                ))}
              </Stack>
            </Grid.Col>

            {/* Features */}
            <Grid.Col span={{ base: 6, sm: 4 }}>
              <Text fw={700} size="sm" c={rallyColors.textPrimary} mb="md">
                امکانات
              </Text>
              <Stack gap={8}>
                {['تحلیل تکنیکال', 'نقشه گرمایی', 'حقیقی-حقوقی', 'محاسبه وام'].map(
                  (item) => (
                    <Text key={item} size="sm" c={rallyColors.textSecondary}>
                      {item}
                    </Text>
                  ),
                )}
              </Stack>
            </Grid.Col>
          </Grid>

          {/* Copyright bar */}
          <Box
            mt={40}
            pt={20}
            style={{ borderTop: `1px solid ${rallyColors.glassBorder}` }}
          >
            <Group justify="space-between">
              <Text size="xs" c={rallyColors.textDimmed}>
                &copy; {new Date().getFullYear()} TSETMC Dashboard — تمامی حقوق
                محفوظ است
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
      </Container>
    </Box>
  );
}
