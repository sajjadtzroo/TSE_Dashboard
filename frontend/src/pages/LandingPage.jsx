import { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, AnimatePresence } from "motion/react";
import { useReducedMotion } from '@mantine/hooks';
import {
  Box,
  Container,
  Stack,
  Text,
  Button,
  Group,
  Loader,
  Center,
} from '@mantine/core';
import { spotlight } from '@mantine/spotlight';
import {
  IconChevronDown,
  IconSearch,
} from '@tabler/icons-react';

import rallyColors from '../theme/rallyColors';
const Hero3DScene = lazy(() => import('../features/landing/components/Hero3DScene'));
import LightRays from '../features/landing/components/LightRays';
import TrueFocus from '../features/landing/components/TrueFocus';
import Magnet from '../animations/Magnet';
import LandingNav from '../features/landing/components/LandingNav';
import LandingFooter from '../features/landing/components/LandingFooter';
import SplashCursor from '../features/landing/components/SplashCursor';
import { useHeroData } from '../hooks/useHeroData';

const StatsSection = lazy(() => import('../features/landing/components/StatsSection'));
const TestimonialsSection = lazy(() => import('../features/landing/components/TestimonialsSection'));
const FeaturesSection = lazy(() => import('../features/landing/components/FeaturesSection'));
const PricingPlans = lazy(() => import('../features/landing/components/PricingPlans'));

/* ── Search placeholder hints ──────────────────────────────────── */
const SEARCH_HINTS = [
  'جستجوی نماد، رمزارز یا وام...',
  'فولاد، خودرو، شپنا، وبملت...',
  'بیت‌کوین، اتریوم، تتر...',
  'وام مسکن، تسهیلات بانک ملی...',
  'نقشه بازار، فیلتر سهام...',
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

// No blur on the title wrapper — TrueFocus manages its own per-word blur internally;
// stacking an outer blur causes double-blur on the non-focused word during entrance.
const heroTitleItem = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1, y: 0,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
  },
};

/* ── Platform-aware shortcut key ─────────────────────────────── */
const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
const KBD_LABEL = isMac ? '⌘K' : 'Ctrl+K';

/* ══ Main Component ══════════════════════════════════════════════ */

export default function LandingPage() {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const heroData = useHeroData();

  // ── Animated placeholder cycling ──
  const [hintIndex, setHintIndex] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => {
      setHintIndex((prev) => (prev + 1) % SEARCH_HINTS.length);
    }, 3000);
    return () => clearInterval(id);
  }, [reduced]);

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
      <SplashCursor />
      <a href="#main-content" className="skip-link">رفتن به محتوای اصلی</a>
      <div className="landing-dot-grid" />

      {/* ── Navbar ─────────────────────────────────────────── */}
      <LandingNav />

      {/* ── Content ────────────────────────────────────────── */}
      <main id="main-content">
      <Container size="lg" style={{ position: 'relative', zIndex: 1 }}>

        {/* ── Hero ─────────────────────────────────────────── */}
        <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, height: '100vh', zIndex: 0 }}>
          <LightRays
            raysOrigin="top-center"
            raysColor="#6EE7B7"
            raysSpeed={0.45}
            lightSpread={0.75}
            rayLength={2.0}
            pulsating
            fadeDistance={0.9}
            saturation={1.2}
            followMouse
            mouseInfluence={0.1}
            noiseAmount={0.04}
            distortion={0.10}
          />
        </div>

        <motion.div variants={heroContainer} initial="hidden" animate="show" style={{ position: 'relative', zIndex: 1 }}>
          <Stack
            align="center"
            justify="center"
            gap={{ base: 'md', md: 'lg' }}
            pt={{ base: 100, sm: 130, md: 160 }}
            pb={{ base: 24, sm: 48 }}
            style={{ textAlign: 'center' }}
          >

            <motion.div variants={heroTitleItem}>
              <TrueFocus sentence="فین هاب" />
            </motion.div>

            {/* ── Search bar ─────────────────────────────────── */}
            <motion.div variants={heroItem} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div
                className="landing-hero-search"
                role="button"
                tabIndex={0}
                onClick={() => spotlight.open()}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') spotlight.open(); }}
              >
                <IconSearch size={18} color={rallyColors.textDimmed} />
                <div style={{ flex: 1, position: 'relative', height: 20, overflow: 'hidden' }}>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={hintIndex}
                      initial={reduced ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.3 }}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        fontSize: 14,
                        color: rallyColors.textDimmed,
                        userSelect: 'none',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {SEARCH_HINTS[hintIndex]}
                    </motion.span>
                  </AnimatePresence>
                </div>
                <kbd className="landing-hero-search__kbd">{KBD_LABEL}</kbd>
              </div>
            </motion.div>

            <motion.div variants={heroItem}>
              <Stack gap={6} align="center" mt="xs">
                <Group gap="md">
                  <Magnet padding={60} magnetStrength={3}>
                    <Button
                      size="lg"
                      radius={60}
                      variant="outline"
                      className="landing-cta landing-cta--shimmer landing-cta-glass-hover"
                      onClick={() => navigate('/dashboard')}
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
                    >
                      ورود به داشبورد
                    </Button>
                  </Magnet>
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
            </motion.div>
          </Stack>
        </motion.div>

        {/* ── Hero 3D Scene ────────────────────────────────── */}
        <motion.div style={{ y: heroY, scale: heroScale, opacity: heroOpacity, position: 'relative', zIndex: 1 }}>
          <Box py={48}>
            <Suspense fallback={null}>
              <Hero3DScene {...heroData} />
            </Suspense>
          </Box>
        </motion.div>
        </div>{/* end hero light-rays wrapper */}

        {/* ── Stats ────────────────────────────────────────── */}
        <Suspense fallback={<Center py="xl"><Loader color="rally-green" /></Center>}>
          <StatsSection />
        </Suspense>

        {/* ── Testimonials ───────────────────────────────── */}
        <Suspense fallback={<Center py="xl"><Loader color="rally-green" /></Center>}>
          <TestimonialsSection />
        </Suspense>

        {/* ── Features ─────────────────────────────────────── */}
        <Suspense fallback={<Center py="xl"><Loader color="rally-green" /></Center>}>
          <FeaturesSection onFeatureClick={handleFeatureClick} />
        </Suspense>

        {/* ── Pricing ─────────────────────────────────────── */}
        <Suspense fallback={<Center py="xl"><Loader color="rally-green" /></Center>}>
          <PricingPlans />
        </Suspense>

        {/* ── Footer ───────────────────────────────────────── */}
        <LandingFooter />
      </Container>
      </main>
    </Box>
  );
}
