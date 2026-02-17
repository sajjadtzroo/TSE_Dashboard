/**
 * Reminders Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  remindersService,
  CreateLoanRequest,
  UpdateLoanRequest,
  PaymentCalculationRequest,
} from '../../services/loans';

export const REMINDERS_QUERY_KEYS = {
  loans: (userId: string) => ['reminders', 'loans', userId] as const,
  loanDetail: (loanId: string) => ['reminders', 'loans', 'detail', loanId] as const,
  alerts: (userId: string) => ['reminders', 'alerts', userId] as const,
  calculate: ['reminders', 'calculate'] as const,
};

/**
 * Hook to fetch user loans
 */
export function useUserLoans(userId: string, activeOnly: boolean = true) {
  return useQuery({
    queryKey: REMINDERS_QUERY_KEYS.loans(userId),
    queryFn: () => remindersService.getLoans(userId, activeOnly),
    enabled: !!userId,
  });
}

/**
 * Hook to fetch a single loan with schedule
 */
export function useLoanDetail(loanId: string) {
  return useQuery({
    queryKey: REMINDERS_QUERY_KEYS.loanDetail(loanId),
    queryFn: () => remindersService.getLoan(loanId, true),
    enabled: !!loanId,
  });
}

/**
 * Hook to fetch payment alerts
 */
export function usePaymentAlerts(userId: string, daysAhead: number = 30) {
  return useQuery({
    queryKey: REMINDERS_QUERY_KEYS.alerts(userId),
    queryFn: () => remindersService.getAlerts(userId, daysAhead),
    enabled: !!userId,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}

/**
 * Hook to create a new loan
 */
export function useCreateLoan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLoanRequest) => remindersService.createLoan(data),
    onSuccess: (_, variables) => {
      // Invalidate loans list for this user
      queryClient.invalidateQueries({
        queryKey: REMINDERS_QUERY_KEYS.loans(variables.userId),
      });
      // Invalidate alerts
      queryClient.invalidateQueries({
        queryKey: REMINDERS_QUERY_KEYS.alerts(variables.userId),
      });
    },
  });
}

/**
 * Hook to update a loan
 */
export function useUpdateLoan(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ loanId, data }: { loanId: string; data: UpdateLoanRequest }) =>
      remindersService.updateLoan(loanId, data),
    onSuccess: (_, variables) => {
      // Invalidate specific loan
      queryClient.invalidateQueries({
        queryKey: REMINDERS_QUERY_KEYS.loanDetail(variables.loanId),
      });
      // Invalidate loans list
      queryClient.invalidateQueries({
        queryKey: REMINDERS_QUERY_KEYS.loans(userId),
      });
    },
  });
}

/**
 * Hook to delete a loan
 */
export function useDeleteLoan(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ loanId, hardDelete }: { loanId: string; hardDelete?: boolean }) =>
      remindersService.deleteLoan(loanId, hardDelete),
    onSuccess: () => {
      // Invalidate loans list
      queryClient.invalidateQueries({
        queryKey: REMINDERS_QUERY_KEYS.loans(userId),
      });
      // Invalidate alerts
      queryClient.invalidateQueries({
        queryKey: REMINDERS_QUERY_KEYS.alerts(userId),
      });
    },
  });
}

/**
 * Hook to mark a payment as paid
 */
export function useMarkPaymentPaid(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      loanId,
      installmentNumber,
      paidAmount,
      paidDate,
    }: {
      loanId: string;
      installmentNumber: number;
      paidAmount?: string;
      paidDate?: string;
    }) => remindersService.markPaymentPaid(loanId, installmentNumber, paidAmount, paidDate),
    onSuccess: (_, variables) => {
      // Invalidate specific loan
      queryClient.invalidateQueries({
        queryKey: REMINDERS_QUERY_KEYS.loanDetail(variables.loanId),
      });
      // Invalidate loans list
      queryClient.invalidateQueries({
        queryKey: REMINDERS_QUERY_KEYS.loans(userId),
      });
      // Invalidate alerts
      queryClient.invalidateQueries({
        queryKey: REMINDERS_QUERY_KEYS.alerts(userId),
      });
    },
  });
}

/**
 * Hook to calculate payment schedule (preview only)
 */
export function useCalculatePayment() {
  return useMutation({
    mutationFn: (data: PaymentCalculationRequest) => remindersService.calculatePayment(data),
  });
}
