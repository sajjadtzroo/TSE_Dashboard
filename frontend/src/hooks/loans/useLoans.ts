/**
 * Loans Hooks
 */

import { useQuery } from '@tanstack/react-query';
import { loansService, type LoanFilters } from '../../services/loans/loans.service';
import type { LoanWithBank } from '../../types';

export const LOANS_QUERY_KEYS = {
  all: ['loans'] as const,
  filtered: (filters: LoanFilters) => ['loans', filters] as const,
  noGuarantor: ['loans', 'no-guarantor'] as const,
  byMethod: (method: string) => ['loans', 'method', method] as const,
};

/**
 * Hook to fetch all loans with optional filters
 */
export function useLoans(filters?: LoanFilters) {
  return useQuery<LoanWithBank[]>({
    queryKey: filters ? LOANS_QUERY_KEYS.filtered(filters) : LOANS_QUERY_KEYS.all,
    queryFn: () => loansService.getAll(filters),
  });
}

/**
 * Hook to fetch loans without guarantor requirement
 */
export function useNoGuarantorLoans() {
  return useQuery<LoanWithBank[]>({
    queryKey: LOANS_QUERY_KEYS.noGuarantor,
    queryFn: loansService.getNoGuarantor,
  });
}

/**
 * Hook to fetch loans by calculation method
 */
export function useLoansByMethod(method: string) {
  return useQuery<LoanWithBank[]>({
    queryKey: LOANS_QUERY_KEYS.byMethod(method),
    queryFn: () => loansService.getByMethod(method),
    enabled: !!method,
  });
}
