import { Card, Group, Text, ThemeIcon, Box, Stack } from '@mantine/core';
import { IconTrendingUp, IconTrendingDown, IconMinus } from '@tabler/icons-react';
import SparklineMini from './charts/SparklineMini';
import rallyColors from '../theme/rallyColors';
import animStyles from './shared/animations.module.css';

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

  // Compact mode: horizontal, smaller icon, single-line
  if (compact) {
    const accentColor = bgColor || color;
    return (
      <Card
        radius="md"
        p="xs"
        style={{
          background: rallyColors.glassBg,
          backdropFilter: rallyColors.glassBlur,
          border: `1px solid ${rallyColors.glassBorder}`,
          height: '100%',
        }}
      >
        <Group gap={8} wrap="nowrap" align="center">
          {Icon && (
            <ThemeIcon
              size={28}
              radius="sm"
              variant="filled"
              style={{
                backgroundColor: `${accentColor}18`,
                color: accentColor,
                border: `1px solid ${accentColor}25`,
                flexShrink: 0,
              }}
            >
              <Icon size={14} stroke={1.5} />
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
    <Card
      radius="md"
      p="md"
      style={{
        background: rallyColors.glassBg,
        backdropFilter: rallyColors.glassBlur,
        border: `1px solid ${rallyColors.glassBorder}`,
        position: 'relative',
        overflow: 'hidden',
        contain: 'paint',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        height: '100%',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${accentColor}30`;
        e.currentTarget.style.boxShadow = `0 0 20px ${accentColor}10`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = rallyColors.glassBorder;
        e.currentTarget.style.boxShadow = 'none';
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
            size={40}
            radius="md"
            variant="filled"
            style={{
              backgroundColor: `${accentColor}18`,
              color: accentColor,
              border: `1px solid ${accentColor}25`,
              flexShrink: 0,
            }}
          >
            <Icon size={20} stroke={1.5} />
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
  );
}
