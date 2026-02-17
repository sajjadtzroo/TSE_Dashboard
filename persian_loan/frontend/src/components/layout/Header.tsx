/**
 * Header Component - MUI AppBar with RTL Support
 */

import { memo } from 'react';
import { AppBar, Toolbar, IconButton, Typography, Chip, Box, useMediaQuery, useTheme } from '@mui/material';
import { Menu } from 'lucide-react';
import { QuickActionsToolbar } from './QuickActionsToolbar';

interface HeaderProps {
  onMenuClick?: () => void;
}

export const Header = memo(function Header({ onMenuClick }: HeaderProps) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));

  return (
    <AppBar
      position="sticky"
      elevation={1}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar sx={{ px: { xs: 2, sm: 3, lg: 4 } }}>
        {/* Mobile Menu Button */}
        {!isDesktop && (
          <IconButton
            edge="start"
            color="inherit"
            aria-label="open drawer"
            onClick={onMenuClick}
            sx={{
              ml: 2,
              color: 'text.secondary',
              '&:hover': {
                color: 'primary.main',
              },
            }}
          >
            <Menu size={24} />
          </IconButton>
        )}

        {/* Title with Gradient */}
        <Typography
          variant="h5"
          component="h1"
          sx={{
            ml: { xs: 0, lg: 2 },
            fontWeight: 700,
            background: 'linear-gradient(90deg, #BB86FC 0%, #03DAC5 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            flexGrow: 0,
          }}
        >
          داشبورد وام‌های بانکی
        </Typography>

        {/* Spacer */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Quick Actions Toolbar */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <QuickActionsToolbar variant="desktop" />

          {/* Version Badge */}
          <Chip
            label="نسخه ۱.۰.۰"
            size="small"
            sx={{
              fontSize: '0.75rem',
              fontWeight: 500,
              backgroundColor: 'rgba(45, 45, 45, 0.8)',
              color: 'text.secondary',
              border: '1px solid',
              borderColor: 'divider',
            }}
          />
        </Box>
      </Toolbar>
    </AppBar>
  );
});

export default Header;
