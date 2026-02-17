import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

/**
 * Vite plugin to strip the inline React Refresh preamble <script type="module">
 * that @vitejs/plugin-react injects into <head>.
 * Codespaces CSP blocks inline scripts, causing a white page.
 * Our boot-diag.js (external script) already provides the preamble globals.
 */
function stripInlineRefreshPreamble(): Plugin {
  return {
    name: 'strip-inline-refresh-preamble',
    transformIndexHtml(html) {
      // Remove the inline <script type="module"> that contains the React Refresh preamble
      return html.replace(
        /<script type="module">import\s*\{[^}]*\}\s*from\s*"\/\@react-refresh"[\s\S]*?<\/script>\s*/,
        ''
      );
    },
  };
}

export default defineConfig({
  base: '/loans/',
  plugins: [react(), stripInlineRefreshPreamble()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    // HMR: auto-detect Codespaces (HTTPS/WSS on 443) vs local dev
    hmr: process.env.CODESPACES
      ? {
          clientPort: 443,
          protocol: 'wss' as const,
          host: process.env.CODESPACE_NAME
            ? `${process.env.CODESPACE_NAME}-5173.app.github.dev`
            : undefined,
        }
      : true,
    // Fix file watching in Docker/Codespaces/WSL
    watch: {
      usePolling: true, // Enable polling for file changes
      interval: 100, // Poll every 100ms
    },
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
        // Enable WebSocket upgrades for the proxy
        ws: true,
        // Configure timeout for WebSocket
        timeout: 60000,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
})
