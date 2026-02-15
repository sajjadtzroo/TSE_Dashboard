import { createTheme, ThemeProvider, StyledEngineProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import colors from './colors';

const gridSpacing = 3;
const drawerWidth = 260;
const borderRadius = 8;

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      light: colors.primary200,
      main: colors.primaryMain,
      dark: colors.primaryDark,
      200: colors.primary200,
      800: colors.primary800,
    },
    secondary: {
      light: colors.secondary200,
      main: colors.secondaryMain,
      dark: colors.secondaryDark,
      200: colors.secondary200,
      800: colors.secondary800,
    },
    error: {
      light: colors.errorLight,
      main: colors.errorMain,
      dark: colors.errorDark,
    },
    warning: {
      light: colors.warningLight,
      main: colors.warningMain,
      dark: colors.warningDark,
    },
    success: {
      light: colors.successLight,
      200: colors.success200,
      main: colors.successMain,
      dark: colors.successDark,
    },
    background: {
      paper: colors.darkPaper,
      default: colors.darkBackground,
    },
    text: {
      primary: colors.darkTextPrimary,
      secondary: colors.darkTextSecondary,
      hint: colors.grey100,
    },
    divider: 'rgba(255,255,255,0.12)',
  },
  typography: {
    fontFamily: `'Inter', 'Roboto', sans-serif`,
    h1: { fontSize: '2.125rem', fontWeight: 700 },
    h2: { fontSize: '1.5rem', fontWeight: 700 },
    h3: { fontSize: '1.25rem', fontWeight: 600 },
    h4: { fontSize: '1rem', fontWeight: 600 },
    h5: { fontSize: '0.875rem', fontWeight: 500 },
    h6: { fontSize: '0.75rem', fontWeight: 500 },
    subtitle1: { fontSize: '0.875rem', fontWeight: 500 },
    subtitle2: { fontSize: '0.75rem', fontWeight: 400 },
    body1: { fontSize: '0.875rem' },
    body2: { fontSize: '0.75rem' },
    caption: { fontSize: '0.75rem', fontWeight: 400 },
  },
  shape: {
    borderRadius,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': { width: '6px', height: '6px' },
          '&::-webkit-scrollbar-track': { background: colors.darkBackground },
          '&::-webkit-scrollbar-thumb': { background: colors.darkLevel1, borderRadius: '3px' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderRadius: `${borderRadius}px`,
          border: '1px solid rgba(255,255,255,0.05)',
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: { padding: '24px' },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: colors.darkPaper,
          backgroundImage: 'none',
          boxShadow: 'none',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: colors.darkPaper,
          borderRight: '1px solid rgba(255,255,255,0.05)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 500, borderRadius: `${borderRadius}px` },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: `${borderRadius}px` },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: { borderRadius: `${borderRadius}px`, marginBottom: '4px' },
      },
    },
  },
});

export { theme, gridSpacing, drawerWidth };
export default theme;
