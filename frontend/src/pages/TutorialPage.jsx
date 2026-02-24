import { useNavigate } from 'react-router-dom';
import { motion } from "motion/react";
import {
  Box,
  Container,
  Title,
  Text,
  Button,
  Group,
  Stack,
  SimpleGrid,
  Accordion,
  Badge,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconLayoutDashboard,
  IconChartCandle,
  IconFlame,
  IconFilter,
  IconBuildingBank,
  IconCoin,
  IconRobot,
  IconChartLine,
  IconBook,
  IconPlayerPlay,
  IconCircleCheck,
  IconSearch,
  IconChartBar,
  IconReceipt,
  IconTrendingUp,
  IconArrowUpRight,
} from '@tabler/icons-react';
import rallyColors from '../theme/rallyColors';
import LandingNav from '../features/landing/components/LandingNav';
import LandingFooter from '../features/landing/components/LandingFooter';
import Reveal from '../features/landing/components/Reveal';
import SectionHeader from '../features/landing/components/SectionHeader';

/* ── Tutorial sections data ────────────────────────────────────── */

const TUTORIAL_SECTIONS = [
  {
    id: 'dashboard',
    icon: IconLayoutDashboard,
    accent: '#10B981',
    accentName: 'green',
    title: 'داشبورد اصلی',
    badge: 'شروع اینجاست',
    description: 'نمای کلی از وضعیت بازار بورس تهران به صورت لحظه‌ای',
    route: '/dashboard',
    steps: [
      'از صفحه لندینگ روی «ورود به داشبورد» کلیک کنید',
      'شاخص‌های کلیدی بازار (TEDPIX، شاخص هم‌وزن و...) در بالای صفحه قابل مشاهده است',
      'کارت‌های KPI آمار روز را نشان می‌دهند: ارزش معاملات، حجم، تعداد نمادهای مثبت/منفی',
      'نمودار شاخص کل تاریخچه ۳۰ روزه را به نمایش می‌گذارد',
      'جدول «برترین نمادها» برترین‌های روز از نظر حجم و ارزش را نشان می‌دهد',
    ],
    tips: [
      'برای به‌روزرسانی لحظه‌ای، از WebSocket خودکار استفاده می‌شود — نیازی به رفرش دستی نیست',
      'با کلیک روی هر نماد در جدول به صفحه جزئیات آن نماد منتقل می‌شوید',
    ],
  },
  {
    id: 'market-overview',
    icon: IconChartBar,
    accent: '#10B981',
    accentName: 'green',
    title: 'دیده‌بان بازار',
    description: 'مشاهده قیمت لحظه‌ای همه نمادهای بورسی',
    route: '/dashboard/market',
    steps: [
      'از منوی سمت راست، گزینه «دیده‌بان بازار» را انتخاب کنید',
      'جدول همه نمادهای فعال با قیمت، تغییر درصدی، حجم و ارزش نمایش داده می‌شود',
      'از فیلترهای بالای جدول برای فیلتر بر اساس صنعت، بازار یا نوع نماد استفاده کنید',
      'ستون‌ها قابل مرتب‌سازی هستند — روی عنوان هر ستون کلیک کنید',
      'برای جستجوی سریع نماد از نوار جستجوی بالای صفحه استفاده کنید',
    ],
    tips: [
      'داده‌ها در ساعات بازار هر ۲ دقیقه یک‌بار به‌روزرسانی می‌شوند',
      'فیلتر «صنعت» برای بررسی یک گروه خاص بسیار مفید است',
    ],
  },
  {
    id: 'stock-detail',
    icon: IconChartCandle,
    accent: '#3B82F6',
    accentName: 'blue',
    title: 'جزئیات نماد',
    description: 'تحلیل کامل یک نماد با نمودار شمعی، اندیکاتورها و داده‌های بنیادی',
    route: '/dashboard/stock/فولاد',
    steps: [
      'از دیده‌بان یا جستجوی سراسری، روی نام نماد کلیک کنید',
      'نمودار شمعی تاریخچه قیمتی نماد را نشان می‌دهد (پیش‌فرض ۳۰ روز)',
      'از منوی بازه زمانی می‌توانید ۱ هفته تا ۵ سال را انتخاب کنید',
      'تب «اطلاعات» مشخصات بنیادی: P/E، EPS، بازارارزش را نمایش می‌دهد',
      'تب «سهام‌داران عمده» درصد مالکیت سهام‌داران را نشان می‌دهد',
      'تب «معاملات حقیقی-حقوقی» جریان نقدینگی را نمایش می‌دهد',
    ],
    tips: [
      'اندیکاتورهای تکنیکال (MA، RSI، MACD) از منوی «ابزارها» قابل فعال‌سازی هستند',
      'برای مقایسه همزمان چند نماد از صفحه «مقایسه» استفاده کنید',
    ],
  },
  {
    id: 'heatmap',
    icon: IconFlame,
    accent: '#EF4444',
    accentName: 'red',
    title: 'نقشه گرمایی',
    description: 'تصویری از وضعیت کل بازار با رنگ‌بندی بر اساس تغییر قیمت',
    route: '/dashboard/heatmap',
    steps: [
      'از منوی سمت راست، «نقشه گرمایی» را انتخاب کنید',
      'هر مستطیل یک نماد بورسی است — اندازه آن متناسب با ارزش بازار است',
      'رنگ سبز نشان‌دهنده رشد و رنگ قرمز نشان‌دهنده کاهش قیمت است',
      'شدت رنگ با میزان تغییر درصدی متناسب است',
      'از فیلتر «صنعت» می‌توانید یک گروه خاص را مجزا ببینید',
      'با کلیک روی هر نماد، جزئیات آن در یک drawer باز می‌شود',
    ],
    tips: [
      'نقشه گرمایی برای شناسایی سریع جریان پول در صنایع مختلف بسیار مفید است',
      'گروه‌بندی بر اساس صنعت به درک بهتر روند بازار کمک می‌کند',
    ],
  },
  {
    id: 'screener',
    icon: IconFilter,
    accent: '#F59E0B',
    accentName: 'yellow',
    title: 'فیلتر پیشرفته',
    description: 'جستجو و فیلتر نمادها بر اساس معیارهای تکنیکال و بنیادی',
    route: '/dashboard/screener',
    steps: [
      'از منوی سمت راست، «فیلتر سهام» را انتخاب کنید',
      'معیارهای مورد نظر را از ستون‌های جدول انتخاب کنید',
      'می‌توانید بر اساس P/E، ارزش بازار، حجم، تغییر قیمت و... فیلتر کنید',
      'نتایج به صورت لحظه‌ای به‌روزرسانی می‌شوند',
      'نتایج فیلتر شده را می‌توانید به فرمت CSV خروجی بگیرید',
    ],
    tips: [
      'برای فیلتر کردن سهام پرحجم با رشد مثبت: حجم > میانگین + تغییر > ۰',
      'می‌توانید چند فیلتر را همزمان اعمال کنید (AND منطقی)',
    ],
  },
  {
    id: 'options',
    icon: IconChartLine,
    accent: '#8B5CF6',
    accentName: 'purple',
    title: 'اختیار معامله',
    description: 'تحلیل قراردادهای اختیار خرید و فروش با ماشین‌حساب پیشرفته',
    route: '/dashboard/options-calculator',
    steps: [
      'از منوی «اختیار معامله» گزینه «ماشین‌حساب» را انتخاب کنید',
      'نماد پایه را از لیست انتخاب کنید',
      'قرارداد مورد نظر را از زنجیره اختیار (Options Chain) انتخاب کنید',
      'معیارهای محاسبه (تعداد قرارداد، استراتژی) را وارد کنید',
      'نمودار payoff سود/زیان استراتژی در قیمت‌های مختلف رسم می‌شود',
      'Greeks (Delta، Gamma، Theta، Vega) به صورت خودکار محاسبه می‌شوند',
    ],
    tips: [
      'برای مقایسه چند استراتژی همزمان از «ماشین‌حساب چندگانه» استفاده کنید',
      'نوسان‌پذیری ضمنی (IV) برای هر قرارداد نمایش داده می‌شود',
    ],
  },
  {
    id: 'crypto',
    icon: IconCoin,
    accent: '#F59E0B',
    accentName: 'yellow',
    title: 'رمزارزها',
    description: 'پایش لحظه‌ای بازار ارزهای دیجیتال',
    route: '/crypto',
    steps: [
      'از منوی اصلی «رمزارزها» را انتخاب کنید',
      'داشبورد اصلی قیمت، تغییر ۲۴ساعته و حجم ۳۰ رمزارز برتر را نشان می‌دهد',
      'برای مشاهده نمودار هر رمزارز، روی آن کلیک کنید',
      'نقشه گرمایی رمزارزها از منوی بالا قابل دسترسی است',
      'شاخص «ترس و طمع» وضعیت کلی احساسات بازار را نشان می‌دهد',
    ],
    tips: [
      'قیمت‌ها به صورت همزمان به دلار و تومان نمایش داده می‌شوند',
      'از صفحه «مقایسه» می‌توانید چند رمزارز را کنار هم بررسی کنید',
    ],
  },
  {
    id: 'loans',
    icon: IconBuildingBank,
    accent: '#8B5CF6',
    accentName: 'purple',
    title: 'تسهیلات بانکی',
    description: 'بررسی، مقایسه و محاسبه انواع وام‌های بانکی',
    route: '/loans',
    steps: [
      'از صفحه اصلی یا منو «تسهیلات بانکی» را انتخاب کنید',
      'در داشبورد وام، خلاصه‌ای از بهترین پیشنهادها نمایش داده می‌شود',
      'از «بانک‌ها» می‌توانید شرایط هر بانک را به تفکیک ببینید',
      'در «ماشین‌حساب» مبلغ، مدت و نرخ را وارد کنید تا اقساط محاسبه شود',
      'از «مقایسه» می‌توانید شرایط چند وام را کنار هم بررسی کنید',
      'وام‌های شخصی خود را در «وام‌های من» ثبت و پیگیری کنید',
    ],
    tips: [
      'فیلتر «هدف وام» (خرید خانه، خودرو، ازدواج) پیشنهادهای مناسب‌تر نشان می‌دهد',
      'ماشین‌حساب می‌تواند جدول کامل اقساط ماهانه را خروجی بدهد',
    ],
  },
  {
    id: 'ai-chat',
    icon: IconRobot,
    accent: '#10B981',
    accentName: 'green',
    title: 'دستیار هوشمند',
    description: 'چت با هوش مصنوعی برای تحلیل بازار و پاسخ به سوالات',
    route: '/dashboard',
    steps: [
      'روی آیکون چت در گوشه پایین-راست صفحه کلیک کنید',
      'سوال خود را به فارسی یا انگلیسی تایپ کنید',
      'دستیار می‌تواند قیمت سهام، شاخص‌ها و تحلیل‌های بازار را ارائه دهد',
      'برای سوالات مربوط به وام از پرامپت‌های مشخص استفاده کنید',
      'دستیار می‌تواند محاسبات اختیار معامله را انجام دهد',
    ],
    tips: [
      'مثال: «قیمت لحظه‌ای فولاد و مقایسه با سه ماه اخیر چطوره؟»',
      'مثال: «بهترین وام خرید خانه با مبلغ ۵۰۰ میلیون تومان کدام بانک است؟»',
      'دستیار به اسناد مالی (گزارش کدال) دسترسی دارد و می‌تواند آن‌ها را خلاصه کند',
    ],
  },
];

/* ── Quick Start Steps ─────────────────────────────────────────── */

const QUICK_START = [
  { num: '۱', title: 'ورود به داشبورد', desc: 'روی «ورود به داشبورد» کلیک کنید', icon: IconArrowLeft },
  { num: '۲', title: 'کاوش بازار', desc: 'دیده‌بان بازار را بررسی کنید', icon: IconSearch },
  { num: '۳', title: 'انتخاب نماد', desc: 'روی نماد مورد علاقه کلیک کنید', icon: IconChartCandle },
  { num: '۴', title: 'تحلیل کامل', desc: 'نمودار، اندیکاتور و اطلاعات بنیادی', icon: IconTrendingUp },
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

/* ══ Main Component ══════════════════════════════════════════════ */

export default function TutorialPage() {
  const navigate = useNavigate();

  return (
    <Box
      className="landing-bg"
      style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}
    >
      <div className="landing-dot-grid" />
      <LandingNav />

      <Container size="lg" style={{ position: 'relative', zIndex: 1 }}>

        {/* ── Hero ────────────────────────────────────────── */}
        <motion.div variants={heroContainer} initial="hidden" animate="show">
          <Stack align="center" justify="center" gap="lg" pt={160} pb={64} style={{ textAlign: 'center' }}>
            <motion.div variants={heroItem}>
              <Title
                order={1}
                className="landing-hero-title"
                style={{ maxWidth: 680 }}
              >
                راهنمای جامع
              </Title>
            </motion.div>

            <motion.div variants={heroItem}>
              <Group gap="md" mt="xs">
                <Button
                  size="lg"
                  radius={60}
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                  className="landing-cta landing-cta--shimmer landing-cta-glass-hover"
                  styles={{
                    root: {
                      height: 48,
                      paddingInline: 32,
                      background: 'rgba(16, 185, 129, 0.12)',
                      borderColor: 'rgba(16, 185, 129, 0.40)',
                      backdropFilter: 'blur(12px)',
                      color: '#10B981',
                    },
                  }}
                  leftSection={<IconPlayerPlay size={18} />}
                >
                  شروع کنید
                </Button>
              </Group>
            </motion.div>
          </Stack>
        </motion.div>

        {/* ── Quick Start ──────────────────────────────────── */}
        <Reveal>
          <Box pb={80}>
            <SectionHeader
              title="در ۴ گام شروع کنید"
            />
            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg">
              {QUICK_START.map((step, i) => (
                <Reveal key={step.num} delay={i * 0.08} direction="up">
                  <Box
                    className="landing-glow-card landing-glow-card--sm"
                    style={{ textAlign: 'center' }}
                  >
                    <Text
                      fz={40}
                      fw={800}
                      style={{
                        background: `linear-gradient(135deg, ${rallyColors.green} 0%, ${rallyColors.darkGreen} 100%)`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        lineHeight: 1,
                        marginBottom: 12,
                      }}
                    >
                      {step.num}
                    </Text>
                    <step.icon size={28} color={rallyColors.green} style={{ marginBottom: 12 }} />
                    <Text fw={700} size="md" c={rallyColors.textPrimary} mb={6}>
                      {step.title}
                    </Text>
                    <Text size="sm" c={rallyColors.textSecondary} lh={1.6}>
                      {step.desc}
                    </Text>
                  </Box>
                </Reveal>
              ))}
            </SimpleGrid>
          </Box>
        </Reveal>

        {/* ── Section-by-section tutorial ─────────────────── */}
        <Reveal>
          <Box pb={80}>
            <SectionHeader
              badge="راهنمای کامل"
              title="آموزش بخش به بخش"
              subtitle="راهنمای گام‌به‌گام هر بخش از پلتفرم"
            />

            <Accordion
              variant="separated"
              radius="md"
              styles={{
                item: {
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  marginBottom: 12,
                },
                control: {
                  color: rallyColors.textPrimary,
                  padding: '16px 24px',
                  '&:hover': { background: 'rgba(255,255,255,0.04)' },
                },
                chevron: { color: rallyColors.textSecondary },
                content: { paddingInline: 24, paddingBottom: 24 },
                panel: { borderTop: '1px solid rgba(255,255,255,0.06)' },
              }}
            >
              {TUTORIAL_SECTIONS.map((section) => (
                <Accordion.Item key={section.id} value={section.id}>
                  <Accordion.Control>
                    <Group gap={12}>
                      <div className={`landing-icon-glow landing-icon-glow--${section.accentName}`}
                        style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0 }}
                      >
                        <section.icon size={20} color={section.accent} stroke={1.5} />
                      </div>
                      <Box>
                        <Group gap={8} mb={2}>
                          <Text fw={700} size="md" c={rallyColors.textPrimary}>
                            {section.title}
                          </Text>
                          {section.badge && (
                            <Badge size="xs" variant="light" color="green" radius="xl">
                              {section.badge}
                            </Badge>
                          )}
                        </Group>
                        <Text size="sm" c={rallyColors.textSecondary}>
                          {section.description}
                        </Text>
                      </Box>
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl" mt={8}>
                      {/* Steps */}
                      <Box>
                        <Text size="sm" fw={600} c={rallyColors.textPrimary} mb={12}>
                          مراحل استفاده
                        </Text>
                        <Stack gap={10}>
                          {section.steps.map((step, i) => (
                            <Group key={i} gap={10} wrap="nowrap" align="flex-start">
                              <Box
                                style={{
                                  minWidth: 24,
                                  height: 24,
                                  borderRadius: '50%',
                                  background: `rgba(${section.accent === '#10B981' ? '16,185,129' : section.accent === '#8B5CF6' ? '139,92,246' : section.accent === '#F59E0B' ? '245,158,11' : '59,130,246'}, 0.12)`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                  marginTop: 2,
                                }}
                              >
                                <Text size="xs" fw={700} c={section.accent}>{i + 1}</Text>
                              </Box>
                              <Text size="sm" c={rallyColors.textSecondary} lh={1.6}>
                                {step}
                              </Text>
                            </Group>
                          ))}
                        </Stack>
                      </Box>

                      {/* Tips + CTA */}
                      <Box>
                        <Text size="sm" fw={600} c={rallyColors.textPrimary} mb={12}>
                          نکات کاربردی
                        </Text>
                        <Stack gap={10} mb={24}>
                          {section.tips.map((tip, i) => (
                            <Group key={i} gap={8} wrap="nowrap" align="flex-start">
                              <IconCircleCheck
                                size={16}
                                color={section.accent}
                                stroke={1.5}
                                style={{ flexShrink: 0, marginTop: 3 }}
                              />
                              <Text size="sm" c={rallyColors.textSecondary} lh={1.6}>
                                {tip}
                              </Text>
                            </Group>
                          ))}
                        </Stack>
                        <Button
                          size="sm"
                          radius={60}
                          variant="light"
                          color={section.accentName === 'green' ? 'rally-green' : section.accentName === 'purple' ? 'violet' : section.accentName === 'red' ? 'red' : 'yellow'}
                          onClick={() => navigate(section.route)}
                          leftSection={<IconArrowUpRight size={14} />}
                        >
                          رفتن به این بخش
                        </Button>
                      </Box>
                    </SimpleGrid>
                  </Accordion.Panel>
                </Accordion.Item>
              ))}
            </Accordion>
          </Box>
        </Reveal>

        {/* ── FAQ ──────────────────────────────────────────── */}
        <Reveal>
          <Box pb={80}>
            <SectionHeader
              badge="سوالات متداول"
              title="پرسش‌های رایج"
            />
            <Accordion
              variant="separated"
              radius="md"
              styles={{
                item: {
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  marginBottom: 8,
                },
                control: { color: rallyColors.textPrimary, padding: '14px 20px' },
                chevron: { color: rallyColors.textSecondary },
                content: { paddingInline: 20, paddingBottom: 16 },
                panel: { borderTop: '1px solid rgba(255,255,255,0.06)' },
              }}
            >
              {[
                {
                  q: 'داده‌ها از کجا می‌آیند؟',
                  a: 'داده‌های بازار بورس از TSETMC (شرکت مدیریت فناوری بورس تهران) و از طریق APIهای رسمی دریافت می‌شود. داده‌های رمزارز از Binance و CoinGecko است.',
                },
                {
                  q: 'داده‌ها چقدر به‌روز هستند؟',
                  a: 'در ساعات بازار (شنبه تا چهارشنبه ۰۹:۰۰ تا ۱۲:۳۰ به وقت تهران) داده‌ها هر ۲.۵ دقیقه به‌روزرسانی می‌شوند. خارج از ساعات بازار داده‌های روز جاری تا پایان روز در دسترس هستند.',
                },
                {
                  q: 'آیا نیاز به ثبت‌نام است؟',
                  a: 'مشاهده داده‌های بازار نیازی به ثبت‌نام ندارد. برای استفاده از دستیار هوشمند و آپلود اسناد مالی، ثبت‌نام با ایمیل کافی است.',
                },
                {
                  q: 'دستیار هوشمند چه کارهایی انجام می‌دهد؟',
                  a: 'دستیار هوشمند مبتنی بر مدل‌های زبانی بزرگ (LLM) است و می‌تواند قیمت سهام، تحلیل‌های بازار، محاسبات اختیار معامله، اطلاعات وام و خلاصه‌سازی گزارش‌های کدال را ارائه دهد.',
                },
                {
                  q: 'آیا این پلتفرم رایگان است؟',
                  a: 'بله، TSETMC Dashboard یک پروژه متن‌باز است. کدهای آن در GitHub قابل دسترسی است و استفاده از آن کاملاً رایگان است.',
                },
              ].map((faq, i) => (
                <Accordion.Item key={i} value={`faq-${i}`}>
                  <Accordion.Control>
                    <Text size="sm" fw={600} c={rallyColors.textPrimary}>{faq.q}</Text>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Text size="sm" c={rallyColors.textSecondary} lh={1.7}>{faq.a}</Text>
                  </Accordion.Panel>
                </Accordion.Item>
              ))}
            </Accordion>
          </Box>
        </Reveal>

        {/* ── CTA Banner ─────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <Box
            className="landing-glow-card landing-glow-card--hero"
            mb={96}
            style={{ textAlign: 'center' }}
          >
            <Title
              order={3}
              fw={700}
              fz={{ base: 22, md: 28 }}
              mb="xs"
              style={{
                background: 'linear-gradient(180deg, #F1F5F9 0%, rgba(241,245,249,0.5) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              آماده‌اید تحلیل را شروع کنید؟
            </Title>
            <Text size="md" c={rallyColors.textSecondary} mb="xl" maw={380} mx="auto" lh={1.7}>
              داشبورد را باز کنید و بازار را لحظه‌ای رصد کنید
            </Text>
            <Group justify="center" gap="md">
              <Button
                size="lg"
                radius={60}
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="landing-cta landing-cta--shimmer landing-cta-glass-hover"
                styles={{
                  root: {
                    height: 48,
                    paddingInline: 32,
                    background: 'rgba(16, 185, 129, 0.12)',
                    borderColor: 'rgba(16, 185, 129, 0.40)',
                    backdropFilter: 'blur(12px)',
                    color: '#10B981',
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
                onClick={() => navigate('/about')}
                styles={{ root: { height: 48 } }}
              >
                درباره ما
              </Button>
            </Group>
          </Box>
        </motion.div>

        {/* ── Footer ─────────────────────────────────────── */}
        <LandingFooter />
      </Container>
    </Box>
  );
}
