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
  Badge,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconBrandGithub,
  IconCode,
  IconDatabase,
  IconServer,
  IconBolt,
  IconShieldCheck,
  IconWorld,
  IconChartBar,
  IconRobot,
  IconLock,
  IconBuildingBank,
  IconTrendingUp,
  IconCoin,
  IconBrandDocker,
  IconBrandReact,
  IconBrandPython,
  IconArrowUpRight,
  IconHeart,
  IconUsers,
  IconBook,
} from '@tabler/icons-react';
import rallyColors from '../theme/rallyColors';
import LandingNav from '../features/landing/components/LandingNav';
import LandingFooter from '../features/landing/components/LandingFooter';
import Reveal from '../features/landing/components/Reveal';
import SectionHeader from '../features/landing/components/SectionHeader';

/* ── Tech Stack ───────────────────────────────────────────────── */

const TECH_STACK = [
  {
    category: 'Frontend',
    color: '#3B82F6',
    accentName: 'blue',
    items: [
      { icon: IconBrandReact, name: 'React 18', desc: 'کتابخانه UI' },
      { icon: IconBolt, name: 'Vite', desc: 'باندلر سریع' },
      { icon: IconCode, name: 'Mantine UI', desc: 'کامپوننت‌های آماده' },
      { icon: IconChartBar, name: 'Recharts / LightWeight', desc: 'نمودارهای پیشرفته' },
    ],
  },
  {
    category: 'Backend',
    color: '#10B981',
    accentName: 'green',
    items: [
      { icon: IconBrandPython, name: 'FastAPI', desc: 'API سریع با Python' },
      { icon: IconServer, name: 'Gunicorn + Uvicorn', desc: 'ASGI server' },
      { icon: IconDatabase, name: 'PostgreSQL + pgvector', desc: 'پایگاه داده وکتوری' },
      { icon: IconBolt, name: 'Redis', desc: 'کش و pub/sub' },
    ],
  },
  {
    category: 'Infrastructure',
    color: '#F59E0B',
    accentName: 'yellow',
    items: [
      { icon: IconBrandDocker, name: 'Docker Compose', desc: 'کانتینری‌سازی' },
      { icon: IconServer, name: 'Nginx', desc: 'ریورس پراکسی' },
      { icon: IconDatabase, name: 'PgBouncer', desc: 'connection pooling' },
      { icon: IconShieldCheck, name: 'JWT Auth', desc: 'احراز هویت امن' },
    ],
  },
  {
    category: 'AI & Data',
    color: '#8B5CF6',
    accentName: 'purple',
    items: [
      { icon: IconRobot, name: 'OpenRouter LLM', desc: 'مدل‌های زبانی بزرگ' },
      { icon: IconDatabase, name: 'RAG Pipeline', desc: 'بازیابی افزوده' },
      { icon: IconCode, name: 'Scrapy', desc: 'خزنده داده بازار' },
      { icon: IconBolt, name: 'APScheduler', desc: 'زمانبند خودکار' },
    ],
  },
];

/* ── Features overview ─────────────────────────────────────────── */

const FEATURES_OVERVIEW = [
  {
    icon: IconTrendingUp,
    accent: '#10B981',
    accentName: 'green',
    title: 'بازار بورس تهران',
    desc: 'پوشش کامل بازار بورس، فرابورس و بازار پایه با داده‌های لحظه‌ای',
  },
  {
    icon: IconChartBar,
    accent: '#3B82F6',
    accentName: 'blue',
    title: 'تحلیل تکنیکال',
    desc: 'نمودار شمعی، اندیکاتورها و نقشه گرمایی بازار',
  },
  {
    icon: IconCoin,
    accent: '#F59E0B',
    accentName: 'yellow',
    title: 'رمزارزها',
    desc: '۳۰ رمزارز برتر با داده‌های لحظه‌ای و شاخص ترس و طمع',
  },
  {
    icon: IconBuildingBank,
    accent: '#8B5CF6',
    accentName: 'purple',
    title: 'تسهیلات بانکی',
    desc: 'مقایسه و محاسبه انواع وام‌های بانکی',
  },
  {
    icon: IconRobot,
    accent: '#10B981',
    accentName: 'green',
    title: 'دستیار هوشمند',
    desc: 'چت‌بات مبتنی بر LLM با دسترسی به داده‌های زنده بازار',
  },
  {
    icon: IconLock,
    accent: '#3B82F6',
    accentName: 'blue',
    title: 'امنیت و مقیاس‌پذیری',
    desc: 'معماری مقیاس‌پذیر برای ۱۰،۰۰۰ کاربر همزمان',
  },
];

/* ── Stats ─────────────────────────────────────────────────────── */

const PROJECT_STATS = [
  { value: '۱۰+', label: 'ماه توسعه' },
  { value: '۳۰+', label: 'صفحه و کامپوننت' },
  { value: '۲۰+', label: 'API endpoint' },
  { value: '۱۰K', label: 'ظرفیت کاربر همزمان' },
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

export default function AboutPage() {
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
              <div className="landing-pill">
                <IconHeart size={14} color={rallyColors.green} />
                ساخته شده با علاقه
              </div>
            </motion.div>

            <motion.div variants={heroItem}>
              <Title
                order={1}
                className="landing-hero-title"
                style={{ maxWidth: 640 }}
              >
                درباره TSETMC Dashboard
              </Title>
            </motion.div>

            <motion.div variants={heroItem}>
              <Text
                fz={{ base: 16, sm: 18 }}
                c={rallyColors.textSecondary}
                maw={560}
                style={{ lineHeight: 1.7 }}
              >
                یک پلتفرم متن‌باز برای تحلیل و پایش بازار بورس تهران،
                ساخته شده با بهترین تکنولوژی‌های روز برای تحلیلگران ایرانی
              </Text>
            </motion.div>

            <motion.div variants={heroItem}>
              <Group gap="md" mt="xs">
                <Button
                  size="lg"
                  radius={60}
                  component="a"
                  href="https://github.com/sajjadtzroo/TSE_Dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
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
                  leftSection={<IconBrandGithub size={18} />}
                >
                  مشاهده در GitHub
                </Button>
                <Button
                  size="lg"
                  radius={60}
                  variant="outline"
                  color="gray"
                  className="landing-cta-ghost"
                  onClick={() => navigate('/tutorial')}
                  styles={{ root: { height: 48 } }}
                  leftSection={<IconBook size={18} />}
                >
                  راهنمای استفاده
                </Button>
              </Group>
            </motion.div>
          </Stack>
        </motion.div>

        {/* ── Project Stats ────────────────────────────────── */}
        <Reveal>
          <Box pb={80}>
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="lg">
              {PROJECT_STATS.map((stat, i) => (
                <Reveal key={stat.label} delay={i * 0.08} direction="up">
                  <Box className="landing-glow-card landing-glow-card--sm" style={{ textAlign: 'center' }}>
                    <Text
                      fz={36}
                      fw={800}
                      lh={1.1}
                      mb={6}
                      style={{
                        background: `linear-gradient(135deg, ${rallyColors.green} 0%, ${rallyColors.darkGreen} 100%)`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      {stat.value}
                    </Text>
                    <Text size="sm" c={rallyColors.textSecondary}>{stat.label}</Text>
                  </Box>
                </Reveal>
              ))}
            </SimpleGrid>
          </Box>
        </Reveal>

        {/* ── Mission ──────────────────────────────────────── */}
        <Reveal>
          <Box pb={80}>
            <SectionHeader
              badge="ماموریت ما"
              title="چرا این پلتفرم را ساختیم؟"
            />
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
              <Reveal delay={0} direction="left">
                <Box className="landing-glow-card landing-glow-card--md">
                  <div className="landing-icon-glow landing-icon-glow--green" style={{ marginBottom: 16 }}>
                    <IconWorld size={24} color={rallyColors.green} stroke={1.5} />
                  </div>
                  <Text fw={700} size="xl" c={rallyColors.textPrimary} mb={12}>
                    دسترسی برابر به اطلاعات
                  </Text>
                  <Text size="sm" c={rallyColors.textSecondary} lh={1.8}>
                    در بازار سرمایه ایران، اطلاعات باکیفیت اغلب در اختیار معامله‌گران حرفه‌ای و موسسات مالی بزرگ است.
                    هدف ما ساختن ابزاری است که تحلیل‌گران خرد هم بتوانند با داده‌های کامل و لحظه‌ای تصمیم‌گیری کنند.
                  </Text>
                </Box>
              </Reveal>
              <Reveal delay={0.1} direction="right">
                <Box className="landing-glow-card landing-glow-card--md">
                  <div className="landing-icon-glow landing-icon-glow--blue" style={{ marginBottom: 16 }}>
                    <IconCode size={24} color={rallyColors.blue} stroke={1.5} />
                  </div>
                  <Text fw={700} size="xl" c={rallyColors.textPrimary} mb={12}>
                    متن‌باز و شفاف
                  </Text>
                  <Text size="sm" c={rallyColors.textSecondary} lh={1.8}>
                    تمام کدهای پروژه در GitHub در دسترس عموم است. هر کسی می‌تواند کد را بررسی کند،
                    باگ بزند، یا با pull request بهبود دهد. شفافیت کامل در الگوریتم‌ها و منابع داده.
                  </Text>
                </Box>
              </Reveal>
            </SimpleGrid>
          </Box>
        </Reveal>

        {/* ── Features Overview ───────────────────────────── */}
        <Reveal>
          <Box pb={80}>
            <SectionHeader
              badge="امکانات"
              title="آنچه ارائه می‌دهیم"
              subtitle="پوشش کامل نیازهای تحلیلگران بازار سرمایه"
            />
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
              {FEATURES_OVERVIEW.map((feature, i) => (
                <Reveal key={feature.title} delay={i * 0.06} direction="up">
                  <Box className="landing-glow-card landing-glow-card--sm">
                    <div
                      className={`landing-icon-glow landing-icon-glow--${feature.accentName}`}
                      style={{ marginBottom: 14 }}
                    >
                      <feature.icon size={22} color={feature.accent} stroke={1.5} />
                    </div>
                    <Text fw={700} size="md" c={rallyColors.textPrimary} mb={6}>
                      {feature.title}
                    </Text>
                    <Text size="sm" c={rallyColors.textSecondary} lh={1.6}>
                      {feature.desc}
                    </Text>
                  </Box>
                </Reveal>
              ))}
            </SimpleGrid>
          </Box>
        </Reveal>

        {/* ── Tech Stack ───────────────────────────────────── */}
        <Reveal>
          <Box pb={80}>
            <SectionHeader
              badge="تکنولوژی"
              title="ساخته شده با بهترین ابزارها"
              subtitle="معماری مدرن و مقیاس‌پذیر برای بازارهای مالی"
            />
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
              {TECH_STACK.map((group, i) => (
                <Reveal key={group.category} delay={i * 0.08} direction="up">
                  <Box className="landing-glow-card landing-glow-card--sm">
                    <Group gap={10} mb={20}>
                      <Badge
                        size="md"
                        radius="xl"
                        style={{
                          background: `rgba(${group.color === '#10B981' ? '16,185,129' : group.color === '#3B82F6' ? '59,130,246' : group.color === '#F59E0B' ? '245,158,11' : '139,92,246'}, 0.12)`,
                          color: group.color,
                          border: `1px solid ${group.color}30`,
                          fontWeight: 600,
                        }}
                      >
                        {group.category}
                      </Badge>
                    </Group>
                    <Stack gap={14}>
                      {group.items.map((item) => (
                        <Group key={item.name} gap={12} wrap="nowrap">
                          <div
                            className={`landing-icon-glow landing-icon-glow--${group.accentName}`}
                            style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0 }}
                          >
                            <item.icon size={17} color={group.color} stroke={1.5} />
                          </div>
                          <Box>
                            <Text size="sm" fw={600} c={rallyColors.textPrimary} lh={1.2}>
                              {item.name}
                            </Text>
                            <Text size="xs" c={rallyColors.textSecondary}>
                              {item.desc}
                            </Text>
                          </Box>
                        </Group>
                      ))}
                    </Stack>
                  </Box>
                </Reveal>
              ))}
            </SimpleGrid>
          </Box>
        </Reveal>

        {/* ── Architecture highlight ───────────────────────── */}
        <Reveal>
          <Box pb={80}>
            <SectionHeader
              badge="معماری"
              title="معماری میکروسرویس"
              subtitle="طراحی شده برای پایداری در مقیاس بزرگ"
            />
            <Box className="landing-glow-card landing-glow-card--md">
              <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl">
                {[
                  {
                    icon: IconUsers,
                    accent: '#10B981',
                    accentName: 'green',
                    title: '۱۰,۰۰۰ کاربر همزمان',
                    desc: 'PgBouncer transaction mode + ۴ replica + Nginx worker_connections 4096',
                  },
                  {
                    icon: IconDatabase,
                    accent: '#3B82F6',
                    accentName: 'blue',
                    title: '۲+ میلیون رکورد',
                    desc: 'ایندکس‌گذاری بهینه PostgreSQL، query plans سریع روی daily_ohlcv',
                  },
                  {
                    icon: IconBolt,
                    accent: '#F59E0B',
                    accentName: 'yellow',
                    title: 'کش هوشمند Redis',
                    desc: 'TTL متفاوت در ساعات بازار و خارج از بازار، tag-based invalidation',
                  },
                ].map((item) => (
                  <Box key={item.title} style={{ textAlign: 'center' }}>
                    <div
                      className={`landing-icon-glow landing-icon-glow--${item.accentName}`}
                      style={{ width: 52, height: 52, borderRadius: 14, margin: '0 auto 16px' }}
                    >
                      <item.icon size={26} color={item.accent} stroke={1.5} />
                    </div>
                    <Text fw={700} size="md" c={rallyColors.textPrimary} mb={6}>
                      {item.title}
                    </Text>
                    <Text size="sm" c={rallyColors.textSecondary} lh={1.6}>
                      {item.desc}
                    </Text>
                  </Box>
                ))}
              </SimpleGrid>
            </Box>
          </Box>
        </Reveal>

        {/* ── Open Source CTA ──────────────────────────────── */}
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
            <div
              className="landing-icon-glow landing-icon-glow--green"
              style={{ width: 56, height: 56, borderRadius: 16, margin: '0 auto 20px' }}
            >
              <IconBrandGithub size={28} color={rallyColors.green} stroke={1.5} />
            </div>
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
              پروژه متن‌باز است
            </Title>
            <Text size="md" c={rallyColors.textSecondary} mb="xl" maw={440} mx="auto" lh={1.7}>
              کدها کاملاً در دسترس هستند. می‌توانید fork کنید، contribute دهید
              یا روی سرور خودتان deploy کنید.
            </Text>
            <Group justify="center" gap="md">
              <Button
                size="lg"
                radius={60}
                component="a"
                href="https://github.com/sajjadtzroo/TSE_Dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="landing-cta"
                styles={{
                  root: {
                    background: `linear-gradient(135deg, ${rallyColors.green} 0%, ${rallyColors.darkGreen} 100%)`,
                    border: 'none',
                    fontWeight: 700,
                    paddingInline: 36,
                    height: 48,
                  },
                }}
                leftSection={<IconBrandGithub size={18} />}
              >
                مشاهده کدها
              </Button>
              <Button
                size="lg"
                radius={60}
                variant="outline"
                color="gray"
                className="landing-cta-ghost"
                onClick={() => navigate('/dashboard')}
                styles={{ root: { height: 48 } }}
                leftSection={<IconArrowLeft size={18} />}
              >
                ورود به داشبورد
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
