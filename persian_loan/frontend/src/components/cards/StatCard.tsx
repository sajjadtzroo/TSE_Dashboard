import React from 'react';
import type { ComponentType } from 'react';
import { RallyKPICard } from '../rally';
import type { ColorVariant } from '@/types';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: ComponentType<{ size?: number; stroke?: number }>;
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
      icon={<Icon size={22} stroke={1.5} />}
      color={colorToMantine[color]}
      variant="accent-bar"
      trend={
        trend
          ? { value: trend.value, direction: trend.isPositive ? 'up' : 'down' }
          : undefined
      }
    />
  );
};

export const StatCard = React.memo(StatCardComponent);
StatCard.displayName = 'StatCard';

export default StatCard;
