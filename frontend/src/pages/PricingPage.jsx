import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
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
  SegmentedControl,
  Accordion,
} from '@mantine/core';
import {
  IconCheck,
  IconX,
  IconSparkles,
  IconArrowLeft,
  IconShieldCheck,
  IconCrown,
  IconBuilding,
  IconGift,
  IconInfoCircle,
} from '@tabler/icons-react';

import rallyColors from '../theme/rallyColors';
import Reveal from '../features/landing/components/Reveal';
import LandingNav from '../features/landing/components/LandingNav';
import LandingFooter from '../features/landing/components/LandingFooter';
import SectionHeader from '../features/landing/components/SectionHeader';

/* ── Plan Data ────────────────────────────────────────────────── */

const PLANS = [
  {
    key: 'free',
    name: 'رایگان',
    subtitle: 'شروع سریع و بدون هزینه',
    icon: IconGift,
    accent: '#22C55E',
    featured: false,
    monthlyPrice: 'رایگان',
    yearlyPrice: 'رایگان',
    monthlyPeriod: '',
    yearlyPeriod: '',
    cta: 'ورود رایگان',
    route: '/dashboard',
    disabled: false,
  },
  {
    key: 'pro',
    name: 'حرفه‌ای',
    subtitle: 'ابزارهای پیشرفته تحلیل',
    icon: IconCrown,
    accent: '#22C55E',
    featured: true,
    monthlyPrice: '۲۹۹,۰۰۰',
    yearlyPrice: '۲,۸۷۰,۰۰۰',
    monthlyPeriod: 'تومان/ماه',
    yearlyPeriod: 'تومان/سال',
    cta: 'شروع دوره آزمایشی',
    route: null,
    disabled: true,
  },
  {
    key: 'enterprise',
    name: 'سازمانی',
    subtitle: 'راهکار اختصاصی سازمان‌ها',
    icon: IconBuilding,
    accent: '#8B5CF6',
    featured: false,
    monthlyPrice: 'تماس بگیرید',
    yearlyPrice: 'تماس بگیرید',
    monthlyPeriod: '',
    yearlyPeriod: '',
    cta: 'تماس با ما',
    route: null,
    disabled: true,
  },
];

const ALL_FEATURES = [
  { text: 'داشبورد بورس تهران', free: true, pro: true, enterprise: true },
  { text: 'نمای کلی بازار', free: true, pro: true, enterprise: true },
  { text: 'نقشه گرمایی بازار', free: true, pro: true, enterprise: true },
  { text: 'فیلتر و اسکرینر سهام', free: true, pro: true, enterprise: true },
  { text: 'رمزارزها (۳۰+ کوین)', free: true, pro: true, enterprise: true },
  { text: 'تسهیلات بانکی و مقایسه', free: true, pro: true, enterprise: true },
  { text: 'پرتفوی و مدیریت سبد', free: false, pro: true, enterprise: true },
  { text: 'دستیار هوشمند (چت‌بات AI)', free: false, pro: true, enterprise: true },
  { text: 'تحلیل تکنیکال پیشرفته', free: false, pro: true, enterprise: true },
  { text: 'داده‌های بورس کالا (IME)', free: false, pro: true, enterprise: true },
  { text: 'اختیار معامله و ماشین‌حساب', free: false, pro: true, enterprise: true },
  { text: 'هشدار قیمت و نوتیفیکیشن', free: false, pro: true, enterprise: true },
  { text: 'API اختصاصی', free: false, pro: false, enterprise: true },
  { text: 'پشتیبانی اختصاصی ۲۴/۷', free: false, pro: false, enterprise: true },
  { text: 'گزارش‌های سفارشی', free: false, pro: false, enterprise: true },
  { text: 'کاربران نامحدود', free: false, pro: false, enterprise: true },
];

/* Features grouped by category for comparison table */
const FEATURE_CATEGORIES = [
  {
    category: 'بازار سهام',
    features: [
      { text: 'داشبورد بورس تهران', free: true, pro: true, enterprise: true },
      { text: 'نمای کلی بازار', free: true, pro: true, enterprise: true },
      { text: 'نقشه گرمایی بازار', free: true, pro: true, enterprise: true },
      { text: 'فیلتر و اسکرینر سهام', free: true, pro: true, enterprise: true },
      { text: 'رمزارزها (۳۰+ کوین)', free: true, pro: true, enterprise: true },
      { text: 'تسهیلات بانکی و مقایسه', free: true, pro: true, enterprise: true },
    ],
  },
  {
    category: 'ابزارهای تحلیل',
    features: [
      { text: 'پرتفوی و مدیریت سبد', free: false, pro: true, enterprise: true },
      { text: 'دستیار هوشمند (چت‌بات AI)', free: false, pro: true, enterprise: true },
      { text: 'تحلیل تکنیکال پیشرفته', free: false, pro: true, enterprise: true },
      { text: 'داده‌های بورس کالا (IME)', free: false, pro: true, enterprise: true },
      { text: 'اختیار معامله و ماشین‌حساب', free: false, pro: true, enterprise: true },
      { text: 'هشدار قیمت و نوتیفیکیشن', free: false, pro: true, enterprise: true },
    ],
  },
  {
    category: 'پلتفرم',
    features: [
      { text: 'API اختصاصی', free: false, pro: false, enterprise: true },
      { text: 'پشتیبانی اختصاصی ۲۴/۷', free: false, pro: false, enterprise: true },
      { text: 'گزارش‌های سفارشی', free: false, pro: false, enterprise: true },
      { text: 'کاربران نامحدود', free: false, pro: false, enterprise: true },
    ],
  },
];

const FAQ_ITEMS = [
  {
    q: 'آیا می‌توانم بعداً پلن خود را تغییر دهم؟',
    a: 'بله، شما در هر زمان می‌توانید پلن خود را ارتقا یا تغییر دهید. تغییر پلن بلافاصله اعمال می‌شود و مبلغ به صورت نسبی محاسبه خواهد شد.',
  },
  {
    q: 'دوره آزمایشی رایگان چقدر است؟',
    a: 'پلن حرفه‌ای شامل ۱۴ روز دوره آزمایشی رایگان است. در طول این مدت به تمامی امکانات پلن حرفه‌ای دسترسی خواهید داشت.',
  },
  {
    q: 'آیا داده‌ها به‌صورت لحظه‌ای هستند؟',
    a: 'بله، تمامی داده‌های بازار بورس تهران و رمزارزها به‌صورت لحظه‌ای و با کمترین تاخیر ممکن به‌روزرسانی می‌شوند.',
  },
  {
    q: 'آیا امکان پرداخت ارزی وجود دارد؟',
    a: 'در حال حاضر پرداخت به صورت ریالی و از طریق درگاه‌های بانکی داخلی انجام می‌شود. پشتیبانی از پرداخت ارزی به‌زودی اضافه خواهد شد.',
  },
];

/* ── Helpers ──────────────────────────────────────────────────── */

function CheckIcon({ included }) {
  return included ? (
    <IconCheck size={18} color={rallyColors.green} />
  ) : (
    <IconX size={18} color="#2A2E3E" />
  );
}

/* ── Motion Variants ─────────────────────────────────────────── */

const cardHover = { y: -8, transition: { type: 'spring', stiffness: 300, damping: 20 } };

/* ══ Main Component ══════════════════════════════════════════════ */

export default function PricingPage() {
  const navigate = useNavigate();
  const [billing, setBilling] = useState('monthly');
  const isYearly = billing === 'yearly';

  return (
    <Box
      className="landing-bg"
      style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}
    >
      <div className="landing-dot-grid" />
      <LandingNav />

      <Container size="lg" style={{ position: 'relative', zIndex: 1 }}>

        {/* ── Hero / Header ───────────────────────────────────── */}
        <Box pt={160} pb={48}>
          <Reveal>
            <SectionHeader
              badge="تعرفه‌ها"
              title="پلن های همکاری"
              subtitle="از داشبورد رایگان شروع کنید یا با پلن حرفه‌ای به تمام امکانات دسترسی پیدا کنید"
            />
          </Reveal>

          {/* Billing toggle */}
          <Reveal delay={0.1}>
            <div className="landing-billing-toggle">
              <SegmentedControl
                value={billing}
                onChange={setBilling}
                data={[
                  { label: 'ماهانه', value: 'monthly' },
                  { label: 'سالانه', value: 'yearly' },
                ]}
                radius="xl"
                size="md"
                styles={{
                  root: {
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  },
                  label: {
                    color: rallyColors.textSecondary,
                    fontWeight: 500,
                    padding: '8px 24px',
                  },
                  indicator: {
                    background: 'rgba(34,197,94,0.15)',
                    border: '1px solid rgba(34,197,94,0.3)',
                    boxShadow: '0 0 12px rgba(42,46,62,0.5)',
                  },
                }}
              />
              {isYearly && (
                <Badge
                  size="sm"
                  variant="light"
                  color="teal"
                  className="landing-discount-badge"
                >
                  ۲۰٪ تخفیف
                </Badge>
              )}
            </div>
          </Reveal>
        </Box>

        {/* ── Plan Cards ──────────────────────────────────────── */}
        <Box pb={96}>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
            {PLANS.map((plan, i) => {
              const Icon = plan.icon;
              const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
              const period = isYearly ? plan.yearlyPeriod : plan.monthlyPeriod;
              const planFeatures = ALL_FEATURES.map((f) => ({
                text: f.text,
                included: f[plan.key],
              }));

              return (
                <Reveal key={plan.key} delay={i * 0.1}>
                  <motion.div whileHover={cardHover}>
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
                          style={{
                            position: 'absolute',
                            top: -12,
                            left: '50%',
                            transform: 'translateX(-50%)',
                          }}
                        >
                          پیشنهادی
                        </Badge>
                      )}

                      {/* Plan icon + name */}
                      <Group gap="sm" mb="xs">
                        <Box
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: `rgba(${plan.accent === '#8B5CF6' ? '139,92,246' : '34,197,94'},0.1)`,
                            border: `1px solid rgba(${plan.accent === '#8B5CF6' ? '139,92,246' : '34,197,94'},0.2)`,
                          }}
                        >
                          <Icon size={20} color={plan.accent} />
                        </Box>
                        <Box>
                          <Text fw={700} fz={20} c="#E8EAED" lh={1.2}>
                            {plan.name}
                          </Text>
                          <Text size="xs" c={rallyColors.textDimmed}>
                            {plan.subtitle}
                          </Text>
                        </Box>
                      </Group>

                      {/* Price */}
                      <Group gap={6} align="baseline" mt="md" mb="xs">
                        <Title
                          order={3}
                          fw={800}
                          fz={{ base: 28, md: 32 }}
                          style={{
                            background: 'linear-gradient(180deg, #E8EAED 0%, rgba(232,234,237,0.55) 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                          }}
                        >
                          {price}
                        </Title>
                        {period && (
                          <Text size="sm" c={rallyColors.textDimmed}>
                            {period}
                          </Text>
                        )}
                      </Group>

                      {/* Feature list */}
                      <Box
                        style={{
                          borderTop: '1px solid rgba(255,255,255,0.06)',
                          margin: '16px 0',
                          paddingTop: 16,
                          flex: 1,
                        }}
                      >
                        {planFeatures.map((f) => (
                          <div key={f.text} className="landing-pricing-check">
                            {f.included ? (
                              <IconCheck size={16} color={rallyColors.green} />
                            ) : (
                              <IconX size={16} color="rgba(156,163,175,0.3)" />
                            )}
                            <Text
                              span
                              size="sm"
                              c={f.included ? '#CBD5E1' : 'rgba(156,163,175,0.35)'}
                            >
                              {f.text}
                            </Text>
                          </div>
                        ))}
                      </Box>

                      {/* CTA */}
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
                            ? { borderColor: 'rgba(156,163,175,0.15)' }
                            : {
                                background: `linear-gradient(135deg, ${rallyColors.green} 0%, ${rallyColors.darkGreen} 100%)`,
                                border: 'none',
                                fontWeight: 700,
                              },
                        }}
                        leftSection={plan.disabled ? undefined : <IconArrowLeft size={16} />}
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
              );
            })}
          </SimpleGrid>
        </Box>

        {/* ── Comparison Table ────────────────────────────────── */}
        <Box pb={96}>
          <Reveal>
            <SectionHeader
              badge="مقایسه"
              title="مقایسه کامل امکانات"
              subtitle="تمام ویژگی‌ها را در یک نگاه مقایسه کنید"
            />
          </Reveal>

          <Reveal delay={0.1}>
            <Box className="landing-glow-card landing-compare-table">
              {/* Sticky header */}
              <div className="landing-compare-header">
                <div className="landing-compare-cell landing-compare-cell--feature">
                  <Text fw={600} size="sm" c={rallyColors.textDimmed}>
                    ویژگی
                  </Text>
                </div>
                <div className="landing-compare-cell">
                  <Text fw={700} size="sm" c={rallyColors.textPrimary}>
                    رایگان
                  </Text>
                </div>
                <div className="landing-compare-cell landing-compare-cell--highlight">
                  <Group gap={6} justify="center">
                    <IconCrown size={14} color={rallyColors.green} />
                    <Text fw={700} size="sm" c={rallyColors.green}>
                      حرفه‌ای
                    </Text>
                  </Group>
                </div>
                <div className="landing-compare-cell">
                  <Text fw={700} size="sm" c={rallyColors.textPrimary}>
                    سازمانی
                  </Text>
                </div>
              </div>

              {/* Feature rows grouped by category */}
              {FEATURE_CATEGORIES.map((cat) => (
                <div key={cat.category}>
                  {/* Category separator */}
                  <div className="landing-compare-category">
                    <Text fw={700} size="sm" c={rallyColors.textPrimary}>
                      {cat.category}
                    </Text>
                  </div>

                  {cat.features.map((f) => (
                    <div key={f.text} className="landing-compare-row">
                      <div className="landing-compare-cell landing-compare-cell--feature">
                        <Text size="sm" c={rallyColors.textSecondary}>
                          {f.text}
                        </Text>
                      </div>
                      <div className="landing-compare-cell">
                        <CheckIcon included={f.free} />
                      </div>
                      <div className="landing-compare-cell landing-compare-cell--highlight">
                        <CheckIcon included={f.pro} />
                      </div>
                      <div className="landing-compare-cell">
                        <CheckIcon included={f.enterprise} />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </Box>
          </Reveal>
        </Box>

        {/* ── FAQ Section ─────────────────────────────────────── */}
        <Box pb={96}>
          <Reveal>
            <SectionHeader
              badge="سوالات متداول"
              title="پاسخ به سوالات شما"
              subtitle="پاسخ سوالات رایج درباره پلن‌ها و خدمات"
            />
          </Reveal>

          <Reveal delay={0.1}>
            <Box maw={720} mx="auto">
              <Accordion
                variant="separated"
                radius="md"
                styles={{
                  item: {
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    '&[data-active]': {
                      border: '1px solid rgba(34,197,94,0.2)',
                    },
                  },
                  control: {
                    color: rallyColors.textPrimary,
                    fontWeight: 600,
                    '&:hover': {
                      background: 'rgba(255,255,255,0.02)',
                    },
                  },
                  chevron: {
                    color: rallyColors.textDimmed,
                  },
                  content: {
                    color: rallyColors.textSecondary,
                    lineHeight: 1.8,
                  },
                }}
              >
                {FAQ_ITEMS.map((item, i) => (
                  <Accordion.Item key={i} value={`faq-${i}`}>
                    <Accordion.Control
                      icon={<IconInfoCircle size={18} color={rallyColors.green} />}
                    >
                      {item.q}
                    </Accordion.Control>
                    <Accordion.Panel>{item.a}</Accordion.Panel>
                  </Accordion.Item>
                ))}
              </Accordion>
            </Box>
          </Reveal>
        </Box>

        {/* ── Footer ──────────────────────────────────────────── */}
        <LandingFooter />
      </Container>
    </Box>
  );
}
