import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider, DirectionProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { MotionConfig } from 'motion/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { SpotlightProvider } from './components/GlobalSearch';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/spotlight/styles.css';
import 'mantine-datatable/styles.css';
import './global.css';
import rallyTheme from './theme/rallyTheme';
import App from './App';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,       // 60s before data is considered stale
      gcTime: 5 * 60 * 1000,      // 5 min garbage collection
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DirectionProvider initialDirection="rtl">
      <MantineProvider theme={rallyTheme} defaultColorScheme="auto">
        <MotionConfig reducedMotion="user">
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <ModalsProvider>
                <Notifications position="bottom-right" />
                <BrowserRouter>
                  <SpotlightProvider>
                    <App />
                  </SpotlightProvider>
                </BrowserRouter>
              </ModalsProvider>
            </AuthProvider>
          </QueryClientProvider>
        </MotionConfig>
      </MantineProvider>
    </DirectionProvider>
  </React.StrictMode>
);
