import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  SimpleGrid,
  Title,
  Text,
  Button,
  Group,
  Stack,
} from '@mantine/core';
import {
  IconTrendingUp,
  IconBuildingBank,
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
} from '@tabler/icons-react';
import rallyColors from '../theme/rallyColors';
import Reveal from '../components/landing/Reveal';
import Counter from '../components/landing/Counter';
import HeroVisual from '../components/landing/HeroVisual';
import LandingNav from '../components/landing/LandingNav';
import LandingFooter from '../components/landing/LandingFooter';
import SectionHeader from '../components/landing/SectionHeader';
import FeatureCard from '../components/landing/FeatureCard';

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
    title: 'رمزارزها',
    subtitle: 'بازار ارزهای دیجیتال',
    description: 'پایش لحظه‌ای ۳۰ رمزارز برتر، نمودار قیمت، مقایسه و تحلیل بازار کریپتو',
    icon: IconCoin,
    accent: '#F59E0B',
    accentName: 'yellow',
    route: '/crypto',
    fullWidth: true,
    bullets: [
      { icon: IconCurrencyDollar, text: 'قیمت لحظه‌ای به دلار و تومان' },
      { icon: IconChartLine, text: 'نمودار شمعی و نقشه گرمایی' },
      { icon: IconChartBar, text: 'شاخص ترس و طمع و سلطه بیت‌کوین' },
    ],
  },
];

const STATS = [
  { icon: IconDatabase, value: 3000, suffix: '+', label: 'نماد بورسی' },
  { icon: IconBolt, value: 500, suffix: '+', label: 'داده روزانه' },
  { icon: IconClock24, value: 24, suffix: '/۷', label: 'پایش مداوم' },
  { icon: IconChartAreaLine, value: 50, suffix: '+', label: 'ابزار تحلیلی' },
  { icon: IconCoin, value: 30, suffix: '+', label: 'رمزارز' },
];

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
      style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}
    >
      <div className="landing-dot-grid" />

      {/* ── Navbar ─────────────────────────────────────────── */}
      <LandingNav />

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
          <div className="landing-pill landing-enter landing-enter--d1">
            <IconShieldCheck size={14} color={rallyColors.green} />
            پلتفرم هوشمند سرمایه‌گذاری
          </div>

          <Title
            order={1}
            className="landing-hero-title landing-enter landing-enter--d2"
            style={{ maxWidth: 720 }}
          >
            از امروز هوشمند سرمایه‌گذاری کن
          </Title>

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

        {/* ── Hero Visual ──────────────────────────────────── */}
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

          {FEATURES.filter((f) => f.fullWidth).map((feature) => (
            <Reveal key={feature.title} delay={0.2}>
              <FeatureCard
                feature={feature}
                onClick={() => handleFeatureClick(feature)}
              />
            </Reveal>
          ))}
        </Box>

        {/* ── CTA Banner ─────────────────────────────────────── */}
        <Reveal>
          <Box
            className="landing-glow-card"
            mb={96}
            style={{ padding: '56px 32px', textAlign: 'center' }}
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
        <LandingFooter />
      </Container>
    </Box>
  );
}
