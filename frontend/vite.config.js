import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
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
  plugins: [react(), cssPreloadPlugin()],
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
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-mantine': ['@mantine/core', '@mantine/hooks', '@mantine/modals', '@mantine/notifications', '@mantine/spotlight'],
          'vendor-charts': ['recharts', 'lightweight-charts'],
          'vendor-motion': ['motion'],
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
