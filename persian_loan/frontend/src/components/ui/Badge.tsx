/**
 * Badge Component - MUI-based with Dark Theme
 * Wrapper around MUI Chip component with our color variants
 */

import { ReactNode } from 'react';
import { Chip } from '@mui/material';
import type { ColorVariant } from '@/types';

interface BadgeProps {
  children: ReactNode;
  variant?: ColorVariant;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Badge component using MUI Chip with custom color variants
 * Maps our 6 color variants (blue, green, yellow, purple, red, gray) to MUI colors
 */
export function Badge({
  children,
  variant = 'gray',
  size = 'md',
  className,
}: BadgeProps) {
  // Map our ColorVariant to MUI Chip colors
  const colorMap: Record<ColorVariant, 'primary' | 'secondary' | 'error' | 'warning' | 'success' | 'default'> = {
    blue: 'primary',
    green: 'success',
    yellow: 'warning',
    purple: 'primary',
    red: 'error',
    gray: 'default',
  };

  return (
    <Chip
      label={children}
      color={colorMap[variant]}
      size={size === 'sm' ? 'small' : 'medium'}
      variant="outlined"
      className={className}
      sx={{
        // Special handling for purple variant
        ...(variant === 'purple' && {
          backgroundColor: 'rgba(55, 0, 179, 0.4)',
          color: '#BB86FC',
          borderColor: 'rgba(147, 51, 234, 0.5)',
        }),
      }}
    />
  );
}

export default Badge;
