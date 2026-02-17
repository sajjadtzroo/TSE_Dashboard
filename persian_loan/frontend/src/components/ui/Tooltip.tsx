/**
 * Tooltip Component - MUI-based with better positioning
 * Wrapper around MUI Tooltip with Popper for better positioning
 */

import { ReactNode } from 'react';
import { Tooltip as MuiTooltip, TooltipProps as MuiTooltipProps } from '@mui/material';

interface TooltipProps {
  children: ReactNode;
  content: string | ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
}

/**
 * Tooltip component using MUI Tooltip with Popper
 * Provides better positioning and theme-aware styling
 */
export function Tooltip({
  children,
  content,
  position = 'top',
  delay = 200,
  className,
}: TooltipProps) {
  // Map position to MUI placement
  const placementMap: Record<string, MuiTooltipProps['placement']> = {
    top: 'top',
    bottom: 'bottom',
    left: 'left',
    right: 'right',
  };

  return (
    <MuiTooltip
      title={content}
      placement={placementMap[position]}
      arrow
      enterDelay={delay}
      enterNextDelay={delay}
      className={className}
      slotProps={{
        popper: {
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: [0, 8],
              },
            },
          ],
        },
      }}
    >
      <span style={{ display: 'inline-flex' }}>{children}</span>
    </MuiTooltip>
  );
}

export default Tooltip;
