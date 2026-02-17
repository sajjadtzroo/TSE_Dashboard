/**
 * Material UI Theme Configuration
 *
 * Configures MUI theme to match existing Tailwind design:
 * - Dark theme with #121212 base
 * - Primary color: #BB86FC (purple)
 * - Secondary color: #03DAC5 (teal)
 * - RTL direction for Persian
 * - Vazirmatn font family
 */

import { createTheme } from '@mui/material/styles';
import { faIR } from '@mui/material/locale';
import type {} from '@mui/x-data-grid/themeAugmentation';

declare module '@mui/material/styles' {
  interface Palette {
    surface: {
      main: string;
      elevated: string;
      dark: string;
    };
  }
  interface PaletteOptions {
    surface?: {
      main?: string;
      elevated?: string;
      dark?: string;
    };
  }
}

// Create RTL-compatible MUI theme matching the existing design system
export const muiTheme = createTheme(
  {
    direction: 'rtl', // Enable RTL support
    palette: {
      mode: 'dark',
      primary: {
        main: '#BB86FC', // Primary 400
        light: '#c9a7ff', // Primary 300
        dark: '#a855f7', // Primary 500
        contrastText: '#000000',
      },
      secondary: {
        main: '#03DAC5', // Secondary 500
        light: '#4dfff0', // Secondary 300
        dark: '#00b3a1', // Secondary 600
        contrastText: '#000000',
      },
      error: {
        main: '#CF6679', // Error 500
        light: '#ff839b', // Error 400
        dark: '#b94a5e', // Error 600
        contrastText: '#000000',
      },
      background: {
        default: '#121212', // Surface 100
        paper: '#121212', // Surface 100
      },
      surface: {
        main: '#121212',
        elevated: '#1a1a1a',
        dark: '#0f0f0f',
      },
      text: {
        primary: '#e5e5e5', // Gray 100
        secondary: '#cccccc', // Gray 200
        disabled: '#999999', // Gray 400
      },
      divider: '#3d3d3d', // Border light
      action: {
        active: '#BB86FC',
        hover: 'rgba(187, 134, 252, 0.08)',
        selected: 'rgba(187, 134, 252, 0.16)',
        disabled: 'rgba(229, 229, 229, 0.3)',
        disabledBackground: 'rgba(229, 229, 229, 0.12)',
        focus: 'rgba(187, 134, 252, 0.12)',
      },
    },
    typography: {
      fontFamily: 'Vazirmatn, system-ui, sans-serif',
      fontSize: 14,
      fontWeightLight: 300,
      fontWeightRegular: 400,
      fontWeightMedium: 500,
      fontWeightBold: 700,
      h1: {
        fontSize: '2.5rem',
        fontWeight: 700,
        lineHeight: 1.2,
        color: '#f9f9f9',
      },
      h2: {
        fontSize: '2rem',
        fontWeight: 700,
        lineHeight: 1.3,
        color: '#f9f9f9',
      },
      h3: {
        fontSize: '1.75rem',
        fontWeight: 600,
        lineHeight: 1.4,
        color: '#f9f9f9',
      },
      h4: {
        fontSize: '1.5rem',
        fontWeight: 600,
        lineHeight: 1.4,
        color: '#e5e5e5',
      },
      h5: {
        fontSize: '1.25rem',
        fontWeight: 600,
        lineHeight: 1.5,
        color: '#e5e5e5',
      },
      h6: {
        fontSize: '1rem',
        fontWeight: 600,
        lineHeight: 1.5,
        color: '#e5e5e5',
      },
      subtitle1: {
        fontSize: '1rem',
        fontWeight: 400,
        lineHeight: 1.75,
        color: '#cccccc',
      },
      subtitle2: {
        fontSize: '0.875rem',
        fontWeight: 500,
        lineHeight: 1.57,
        color: '#cccccc',
      },
      body1: {
        fontSize: '1rem',
        fontWeight: 400,
        lineHeight: 1.5,
        color: '#e5e5e5',
      },
      body2: {
        fontSize: '0.875rem',
        fontWeight: 400,
        lineHeight: 1.43,
        color: '#cccccc',
      },
      button: {
        fontSize: '0.875rem',
        fontWeight: 500,
        lineHeight: 1.75,
        textTransform: 'none',
      },
      caption: {
        fontSize: '0.75rem',
        fontWeight: 400,
        lineHeight: 1.66,
        color: '#999999',
      },
      overline: {
        fontSize: '0.75rem',
        fontWeight: 500,
        lineHeight: 2.66,
        textTransform: 'uppercase',
        color: '#999999',
      },
    },
  shape: {
    borderRadius: 8,
  },
  shadows: [
    'none',
    '0 1px 3px 0 rgba(0, 0, 0, 0.5), 0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    '0 1px 3px 0 rgba(0, 0, 0, 0.5), 0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
    '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
    '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
    '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
    '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
    '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
    '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: '#3d3d3d #121212',
          '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
            width: 8,
            height: 8,
          },
          '&::-webkit-scrollbar-track, & *::-webkit-scrollbar-track': {
            background: '#121212',
          },
          '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
            backgroundColor: '#3d3d3d',
            borderRadius: 4,
          },
          '&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover': {
            backgroundColor: '#525252',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 500,
          padding: '8px 16px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
          },
        },
        containedPrimary: {
          backgroundColor: '#BB86FC',
          color: '#000000',
          '&:hover': {
            backgroundColor: '#c9a7ff',
          },
        },
        containedSecondary: {
          backgroundColor: '#03DAC5',
          color: '#000000',
          '&:hover': {
            backgroundColor: '#4dfff0',
          },
        },
        outlined: {
          borderColor: '#3d3d3d',
          color: '#e5e5e5',
          '&:hover': {
            borderColor: '#BB86FC',
            backgroundColor: 'rgba(187, 134, 252, 0.08)',
          },
        },
        text: {
          color: '#BB86FC',
          '&:hover': {
            backgroundColor: 'rgba(187, 134, 252, 0.08)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#121212',
          backgroundImage: 'none',
          borderRadius: 8,
          border: '1px solid #3d3d3d',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#121212',
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.5)',
        },
        elevation2: {
          boxShadow: '0 2px 4px 0 rgba(0, 0, 0, 0.5)',
        },
        elevation3: {
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
        },
        elevation4: {
          boxShadow: '0 6px 8px -2px rgba(0, 0, 0, 0.5)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#121212',
          backgroundImage: 'none',
          borderBottom: '1px solid #3d3d3d',
          boxShadow: 'none',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#121212',
          backgroundImage: 'none',
          borderLeft: '1px solid #3d3d3d',
          borderRight: 'none',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: '#3d3d3d',
            },
            '&:hover fieldset': {
              borderColor: '#BB86FC',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#BB86FC',
            },
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#3d3d3d',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#BB86FC',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#BB86FC',
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        icon: {
          color: '#e5e5e5',
        },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: '1px solid #3d3d3d',
          backgroundColor: '#121212',
          '& .MuiDataGrid-cell': {
            borderBottom: '1px solid #2d2d2d',
            color: '#e5e5e5',
          },
          '& .MuiDataGrid-columnHeaders': {
            borderBottom: '1px solid #3d3d3d',
            backgroundColor: '#1a1a1a',
          },
          '& .MuiDataGrid-columnHeaderTitle': {
            fontWeight: 600,
            color: '#f9f9f9',
          },
          '& .MuiDataGrid-row': {
            '&:hover': {
              backgroundColor: 'rgba(187, 134, 252, 0.08)',
            },
            '&.Mui-selected': {
              backgroundColor: 'rgba(187, 134, 252, 0.16)',
              '&:hover': {
                backgroundColor: 'rgba(187, 134, 252, 0.24)',
              },
            },
          },
          '& .MuiDataGrid-footerContainer': {
            borderTop: '1px solid #3d3d3d',
            backgroundColor: '#1a1a1a',
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          margin: '4px 0',
          '&.Mui-selected': {
            backgroundColor: '#BB86FC',
            color: '#ffffff',
            boxShadow: '0 0 20px rgba(187, 134, 252, 0.3)',
            '&:hover': {
              backgroundColor: '#a855f7',
            },
            '& .MuiListItemIcon-root': {
              color: '#ffffff',
            },
          },
          '&:hover': {
            backgroundColor: '#2d2d2d',
          },
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          color: '#b3b3b3',
          minWidth: '40px',
        },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: {
          fontSize: '0.875rem',
          fontWeight: 500,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
        standardError: {
          backgroundColor: 'rgba(207, 102, 121, 0.2)',
          color: '#CF6679',
          border: '1px solid rgba(207, 102, 121, 0.4)',
        },
        standardWarning: {
          backgroundColor: 'rgba(255, 193, 7, 0.2)',
          color: '#ffb300',
          border: '1px solid rgba(255, 193, 7, 0.4)',
        },
        standardInfo: {
          backgroundColor: 'rgba(3, 218, 197, 0.2)',
          color: '#03DAC5',
          border: '1px solid rgba(3, 218, 197, 0.4)',
        },
        standardSuccess: {
          backgroundColor: 'rgba(76, 175, 80, 0.2)',
          color: '#66bb6a',
          border: '1px solid rgba(76, 175, 80, 0.4)',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#1a1a1a',
          color: '#e5e5e5',
          border: '1px solid #3d3d3d',
          fontSize: '0.875rem',
        },
        arrow: {
          color: '#1a1a1a',
          '&::before': {
            border: '1px solid #3d3d3d',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: '#121212',
          backgroundImage: 'none',
          border: '1px solid #3d3d3d',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid #2d2d2d',
          color: '#e5e5e5',
        },
        head: {
          backgroundColor: '#1a1a1a',
          color: '#f9f9f9',
          fontWeight: 600,
          borderBottom: '2px solid #3d3d3d',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(187, 134, 252, 0.08)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(187, 134, 252, 0.16)',
            '&:hover': {
              backgroundColor: 'rgba(187, 134, 252, 0.24)',
            },
          },
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: '#3d3d3d',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          color: '#cccccc',
          '&.Mui-selected': {
            color: '#BB86FC',
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: '#BB86FC',
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          color: '#999999',
          '&.Mui-checked': {
            color: '#BB86FC',
            '& + .MuiSwitch-track': {
              backgroundColor: '#BB86FC',
              opacity: 0.5,
            },
          },
        },
        track: {
          backgroundColor: '#666666',
          opacity: 0.5,
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: '#999999',
          '&.Mui-checked': {
            color: '#BB86FC',
          },
        },
      },
    },
    MuiRadio: {
      styleOverrides: {
        root: {
          color: '#999999',
          '&.Mui-checked': {
            color: '#BB86FC',
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          backgroundColor: '#2d2d2d',
        },
        bar: {
          backgroundColor: '#BB86FC',
        },
      },
    },
    MuiCircularProgress: {
      styleOverrides: {
        root: {
          color: '#BB86FC',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: '#b3b3b3',
          '&:hover': {
            backgroundColor: '#2d2d2d',
            color: '#BB86FC',
          },
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: '64px',
          '@media (min-width: 600px)': {
            minHeight: '64px',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          backgroundColor: '#1a1a1a',
          color: '#e5e5e5',
          borderColor: '#3d3d3d',
          fontWeight: 500,
          borderRadius: '9999px',
        },
        filled: {
          '&.MuiChip-colorPrimary': {
            backgroundColor: 'rgba(187, 134, 252, 0.2)',
            color: '#BB86FC',
          },
          '&.MuiChip-colorSecondary': {
            backgroundColor: 'rgba(3, 218, 197, 0.2)',
            color: '#03DAC5',
          },
        },
        outlined: {
          borderColor: '#3d3d3d',
          '&.MuiChip-colorPrimary': {
            borderColor: '#BB86FC',
            color: '#BB86FC',
          },
          '&.MuiChip-colorSecondary': {
            borderColor: '#03DAC5',
            color: '#03DAC5',
          },
        },
        sizeSmall: {
          fontSize: '0.75rem',
          height: '24px',
          padding: '0 8px',
        },
        sizeMedium: {
          fontSize: '0.875rem',
          height: '28px',
          padding: '0 10px',
        },
      },
      variants: [
        {
          props: { color: 'primary' },
          style: {
            backgroundColor: 'rgba(55, 0, 179, 0.3)',
            color: '#BB86FC',
            borderColor: 'rgba(124, 34, 206, 0.5)',
          },
        },
        {
          props: { color: 'secondary' },
          style: {
            backgroundColor: 'rgba(0, 102, 89, 0.3)',
            color: '#03DAC5',
            borderColor: 'rgba(0, 140, 125, 0.5)',
          },
        },
        {
          props: { color: 'error' },
          style: {
            backgroundColor: 'rgba(118, 7, 28, 0.3)',
            color: '#CF6679',
            borderColor: 'rgba(163, 51, 72, 0.5)',
          },
        },
        {
          props: { color: 'warning' },
          style: {
            backgroundColor: 'rgba(120, 53, 15, 0.3)',
            color: '#fbbf24',
            borderColor: 'rgba(180, 83, 9, 0.5)',
          },
        },
        {
          props: { color: 'success' },
          style: {
            backgroundColor: 'rgba(0, 102, 89, 0.3)',
            color: '#03DAC5',
            borderColor: 'rgba(0, 140, 125, 0.5)',
          },
        },
        {
          props: { color: 'default' },
          style: {
            backgroundColor: 'rgba(45, 45, 45, 0.5)',
            color: '#b3b3b3',
            borderColor: 'rgba(102, 102, 102, 0.5)',
          },
        },
      ],
    },
    MuiBadge: {
      styleOverrides: {
        badge: {
          fontWeight: 600,
          fontSize: '0.75rem',
          minWidth: '20px',
          height: '20px',
          padding: '0 6px',
        },
        colorPrimary: {
          backgroundColor: '#BB86FC',
          color: '#ffffff',
        },
        colorSecondary: {
          backgroundColor: '#03DAC5',
          color: '#000000',
        },
        colorError: {
          backgroundColor: '#CF6679',
          color: '#ffffff',
        },
      },
    },
  },
}, faIR); // Persian locale
