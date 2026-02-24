import { createTheme } from '@mantine/core';
import {
  RALLY_GREEN,
  RALLY_DARK_GREEN,
  RALLY_RED,
  RALLY_YELLOW,
  RALLY_PURPLE,
  RALLY_BLUE,
  RALLY_PRIMARY,
  RALLY_DARK_PRIMARY,
  BG_DEFAULT,
  BG_CARD,
  BG_ELEVATED,
  BG_HOVER,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_DIMMED,
  BORDER_SUBTLE,
  GLASS_BG,
  GLASS_BORDER,
  GLASS_SHADOW,
  GLASS_BLUR,
} from './rallyColors';

// Generate 10-shade tuples from a base color (index 6 = main shade)
function generateShades(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const lighten = (amt) =>
    '#' +
    [r, g, b]
      .map((c) =>
        Math.min(255, Math.round(c + (255 - c) * amt))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('');

  const darken = (amt) =>
    '#' +
    [r, g, b]
      .map((c) =>
        Math.max(0, Math.round(c * (1 - amt)))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('');

  return [
    lighten(0.85), // 0 - lightest
    lighten(0.7),  // 1
    lighten(0.55), // 2
    lighten(0.4),  // 3
    lighten(0.25), // 4
    lighten(0.1),  // 5
    hex,           // 6 - base
    darken(0.12),  // 7
    darken(0.25),  // 8
    darken(0.4),   // 9 - darkest
  ];
}

const rallyTheme = createTheme({
  primaryColor: 'rally-primary',
  primaryShade: 6,
  defaultRadius: 'md',
  cursorType: 'pointer',

  fontFamily: "'PELAK', 'Poppins', sans-serif",
  headings: {
    fontFamily: "'PELAK', 'Poppins', sans-serif",
    fontWeight: '700',
  },

  colors: {
    'rally-green': generateShades(RALLY_GREEN),
    'rally-red': generateShades(RALLY_RED),
    'rally-orange': generateShades(RALLY_RED),  // alias for compatibility
    'rally-yellow': generateShades(RALLY_YELLOW),
    'rally-purple': generateShades(RALLY_PURPLE),
    'rally-blue': generateShades(RALLY_BLUE),
    'rally-primary': generateShades(RALLY_PRIMARY),
    dark: [
      TEXT_PRIMARY,   // 0 - text
      '#CBD5E1',      // 1 - slate-300
      TEXT_SECONDARY,  // 2 - slate-400
      TEXT_DIMMED,     // 3 - slate-500
      '#475569',      // 4 - slate-600
      BG_ELEVATED,    // 5 - elevated surface
      BG_CARD,        // 6 - card surface
      '#0F1118',      // 7 - between bg and card
      BG_DEFAULT,     // 8 - page background
      '#070A0F',      // 9 - deepest
    ],
  },

  components: {
    Card: {
      defaultProps: {
        withBorder: true,
        radius: 'md',
      },
      styles: () => ({
        root: {
          backgroundColor: 'var(--rally-glass-bg)',
          backdropFilter: GLASS_BLUR,
          borderColor: 'var(--rally-glass-border)',
          boxShadow: 'var(--rally-glass-shadow)',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.3s ease',
        },
      }),
    },
    Paper: {
      styles: () => ({
        root: {
          backgroundColor: 'var(--rally-bg-card)',
        },
      }),
    },
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
    NavLink: {
      styles: () => ({
        root: {
          borderRadius: 'var(--mantine-radius-md)',
          marginBottom: 4,
          transition: 'background-color 0.15s ease, color 0.15s ease',
        },
      }),
    },
    Table: {},
    AppShell: {
      styles: () => ({
        main: {
          backgroundColor: 'var(--rally-bg-default)',
          transition: 'background-color 0.3s ease',
        },
        header: {
          backgroundColor: 'var(--rally-bg-card)',
          borderBottomColor: 'var(--rally-border-subtle)',
          transition: 'background-color 0.3s ease',
        },
        navbar: {
          backgroundColor: 'var(--rally-bg-card)',
          borderInlineEndColor: 'var(--rally-border-subtle)',
          transition: 'background-color 0.3s ease',
        },
      }),
    },
    Select: {
      defaultProps: {
        radius: 'md',
      },
    },
    TextInput: {
      defaultProps: {
        radius: 'md',
      },
    },
    Badge: {
      defaultProps: {
        radius: 'sm',
      },
    },
    Menu: {
      styles: () => ({
        dropdown: {
          backgroundColor: 'var(--rally-bg-elevated)',
          borderColor: 'var(--rally-border-subtle)',
        },
      }),
    },
    Tabs: {},
    SegmentedControl: {
      styles: () => ({
        root: {
          backgroundColor: 'rgba(156, 163, 175, 0.06)',
        },
      }),
    },
    Alert: {
      defaultProps: {
        radius: 'md',
      },
    },
    Notification: {
      defaultProps: {
        radius: 'md',
      },
    },
    Modal: {
      styles: () => ({
        content: {
          backgroundColor: 'var(--rally-bg-card)',
        },
        header: {
          backgroundColor: 'var(--rally-bg-card)',
        },
      }),
    },
    Tooltip: {
      styles: () => ({
        tooltip: {
          backgroundColor: 'var(--rally-bg-elevated)',
          color: 'var(--rally-text-primary)',
          borderColor: 'var(--rally-border-subtle)',
        },
      }),
    },
  },

  other: {
    rallyGreen: RALLY_GREEN,
    rallyDarkGreen: RALLY_DARK_GREEN,
    rallyRed: RALLY_RED,
    rallyOrange: RALLY_RED,
    rallyYellow: RALLY_YELLOW,
    rallyPurple: RALLY_PURPLE,
    rallyBlue: RALLY_BLUE,
    rallyPrimary: RALLY_PRIMARY,
    rallyDarkPrimary: RALLY_DARK_PRIMARY,
    bgDefault: BG_DEFAULT,
    bgCard: BG_CARD,
    bgElevated: BG_ELEVATED,
    bgHover: BG_HOVER,
  },
});

export default rallyTheme;
