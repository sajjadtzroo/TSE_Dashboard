import { motion } from "motion/react";
import { Card, Group, Text, ThemeIcon, Box, Stack } from '@mantine/core';
import { IconTrendingUp, IconTrendingDown, IconMinus } from '@tabler/icons-react';
import SparklineMini from './charts/SparklineMini';
import rallyColors from '../theme/rallyColors';
import animStyles from './shared/animations.module.css';
import styles from './RallyKPICard.module.css';

function TrendIndicator({ trend }) {
  if (trend == null) return null;
  const color = trend > 0 ? rallyColors.green : trend < 0 ? rallyColors.red : rallyColors.textDimmed;
  const Icon = trend > 0 ? IconTrendingUp : trend < 0 ? IconTrendingDown : IconMinus;
  return <Icon size={16} color={color} />;
}

export default function RallyKPICard({
  title,
  value,
  icon: Icon,
  color = rallyColors.green,
  bgColor,
  subtitle,
  variant = 'filled',
  trend,
  sparklineData,
  compact = false,
  animateValue = false,
}) {
  if (variant === 'accent-bar') {
    return (
      <Card
        withBorder
        radius="md"
        p="md"
        style={{
          borderInlineStart: `3px solid ${color}`,
        }}
      >
        <Group gap="sm" align="flex-start">
          {Icon && (
            <ThemeIcon
              size={40}
              radius="md"
              variant="light"
              style={{
                backgroundColor: `${color}15`,
                color: color,
              }}
            >
              <Icon size={22} stroke={1.5} />
            </ThemeIcon>
          )}
          <Stack gap={2}>
            <Group gap={6}>
              <Text size="xl" fw={700}>
                {value}
              </Text>
              <TrendIndicator trend={trend} />
            </Group>
            <Text size="xs" c="dimmed">
              {title}
            </Text>
            {subtitle && (
              <Text size="xs" c="dimmed">
                {subtitle}
              </Text>
            )}
          </Stack>
        </Group>
      </Card>
    );
  }

  // Compact mode: horizontal, larger 32px icon, single-line
  if (compact) {
    const accentColor = bgColor || color;
    return (
      <Card
        radius="md"
        p="xs"
        className={styles.card}
        style={{
          background: rallyColors.glassBg,
          backdropFilter: rallyColors.glassBlur,
          border: `1px solid ${rallyColors.glassBorder}`,
          height: '100%',
          '--kpi-accent-30': `${accentColor}30`,
          '--kpi-accent-10': `${accentColor}10`,
        }}
      >
        <Group gap={8} wrap="nowrap" align="center">
          {Icon && (
            <ThemeIcon
              size={32}
              radius={10}
              variant="filled"
              className={styles.iconContainer}
              style={{
                background: `linear-gradient(135deg, ${accentColor}22 0%, ${accentColor}0a 100%)`,
                color: accentColor,
                border: `1px solid ${accentColor}25`,
                flexShrink: 0,
              }}
            >
              <Icon size={16} stroke={1.5} />
            </ThemeIcon>
          )}
          <Box style={{ minWidth: 0, flex: 1 }}>
            <Text size="xs" c="dimmed" truncate lineClamp={1}>
              {title}
            </Text>
            <Group gap={4} wrap="nowrap">
              <Text
                size="sm"
                fw={700}
                c={rallyColors.textPrimary}
                truncate
                className={animateValue ? animStyles.valuePulse : undefined}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {value}
              </Text>
              <TrendIndicator trend={trend} />
            </Group>
          </Box>
        </Group>
      </Card>
    );
  }

  // Default: Glassmorphic dark card with accent-colored icon
  const accentColor = bgColor || color;

  return (
    <motion.div whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
    <Card
      radius="md"
      p="md"
      className={styles.card}
      style={{
        background: rallyColors.glassBg,
        backdropFilter: rallyColors.glassBlur,
        border: `1px solid ${rallyColors.glassBorder}`,
        position: 'relative',
        overflow: 'hidden',
        contain: 'paint',
        height: '100%',
        '--kpi-accent-30': `${accentColor}30`,
        '--kpi-accent-10': `${accentColor}10`,
      }}
    >
      {/* Subtle accent glow in top-right corner — clipped by card overflow */}
      <Box
        style={{
          position: 'absolute',
          width: 80,
          height: 80,
          background: `radial-gradient(circle, ${accentColor}12 0%, transparent 70%)`,
          top: -20,
          right: -20,
          pointerEvents: 'none',
        }}
      />

      {/* Sparkline in bottom-right corner */}
      {sparklineData && sparklineData.length > 1 && (
        <Box
          style={{
            position: 'absolute',
            bottom: 6,
            left: 6,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          <SparklineMini data={sparklineData} color={accentColor} width={60} height={24} />
        </Box>
      )}

      <Group gap="sm" align="flex-start" style={{ position: 'relative', zIndex: 1 }}>
        {Icon && (
          <ThemeIcon
            size={42}
            radius={12}
            variant="filled"
            className={styles.iconContainer}
            style={{
              background: `linear-gradient(135deg, ${accentColor}20 0%, ${accentColor}08 100%)`,
              color: accentColor,
              border: `1px solid ${accentColor}25`,
              boxShadow: `inset 0 1px 1px rgba(255,255,255,0.06)`,
              flexShrink: 0,
            }}
          >
            <Icon size={22} stroke={1.5} />
          </ThemeIcon>
        )}
        <Stack gap={2} style={{ minWidth: 0 }}>
          <Text size="xs" c="dimmed" truncate>
            {title}
          </Text>
          <Group gap={6} wrap="nowrap">
            <Text
              size="lg"
              fw={700}
              c={rallyColors.textPrimary}
              truncate
              className={animateValue ? animStyles.valuePulse : undefined}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {value}
            </Text>
            <TrendIndicator trend={trend} />
          </Group>
          {subtitle && (
            <Text size="xs" c="dimmed" style={{ opacity: 0.7 }}>
              {subtitle}
            </Text>
          )}
        </Stack>
      </Group>
    </Card>
    </motion.div>
  );
}
