import { Card, Group, Text, ThemeIcon, Box, Stack } from '@mantine/core';
import { IconTrendingUp, IconTrendingDown, IconMinus, type TablerIcon } from '@tabler/icons-react';
import rallyColors from '../../theme/rallyColors';

function TrendIndicator({ trend }: { trend?: number | null }) {
  if (trend == null) return null;
  const color = trend > 0 ? rallyColors.green : trend < 0 ? rallyColors.red : rallyColors.textDimmed;
  const Icon = trend > 0 ? IconTrendingUp : trend < 0 ? IconTrendingDown : IconMinus;
  return <Icon size={16} color={color} />;
}

interface RallyKPICardProps {
  title: string;
  value: string | number;
  icon?: TablerIcon;
  color?: string;
  bgColor?: string;
  subtitle?: string;
  variant?: 'filled' | 'accent-bar';
  trend?: number | null;
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
}: RallyKPICardProps) {
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

  const gradientBg = bgColor || color;

  return (
    <Card
      radius="md"
      p="lg"
      style={{
        background: `linear-gradient(135deg, ${gradientBg} 0%, ${gradientBg}cc 100%)`,
        color: rallyColors.textPrimary,
        overflow: 'hidden',
        position: 'relative',
        border: 'none',
        boxShadow: rallyColors.glassShadow,
      }}
    >
      <Box
        style={{
          position: 'absolute',
          width: 210,
          height: 210,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '50%',
          top: -85,
          right: -95,
        }}
      />
      <Box
        style={{
          position: 'absolute',
          width: 210,
          height: 210,
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '50%',
          top: -125,
          right: -15,
        }}
      />
      <Group gap="sm" style={{ position: 'relative', zIndex: 1 }}>
        {Icon && (
          <ThemeIcon
            size={44}
            radius="md"
            variant="filled"
            style={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              color: rallyColors.textPrimary,
            }}
          >
            <Icon size={24} stroke={1.5} />
          </ThemeIcon>
        )}
        <Stack gap={2}>
          <Group gap={6}>
            <Text size="xl" fw={700} c="inherit">
              {value}
            </Text>
            <TrendIndicator trend={trend} />
          </Group>
          <Text size="xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {title}
          </Text>
        </Stack>
      </Group>
      {subtitle && (
        <Text size="xs" mt="xs" style={{ color: 'rgba(255,255,255,0.5)', position: 'relative', zIndex: 1 }}>
          {subtitle}
        </Text>
      )}
    </Card>
  );
}
