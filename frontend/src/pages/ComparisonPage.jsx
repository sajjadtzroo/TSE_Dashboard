import { useState, useRef, useMemo, useCallback } from 'react';
import { motion } from "motion/react";
import {
  Box,
  Container,
  Title,
  Text,
  Stack,
  SimpleGrid,
  Group,
  Badge,
  ThemeIcon,
  Tooltip,
  Button,
  Progress,
} from '@mantine/core';
import {
  IconScale,
  IconCheck,
  IconX,
  IconMinus,
  IconBrain,
  IconServer,
  IconWorld,
  IconBulb,
  IconChartBar,
  IconFileSpreadsheet,
  IconRobot,
  IconCode,
  IconCloud,
  IconDatabase,
  IconShieldCheck,
  IconActivity,
  IconCoin,
  IconBuildingBank,
  IconEye,
  IconTrendingUp,
  IconArrowLeft,
} from '@tabler/icons-react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from 'recharts';
import rallyColors from '../theme/rallyColors';
import { COMPARISON_COLORS } from '../constants/chartColors';
import LandingNav from '../features/landing/components/LandingNav';
import LandingFooter from '../features/landing/components/LandingFooter';
import Reveal from '../features/landing/components/Reveal';
import SectionHeader from '../features/landing/components/SectionHeader';
import Counter from '../features/landing/components/Counter';
import useSectionObserver from '../hooks/useSectionObserver';

/* ── Project Definitions ─────────────────────────────────────── */

const PROJECTS = [
  { key: 'tse', name: 'TSE Dashboard', highlight: true, color: rallyColors.primary },
  { key: 'excel', name: 'Excel Analyst Pro', color: COMPARISON_COLORS[0] },
  { key: 'fingpt', name: 'FinGPT', color: COMPARISON_COLORS[2] },
  { key: 'quantmod', name: 'quantmod', color: COMPARISON_COLORS[1] },
  { key: 'rag', name: 'RAG Multimodal', color: COMPARISON_COLORS[3] },
];

/* ── Overview Matrix ─────────────────────────────────────────── */

const OVERVIEW_ROWS = [
  {
    label: 'هدف',
    tse: 'پایش و تحلیل بازار (بورس، کریپتو، وام)',
    excel: 'مدل‌سازی مالی Excel با Claude',
    fingpt: 'NLP مالی با مدل‌های Fine-tune شده',
    quantmod: 'تحلیل تکنیکال و نمودار در R',
    rag: 'پرسش و پاسخ چندوجهی اسناد',
  },
  {
    label: 'استک',
    tse: 'FastAPI + React + PostgreSQL + Redis',
    excel: 'Claude Code + Node.js + Excel',
    fingpt: 'Python + PyTorch + HuggingFace',
    quantmod: 'R + xts + TTR',
    rag: 'Python + LlamaIndex + GPT-4V',
  },
  {
    label: 'هوش مصنوعی',
    tse: 'RAG + Tool-calling (OpenRouter, Gemini)',
    excel: 'Claude Skills (مسیریابی intent)',
    fingpt: 'Fine-tuned Llama-2/3, RLHF',
    quantmod: 'ندارد',
    rag: 'GPT-4V + embeddings',
  },
  {
    label: 'منابع داده',
    tse: 'TSETMC, BrsAPI, CoinMarketCap, تلگرام',
    excel: 'ورودی دستی کاربر',
    fingpt: 'اخبار، توییتر، Tushare (چین)',
    quantmod: 'Yahoo Finance, FRED',
    rag: 'فقط اسناد PDF',
  },
  {
    label: 'خروجی',
    tse: 'داشبورد تعاملی وب + چت',
    excel: 'فایل‌های Excel (DCF, LBO)',
    fingpt: 'امتیاز احساسات، پیش‌بینی',
    quantmod: 'نمودارهای R + سری زمانی',
    rag: 'پاسخ متنی با ارجاع',
  },
  {
    label: 'استقرار',
    tse: 'Docker Compose (+8 سرویس)',
    excel: 'پلاگین CLI محلی',
    fingpt: 'Jupyter notebook / اسکریپت',
    quantmod: 'پکیج R (CRAN)',
    rag: 'Jupyter notebook',
  },
  {
    label: 'بلوغ',
    tse: 'آماده تولید',
    excel: 'آماده تولید (v1.1)',
    fingpt: 'فریمورک تحقیقاتی',
    quantmod: 'بالغ (15+ نسخه)',
    rag: 'فقط دمو',
  },
  {
    label: 'لایسنس',
    tse: 'MIT',
    excel: 'تجاری (پولی)',
    fingpt: 'MIT',
    quantmod: 'GPL-3',
    rag: 'مشخص نشده',
  },
];

/* ── Capability Matrix ───────────────────────────────────────── */

const CAPABILITY_ROWS = [
  { label: 'ارزش‌گذاری DCF', tse: false, excel: true, fingpt: false, quantmod: false, rag: false },
  { label: 'تحلیل LBO', tse: false, excel: true, fingpt: false, quantmod: false, rag: false },
  { label: 'اندیکاتورهای تکنیکال', tse: false, excel: false, fingpt: false, quantmod: true, rag: false },
  { label: 'تحلیل احساسات', tse: false, excel: false, fingpt: true, quantmod: false, rag: false },
  { label: 'پیش‌بینی سهام', tse: false, excel: false, fingpt: true, quantmod: false, rag: false },
  { label: 'نمای کلی بازار', tse: true, excel: false, fingpt: false, quantmod: true, rag: false },
  { label: 'مدیریت پرتفوی', tse: true, excel: false, fingpt: false, quantmod: true, rag: false },
  { label: 'تحلیل اسناد', tse: true, excel: false, fingpt: 'partial', quantmod: false, rag: true },
  { label: 'تحلیل وام', tse: true, excel: 'partial', fingpt: false, quantmod: false, rag: false },
  { label: 'رصد کریپتو', tse: true, excel: false, fingpt: false, quantmod: false, rag: false },
  { label: 'خروجی Excel', tse: true, excel: true, fingpt: false, quantmod: false, rag: false },
];

/* ── AI & RAG Matrix ─────────────────────────────────────────── */

const AI_ROWS = [
  { label: 'طبقه‌بندی Intent', tse: true, excel: true, fingpt: false, quantmod: false, rag: false },
  { label: 'عوامل Tool-calling', tse: true, excel: false, fingpt: false, quantmod: false, rag: false },
  { label: 'خط لوله RAG', tse: true, excel: false, fingpt: 'partial', quantmod: false, rag: true },
  { label: 'چندوجهی (بینایی)', tse: false, excel: false, fingpt: false, quantmod: false, rag: true },
  { label: 'مدل Fine-tune شده', tse: false, excel: false, fingpt: true, quantmod: false, rag: false },
  { label: 'چت استریم', tse: true, excel: false, fingpt: false, quantmod: false, rag: false },
  { label: 'ارجاع منابع', tse: true, excel: false, fingpt: false, quantmod: false, rag: true },
];

/* ── Infrastructure Matrix ───────────────────────────────────── */

const INFRA_ROWS = [
  { label: 'استقرار Docker', tse: true, excel: false, fingpt: false, quantmod: false, rag: false },
  { label: 'پایگاه داده', tse: 'PostgreSQL + pgvector', excel: false, fingpt: false, quantmod: false, rag: 'DeepLake' },
  { label: 'کشینگ', tse: 'Redis (tag-based)', excel: false, fingpt: false, quantmod: false, rag: false },
  { label: 'احراز هویت و RBAC', tse: true, excel: false, fingpt: false, quantmod: false, rag: false },
  { label: 'محدودیت نرخ', tse: true, excel: false, fingpt: false, quantmod: false, rag: false },
  { label: 'مانیتورینگ', tse: 'Prometheus + Grafana', excel: false, fingpt: false, quantmod: false, rag: false },
  { label: 'Load Balancing', tse: 'Nginx + PgBouncer', excel: false, fingpt: false, quantmod: false, rag: false },
  { label: 'زمانبند', tse: true, excel: false, fingpt: false, quantmod: false, rag: false },
];

/* ── Market Coverage ─────────────────────────────────────────── */

const MARKET_ROWS = [
  { label: 'بورس تهران', tse: 'اصلی', excel: false, fingpt: false, quantmod: false, rag: false },
  { label: 'بورس آمریکا/جهانی', tse: false, excel: 'ورودی دستی', fingpt: 'DOW30', quantmod: true, rag: 'از طریق اسناد' },
  { label: 'بازار چین', tse: false, excel: false, fingpt: true, quantmod: false, rag: false },
  { label: 'کریپتو', tse: true, excel: false, fingpt: false, quantmod: false, rag: false },
  { label: 'فارکس', tse: false, excel: false, fingpt: 'partial', quantmod: true, rag: false },
  { label: 'اوراق بدهی', tse: false, excel: false, fingpt: false, quantmod: true, rag: false },
  { label: 'وام بانکی (ایران)', tse: true, excel: false, fingpt: false, quantmod: false, rag: false },
];

/* ── Lessons / Ideas ─────────────────────────────────────────── */

const LESSONS = [
  {
    from: 'Excel Analyst Pro',
    icon: IconFileSpreadsheet,
    accent: '#22C55E',
    accentName: 'green',
    ideas: [
      'قالب‌های DCF/LBO درجه بانک سرمایه‌گذاری برای خروجی Excel',
      'مقادیر پیش‌فرض ساختاریافته (D&A ۵٪ درآمد, CapEx ۳-۴٪) برای شرکت‌های ایرانی',
    ],
  },
  {
    from: 'FinGPT',
    icon: IconBrain,
    accent: '#8B5CF6',
    accentName: 'purple',
    ideas: [
      'تحلیل احساسات فارسی — Fine-tune مدل کوچک روی اخبار مالی فارسی',
      'ماژول پیش‌بینی سهام — رویکرد پیش‌بینی مبتنی بر اخبار',
      'LoRA Fine-tuning — تخصصی‌سازی ارزان مدل‌ها برای دامنه مالی ایران',
    ],
  },
  {
    from: 'quantmod',
    icon: IconChartBar,
    accent: '#3B82F6',
    accentName: 'blue',
    ideas: [
      'کتابخانه اندیکاتورهای تکنیکال — MACD, RSI, باندهای بولینگر',
      'فریمورک بک‌تست — اجازه تست استراتژی‌های معاملاتی روی داده تاریخی',
    ],
  },
  {
    from: 'RAG Multimodal',
    icon: IconEye,
    accent: '#F59E0B',
    accentName: 'yellow',
    ideas: [
      'درک نمودار/تصویر در اسناد کدال — استفاده از مدل‌های بینایی',
      'Embeddings چندوجهی — ایندکس محتوای بصری کنار متن',
    ],
  },
];

/* ── Summary Cards ────────────────────────────────────────────── */

const SUMMARY_CARDS = [
  {
    name: 'Excel Analyst Pro',
    best: 'مدل‌سازی ارزش‌گذاری (DCF, LBO)',
    missing: 'بدون داده زنده، بدون UI وب، بدون زیرساخت',
    icon: IconFileSpreadsheet,
    accent: '#22C55E',
    accentName: 'green',
  },
  {
    name: 'FinGPT',
    best: 'NLP مالی و آموزش مدل',
    missing: 'بدون فرانت‌اند، بدون خط لوله داده، فقط تحقیقاتی',
    icon: IconBrain,
    accent: '#8B5CF6',
    accentName: 'purple',
  },
  {
    name: 'quantmod',
    best: 'تحلیل تکنیکال و نمودار',
    missing: 'فقط R، بدون وب اپ، بدون AI/چت، بدون احراز هویت',
    icon: IconChartBar,
    accent: '#3B82F6',
    accentName: 'blue',
  },
  {
    name: 'RAG Multimodal',
    best: 'درک بصری اسناد',
    missing: 'فقط دمو، بدون زیرساخت تولید، دامنه محدود',
    icon: IconEye,
    accent: '#F59E0B',
    accentName: 'yellow',
  },
];

/* ── Step 1: Verdict Callout Data ────────────────────────────── */

const TABLE_VERDICTS = {
  overview: {
    icon: IconScale,
    text: 'TSE Dashboard تنها پروژه‌ای است که داده زنده، AI، زیرساخت تولید و پوشش چندبازاره را در یک پلتفرم یکپارچه ترکیب می‌کند.',
    accent: rallyColors.primary,
  },
  capabilities: {
    icon: IconCode,
    text: 'گسترده‌ترین پوشش افقی قابلیت‌ها — ۶ قابلیت فعال در مقابل حداکثر ۳ قابلیت رقبا.',
    accent: rallyColors.green,
  },
  ai: {
    icon: IconRobot,
    text: 'آماده‌ترین خط لوله RAG تولیدی با چت استریم، عوامل Tool-calling و ارجاع منابع.',
    accent: rallyColors.purple,
  },
  infra: {
    icon: IconServer,
    text: 'هیچ پروژه دیگری حتی یک مورد از ۸ مؤلفه زیرساخت تولید TSE Dashboard را ندارد.',
    accent: rallyColors.blue,
  },
  markets: {
    icon: IconWorld,
    text: 'تنها پروژه با تمرکز بر بورس تهران، کریپتو و وام بانکی ایران — ۳ بازار در یک پلتفرم.',
    accent: rallyColors.yellow,
  },
};

/* ── Step 2: Hero Stats Data ─────────────────────────────────── */

const HERO_STATS = [
  { value: 5, suffix: '', label: 'پروژه مقایسه شده' },
  { value: 23, suffix: '+', label: 'قابلیت فعال TSE' },
  { value: 8, suffix: '/۸', label: 'زیرساخت تولید' },
  { value: 3, suffix: '', label: 'بازار پوشش‌داده' },
];

/* ── Step 5: Section Nav Data ────────────────────────────────── */

const SECTIONS = [
  { id: 'overview', label: 'نمای کلی' },
  { id: 'capabilities', label: 'قابلیت‌ها' },
  { id: 'ai-rag', label: 'هوش مصنوعی' },
  { id: 'infra', label: 'زیرساخت' },
  { id: 'markets', label: 'بازارها' },
  { id: 'lessons', label: 'الهام‌بخشی' },
  { id: 'summary', label: 'جمع‌بندی' },
];

/* ── Step 3: Score Computation Helper ────────────────────────── */

function computeMatrixScore(rows, projectKey) {
  let score = 0;
  for (const row of rows) {
    const val = row[projectKey];
    if (val === true) score += 1;
    else if (val === 'partial') score += 0.5;
    else if (typeof val === 'string' && val) score += 1;
  }
  return score;
}

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

/* ── Cell Renderer ────────────────────────────────────────────── */

function CellValue({ value, highlight }) {
  if (value === true) {
    return (
      <ThemeIcon size={24} radius="xl" variant="light" color="green" style={{ background: 'rgba(34,197,94,0.12)' }}>
        <IconCheck size={14} />
      </ThemeIcon>
    );
  }
  if (value === false) {
    return (
      <ThemeIcon size={24} radius="xl" variant="light" color="gray" style={{ background: 'rgba(107,114,128,0.08)' }}>
        <IconX size={14} color={rallyColors.textDimmed} />
      </ThemeIcon>
    );
  }
  if (value === 'partial') {
    return (
      <Tooltip label="پشتیبانی جزئی" withArrow>
        <ThemeIcon size={24} radius="xl" variant="light" color="yellow" style={{ background: 'rgba(245,158,11,0.12)' }}>
          <IconMinus size={14} />
        </ThemeIcon>
      </Tooltip>
    );
  }
  return (
    <Text size="xs" c={highlight ? rallyColors.textPrimary : rallyColors.textSecondary} ta="center" lh={1.4}>
      {value}
    </Text>
  );
}

/* ── Comparison Table Component (enhanced with verdict + filtering) ── */

function CompareTable({ rows, title, badge, subtitle, verdict, visibleProjects }) {
  const filteredProjects = PROJECTS.filter((p) => visibleProjects.includes(p.key));

  return (
    <Box pb={80}>
      <SectionHeader badge={badge} title={title} subtitle={subtitle} />
      <Reveal>
        <Box
          className="landing-glow-card"
          style={{ padding: 0, overflow: 'hidden' }}
        >
          <div className="landing-compare-table">
            {/* Header */}
            <div className="landing-compare-header">
              <div className="landing-compare-cell landing-compare-cell--feature">
                <Text size="xs" fw={700} c={rallyColors.textDimmed}>ویژگی</Text>
              </div>
              {filteredProjects.map((p) => (
                <div
                  key={p.key}
                  className={`landing-compare-cell${p.highlight ? ' landing-compare-cell--highlight' : ''}`}
                >
                  <Text
                    size="xs"
                    fw={p.highlight ? 800 : 600}
                    c={p.highlight ? rallyColors.primary : rallyColors.textSecondary}
                    ta="center"
                  >
                    {p.name}
                  </Text>
                </div>
              ))}
            </div>

            {/* Rows */}
            {rows.map((row) => (
              <div key={row.label} className="landing-compare-row">
                <div className="landing-compare-cell landing-compare-cell--feature">
                  <Text size="sm" c={rallyColors.textPrimary} fw={500}>{row.label}</Text>
                </div>
                {filteredProjects.map((p) => (
                  <div
                    key={p.key}
                    className={`landing-compare-cell${p.highlight ? ' landing-compare-cell--highlight' : ''}`}
                  >
                    <CellValue value={row[p.key]} highlight={p.highlight} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Box>
      </Reveal>

      {/* Step 1: Verdict callout */}
      {verdict && (
        <Reveal delay={0.1}>
          <Group
            gap={14}
            wrap="nowrap"
            align="flex-start"
            mt="lg"
            p="md"
            style={{
              background: `rgba(${hexToRgb(verdict.accent)}, 0.04)`,
              border: `1px solid rgba(${hexToRgb(verdict.accent)}, 0.15)`,
              borderRadius: 12,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                background: `rgba(${hexToRgb(verdict.accent)}, 0.12)`,
              }}
            >
              <verdict.icon size={20} color={verdict.accent} stroke={1.5} />
            </div>
            <Text size="sm" c={rallyColors.textSecondary} lh={1.7}>
              {verdict.text}
            </Text>
          </Group>
        </Reveal>
      )}
    </Box>
  );
}

/* ── Hex to RGB helper ───────────────────────────────────────── */

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

/* ══ Main Component ══════════════════════════════════════════════ */

export default function ComparisonPage() {
  /* Step 5: Section refs */
  const sectionRefs = useRef(SECTIONS.map(() => ({ current: null }))).current;
  const { activeIndex } = useSectionObserver(sectionRefs);

  /* Step 6: Project toggle */
  const [visibleProjects, setVisibleProjects] = useState(PROJECTS.map((p) => p.key));

  const toggleProject = useCallback((key) => {
    if (key === 'tse') return; // TSE cannot be deselected
    setVisibleProjects((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }, []);

  /* Step 3: Radar chart data */
  const UX_SCORES = useMemo(() => ({ tse: 9, excel: 5, fingpt: 3, quantmod: 4, rag: 3 }), []);

  const radarData = useMemo(() => {
    const matrices = [
      { key: 'capabilities', label: 'قابلیت‌ها مالی', rows: CAPABILITY_ROWS },
      { key: 'ai', label: 'هوش مصنوعی', rows: AI_ROWS },
      { key: 'infra', label: 'زیرساخت', rows: INFRA_ROWS },
      { key: 'markets', label: 'پوشش بازار', rows: MARKET_ROWS },
    ];

    const data = matrices.map(({ label, rows }) => {
      const maxPossible = rows.length;
      const entry = { dimension: label };
      PROJECTS.forEach((p) => {
        const raw = computeMatrixScore(rows, p.key);
        entry[p.key] = Math.round((raw / maxPossible) * 10 * 10) / 10;
      });
      return entry;
    });

    // Add UX dimension
    data.push({
      dimension: 'تجربه کاربری',
      ...UX_SCORES,
    });

    return data;
  }, [UX_SCORES]);

  /* Step 4: Progress bar data */
  const progressData = useMemo(() => {
    const allRows = [...CAPABILITY_ROWS, ...AI_ROWS, ...INFRA_ROWS, ...MARKET_ROWS];
    const scores = {};
    PROJECTS.forEach((p) => {
      scores[p.key] = computeMatrixScore(allRows, p.key);
    });
    const tseScore = scores.tse || 1;
    return PROJECTS
      .map((p) => ({
        ...p,
        score: scores[p.key],
        pct: Math.round((scores[p.key] / tseScore) * 100),
      }))
      .sort((a, b) => b.score - a.score);
  }, []);

  /* Step 5: scroll handler */
  const scrollToSection = useCallback((index) => {
    sectionRefs[index]?.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sectionRefs]);

  return (
    <Box
      className="landing-bg"
      style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}
    >
      <div className="landing-dot-grid" />
      <LandingNav />

      {/* Step 5: Sticky section quick-nav */}
      <Box
        component={motion.div}
        className="landing-section-nav"
        visibleFrom="sm"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 1, ease: [0.22, 1, 0.36, 1] }}
      >
        {SECTIONS.map((sec, i) => (
          <Button
            key={sec.id}
            variant="subtle"
            size="xs"
            radius="xl"
            onClick={() => scrollToSection(i)}
            style={{
              background: activeIndex === i ? 'rgba(41,98,255,0.15)' : 'transparent',
              color: activeIndex === i ? rallyColors.primary : rallyColors.textDimmed,
              fontWeight: activeIndex === i ? 700 : 500,
              border: 'none',
              transition: 'all 0.2s ease',
            }}
          >
            {sec.label}
          </Button>
        ))}
      </Box>

      <Container size="xl" style={{ position: 'relative', zIndex: 1 }}>

        {/* ── Hero ──────────────────────────────────────────── */}
        <motion.div variants={heroContainer} initial="hidden" animate="show">
          <Stack align="center" justify="center" gap="lg" pt={160} pb={64} style={{ textAlign: 'center' }}>
            <motion.div variants={heroItem}>
              <div className="landing-pill">
                <IconScale size={14} color={rallyColors.primary} />
                مقایسه پلتفرم‌ها
              </div>
            </motion.div>

            <motion.div variants={heroItem}>
              <Title
                order={1}
                className="landing-hero-title"
                style={{ maxWidth: 720 }}
              >
                TSE Dashboard در برابر دیگران
              </Title>
            </motion.div>

            <motion.div variants={heroItem}>
              <Text
                fz={{ base: 16, sm: 18 }}
                c={rallyColors.textSecondary}
                maw={640}
                style={{ lineHeight: 1.7 }}
              >
                مقایسه جامع TSE Dashboard با ۴ پروژه متن‌باز مالی:
                Excel Analyst Pro، FinGPT، quantmod و RAG Multimodal
              </Text>
            </motion.div>
          </Stack>
        </motion.div>

        {/* Step 2: Hero animated counters */}
        <Reveal>
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" mb={64}>
            {HERO_STATS.map((stat, i) => (
              <Box
                key={stat.label}
                className="landing-glow-card landing-glow-card--sm"
                style={{ textAlign: 'center' }}
              >
                <Text fw={700} fz={28} c={rallyColors.textPrimary} lh={1.2}>
                  <Counter end={stat.value} suffix={stat.suffix} />
                </Text>
                <Text size="sm" c={rallyColors.textDimmed} mt={6}>
                  {stat.label}
                </Text>
              </Box>
            ))}
          </SimpleGrid>
        </Reveal>

        {/* Step 3: Radar Chart */}
        <Reveal>
          <Box className="landing-glow-card landing-glow-card--md" mb={64}>
            <SectionHeader
              badge="نمودار راداری"
              title="مقایسه بصری ۵ پروژه"
              subtitle="امتیاز هر پروژه در ۵ بُعد کلیدی (مقیاس ۰ تا ۱۰)"
            />
            <ResponsiveContainer width="100%" height={360}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis
                  dataKey="dimension"
                  tick={{ fill: rallyColors.textSecondary, fontSize: 12 }}
                />
                {PROJECTS.filter((p) => visibleProjects.includes(p.key)).map((p) => (
                  <Radar
                    key={p.key}
                    name={p.name}
                    dataKey={p.key}
                    stroke={p.color}
                    fill={p.color}
                    fillOpacity={p.highlight ? 0.2 : 0.08}
                    strokeWidth={p.highlight ? 3 : 1.5}
                  />
                ))}
              </RadarChart>
            </ResponsiveContainer>
            {/* Custom legend */}
            <Group justify="center" gap="lg" mt="md">
              {PROJECTS.filter((p) => visibleProjects.includes(p.key)).map((p) => (
                <Group key={p.key} gap={6}>
                  <Box
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: p.color,
                      flexShrink: 0,
                    }}
                  />
                  <Text size="xs" c={p.highlight ? rallyColors.textPrimary : rallyColors.textSecondary} fw={p.highlight ? 700 : 400}>
                    {p.name}
                  </Text>
                </Group>
              ))}
            </Group>
          </Box>
        </Reveal>

        {/* Step 6: Project toggle */}
        <Reveal>
          <Group justify="center" gap={8} mb={40}>
            {PROJECTS.map((p) => (
              <Button
                key={p.key}
                variant={visibleProjects.includes(p.key) ? 'filled' : 'outline'}
                size="xs"
                radius="xl"
                color={p.key === 'tse' ? 'blue' : undefined}
                onClick={() => toggleProject(p.key)}
                style={{
                  ...(visibleProjects.includes(p.key)
                    ? { background: p.color, borderColor: p.color }
                    : { borderColor: 'rgba(255,255,255,0.15)', color: rallyColors.textDimmed }),
                  cursor: p.key === 'tse' ? 'default' : 'pointer',
                  opacity: p.key === 'tse' ? 1 : undefined,
                }}
              >
                {p.name}
              </Button>
            ))}
          </Group>
        </Reveal>

        {/* ── Overview Matrix ───────────────────────────────── */}
        <div id="overview" ref={(el) => { sectionRefs[0].current = el; }}>
          <CompareTable
            rows={OVERVIEW_ROWS}
            badge="نمای کلی"
            title="ماتریس مقایسه‌ای"
            subtitle="مشخصات اصلی هر پروژه در یک نگاه"
            verdict={TABLE_VERDICTS.overview}
            visibleProjects={visibleProjects}
          />
        </div>

        {/* ── Capability Matrix ─────────────────────────────── */}
        <div id="capabilities" ref={(el) => { sectionRefs[1].current = el; }}>
          <CompareTable
            rows={CAPABILITY_ROWS}
            badge="قابلیت‌ها"
            title="مقایسه امکانات مالی"
            subtitle="TSE Dashboard گسترده‌ترین پوشش افقی را دارد"
            verdict={TABLE_VERDICTS.capabilities}
            visibleProjects={visibleProjects}
          />
        </div>

        {/* ── AI & RAG ──────────────────────────────────────── */}
        <div id="ai-rag" ref={(el) => { sectionRefs[2].current = el; }}>
          <CompareTable
            rows={AI_ROWS}
            badge="هوش مصنوعی"
            title="معماری AI و RAG"
            subtitle="TSE Dashboard آماده‌ترین RAG تولیدی با استریم لحظه‌ای و عوامل تخصصی است"
            verdict={TABLE_VERDICTS.ai}
            visibleProjects={visibleProjects}
          />
        </div>

        {/* ── Infrastructure ────────────────────────────────── */}
        <div id="infra" ref={(el) => { sectionRefs[3].current = el; }}>
          <CompareTable
            rows={INFRA_ROWS}
            badge="زیرساخت"
            title="آمادگی تولید"
            subtitle="TSE Dashboard تنها پروژه با زیرساخت کامل تولید است"
            verdict={TABLE_VERDICTS.infra}
            visibleProjects={visibleProjects}
          />
        </div>

        {/* ── Market Coverage ───────────────────────────────── */}
        <div id="markets" ref={(el) => { sectionRefs[4].current = el; }}>
          <CompareTable
            rows={MARKET_ROWS}
            badge="پوشش بازار"
            title="پوشش بازارهای مالی"
            subtitle="هر پروژه روی بازارهای متفاوتی تمرکز دارد"
            verdict={TABLE_VERDICTS.markets}
            visibleProjects={visibleProjects}
          />
        </div>

        {/* ── Lessons / Ideas ───────────────────────────────── */}
        <div id="lessons" ref={(el) => { sectionRefs[5].current = el; }}>
          <Reveal>
            <Box pb={80}>
              <SectionHeader
                badge="الهام‌بخشی"
                title="درس‌هایی از هر پروژه"
                subtitle="ایده‌هایی که TSE Dashboard می‌تواند از هر کدام بیاموزد"
              />
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                {LESSONS.map((lesson, i) => (
                  <Reveal key={lesson.from} delay={i * 0.08} direction="up">
                    <Box className="landing-glow-card landing-glow-card--sm" style={{ height: '100%' }}>
                      <Group gap={12} mb={20}>
                        <div
                          className={`landing-icon-glow landing-icon-glow--${lesson.accentName}`}
                          style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0 }}
                        >
                          <lesson.icon size={20} color={lesson.accent} stroke={1.5} />
                        </div>
                        <Box>
                          <Text fw={700} size="md" c={rallyColors.textPrimary} lh={1.2}>
                            {lesson.from}
                          </Text>
                        </Box>
                      </Group>
                      <Stack gap={10}>
                        {lesson.ideas.map((idea) => (
                          <Group key={idea} gap={10} wrap="nowrap" align="flex-start">
                            <IconBulb
                              size={16}
                              color={lesson.accent}
                              style={{ flexShrink: 0, marginTop: 3 }}
                            />
                            <Text size="sm" c={rallyColors.textSecondary} lh={1.6}>
                              {idea}
                            </Text>
                          </Group>
                        ))}
                      </Stack>
                    </Box>
                  </Reveal>
                ))}
              </SimpleGrid>
            </Box>
          </Reveal>
        </div>

        {/* ── Summary ───────────────────────────────────────── */}
        <div id="summary" ref={(el) => { sectionRefs[6].current = el; }}>
          <Reveal>
            <Box pb={80}>
              <SectionHeader
                badge="نتیجه‌گیری"
                title="جمع‌بندی نهایی"
                subtitle="TSE Dashboard تنها سیستم Full-stack آماده تولید در میان این ۵ پروژه است"
              />

              {/* Step 4: Progress bars */}
              <Reveal delay={0}>
                <Box
                  className="landing-glow-card landing-glow-card--md"
                  mb="xl"
                >
                  <Text fw={700} fz={18} c={rallyColors.textPrimary} mb="lg" ta="center">
                    امتیاز کلی پروژه‌ها
                  </Text>
                  <Stack gap="md">
                    {progressData.map((p) => (
                      <Box key={p.key}>
                        <Group justify="space-between" mb={6}>
                          <Text
                            size="sm"
                            fw={p.highlight ? 700 : 500}
                            c={p.highlight ? rallyColors.primary : rallyColors.textSecondary}
                          >
                            {p.name}
                          </Text>
                          <Text size="xs" c={rallyColors.textDimmed} style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {p.score.toLocaleString('fa-IR')} امتیاز
                          </Text>
                        </Group>
                        <Progress
                          value={p.pct}
                          size="lg"
                          radius="xl"
                          color={p.highlight ? rallyColors.primary : p.color}
                          style={{
                            background: 'rgba(255,255,255,0.04)',
                          }}
                        />
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </Reveal>

              {/* Highlight banner */}
              <Reveal delay={0}>
                <Box
                  className="landing-glow-card landing-glow-card--md"
                  mb="xl"
                  style={{
                    textAlign: 'center',
                    borderColor: 'rgba(41, 98, 255, 0.25)',
                    background: 'rgba(41, 98, 255, 0.04)',
                  }}
                >
                  <div
                    className="landing-icon-glow landing-icon-glow--primary"
                    style={{ width: 52, height: 52, borderRadius: 14, margin: '0 auto 16px' }}
                  >
                    <IconTrendingUp size={26} color={rallyColors.primary} stroke={1.5} />
                  </div>
                  <Text fw={700} fz={{ base: 18, md: 22 }} c={rallyColors.textPrimary} mb={8}>
                    TSE Dashboard ترکیب می‌کند
                  </Text>
                  <Text size="md" c={rallyColors.textSecondary} lh={1.7} maw={560} mx="auto">
                    داده زنده بازار (مانند quantmod) + چت AI با RAG (مانند FinGPT و RAG Multimodal)
                    + خروجی مدل‌سازی مالی (مانند Excel Analyst Pro) + کریپتو، وام، احراز هویت، مانیتورینگ
                    و استقرار کامل Docker — همه در یک پلتفرم یکپارچه
                  </Text>
                </Box>
              </Reveal>

              {/* Summary cards */}
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
                {SUMMARY_CARDS.map((card, i) => (
                  <Reveal key={card.name} delay={i * 0.06} direction="up">
                    <Box className="landing-glow-card landing-glow-card--sm" style={{ height: '100%' }}>
                      <div
                        className={`landing-icon-glow landing-icon-glow--${card.accentName}`}
                        style={{ width: 40, height: 40, borderRadius: 10, marginBottom: 14 }}
                      >
                        <card.icon size={20} color={card.accent} stroke={1.5} />
                      </div>
                      <Text fw={700} size="md" c={rallyColors.textPrimary} mb={4}>
                        {card.name}
                      </Text>
                      <Group gap={6} mb={8}>
                        <Badge
                          size="xs"
                          variant="light"
                          color="green"
                          style={{ background: 'rgba(34,197,94,0.1)', color: rallyColors.green }}
                        >
                          بهترین در
                        </Badge>
                      </Group>
                      <Text size="sm" c={rallyColors.textSecondary} lh={1.6} mb={12}>
                        {card.best}
                      </Text>
                      <Group gap={6} mb={8}>
                        <Badge
                          size="xs"
                          variant="light"
                          color="red"
                          style={{ background: 'rgba(239,68,68,0.1)', color: rallyColors.red }}
                        >
                          ندارد نسبت به TSE
                        </Badge>
                      </Group>
                      <Text size="xs" c={rallyColors.textDimmed} lh={1.6}>
                        {card.missing}
                      </Text>
                    </Box>
                  </Reveal>
                ))}
              </SimpleGrid>
            </Box>
          </Reveal>
        </div>

        {/* ── Footer ───────────────────────────────────────── */}
        <LandingFooter />
      </Container>
    </Box>
  );
}
