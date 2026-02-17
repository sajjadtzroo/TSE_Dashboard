/**
 * Banks Hooks
 */

import { useQuery } from '@tanstack/react-query';
import { banksService } from '../../services/loans';
import type { Bank, LoanType } from '../../types';

export const BANKS_QUERY_KEYS = {
  all: ['banks'] as const,
  traditional: ['banks', 'traditional'] as const,
  digital: ['banks', 'digital'] as const,
  detail: (id: string) => ['banks', id] as const,
  loans: (id: string) => ['banks', id, 'loans'] as const,
};

/**
 * Hook to fetch all banks
 */
export function useBanks() {
  return useQuery<Bank[]>({
    queryKey: BANKS_QUERY_KEYS.all,
    queryFn: banksService.getAll,
  });
}

/**
 * Hook to fetch traditional banks
 */
export function useTraditionalBanks() {
  return useQuery<Bank[]>({
    queryKey: BANKS_QUERY_KEYS.traditional,
    queryFn: banksService.getTraditional,
  });
}

/**
 * Hook to fetch digital banks
 */
export function useDigitalBanks() {
  return useQuery<Bank[]>({
    queryKey: BANKS_QUERY_KEYS.digital,
    queryFn: banksService.getDigital,
  });
}

/**
 * Hook to fetch a single bank by ID
 */
export function useBank(id: string) {
  return useQuery<Bank>({
    queryKey: BANKS_QUERY_KEYS.detail(id),
    queryFn: () => banksService.getById(id),
    enabled: !!id,
  });
}

/**
 * Hook to fetch loans for a specific bank
 */
export function useBankLoans(id: string) {
  return useQuery<LoanType[]>({
    queryKey: BANKS_QUERY_KEYS.loans(id),
    queryFn: () => banksService.getLoans(id),
    enabled: !!id,
  });
}
