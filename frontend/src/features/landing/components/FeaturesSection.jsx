import { Box } from '@mantine/core';
import { FEATURES } from '../../../constants/landing';
import FlowingMenu from './FlowingMenu';
import SectionHeader from './SectionHeader';
import Reveal from './Reveal';

export default function FeaturesSection({ onFeatureClick }) {
  const flowItems = FEATURES.map((f) => ({
    text: f.title,
    subtitle: f.subtitle,
    icon: f.icon,
    accent: f.accent,
    bullets: f.bullets,
    route: f.route,
  }));

  return (
    <Box id="features" pb={96}>
      <Reveal>
        <SectionHeader
          badge="امکانات"
          title="هر آنچه برای تحلیل نیاز دارید"
          subtitle="ابزارهای حرفه‌ای تحلیل بازار سرمایه در دسترس شما"
        />
      </Reveal>

      <FlowingMenu items={flowItems} onItemClick={(route) => onFeatureClick({ route })} />
    </Box>
  );
}
