/**
 * Main Layout Component - MUI with RTL Support
 * Fixed: Uses absolute positioning to avoid flex layout issues with MUI Drawer
 */

import { useState, useMemo, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Container, useMediaQuery, useTheme } from '@mui/material';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { PageTransition } from './PageTransition';
import { QuickActionsToolbar } from './QuickActionsToolbar';
import { useSidebar } from '@/context/SidebarContext';

const DRAWER_WIDTH_EXPANDED = 256;
const DRAWER_WIDTH_COLLAPSED = 72;
const HEADER_HEIGHT = 64;

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const { isCollapsed } = useSidebar();

  // Calculate drawer width for desktop (0 on mobile)
  const drawerWidth = useMemo(
    () => (isDesktop ? (isCollapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH_EXPANDED) : 0),
    [isDesktop, isCollapsed]
  );

  // Memoize handlers
  const handleMenuClick = useCallback(() => setSidebarOpen(true), []);
  const handleSidebarClose = useCallback(() => setSidebarOpen(false), []);

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      {/* Header */}
      <Header onMenuClick={handleMenuClick} />

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={handleSidebarClose} />

      {/* Main Content - Absolute positioned to avoid flex layout issues */}
      <Box
        component="main"
        sx={{
          position: 'absolute',
          top: HEADER_HEIGHT,
          left: 0,
          right: { xs: 0, lg: `${drawerWidth}px` },
          bottom: 0,
          p: { xs: 2, sm: 3, lg: 4, xl: 5 },
          backgroundColor: 'background.default',
          overflow: 'auto',
          transition: theme.transitions.create('right', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Container
          maxWidth={false}
          sx={{
            maxWidth: { xs: '100%', xl: '1600px' },
            px: { xs: 0, sm: 2 },
          }}
        >
          <PageTransition>
            <Outlet />
          </PageTransition>
        </Container>
      </Box>

      {/* Mobile Quick Actions FAB */}
      <QuickActionsToolbar variant="mobile" sidebarOpen={sidebarOpen} />
    </Box>
  );
}

export default MainLayout;
