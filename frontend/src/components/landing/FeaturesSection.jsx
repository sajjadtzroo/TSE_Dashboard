import { Box, SimpleGrid } from '@mantine/core';
import { FEATURES } from '../../constants/landing';
import FeatureCard from './FeatureCard';
import SectionHeader from './SectionHeader';
import Reveal from './Reveal';

export default function FeaturesSection({ onFeatureClick }) {
  return (
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
              onClick={() => onFeatureClick(feature)}
            />
          </Reveal>
        ))}
      </SimpleGrid>
    </Box>
  );
}
