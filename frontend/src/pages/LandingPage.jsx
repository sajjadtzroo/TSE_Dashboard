import { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from "motion/react";
import {
  Box,
  Container,
  Stack,
  Title,
  Text,
  Button,
  Group,
  Loader,
  Center,
} from '@mantine/core';
import {
  IconShieldCheck,
  IconChevronDown,
} from '@tabler/icons-react';

import rallyColors from '../theme/rallyColors';
import HeroVisual from '../features/landing/components/HeroVisual';
import LandingNav from '../features/landing/components/LandingNav';
import LandingFooter from '../features/landing/components/LandingFooter';

const StatsSection = lazy(() => import('../features/landing/components/StatsSection'));
const FeaturesSection = lazy(() => import('../features/landing/components/FeaturesSection'));
const PricingPlans = lazy(() => import('../features/landing/components/PricingPlans'));

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
      <main>
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

        {/* ── Stats ────────────────────────────────────────── */}
        <Suspense fallback={<Center py="xl"><Loader color="rally-green" /></Center>}>
          <StatsSection />
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
