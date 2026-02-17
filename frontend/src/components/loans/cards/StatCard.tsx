import React from 'react';
import type { TablerIcon } from '@tabler/icons-react';
import { RallyKPICard } from '../rally';
import type { ColorVariant } from '@/types';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: TablerIcon;
  color?: ColorVariant;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const colorToMantine: Record<ColorVariant, string> = {
  blue: 'blue',
  green: 'teal',
  yellow: 'yellow',
  purple: 'violet',
  red: 'red',
  gray: 'gray',
};

const StatCardComponent = function StatCard({
  title,
  value,
  icon: Icon,
  color = 'blue',
  subtitle,
  trend,
}: StatCardProps) {
  return (
    <RallyKPICard
      title={title}
      value={String(value)}
      subtitle={subtitle}
      icon={Icon}
      color={colorToMantine[color]}
      variant="accent-bar"
      trend={trend ? (trend.isPositive ? trend.value : -trend.value) : undefined}
    />
  );
};

export const StatCard = React.memo(StatCardComponent);
StatCard.displayName = 'StatCard';

export default StatCard;
