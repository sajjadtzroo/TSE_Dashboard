import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { compression } from 'vite-plugin-compression2'
import path from 'path'

/** Injects <link rel="preload"> for all emitted CSS chunks at build time. */
function cssPreloadPlugin() {
  return {
    name: 'css-preload',
    transformIndexHtml(_html, ctx) {
      if (!ctx.bundle) return;
      const preloads = Object.keys(ctx.bundle)
        .filter((key) => key.endsWith('.css'))
        .map((key) => ({
          tag: 'link',
          attrs: { rel: 'preload', href: `/${key}`, as: 'style' },
          injectTo: 'head-prepend',
        }));
      return preloads;
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    cssPreloadPlugin(),
    // Pre-compress assets as .gz (nginx serves via gzip_static)
    compression({ algorithm: 'gzip', threshold: 1024 }),
    // Pre-compress assets as .br (brotli — ~20-30% smaller than gzip)
    compression({ algorithm: 'brotliCompress', threshold: 1024 }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
      '@features': path.resolve(__dirname, './src/features'),
    }
  },
  build: {
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React — loaded on every page
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Mantine UI — loaded on every page
          'vendor-mantine': [
            '@mantine/core', '@mantine/hooks', '@mantine/modals',
            '@mantine/notifications', '@mantine/spotlight',
          ],
          // Recharts — used on landing hero + dashboard charts
          'vendor-recharts': ['recharts'],
          // KlineCharts — only technical analysis page (heavy, defer)
          'vendor-klinecharts': ['klinecharts'],
          // Motion — landing page animations
          'vendor-motion': ['motion'],
          // TanStack Query — data fetching layer
          'vendor-query': ['@tanstack/react-query'],
          // Markdown rendering — only chat pages
          'vendor-markdown': ['react-markdown', 'react-syntax-highlighter', 'remark-gfm'],
          // Data table — used across dashboard pages
          'vendor-datatable': ['mantine-datatable'],
          // Date utilities — used across the app
          'vendor-dates': ['date-fns-jalali', 'jalaali-js'],
          // Axios — HTTP client
          'vendor-axios': ['axios'],
        },
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
