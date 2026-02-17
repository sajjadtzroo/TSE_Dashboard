import { Card, Group, Text, ThemeIcon, Box, Stack } from '@mantine/core';
import { IconTrendingUp, IconTrendingDown, IconMinus } from '@tabler/icons-react';
import rallyColors from '../theme/rallyColors';

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
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
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
      {/* Subtle accent glow in top-left corner */}
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
            <Text size="lg" fw={700} c={rallyColors.textPrimary} truncate>
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
