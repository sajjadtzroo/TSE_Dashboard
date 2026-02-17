/**
 * Test Utilities
 * Helper functions for testing React components
 */

import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Custom render function with providers
 * Wraps component with Router and React Query providers
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialRoute?: string;
  queryClient?: QueryClient;
}

export function renderWithProviders(
  ui: ReactElement,
  {
    initialRoute = '/',
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    }),
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  // Set initial route
  window.history.pushState({}, 'Test page', initialRoute);

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>{children}</BrowserRouter>
      </QueryClientProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}

/**
 * Wait for async updates
 * Useful for waiting for state updates or async effects
 */
export const wait = (ms: number = 0) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Mock console methods to suppress expected errors in tests
 */
export function suppressConsole() {
  const originalError = console.error;
  const originalWarn = console.warn;

  beforeAll(() => {
    console.error = vi.fn();
    console.warn = vi.fn();
  });

  afterAll(() => {
    console.error = originalError;
    console.warn = originalWarn;
  });
}

/**
 * Create mock API response
 */
export function createMockApiResponse<T>(data: T, delay = 0) {
  return new Promise<T>((resolve) => {
    setTimeout(() => resolve(data), delay);
  });
}

/**
 * Create mock API error
 */
export function createMockApiError(message: string, status = 500, delay = 0) {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject({
        response: {
          data: { message },
          status,
        },
      });
    }, delay);
  });
}

// Re-export everything from @testing-library/react
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
export { vi } from 'vitest';
