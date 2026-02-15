import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
  Avatar,
  Chip,
} from '@mui/material';
import {
  IconMenu2,
  IconDashboard,
  IconChartBar,
  IconBuildingBank,
  IconChevronLeft,
} from '@tabler/icons-react';
import colors from '../theme/colors';

const drawerWidth = 260;

const menuItems = [
  { text: 'Dashboard', icon: IconDashboard, path: '/' },
  { text: 'Market Overview', icon: IconChartBar, path: '/market' },
  { text: 'Investment Funds', icon: IconBuildingBank, path: '/funds' },
];

export default function MainLayout() {
  const theme = useTheme();
  const matchDownMd = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(!matchDownMd);
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerToggle = () => setOpen(!open);

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <Box sx={{ display: 'flex', alignItems: 'center', p: 2, gap: 1.5 }}>
        <Avatar
          sx={{
            bgcolor: theme.palette.primary.main,
            width: 40,
            height: 40,
            fontSize: '1rem',
            fontWeight: 700,
          }}
        >
          TSE
        </Avatar>
        <Box>
          <Typography variant="h4" color="text.primary">TSETMC</Typography>
          <Typography variant="caption" color="text.secondary">Stock Market Dashboard</Typography>
        </Box>
        {matchDownMd && (
          <IconButton onClick={handleDrawerToggle} sx={{ ml: 'auto' }}>
            <IconChevronLeft />
          </IconButton>
        )}
      </Box>

      {/* Nav */}
      <Box sx={{ px: 2, mt: 1, flex: 1 }}>
        <Typography variant="caption" sx={{ pl: 1, mb: 1, display: 'block', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>
          Navigation
        </Typography>
        <List disablePadding>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isSelected = location.pathname === item.path;
            return (
              <ListItemButton
                key={item.text}
                selected={isSelected}
                onClick={() => {
                  navigate(item.path);
                  if (matchDownMd) setOpen(false);
                }}
                sx={{
                  mb: 0.5,
                  borderRadius: '8px',
                  '&.Mui-selected': {
                    bgcolor: 'rgba(33, 150, 243, 0.15)',
                    color: 'primary.main',
                    '&:hover': { bgcolor: 'rgba(33, 150, 243, 0.25)' },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: isSelected ? 'primary.main' : 'text.secondary' }}>
                  <Icon size={20} stroke={1.5} />
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    variant: 'body1',
                    fontWeight: isSelected ? 600 : 400,
                  }}
                />
              </ListItemButton>
            );
          })}
        </List>
      </Box>

      {/* Footer card */}
      <Box sx={{ p: 2 }}>
        <Box
          sx={{
            p: 2,
            borderRadius: '8px',
            background: `linear-gradient(135deg, ${colors.primaryDark} 0%, ${colors.secondaryDark} 100%)`,
          }}
        >
          <Typography variant="h5" color="#fff" gutterBottom>Tehran Stock Exchange</Typography>
          <Typography variant="caption" color="rgba(255,255,255,0.7)">Real-time market data</Typography>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* AppBar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: open ? `calc(100% - ${drawerWidth}px)` : '100%' },
          ml: { md: open ? `${drawerWidth}px` : 0 },
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar>
          <IconButton color="inherit" onClick={handleDrawerToggle} edge="start" sx={{ mr: 2 }}>
            <IconMenu2 size={20} />
          </IconButton>
          <Typography variant="h3" noWrap color="text.primary" sx={{ flexGrow: 1 }}>
            {menuItems.find((i) => i.path === location.pathname)?.text || 'Stock Detail'}
          </Typography>
          <Chip
            label="Live"
            size="small"
            sx={{
              bgcolor: 'success.main',
              color: '#000',
              fontWeight: 600,
              '& .MuiChip-label': { px: 1.5 },
            }}
          />
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Box component="nav" sx={{ width: { md: open ? drawerWidth : 0 }, flexShrink: 0 }}>
        {matchDownMd ? (
          <Drawer
            variant="temporary"
            open={open}
            onClose={handleDrawerToggle}
            ModalProps={{ keepMounted: true }}
            sx={{ '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' } }}
          >
            {drawer}
          </Drawer>
        ) : (
          <Drawer
            variant="persistent"
            open={open}
            sx={{
              '& .MuiDrawer-paper': {
                width: drawerWidth,
                boxSizing: 'border-box',
                transition: theme.transitions.create('width', {
                  easing: theme.transitions.easing.sharp,
                  duration: theme.transitions.duration.enteringScreen,
                }),
              },
            }}
          >
            {drawer}
          </Drawer>
        )}
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          width: { md: open ? `calc(100% - ${drawerWidth}px)` : '100%' },
          minHeight: '100vh',
          bgcolor: 'background.default',
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
