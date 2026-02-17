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
  IconChartAreaLine,
  IconChevronDown,
  IconBrandGithub,
} from '@tabler/icons-react';
import rallyColors from '../theme/rallyColors';
import Reveal from '../components/landing/Reveal';
import Counter from '../components/landing/Counter';
import HeroVisual from '../components/landing/HeroVisual';

/* ── Data ────────────────────────────────────────────────────── */

const FEATURES = [
  {
    title: 'بازار ایران',
    subtitle: 'بورس اوراق بهادار تهران',
    description: 'داده‌های لحظه‌ای سهام، شاخص‌ها، نقشه بازار و تحلیل جامع بازار سرمایه',
    icon: IconTrendingUp,
    accent: '#10B981',
    accentName: 'green',
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
    description: 'بررسی و مقایسه انواع تسهیلات بانکی با محاسبه دقیق اقساط',
    icon: IconBuildingBank,
    accent: '#8B5CF6',
    accentName: 'purple',
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
    description: 'ارزهای دیجیتال، فلزات گرانبها، شاخص‌های جهانی و نرخ ارز',
    icon: IconWorld,
    accent: '#3B82F6',
    accentName: 'blue',
    comingSoon: true,
    fullWidth: true,
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

/* ── Section header (Figma style) ─────────────────────────────── */

function SectionHeader({ badge, title, subtitle }) {
  return (
    <Stack align="center" mb={48} gap="sm" style={{ textAlign: 'center' }}>
      {badge && (
        <span className="landing-pill">
          <IconShieldCheck size={14} color={rallyColors.green} />
          {badge}
        </span>
      )}
      <Title
        order={2}
        fw={700}
        fz={{ base: 28, sm: 36, md: 48 }}
        style={{
          background: 'linear-gradient(180deg, #F1F5F9 0%, rgba(241,245,249,0.5) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          letterSpacing: '-0.02em',
          lineHeight: 1.15,
        }}
      >
        {title}
      </Title>
      {subtitle && (
        <Text size="md" c={rallyColors.textSecondary} maw={480}>
          {subtitle}
        </Text>
      )}
    </Stack>
  );
}

/* ── Feature Glow Card ─────────────────────────────────────────── */

function FeatureCard({ feature, onClick }) {
  const isClickable = !feature.comingSoon;
  const accentRgb =
    feature.accent === '#10B981'
      ? '16,185,129'
      : feature.accent === '#8B5CF6'
        ? '139,92,246'
        : '59,130,246';

  return (
    <Box
      className="landing-glow-card"
      onClick={isClickable ? onClick : undefined}
      style={{
        padding: 32,
        cursor: isClickable ? 'pointer' : 'default',
        opacity: feature.comingSoon ? 0.55 : 1,
        height: '100%',
        position: 'relative',
      }}
    >
      <Group justify="space-between" align="flex-start" mb={20}>
        <div className={`landing-icon-glow landing-icon-glow--${feature.accentName}`}>
          <feature.icon size={24} color={feature.accent} stroke={1.5} />
        </div>
        {feature.comingSoon && (
          <Badge size="sm" variant="light" color="gray" radius="xl">
            به‌زودی
          </Badge>
        )}
        {isClickable && (
          <IconArrowLeft size={18} color={feature.accent} style={{ opacity: 0.5 }} />
        )}
      </Group>

      <Text fw={700} fz={{ base: 20, md: 24 }} c={rallyColors.textPrimary} mb={4}>
        {feature.title}
      </Text>
      <Text size="sm" c={feature.accent} fw={500} mb={8}>
        {feature.subtitle}
      </Text>
      <Text size="sm" c={rallyColors.textSecondary} mb={20} lh={1.6}>
        {feature.description}
      </Text>

      <Stack gap={10}>
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
      className="landing-bg"
      style={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Dot grid — fades from hero center outward */}
      <div className="landing-dot-grid" />

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
          backdropFilter: 'blur(20px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
          background: 'rgba(0, 0, 0, 0.7)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
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
              radius={60}
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
          {/* Pill badge */}
          <div className="landing-pill landing-enter landing-enter--d1">
            <IconShieldCheck size={14} color={rallyColors.green} />
            پلتفرم هوشمند سرمایه‌گذاری
          </div>

          {/* Hero title — gradient fade */}
          <Title
            order={1}
            className="landing-hero-title landing-enter landing-enter--d2"
            style={{ maxWidth: 720 }}
          >
            از امروز هوشمند سرمایه‌گذاری کن
          </Title>

          {/* Subtitle */}
          <Text
            fz={{ base: 16, sm: 18 }}
            c={rallyColors.textSecondary}
            maw={560}
            className="landing-enter landing-enter--d3"
            style={{ lineHeight: 1.7 }}
          >
            تحلیل لحظه‌ای بازار بورس تهران، ابزارهای پیشرفته تکنیکال و
            بنیادی، نقشه بازار و مدیریت پرتفوی در یک پلتفرم یکپارچه
          </Text>

          {/* Dual pill CTAs */}
          <Group gap="md" mt="xs" className="landing-enter landing-enter--d4">
            <Button
              size="lg"
              radius={60}
              onClick={() => navigate('/dashboard')}
              className="landing-cta"
              styles={{
                root: {
                  background: `linear-gradient(135deg, ${rallyColors.green} 0%, ${rallyColors.darkGreen} 100%)`,
                  border: 'none',
                  fontWeight: 700,
                  paddingInline: 32,
                  height: 48,
                },
              }}
              leftSection={<IconArrowLeft size={18} />}
            >
              ورود به داشبورد
            </Button>
            <Button
              size="lg"
              radius={60}
              variant="outline"
              color="gray"
              className="landing-cta-ghost"
              onClick={scrollToFeatures}
              styles={{ root: { height: 48 } }}
              leftSection={<IconChevronDown size={18} />}
            >
              مشاهده امکانات
            </Button>
          </Group>
        </Stack>

        {/* ── Hero Visual (SVG dashboard mockup + glow) ────── */}
        <Box py={32} className="landing-enter landing-enter--d4">
          <HeroVisual />
        </Box>

        {/* ── Trust Strip ────────────────────────────────────── */}
        <Reveal>
          <Box pt={24} pb={96}>
            <Text
              ta="center"
              size="sm"
              c={rallyColors.textDimmed}
              fw={500}
              mb={24}
              style={{ letterSpacing: '0.04em' }}
            >
              مورد اعتماد تحلیلگران حرفه‌ای
            </Text>
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
              {STATS.map((stat) => (
                <div key={stat.label} className="landing-trust-stat">
                  <div className="landing-trust-stat__value">
                    <Counter end={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="landing-trust-stat__label">{stat.label}</div>
                </div>
              ))}
            </SimpleGrid>
          </Box>
        </Reveal>

        {/* ── Features ─────────────────────────────────────── */}
        <Box id="features" pb={96}>
          <Reveal>
            <SectionHeader
              badge="امکانات"
              title="هر آنچه برای تحلیل نیاز دارید"
              subtitle="ابزارهای حرفه‌ای تحلیل بازار سرمایه در دسترس شما"
            />
          </Reveal>

          {/* 2-column grid for first two cards */}
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg" mb="lg">
            {FEATURES.filter((f) => !f.fullWidth).map((feature, i) => (
              <Reveal key={feature.title} delay={i * 0.1}>
                <FeatureCard
                  feature={feature}
                  onClick={() => handleFeatureClick(feature)}
                />
              </Reveal>
            ))}
          </SimpleGrid>

          {/* Full-width card for the third feature */}
          {FEATURES.filter((f) => f.fullWidth).map((feature) => (
            <Reveal key={feature.title} delay={0.2}>
              <FeatureCard
                feature={feature}
                onClick={() => handleFeatureClick(feature)}
              />
            </Reveal>
          ))}
        </Box>

        {/* ── CTA Banner (glow card) ─────────────────────────── */}
        <Reveal>
          <Box
            className="landing-glow-card"
            mb={96}
            style={{
              padding: '56px 32px',
              textAlign: 'center',
            }}
          >
            <Title
              order={3}
              fw={700}
              fz={{ base: 24, md: 32 }}
              mb="xs"
              style={{
                background: 'linear-gradient(180deg, #F1F5F9 0%, rgba(241,245,249,0.5) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              آماده‌اید شروع کنید؟
            </Title>
            <Text
              size="md"
              c={rallyColors.textSecondary}
              mb="xl"
              maw={400}
              mx="auto"
              lh={1.7}
            >
              همین حالا وارد داشبورد شوید و تحلیل بازار را شروع کنید
            </Text>
            <Button
              size="lg"
              radius={60}
              onClick={() => navigate('/dashboard')}
              className="landing-cta"
              styles={{
                root: {
                  background: `linear-gradient(135deg, ${rallyColors.green} 0%, ${rallyColors.darkGreen} 100%)`,
                  border: 'none',
                  fontWeight: 700,
                  paddingInline: 40,
                  height: 48,
                },
              }}
              leftSection={<IconArrowLeft size={18} />}
            >
              ورود به داشبورد
            </Button>
          </Box>
        </Reveal>

        {/* ── Footer ───────────────────────────────────────── */}
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
            style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}
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
