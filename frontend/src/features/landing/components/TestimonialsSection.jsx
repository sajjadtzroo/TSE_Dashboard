import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SimpleGrid, Text, Group, Avatar, Box, Stack } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconQuote } from '@tabler/icons-react';
import SectionHeader from './SectionHeader';
import Reveal from './Reveal';
import SpotlightCard from '../../../components/SpotlightCard';
import rallyColors from '../../../theme/rallyColors';
import { TESTIMONIALS } from '../../../constants/landing';

function TestimonialCard({ t }) {
  return (
    <SpotlightCard
      spotlightColor="rgba(34,197,94,0.20)"
      className="landing-testimonial-card"
    >
      <Stack gap="md" justify="space-between" style={{ height: '100%' }}>
        <Box>
          <IconQuote size={20} color={rallyColors.green} style={{ opacity: 0.5, marginBottom: 8 }} />
          <Text size="sm" c={rallyColors.textSecondary} lh={1.7}>
            {t.text}
          </Text>
        </Box>

        <Group gap="sm" mt="auto">
          <Avatar size={36} radius="xl" color="rally-green" styles={{ root: { fontWeight: 600 } }}>
            {t.avatar}
          </Avatar>
          <Box>
            <Text size="sm" fw={600} c={rallyColors.textPrimary}>{t.name}</Text>
            <Text size="xs" c={rallyColors.textDimmed}>{t.role}</Text>
          </Box>
        </Group>
      </Stack>
    </SpotlightCard>
  );
}

export default function TestimonialsSection() {
  const isMobile = useMediaQuery('(max-width: 48em)');
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % TESTIMONIALS.length);
  }, []);

  // Auto-play carousel on mobile
  useEffect(() => {
    if (!isMobile || paused) return;
    const id = setInterval(next, 4000);
    return () => clearInterval(id);
  }, [isMobile, paused, next]);

  // Desktop: show all in grid
  if (!isMobile) {
    return (
      <Box py={64} id="testimonials">
        <SectionHeader
          title="نظرات کاربران"
        />
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg" mt="xl">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <TestimonialCard t={t} />
            </Reveal>
          ))}
        </SimpleGrid>
      </Box>
    );
  }

  // Mobile: carousel with crossfade
  return (
    <Box
      py={64}
      id="testimonials"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <SectionHeader
        title="نظرات کاربران"
      />
      <Box mt="xl" style={{ position: 'relative', minHeight: 200 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <TestimonialCard t={TESTIMONIALS[activeIndex]} />
          </motion.div>
        </AnimatePresence>
      </Box>

      {/* Navigation dots */}
      <Group justify="center" gap={8} mt="md">
        {TESTIMONIALS.map((_, i) => (
          <Box
            key={i}
            onClick={() => setActiveIndex(i)}
            style={{
              width: i === activeIndex ? 20 : 8,
              height: 8,
              borderRadius: 4,
              background: i === activeIndex ? rallyColors.green : `${rallyColors.textDimmed}40`,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </Group>
    </Box>
  );
}
