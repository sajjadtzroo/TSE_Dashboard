/**
 * Sidebar Component - MUI Drawer with RTL Support
 */

import { memo, useMemo } from 'react';
import {
  Drawer,
  Box,
  IconButton,
  Typography,
  useMediaQuery,
  useTheme,
  Toolbar,
} from '@mui/material';
import { X } from 'lucide-react';
import { useSidebar } from '@/context/SidebarContext';
import { SidebarToggle } from './SidebarToggle';
import { SidebarNav } from './SidebarNav';
import { SidebarStats } from './SidebarStats';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const DRAWER_WIDTH_EXPANDED = 256; // 64 * 4 = 256px
const DRAWER_WIDTH_COLLAPSED = 72; // 18 * 4 = 72px

/**
 * Sidebar Component with MUI Drawer
 *
 * Features:
 * - Mobile: Temporary drawer overlay (always expanded)
 * - Desktop: Permanent drawer with collapse support
 * - Grouped navigation with 4 sections
 * - Quick stats in footer
 * - Smooth width transitions
 * - localStorage persistence for collapse state
 * - RTL support
 *
 * Width:
 * - Collapsed: 72px - icon only
 * - Expanded: 256px - full with labels
 */
export const Sidebar = memo(function Sidebar({ isOpen, onClose }: SidebarProps) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const { isCollapsed } = useSidebar();

  const drawerWidth = useMemo(
    () => (isCollapsed && isDesktop ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH_EXPANDED),
    [isCollapsed, isDesktop]
  );

  const drawerContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Mobile header with close button */}
      {!isDesktop && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
            منو
          </Typography>
          <IconButton
            onClick={onClose}
            sx={{
              color: 'text.secondary',
              '&:hover': {
                color: 'text.primary',
              },
            }}
            aria-label="بستن منو"
          >
            <X size={20} />
          </IconButton>
        </Box>
      )}

      {/* Desktop toggle button */}
      {isDesktop && <SidebarToggle />}

      {/* Navigation */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <SidebarNav isCollapsed={isCollapsed && isDesktop} />
      </Box>

      {/* Stats Footer */}
      <SidebarStats isCollapsed={isCollapsed && isDesktop} />

      {/* Footer text (hidden when collapsed) */}
      {!(isCollapsed && isDesktop) && (
        <Box
          sx={{
            p: 2,
            borderTop: 1,
            borderColor: 'divider',
            textAlign: 'center',
          }}
        >
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            تحلیل وام‌های بانک‌های ایران
          </Typography>
        </Box>
      )}
    </Box>
  );

  return (
    <>
      {/* Mobile Drawer - Temporary */}
      {!isDesktop && (
        <Drawer
          anchor="right"
          open={isOpen}
          onClose={onClose}
          variant="temporary"
          ModalProps={{
            keepMounted: true, // Better mobile performance
          }}
          sx={{
            display: { xs: 'block', lg: 'none' },
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH_EXPANDED,
              boxSizing: 'border-box',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Desktop Drawer - Permanent */}
      {isDesktop && (
        <Drawer
          anchor="right"
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', lg: 'block' },
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
              overflowX: 'hidden',
            },
          }}
        >
          <Toolbar /> {/* Spacer for AppBar */}
          {drawerContent}
        </Drawer>
      )}
    </>
  );
});

export default Sidebar;
