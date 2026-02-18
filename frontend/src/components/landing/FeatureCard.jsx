import { motion } from "motion/react";
import { Box, Group, Badge, Text, Stack } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import rallyColors from '../../theme/rallyColors';

export default function FeatureCard({ feature, onClick }) {
  const isClickable = !feature.comingSoon;

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.015 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Box
        className="landing-glow-card"
        onClick={isClickable ? onClick : undefined}
        style={{
          padding: 32,
          cursor: isClickable ? 'pointer' : 'default',
          opacity: feature.comingSoon ? 0.55 : 1,
          height: '100%',
          position: 'relative',
        }}
      >
        <Group justify="space-between" align="flex-start" mb={20}>
          <div className={`landing-icon-glow landing-icon-glow--${feature.accentName}`}>
            <feature.icon size={24} color={feature.accent} stroke={1.5} />
          </div>
          {feature.comingSoon && (
            <Badge size="sm" variant="light" color="gray" radius="xl">
              به‌زودی
            </Badge>
          )}
          {isClickable && (
            <IconArrowLeft size={18} color={feature.accent} style={{ opacity: 0.5 }} />
          )}
        </Group>

        <Text fw={700} fz={{ base: 20, md: 24 }} c={rallyColors.textPrimary} mb={4}>
          {feature.title}
        </Text>
        <Text size="sm" c={feature.accent} fw={500} mb={8}>
          {feature.subtitle}
        </Text>
        <Text size="sm" c={rallyColors.textSecondary} mb={20} lh={1.6}>
          {feature.description}
        </Text>

        <Stack gap={10}>
          {feature.bullets.map((bullet) => (
            <Group key={bullet.text} gap={8} wrap="nowrap">
              <bullet.icon size={15} color={feature.accent} style={{ flexShrink: 0 }} />
              <Text size="xs" c={rallyColors.textSecondary}>
                {bullet.text}
              </Text>
            </Group>
          ))}
        </Stack>
      </Box>
    </motion.div>
  );
}
