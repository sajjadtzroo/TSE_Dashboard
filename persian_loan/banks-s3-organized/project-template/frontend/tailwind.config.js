/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Vazirmatn', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Primary - Purple (#BB86FC)
        primary: {
          50: '#f5f0ff',
          100: '#ede5ff',
          200: '#dcc8ff',
          300: '#c9a7ff',
          400: '#BB86FC', // Main primary
          500: '#a855f7',
          600: '#9333ea',
          700: '#7c22ce',
          800: '#3700B3', // Primary variant
          900: '#2e0099',
        },
        // Secondary - Teal (#03DAC5)
        secondary: {
          50: '#e6fffe',
          100: '#b3fff9',
          200: '#80fff4',
          300: '#4dfff0',
          400: '#1affeb',
          500: '#03DAC5', // Main secondary
          600: '#00b3a1',
          700: '#008c7d',
          800: '#006659',
          900: '#004035',
        },
        // Surface colors for dark theme - #121212 base
        surface: {
          50: '#2d2d2d',   // Lighter elevated surfaces
          100: '#121212',  // Main surface/cards (#121212)
          200: '#0f0f0f',  // Slightly darker
          300: '#0d0d0d',  // Darker
          400: '#0a0a0a',  // Even darker
          500: '#080808',  // Very dark
          600: '#060606',  // Almost black
          700: '#040404',  // Nearly black
          800: '#020202',  // Closest to black
          900: '#000000',  // Pure black
        },
        // Error - Pink (#CF6679)
        error: {
          50: '#fff0f3',
          100: '#ffe0e6',
          200: '#ffc1cd',
          300: '#ffa2b4',
          400: '#ff839b',
          500: '#CF6679', // Main error
          600: '#b94a5e',
          700: '#a33348',
          800: '#8c1d32',
          900: '#76071c',
        },
        // Improved gray scale for better text readability
        gray: {
          50: '#f9f9f9',   // Lightest (headings)
          100: '#e5e5e5',  // Very light (primary text)
          200: '#cccccc',  // Light (secondary text)
          300: '#b3b3b3',  // Medium light (labels)
          400: '#999999',  // Medium (muted text)
          500: '#808080',  // Mid gray
          600: '#666666',  // Dark muted
          700: '#4d4d4d',  // Darker
          800: '#333333',  // Very dark
          900: '#1a1a1a',  // Darkest
        },
        // Border colors for better visibility on #121212
        border: {
          light: '#3d3d3d',    // Lighter borders for cards
          DEFAULT: '#2d2d2d',  // Default border
          dark: '#1a1a1a',     // Subtle borders
          accent: '#BB86FC33', // Primary accent border (20% opacity)
          highlight: '#BB86FC66', // Stronger accent (40% opacity)
        },
      },
      backgroundColor: {
        dark: '#121212',
        'dark-surface': '#121212',
        'dark-elevated': '#1a1a1a',
      },
      boxShadow: {
        'dark': '0 1px 3px 0 rgba(0, 0, 0, 0.5), 0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        'dark-md': '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
        'dark-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
        'dark-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
        'glow': '0 0 20px rgba(187, 134, 252, 0.3)',
        'glow-sm': '0 0 10px rgba(187, 134, 252, 0.2)',
      },
      borderColor: {
        DEFAULT: '#3d3d3d',
      },
      width: {
        '18': '4.5rem', // 72px for collapsed sidebar
      },
      maxWidth: {
        'content': '1600px', // For 2xl+ screens
      },
    },
  },
  plugins: [],
}
