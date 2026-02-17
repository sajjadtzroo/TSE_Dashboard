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
  '/': () => import('../pages/Dashboard'),
  '/banks': () => import('../pages/Banks'),
  '/loans': () => import('../pages/Loans'),
  '/compare': () => import('../pages/Compare'),
  '/analytics': () => import('../pages/Analytics'),
  '/calculator': () => import('../pages/Calculator'),
  '/calculators': () => import('../pages/Calculators'),
  '/loan-optimizer': () => import('../features/loan-optimizer/LoanOptimizerPage'),
  '/import': () => import('../pages/Import'),
  '/my-loans': () => import('../pages/MyLoans'),
} as const;

export type RoutePath = keyof typeof routePrefetchMap;
