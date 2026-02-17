import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MantineProvider } from '@mantine/core'
import { ModalsProvider } from '@mantine/modals'
import { Notifications } from '@mantine/notifications'
import { ErrorBoundary } from './components/ErrorBoundary'
import { RTLProvider } from './theme/RTLProvider'
import rallyTheme from './theme/rallyTheme'
import { QUERY_STALE_TIME, QUERY_RETRY_COUNT } from './constants/app.constants'
import App from './App'

import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import 'mantine-datatable/styles.css'
import './theme/rallyOverrides.css'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_STALE_TIME,
      refetchOnWindowFocus: false,
      retry: QUERY_RETRY_COUNT,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <RTLProvider>
        <MantineProvider theme={rallyTheme} defaultColorScheme="dark">
          <ModalsProvider>
            <Notifications position="top-left" />
            <QueryClientProvider client={queryClient}>
              <App />
            </QueryClientProvider>
          </ModalsProvider>
        </MantineProvider>
      </RTLProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
