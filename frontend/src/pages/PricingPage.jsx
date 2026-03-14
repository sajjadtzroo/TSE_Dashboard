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
  Modal,
  Alert,
  ThemeIcon,
  Divider,
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
  IconCalendar,
  IconAlertCircle,
} from '@tabler/icons-react';

import rallyColors from '../theme/rallyColors';
import Reveal from '../features/landing/components/Reveal';
import LandingNav from '../features/landing/components/LandingNav';
import LandingFooter from '../features/landing/components/LandingFooter';
import SectionHeader from '../features/landing/components/SectionHeader';
import { useAuth } from '../context/AuthContext';
import { useMySubscription } from '../hooks/useMarketData';

/* ── Billing options ──────────────────────────────────────────── */

const BILLING_OPTIONS = [
  { label: 'ماهانه', value: 'monthly', discount: null },
  { label: '۳ ماهه', value: '3month', discount: '۵٪' },
  { label: '۶ ماهه', value: '6month', discount: '۱۰٪' },
  { label: 'سالانه', value: 'yearly', discount: '۲۰٪' },
];

/* ── Plan Data ────────────────────────────────────────────────── */

const PLANS = [
  {
    key: 'free',
    name: 'رایگان',
    subtitle: 'شروع سریع و بدون هزینه',
    icon: IconGift,
    accent: '#2962FF',
    featured: false,
    prices: {
      monthly: { amount: 'رایگان', period: '' },
      '3month': { amount: 'رایگان', period: '' },
      '6month': { amount: 'رایگان', period: '' },
      yearly: { amount: 'رایگان', period: '' },
    },
    cta: 'ورود رایگان',
    route: '/dashboard',
    disabled: false,
    tier: null,
  },
  {
    key: 'pro',
    name: 'حرفه‌ای',
    subtitle: 'ابزارهای پیشرفته تحلیل',
    icon: IconCrown,
    accent: '#2962FF',
    featured: true,
    prices: {
      monthly: { amount: '۲۹۹,۰۰۰', period: 'تومان/ماه' },
      '3month': { amount: '۸۵۰,۰۰۰', period: 'تومان/۳ ماه' },
      '6month': { amount: '۱,۶۱۵,۰۰۰', period: 'تومان/۶ ماه' },
      yearly: { amount: '۲,۸۷۰,۰۰۰', period: 'تومان/سال' },
    },
    cta: 'درخواست اشتراک',
    route: null,
    disabled: false,
    tier: 'pro',
  },
  {
    key: 'enterprise',
    name: 'سازمانی',
    subtitle: 'راهکار اختصاصی سازمان‌ها',
    icon: IconBuilding,
    accent: '#8B5CF6',
    featured: false,
    prices: {
      monthly: { amount: 'تماس بگیرید', period: '' },
      '3month': { amount: 'تماس بگیرید', period: '' },
      '6month': { amount: 'تماس بگیرید', period: '' },
      yearly: { amount: 'تماس بگیرید', period: '' },
    },
    cta: 'تماس با ما',
    route: null,
    disabled: false,
    tier: 'enterprise',
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
    a: 'بله، شما در هر زمان می‌توانید پلن خود را ارتقا یا تغییر دهید. برای تغییر پلن با پشتیبانی تماس بگیرید.',
  },
  {
    q: 'چگونه اشتراک را فعال کنم؟',
    a: 'پس از انتخاب پلن و تماس با پشتیبانی، اشتراک شما توسط تیم ما فعال می‌شود. فعال‌سازی معمولاً در کمتر از ۲۴ ساعت انجام می‌شود.',
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
    <IconCheck size={18} color={rallyColors.primary} />
  ) : (
    <IconX size={18} color="#2A2E3E" />
  );
}

function planTypeLabel(pt) {
  const map = { monthly: 'ماهانه', '3month': '۳ ماهه', '6month': '۶ ماهه', yearly: 'سالانه' };
  return map[pt] || pt;
}

function tierLabel(t) {
  return t === 'pro' ? 'حرفه‌ای' : t === 'enterprise' ? 'سازمانی' : t;
}

/* ── Motion Variants ─────────────────────────────────────────── */

const cardHover = { y: -8, transition: { type: 'spring', stiffness: 300, damping: 20 } };

/* ── Contact Modal ────────────────────────────────────────────── */

function ContactModal({ opened, onClose, plan, billing }) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text fw={700} size="lg" c="#E8EAED">
          درخواست پلن {plan?.name}
        </Text>
      }
      centered
      size="md"
      styles={{
        root: { direction: 'rtl' },
        header: {
          background: '#1A1D2E',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        },
        body: { background: '#1A1D2E', padding: '24px' },
      }}
    >
      <Stack gap="md">
        <Alert
          icon={<IconInfoCircle size={18} />}
          color="blue"
          variant="light"
          styles={{ root: { background: 'rgba(41,98,255,0.08)', border: '1px solid rgba(41,98,255,0.2)' } }}
        >
          <Text size="sm" c="#CBD5E1">
            برای فعال‌سازی اشتراک <strong>{plan?.name}</strong> ({billing && planTypeLabel(billing)}) با تیم پشتیبانی تماس بگیرید.
          </Text>
        </Alert>

        <Box
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            padding: 20,
          }}
        >
          <Stack gap="sm">
            <Group gap="xs">
              <Text size="sm" c={rallyColors.textDimmed}>تلگرام پشتیبانی:</Text>
              <Text size="sm" fw={600} c={rallyColors.primary}>@tse_support</Text>
            </Group>
            <Divider style={{ borderColor: 'rgba(255,255,255,0.06)' }} />
            <Text size="xs" c={rallyColors.textDimmed} lh={1.8}>
              لطفاً نام کاربری و پلن انتخابی خود را در پیام ذکر کنید. تیم ما در کمتر از ۲۴ ساعت اشتراک را فعال می‌کند.
            </Text>
          </Stack>
        </Box>

        <Button
          fullWidth
          variant="outline"
          color="gray"
          radius={10}
          onClick={onClose}
          styles={{ root: { borderColor: 'rgba(255,255,255,0.1)', color: '#CBD5E1' } }}
        >
          بستن
        </Button>
      </Stack>
    </Modal>
  );
}

/* ── Active Subscription Banner ───────────────────────────────── */

function SubscriptionBanner({ subscription }) {
  if (!subscription) return null;

  return (
    <Reveal delay={0.05}>
      <Box
        mx="auto"
        maw={700}
        mb={40}
        style={{
          background: 'rgba(41,98,255,0.08)',
          border: '1px solid rgba(41,98,255,0.25)',
          borderRadius: 14,
          padding: '16px 24px',
        }}
      >
        <Group gap="sm" justify="center">
          <ThemeIcon size={32} radius="xl" variant="light" color="blue">
            <IconShieldCheck size={18} />
          </ThemeIcon>
          <Box>
            <Text fw={700} size="sm" c="#E8EAED">
              اشتراک فعال: {tierLabel(subscription.tier)} — {planTypeLabel(subscription.plan_type)}
            </Text>
            <Group gap={6}>
              <IconCalendar size={13} color={rallyColors.textDimmed} />
              <Text size="xs" c={rallyColors.textDimmed}>
                {subscription.days_remaining} روز باقی‌مانده
                {' · '}انقضا:{' '}
                {new Date(subscription.expires_at).toLocaleDateString('fa-IR')}
              </Text>
            </Group>
          </Box>
        </Group>
      </Box>
    </Reveal>
  );
}

/* ══ Main Component ══════════════════════════════════════════════ */

export default function PricingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [billing, setBilling] = useState('monthly');
  const [contactPlan, setContactPlan] = useState(null);

  const { data: subscription } = useMySubscription({ enabled: isAuthenticated });

  const activeDiscount = BILLING_OPTIONS.find(o => o.value === billing)?.discount;

  const handlePlanClick = (plan) => {
    if (!plan.tier) {
      navigate(plan.route);
      return;
    }
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setContactPlan(plan);
  };

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
                data={BILLING_OPTIONS.map(o => ({ label: o.label, value: o.value }))}
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
                    padding: '8px 20px',
                  },
                  indicator: {
                    background: 'rgba(41,98,255,0.15)',
                    border: '1px solid rgba(41,98,255,0.3)',
                    boxShadow: '0 0 12px rgba(42,46,62,0.5)',
                  },
                }}
              />
              {activeDiscount && (
                <Badge
                  size="sm"
                  variant="light"
                  color="rally-primary"
                  className="landing-discount-badge"
                >
                  {activeDiscount} تخفیف
                </Badge>
              )}
            </div>
          </Reveal>
        </Box>

        {/* ── Active subscription banner ───────────────────── */}
        {isAuthenticated && <SubscriptionBanner subscription={subscription} />}

        {/* ── Plan Cards ──────────────────────────────────────── */}
        <Box pb={96}>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
            {PLANS.map((plan, i) => {
              const Icon = plan.icon;
              const { amount, period } = plan.prices[billing];
              const planFeatures = ALL_FEATURES.map((f) => ({
                text: f.text,
                included: f[plan.key],
              }));

              const isCurrentPlan =
                subscription?.is_active &&
                plan.tier === subscription.tier;

              return (
                <Reveal key={plan.key} delay={i * 0.1}>
                  <motion.div whileHover={cardHover}>
                    <Box
                      className={`landing-glow-card landing-pricing-card ${plan.featured ? 'landing-pricing-card--featured' : ''}`}
                      style={{ position: 'relative' }}
                    >
                      {plan.featured && !isCurrentPlan && (
                        <Badge
                          size="sm"
                          variant="filled"
                          color="rally-primary"
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
                      {isCurrentPlan && (
                        <Badge
                          size="sm"
                          variant="filled"
                          color="green"
                          leftSection={<IconShieldCheck size={12} />}
                          style={{
                            position: 'absolute',
                            top: -12,
                            left: '50%',
                            transform: 'translateX(-50%)',
                          }}
                        >
                          پلن فعال شما
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
                            background: `rgba(${plan.accent === '#8B5CF6' ? '139,92,246' : '41,98,255'},0.1)`,
                            border: `1px solid rgba(${plan.accent === '#8B5CF6' ? '139,92,246' : '41,98,255'},0.2)`,
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
                          {amount}
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
                              <IconCheck size={16} color={rallyColors.primary} />
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
                        disabled={isCurrentPlan}
                        onClick={() => handlePlanClick(plan)}
                        variant={plan.tier && !isCurrentPlan ? 'filled' : 'outline'}
                        color={isCurrentPlan ? 'green' : undefined}
                        className={plan.tier && !isCurrentPlan ? 'landing-cta' : undefined}
                        styles={{
                          root: plan.tier && !isCurrentPlan
                            ? {
                                background: `linear-gradient(135deg, ${rallyColors.primary} 0%, ${rallyColors.darkPrimary} 100%)`,
                                border: 'none',
                                fontWeight: 700,
                              }
                            : isCurrentPlan
                            ? { fontWeight: 700 }
                            : { borderColor: 'rgba(156,163,175,0.15)' },
                        }}
                        leftSection={plan.tier && !isCurrentPlan ? <IconArrowLeft size={16} /> : undefined}
                      >
                        {isCurrentPlan ? 'پلن فعال' : plan.cta}
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
                    <IconCrown size={14} color={rallyColors.primary} />
                    <Text fw={700} size="sm" c={rallyColors.primary}>
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
                      border: '1px solid rgba(41,98,255,0.2)',
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
                      icon={<IconInfoCircle size={18} color={rallyColors.primary} />}
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

      {/* ── Contact Modal ──────────────────────────────────── */}
      <ContactModal
        opened={!!contactPlan}
        onClose={() => setContactPlan(null)}
        plan={contactPlan}
        billing={billing}
      />
    </Box>
  );
}
