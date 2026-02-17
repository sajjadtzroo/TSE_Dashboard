/**
 * Hooks Index
 */

// Utility hooks
export { useReducedMotion } from './useReducedMotion';

// Banks hooks
export {
  useBanks,
  useTraditionalBanks,
  useDigitalBanks,
  useBank,
  useBankLoans,
  BANKS_QUERY_KEYS,
} from './useBanks';

// Loans hooks
export {
  useLoans,
  useNoGuarantorLoans,
  useLoansByMethod,
  LOANS_QUERY_KEYS,
} from './useLoans';

// Analytics hooks
export {
  useSummary,
  useByCategory,
  useInterestRates,
  useLoanAmounts,
  useRequirementsMatrix,
  ANALYTICS_QUERY_KEYS,
} from './useAnalytics';

// Reminders hooks
export {
  useUserLoans,
  useLoanDetail,
  usePaymentAlerts,
  useCreateLoan,
  useUpdateLoan,
  useDeleteLoan,
  useMarkPaymentPaid,
  useCalculatePayment,
  REMINDERS_QUERY_KEYS,
} from './useReminders';
