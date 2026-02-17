import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ErrorBoundary } from './components/ErrorBoundary'
import { QUERY_STALE_TIME, QUERY_RETRY_COUNT } from './constants/app.constants'
import App from './App'
import './index.css'

// Suppress MUI SSR warnings (we're client-side only, no SSR)
// Safe to suppress in all modes since we never do server-side rendering
const originalWarn = console.warn;
const originalError = console.error;

// Helper function to check if message is the MUI SSR warning
const isMuiSsrWarning = (args: any[]): boolean => {
  const text = args.map(arg => String(arg)).join(' ');
  return (
    (text.includes(':first-child') || text.includes(':first-of-type')) &&
    text.includes('server-side rendering')
  );
};

console.warn = (...args) => {
  if (isMuiSsrWarning(args)) {
    return; // Suppress MUI SSR warning
  }
  originalWarn.apply(console, args);
};

console.error = (...args) => {
  if (isMuiSsrWarning(args)) {
    return; // Suppress MUI SSR warning
  }
  originalError.apply(console, args);
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_STALE_TIME,
      refetchOnWindowFocus: false,
      retry: QUERY_RETRY_COUNT,
    },
  },
})

try {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  )
} catch (err) {
  const root = document.getElementById('root')
  if (root) {
    root.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#121212;flex-direction:column;padding:20px;">' +
      '<div style="color:#CF6679;font-size:18px;font-weight:bold;margin-bottom:12px;">Application Error</div>' +
      '<div style="color:#e5e5e5;font-size:14px;max-width:600px;text-align:center;direction:ltr;font-family:monospace;">' +
      (err instanceof Error ? err.message : String(err)) +
      '</div><button data-reload style="margin-top:20px;padding:10px 24px;background:#BB86FC;color:#000;border:none;border-radius:8px;cursor:pointer;">Reload</button></div>'
  }
  console.error('Fatal mount error:', err)
}
