/**
 * Stat Card Component - Dark Theme (Improved)
 */

import React, { ComponentType } from 'react';
import { clsx } from 'clsx';
import type { ColorVariant } from '../../types';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: ComponentType<{ className?: string }>;
  color?: ColorVariant;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export const StatCard = React.memo(function StatCard({
  title,
  value,
  icon: Icon,
  color = 'blue',
  subtitle,
  trend,
}: StatCardProps) {
  // Improved color classes with borders
  const colorClasses: Record<ColorVariant, string> = {
    blue: 'bg-primary-800/20 text-primary-400 border border-primary-700/30',
    green: 'bg-secondary-800/20 text-secondary-500 border border-secondary-700/30',
    yellow: 'bg-yellow-900/20 text-yellow-400 border border-yellow-700/30',
    purple: 'bg-purple-900/20 text-purple-400 border border-purple-700/30',
    red: 'bg-error-900/20 text-error-500 border border-error-700/30',
    gray: 'bg-surface-50/50 text-gray-300 border border-border-dark',
  };

  return (
    <div className="bg-surface-100 p-6 rounded-lg shadow-dark-md border border-border-light hover:shadow-dark-lg hover:border-primary-400/30 transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-300">{title}</p>
          <p className="text-3xl font-bold text-gray-50 mt-2">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div
              className={clsx(
                'flex items-center mt-2 text-sm font-medium',
                trend.isPositive ? 'text-secondary-500' : 'text-error-500'
              )}
            >
              <span>{trend.isPositive ? '+' : ''}{trend.value}%</span>
            </div>
          )}
        </div>
        <div className={clsx('p-3 rounded-lg', colorClasses[color])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
});

export default StatCard;
