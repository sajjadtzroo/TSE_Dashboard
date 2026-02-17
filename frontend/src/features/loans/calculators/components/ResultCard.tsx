/**
 * Result Card Component
 * Beautiful card for displaying calculation results
 */

import { Box, Text, Group } from '@mantine/core';
import rallyColors from '@/theme/rallyColors';
import type { TablerIcon } from '@tabler/icons-react';

type IconComponent = TablerIcon;

interface ResultCardProps {
  label: string;
  value: string | number;
  icon?: IconComponent;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  subtitle?: string;
  highlight?: boolean;
}

const colorMap = {
  primary: {
    bg: 'rgba(59, 130, 246, 0.1)',
    border: 'rgba(59, 130, 246, 0.3)',
    text: rallyColors.blue,
  },
  success: {
    bg: 'rgba(20, 184, 166, 0.1)',
    border: 'rgba(20, 184, 166, 0.3)',
    text: '#14b8a6',
  },
  warning: {
    bg: 'rgba(245, 158, 11, 0.1)',
    border: 'rgba(245, 158, 11, 0.3)',
    text: rallyColors.yellow,
  },
  danger: {
    bg: 'rgba(236, 72, 153, 0.1)',
    border: 'rgba(236, 72, 153, 0.3)',
    text: '#ec4899',
  },
  info: {
    bg: 'rgba(59, 130, 246, 0.1)',
    border: 'rgba(59, 130, 246, 0.3)',
    text: rallyColors.blue,
  },
};

export function ResultCard({
  label,
  value,
  icon: Icon,
  color = 'primary',
  subtitle,
  highlight = false,
}: ResultCardProps) {
  const colors = colorMap[color];

  return (
    <Box
      style={{
        padding: 20,
        borderRadius: 12,
        border: `2px solid ${highlight ? colors.border : rallyColors.glassBorder}`,
        backgroundColor: highlight ? colors.bg : rallyColors.bg,
        transition: 'all 0.2s ease',
      }}
    >
      <Group justify="space-between" align="flex-start" mb="xs">
        <Text size="sm" c={rallyColors.textSecondary} fw={500}>
          {label}
        </Text>
        {Icon && (
          <Icon
            size={20}
            color={highlight ? colors.text : rallyColors.textSecondary}
          />
        )}
      </Group>

      <Text
        size="xl"
        fw={700}
        mb={4}
        c={highlight ? colors.text : rallyColors.textPrimary}
      >
        {value}
      </Text>

      {subtitle && (
        <Text size="xs" c={rallyColors.textSecondary} mt="sm">
          {subtitle}
        </Text>
      )}
    </Box>
  );
}

export default ResultCard;
