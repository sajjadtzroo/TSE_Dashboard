import { createTheme } from '@mantine/core';
import {
  RALLY_GREEN,
  RALLY_DARK_GREEN,
  RALLY_ORANGE,
  RALLY_YELLOW,
  RALLY_PURPLE,
  RALLY_BLUE,
  BG_DEFAULT,
  BG_CARD,
  BG_ELEVATED,
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
  primaryColor: 'rally-green',
  primaryShade: 6,
  defaultRadius: 'md',
  cursorType: 'pointer',

  fontFamily: "'Poppins', sans-serif",
  headings: {
    fontFamily: "'Poppins', sans-serif",
    fontWeight: '700',
  },

  colors: {
    'rally-green': generateShades(RALLY_GREEN),
    'rally-orange': generateShades(RALLY_ORANGE),
    'rally-yellow': generateShades(RALLY_YELLOW),
    'rally-purple': generateShades(RALLY_PURPLE),
    'rally-blue': generateShades(RALLY_BLUE),
    dark: [
      '#EEEEEE', // 0 - text
      '#C8C8C8', // 1
      '#A0A0A0', // 2
      '#6b7280', // 3
      '#4a5060', // 4
      BG_ELEVATED, // 5 - elevated surface
      BG_CARD,     // 6 - card surface
      '#0d0d0d',   // 7 - between bg and card
      BG_DEFAULT,  // 8 - page background
      '#000000',   // 9 - deepest
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
          backgroundColor: BG_CARD,
          borderColor: 'rgba(238,238,238,0.06)',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            borderColor: 'rgba(238,238,238,0.12)',
          },
        },
      }),
    },
    Paper: {
      styles: () => ({
        root: {
          backgroundColor: BG_CARD,
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
          '&[data-active]': {
            backgroundColor: `rgba(118, 171, 174, 0.12)`,
            color: RALLY_GREEN,
          },
        },
      }),
    },
    Table: {
      styles: () => ({
        table: {
          '& thead tr th': {
            borderBottomColor: 'rgba(238,238,238,0.08)',
            color: 'rgba(238,238,238,0.5)',
          },
          '& tbody tr td': {
            borderBottomColor: 'rgba(238,238,238,0.05)',
          },
        },
      }),
    },
    AppShell: {
      styles: () => ({
        main: {
          backgroundColor: BG_DEFAULT,
        },
        header: {
          backgroundColor: BG_CARD,
          borderBottomColor: 'rgba(238,238,238,0.06)',
        },
        navbar: {
          backgroundColor: BG_CARD,
          borderInlineEndColor: 'rgba(238,238,238,0.06)',
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
          backgroundColor: BG_ELEVATED,
          borderColor: 'rgba(238,238,238,0.08)',
        },
      }),
    },
    Tabs: {
      styles: () => ({
        tab: {
          '&[data-active]': {
            borderColor: RALLY_GREEN,
            color: RALLY_GREEN,
          },
        },
      }),
    },
    SegmentedControl: {
      styles: () => ({
        root: {
          backgroundColor: 'rgba(238,238,238,0.04)',
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
  },

  other: {
    rallyGreen: RALLY_GREEN,
    rallyDarkGreen: RALLY_DARK_GREEN,
    rallyOrange: RALLY_ORANGE,
    rallyYellow: RALLY_YELLOW,
    rallyPurple: RALLY_PURPLE,
    rallyBlue: RALLY_BLUE,
    bgDefault: BG_DEFAULT,
    bgCard: BG_CARD,
    bgElevated: BG_ELEVATED,
  },
});

export default rallyTheme;
