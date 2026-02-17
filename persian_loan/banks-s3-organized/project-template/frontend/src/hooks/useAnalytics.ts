/**
 * Analytics Hooks
 */

import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services';
import type {
  SummaryStats,
  CategoryData,
  InterestRatesResponse,
  BankAmounts,
  RequirementsMatrixItem,
} from '../types';

export const ANALYTICS_QUERY_KEYS = {
  summary: ['analytics', 'summary'] as const,
  byCategory: ['analytics', 'by-category'] as const,
  interestRates: ['analytics', 'interest-rates'] as const,
  loanAmounts: ['analytics', 'loan-amounts'] as const,
  requirementsMatrix: ['analytics', 'requirements-matrix'] as const,
};

/**
 * Hook to fetch summary statistics
 */
export function useSummary() {
  return useQuery<SummaryStats>({
    queryKey: ANALYTICS_QUERY_KEYS.summary,
    queryFn: analyticsService.getSummary,
  });
}

/**
 * Hook to fetch banks by category
 */
export function useByCategory() {
  return useQuery<CategoryData>({
    queryKey: ANALYTICS_QUERY_KEYS.byCategory,
    queryFn: analyticsService.getByCategory,
  });
}

/**
 * Hook to fetch interest rates distribution
 */
export function useInterestRates() {
  return useQuery<InterestRatesResponse>({
    queryKey: ANALYTICS_QUERY_KEYS.interestRates,
    queryFn: analyticsService.getInterestRates,
  });
}

/**
 * Hook to fetch loan amounts
 */
export function useLoanAmounts() {
  return useQuery<BankAmounts[]>({
    queryKey: ANALYTICS_QUERY_KEYS.loanAmounts,
    queryFn: analyticsService.getLoanAmounts,
  });
}

/**
 * Hook to fetch requirements matrix
 */
export function useRequirementsMatrix() {
  return useQuery<RequirementsMatrixItem[]>({
    queryKey: ANALYTICS_QUERY_KEYS.requirementsMatrix,
    queryFn: analyticsService.getRequirementsMatrix,
  });
}
