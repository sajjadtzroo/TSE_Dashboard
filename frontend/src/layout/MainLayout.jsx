import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Collapse,
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
  IconArrowsExchange,
  IconChevronLeft,
  IconChevronDown,
  IconChevronRight,
  IconFlame,
  IconTimeline,
  IconTrendingUp,
  IconCoin,
  IconCurrencyDollar,
  IconUsers,
  IconFileText,
  IconActivity,
  IconCertificate,
  IconWallet,
  IconArrowForward,
  IconTruck,
  IconClockHour4,
  IconMessageChatbot,
  IconBrain,
  IconApi,
} from '@tabler/icons-react';
import colors from '../theme/colors';

const drawerWidth = 260;

const menuItems = [
  { text: 'Dashboard', icon: IconDashboard, path: '/' },
  { text: 'Market Overview', icon: IconChartBar, path: '/market' },
  { text: 'Market Indices', icon: IconTrendingUp, path: '/market-indices' },
  { text: 'ETF NAV', icon: IconCoin, path: '/etf-nav' },
  { text: 'Market Prices', icon: IconCurrencyDollar, path: '/market-prices' },
  { text: 'Investment Funds', icon: IconBuildingBank, path: '/funds' },
  { text: 'Options', icon: IconArrowsExchange, path: '/options' },
  { text: 'Codal', icon: IconFileText, path: '/codal' },
  { text: 'Chat (RAG)', icon: IconMessageChatbot, path: '/chat' },
  { text: 'RAG Status', icon: IconBrain, path: '/rag-status' },
  { text: 'API Usage', icon: IconApi, path: '/api-usage' },
  {
    text: 'IME',
    icon: IconFlame,
    children: [
      { text: 'IME Options', icon: IconFlame, path: '/ime-options' },
      { text: 'IME Futures', icon: IconTimeline, path: '/ime-futures' },
      { text: 'IME Certificates', icon: IconCertificate, path: '/ime-certificates' },
      { text: 'IME Funds', icon: IconWallet, path: '/ime-funds' },
      { text: 'IME Forwards', icon: IconArrowForward, path: '/ime-forwards' },
      { text: 'IME Physical', icon: IconTruck, path: '/ime-physical' },
    ],
  },
];

// Flat list of all paths for title lookup
const allPaths = menuItems.flatMap((item) =>
  item.children ? item.children.map((c) => ({ text: c.text, path: c.path })) : [{ text: item.text, path: item.path }]
);

export default function MainLayout() {
  const theme = useTheme();
  const matchDownMd = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(!matchDownMd);
  const [imeOpen, setImeOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerToggle = () => setOpen(!open);

  const renderMenuItem = (item) => {
    const Icon = item.icon;

    // Group with children
    if (item.children) {
      const isAnyChildSelected = item.children.some((c) => location.pathname === c.path);
      return (
        <Box key={item.text}>
          <ListItemButton
            onClick={() => setImeOpen(!imeOpen)}
            sx={{
              mb: 0.5,
              borderRadius: '8px',
              ...(isAnyChildSelected && {
                bgcolor: 'rgba(33, 150, 243, 0.08)',
              }),
            }}
          >
            <ListItemIcon sx={{ minWidth: 36, color: isAnyChildSelected ? 'primary.main' : 'text.secondary' }}>
              <Icon size={20} stroke={1.5} />
            </ListItemIcon>
            <ListItemText
              primary={item.text}
              primaryTypographyProps={{
                variant: 'body1',
                fontWeight: isAnyChildSelected ? 600 : 400,
              }}
            />
            {imeOpen ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
          </ListItemButton>
          <Collapse in={imeOpen} timeout="auto" unmountOnExit>
            <List disablePadding sx={{ pl: 2 }}>
              {item.children.map((child) => {
                const ChildIcon = child.icon;
                const isSelected = location.pathname === child.path;
                return (
                  <ListItemButton
                    key={child.text}
                    selected={isSelected}
                    onClick={() => {
                      navigate(child.path);
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
                    <ListItemIcon sx={{ minWidth: 32, color: isSelected ? 'primary.main' : 'text.secondary' }}>
                      <ChildIcon size={18} stroke={1.5} />
                    </ListItemIcon>
                    <ListItemText
                      primary={child.text}
                      primaryTypographyProps={{
                        variant: 'body2',
                        fontWeight: isSelected ? 600 : 400,
                      }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Collapse>
        </Box>
      );
    }

    // Regular item
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
  };

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
      <Box sx={{ px: 2, mt: 1, flex: 1, overflowY: 'auto' }}>
        <Typography variant="caption" sx={{ pl: 1, mb: 1, display: 'block', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>
          Navigation
        </Typography>
        <List disablePadding>
          {menuItems.map((item) => renderMenuItem(item))}
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

  // Find current page title
  const currentTitle = allPaths.find((i) => i.path === location.pathname)?.text
    || (location.pathname.includes('/shareholders') ? 'Shareholders'
    : location.pathname.includes('/tick-trades') ? 'Tick Trades'
    : location.pathname.startsWith('/stock/') ? 'Stock Detail'
    : 'Dashboard');

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
            {currentTitle}
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
