/**
 * SidebarToggle - MUI IconButton for Sidebar Collapse
 */

import { Box, IconButton, Tooltip } from '@mui/material';
import { ChevronRight } from 'lucide-react';
import { useSidebar } from '@/context/SidebarContext';

/**
 * SidebarToggle - Collapse/Expand button for desktop sidebar with MUI
 *
 * Features:
 * - ChevronRight icon that rotates 180° when collapsed
 * - Hidden on mobile (sidebar always expanded on mobile)
 * - MUI Tooltip for accessibility
 * - Positioned at top of sidebar with border
 */
export function SidebarToggle() {
  const { isCollapsed, toggleCollapse } = useSidebar();

  return (
    <Box
      sx={{
        display: { xs: 'none', lg: 'flex' },
        px: 1.5,
        py: 2,
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Tooltip
        title={isCollapsed ? 'باز کردن منو' : 'بستن منو'}
        placement="left"
        arrow
      >
        <IconButton
          onClick={toggleCollapse}
          sx={{
            width: '100%',
            borderRadius: 2,
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
          aria-label={isCollapsed ? 'باز کردن منو' : 'بستن منو'}
        >
          <ChevronRight
            size={20}
            style={{
              transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 300ms ease-in-out',
            }}
          />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
