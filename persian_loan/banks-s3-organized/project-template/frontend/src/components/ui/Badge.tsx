/**
 * Badge Component - Dark Theme
 */

import { ReactNode } from 'react';
import { clsx } from 'clsx';
import type { ColorVariant } from '../../types';

interface BadgeProps {
  children: ReactNode;
  variant?: ColorVariant;
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({
  children,
  variant = 'gray',
  size = 'md',
  className,
}: BadgeProps) {
  // Dark theme badge colors
  const variantClasses: Record<ColorVariant, string> = {
    blue: 'bg-primary-800/30 text-primary-400 border border-primary-700/50',
    green: 'bg-secondary-800/30 text-secondary-500 border border-secondary-700/50',
    yellow: 'bg-yellow-900/30 text-yellow-400 border border-yellow-700/50',
    purple: 'bg-primary-800/40 text-primary-400 border border-primary-600/50',
    red: 'bg-error-900/30 text-error-500 border border-error-700/50',
    gray: 'bg-surface-50/50 text-gray-300 border border-gray-600/50',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium rounded-full',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {children}
    </span>
  );
}

export default Badge;
