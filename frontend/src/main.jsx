import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import App from './App'
import { COLORS } from './theme/colors'

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: COLORS.primary,
      light: '#E2B6FF',
      dark: '#3700B3',
    },
    secondary: {
      main: COLORS.secondary,
      light: '#66FFF8',
      dark: '#018786',
    },
    error: {
      main: COLORS.error,
    },
    success: {
      main: COLORS.success,
    },
    warning: {
      main: COLORS.warning,
    },
    info: {
      main: COLORS.info,
    },
    background: {
      default: COLORS.black,
      paper: COLORS.background.dark,
    },
    text: {
      primary: COLORS.white,
      secondary: '#888888',
    },
    divider: COLORS.background.darkSecondary,
  },
  typography: {
    fontFamily: '"DM Sans", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontSize: 'clamp(1.5rem, 4vw, 2.125rem)',
      fontWeight: 700,
    },
    h5: {
      fontSize: 'clamp(1.25rem, 3vw, 1.5rem)',
      fontWeight: 600,
    },
    h6: {
      fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
      fontWeight: 500,
    },
    body1: {
      fontSize: 'clamp(0.875rem, 2vw, 1rem)',
    },
    body2: {
      fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: COLORS.black,
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: COLORS.black,
          },
          '&::-webkit-scrollbar-thumb': {
            background: COLORS.gray[800],
            borderRadius: '4px',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: COLORS.background.dark,
          backgroundImage: 'none',
          border: `1px solid ${COLORS.background.darkSecondary}`,
          transition: 'all 0.3s ease',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: COLORS.black,
          backgroundImage: 'none',
          borderBottom: `1px solid ${COLORS.background.darkSecondary}`,
          boxShadow: 'none',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: COLORS.black,
          borderRight: `1px solid ${COLORS.background.darkSecondary}`,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(187, 134, 252, 0.3)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#0F0F0F',
            '& fieldset': {
              borderColor: '#2A2A2A',
            },
            '&:hover fieldset': {
              borderColor: '#3A3A3A',
            },
          },
        },
      },
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
