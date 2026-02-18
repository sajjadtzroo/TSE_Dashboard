import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from "motion/react";
import {
  Box,
  Container,
  SimpleGrid,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Badge,
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
  IconRobot,
  IconChartAreaLine,
  IconChevronDown,
  IconBriefcase,
  IconChartArea,
  IconChartPie,
  IconCheck,
  IconX,
  IconSparkles,
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
    title: 'تسهیلات بانکی',
    subtitle: 'مقایسه و محاسبه وام',
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
    title: 'پورتفولیو',
    subtitle: 'مدیریت سبد سهام',
    description: 'ثبت دارایی‌ها، پایش ارزش لحظه‌ای، تحلیل ریسک و بازده سبد سرمایه‌گذاری',
    icon: IconBriefcase,
    accent: '#3B82F6',
    accentName: 'blue',
    route: '/dashboard/portfolio',
    bullets: [
      { icon: IconChartArea, text: 'ارزش‌گذاری لحظه‌ای سبد' },
      { icon: IconShieldCheck, text: 'تحلیل ریسک: بتا، نوسان‌پذیری، VaR' },
      { icon: IconChartPie, text: 'تخصیص دارایی و مقایسه با شاخص' },
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
    bullets: [
      { icon: IconCurrencyDollar, text: 'قیمت لحظه‌ای به دلار و تومان' },
      { icon: IconChartLine, text: 'نمودار شمعی و نقشه گرمایی' },
      { icon: IconChartBar, text: 'شاخص ترس و طمع و سلطه بیت‌کوین' },
    ],
  },
];

const STATS = [
  { icon: IconDatabase, value: 1200, suffix: '+', label: 'نماد و صندوق' },
  { icon: IconChartAreaLine, value: 40, suffix: '+', label: 'صفحه تحلیلی' },
  { icon: IconCoin, value: 30, suffix: '+', label: 'رمزارز' },
  { icon: IconBuildingBank, value: 6, suffix: '', label: 'بازار تحت پوشش' },
  { icon: IconRobot, value: 19, suffix: '', label: 'ابزار هوش مصنوعی' },
];

const PRICING_PLANS = [
  {
    name: 'رایگان',
    price: 'رایگان',
    period: '',
    accent: '#10B981',
    featured: false,
    features: [
      { text: 'داشبورد بورس تهران', included: true },
      { text: 'رمزارزها', included: true },
      { text: 'تسهیلات بانکی', included: true },
      { text: 'پرتفوی و مدیریت سبد', included: false },
      { text: 'دستیار هوشمند (چت‌بات AI)', included: false },
      { text: 'تحلیل تکنیکال پیشرفته', included: false },
    ],
    cta: 'ورود رایگان',
    route: '/dashboard',
    disabled: false,
  },
  {
    name: 'حرفه‌ای',
    price: '۲۹۹,۰۰۰',
    period: 'تومان/ماه',
    accent: '#10B981',
    featured: true,
    features: [
      { text: 'داشبورد بورس تهران', included: true },
      { text: 'رمزارزها', included: true },
      { text: 'تسهیلات بانکی', included: true },
      { text: 'پرتفوی و مدیریت سبد', included: true },
      { text: 'دستیار هوشمند (چت‌بات AI)', included: true },
      { text: 'تحلیل تکنیکال پیشرفته', included: true },
      { text: 'داده‌های بورس کالا', included: true },
      { text: 'API اختصاصی', included: false },
    ],
    cta: 'شروع دوره آزمایشی',
    route: null,
    disabled: true,
  },
  {
    name: 'سازمانی',
    price: 'تماس بگیرید',
    period: '',
    accent: '#8B5CF6',
    featured: false,
    features: [
      { text: 'داشبورد بورس تهران', included: true },
      { text: 'رمزارزها', included: true },
      { text: 'تسهیلات بانکی', included: true },
      { text: 'پرتفوی و مدیریت سبد', included: true },
      { text: 'دستیار هوشمند (چت‌بات AI)', included: true },
      { text: 'تحلیل تکنیکال پیشرفته', included: true },
      { text: 'داده‌های بورس کالا', included: true },
      { text: 'API اختصاصی', included: true },
      { text: 'پشتیبانی اختصاصی', included: true },
      { text: 'گزارش‌های سفارشی', included: true },
    ],
    cta: 'تماس با ما',
    route: null,
    disabled: true,
  },
];

/* ── Motion Variants ─────────────────────────────────────────── */

const heroContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const heroItem = {
  hidden: { opacity: 0, y: 16, filter: "blur(5px)" },
  show: {
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
  },
};

const statsContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const statItem = {
  hidden: { opacity: 0, scale: 0.8 },
  show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 200, damping: 20 } },
};

/* ══ Main Component ══════════════════════════════════════════════ */

export default function LandingPage() {
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll();

  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -60]);
  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.95]);
  const heroOpacity = useTransform(scrollYProgress, [0.15, 0.35], [1, 0]);

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
        <motion.div variants={heroContainer} initial="hidden" animate="show">
          <Stack
            align="center"
            justify="center"
            gap="lg"
            pt={160}
            pb={48}
            style={{ textAlign: 'center' }}
          >
            <motion.div variants={heroItem}>
              <div className="landing-pill">
                <IconShieldCheck size={14} color={rallyColors.green} />
                پلتفرم هوشمند سرمایه‌گذاری
              </div>
            </motion.div>

            <motion.div variants={heroItem}>
              <Title
                order={1}
                className="landing-hero-title"
                style={{ maxWidth: 720 }}
              >
                از امروز هوشمند سرمایه‌گذاری کن
              </Title>
            </motion.div>

            <motion.div variants={heroItem}>
              <Text
                fz={{ base: 16, sm: 18 }}
                c={rallyColors.textSecondary}
                maw={560}
                style={{ lineHeight: 1.7 }}
              >
                تحلیل لحظه‌ای بازار بورس تهران، ابزارهای پیشرفته تکنیکال و
                بنیادی، نقشه بازار و دستیار هوشمند در یک پلتفرم یکپارچه
              </Text>
            </motion.div>

            <motion.div variants={heroItem}>
              <Group gap="md" mt="xs">
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
            </motion.div>
          </Stack>
        </motion.div>

        {/* ── Hero Visual ──────────────────────────────────── */}
        <motion.div style={{ y: heroY, scale: heroScale, opacity: heroOpacity }}>
          <Box py={32}>
            <HeroVisual />
          </Box>
        </motion.div>

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
              پلتفرم جامع بازار سرمایه
            </Text>
            <motion.div
              variants={statsContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-48px" }}
            >
              <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="md">
                {STATS.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <motion.div key={stat.label} variants={statItem}>
                      <div className="landing-trust-stat">
                        <Icon size={24} color={rallyColors.green} style={{ marginBottom: 4 }} />
                        <div className="landing-trust-stat__value">
                          <Counter end={stat.value} suffix={stat.suffix} />
                        </div>
                        <div className="landing-trust-stat__label">{stat.label}</div>
                      </div>
                    </motion.div>
                  );
                })}
              </SimpleGrid>
            </motion.div>
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

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
            {FEATURES.map((feature, i) => (
              <Reveal key={feature.title} delay={i * 0.1}>
                <FeatureCard
                  feature={feature}
                  onClick={() => handleFeatureClick(feature)}
                />
              </Reveal>
            ))}
          </SimpleGrid>
        </Box>

        {/* ── Pricing ─────────────────────────────────────── */}
        <Box id="pricing" pb={96}>
          <Reveal>
            <SectionHeader
              badge="تعرفه‌ها"
              title="پلن مناسب خود را انتخاب کنید"
              subtitle="از داشبورد رایگان شروع کنید یا با پلن حرفه‌ای به تمام امکانات دسترسی پیدا کنید"
            />
          </Reveal>

          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
            {PRICING_PLANS.map((plan, i) => (
              <Reveal key={plan.name} delay={i * 0.1}>
                <motion.div whileHover={{ y: -6 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
                  <Box
                    className={`landing-glow-card landing-pricing-card ${plan.featured ? 'landing-pricing-card--featured' : ''}`}
                    style={{ position: 'relative' }}
                  >
                    {plan.featured && (
                      <Badge
                        size="sm"
                        variant="filled"
                        color="teal"
                        leftSection={<IconSparkles size={12} />}
                        style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)' }}
                      >
                        پیشنهادی
                      </Badge>
                    )}

                    <Text fw={700} fz={20} c="#F1F5F9" mb={4}>
                      {plan.name}
                    </Text>

                    <Group gap={6} align="baseline" mb="xs">
                      <Title
                        order={3}
                        fw={800}
                        fz={{ base: 28, md: 32 }}
                        style={{
                          background: `linear-gradient(180deg, #F1F5F9 0%, rgba(241,245,249,0.55) 100%)`,
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}
                      >
                        {plan.price}
                      </Title>
                      {plan.period && (
                        <Text size="sm" c={rallyColors.textDimmed}>
                          {plan.period}
                        </Text>
                      )}
                    </Group>

                    <Box
                      style={{
                        borderTop: '1px solid rgba(255,255,255,0.06)',
                        margin: '16px 0',
                        paddingTop: 16,
                        flex: 1,
                      }}
                    >
                      {plan.features.map((f) => (
                        <div key={f.text} className="landing-pricing-check">
                          {f.included ? (
                            <IconCheck size={16} color={rallyColors.green} />
                          ) : (
                            <IconX size={16} color="rgba(148,163,184,0.3)" />
                          )}
                          <Text
                            span
                            size="sm"
                            c={f.included ? '#CBD5E1' : 'rgba(148,163,184,0.35)'}
                          >
                            {f.text}
                          </Text>
                        </div>
                      ))}
                    </Box>

                    <Button
                      fullWidth
                      size="md"
                      radius={12}
                      mt="md"
                      disabled={plan.disabled}
                      onClick={plan.route ? () => navigate(plan.route) : undefined}
                      variant={plan.disabled ? 'outline' : 'filled'}
                      color={plan.disabled ? 'gray' : undefined}
                      className={plan.disabled ? undefined : 'landing-cta'}
                      styles={{
                        root: plan.disabled
                          ? { borderColor: 'rgba(148,163,184,0.15)' }
                          : {
                              background: `linear-gradient(135deg, ${rallyColors.green} 0%, ${rallyColors.darkGreen} 100%)`,
                              border: 'none',
                              fontWeight: 700,
                            },
                      }}
                      leftSection={
                        plan.disabled ? undefined : <IconArrowLeft size={16} />
                      }
                      rightSection={
                        plan.disabled ? (
                          <Badge size="xs" variant="light" color="gray">
                            به‌زودی
                          </Badge>
                        ) : undefined
                      }
                    >
                      {plan.cta}
                    </Button>
                  </Box>
                </motion.div>
              </Reveal>
            ))}
          </SimpleGrid>
        </Box>

        {/* ── Footer ───────────────────────────────────────── */}
        <LandingFooter />
      </Container>
    </Box>
  );
}
