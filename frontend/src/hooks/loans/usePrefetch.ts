/**
 * Prefetch Hook
 * Prefetches lazy-loaded route components on link hover for faster navigation
 */

import { useCallback } from 'react';

type LazyComponent = () => Promise<{ default: React.ComponentType<any> }>;

const prefetchedModules = new Set<string>();

/**
 * Prefetches a lazy-loaded component
 * @param lazyComponent - The lazy component to prefetch
 * @param id - Unique identifier for the component
 */
export function usePrefetch() {
  const prefetch = useCallback((lazyComponent: LazyComponent, id: string) => {
    // Only prefetch once per component
    if (prefetchedModules.has(id)) {
      return;
    }

    prefetchedModules.add(id);

    // Start loading the component
    lazyComponent().catch((error) => {
      console.warn(`Failed to prefetch ${id}:`, error);
      // Remove from set so it can be retried
      prefetchedModules.delete(id);
    });
  }, []);

  const createPrefetchHandler = useCallback(
    (lazyComponent: LazyComponent, id: string) => {
      return () => prefetch(lazyComponent, id);
    },
    [prefetch]
  );

  return { prefetch, createPrefetchHandler };
}

/**
 * Map of route paths to their lazy components
 * Used for easy prefetching from navigation links
 */
export const routePrefetchMap = {
  '/dashboard/loans': () => import('../../pages/loans/LoanDashboard'),
  '/dashboard/loans/banks': () => import('../../pages/loans/LoanBanks'),
  '/dashboard/loans/list': () => import('../../pages/loans/LoansList'),
  '/dashboard/loans/compare': () => import('../../pages/loans/LoanCompare'),
  '/dashboard/loans/analytics': () => import('../../pages/loans/LoanAnalytics'),
  '/dashboard/loans/calculator': () => import('../../pages/loans/LoanCalculator'),
  '/dashboard/loans/calculators': () => import('../../pages/loans/LoanCalculators'),
  '/dashboard/loans/import': () => import('../../pages/loans/LoanImport'),
  '/dashboard/loans/my-loans': () => import('../../pages/loans/MyLoans'),
} as const;

export type RoutePath = keyof typeof routePrefetchMap;
