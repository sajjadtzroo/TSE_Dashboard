/**
 * Payment Reminders API Service
 */

import api from './api';
import {
  validateData,
  apiResponseSchema,
  userLoanWithScheduleSchema,
  loanListResponseSchema,
  userLoanSchema,
  alertsListResponseSchema,
  paymentCalculationResponseSchema,
} from '../../schemas';
import { z } from 'zod';

// Types
export type LoanType = 'equal_installments' | 'reducing_balance' | 'graduated' | 'balloon' | 'interest_only';
export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'partial';
export type AlertPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface PaymentScheduleItem {
  installmentNumber: number;
  dueDate: string;
  dueDateJalali: string;
  principalPayment: string;
  interestPayment: string;
  totalPayment: string;
  remainingBalance: string;
  status: PaymentStatus;
  paidDate?: string;
  paidAmount?: string;
}

export interface UserLoan {
  id: string;
  userId: string;
  loanName: string;
  loanNameFA?: string;
  bankName?: string;
  bankNameFA?: string;
  principalAmount: string;
  interestRate: string;
  loanType: LoanType;
  totalInstallments: number;
  startDate: string;
  paymentDay: number;
  description?: string;
  notes?: string;
  monthlyPayment: string;
  totalPayment: string;
  totalInterest: string;
  paidInstallments: number;
  remainingInstallments: number;
  nextPaymentDate?: string;
  nextPaymentDateJalali?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserLoanWithSchedule extends UserLoan {
  paymentSchedule: PaymentScheduleItem[];
}

export interface LoanListResponse {
  total: number;
  active: number;
  completed: number;
  loans: UserLoan[];
}

export interface PaymentAlert {
  id: string;
  loanId: string;
  loanName: string;
  loanNameFA?: string;
  bankName?: string;
  bankNameFA?: string;
  installmentNumber: number;
  dueDate: string;
  dueDateJalali: string;
  amount: string;
  daysUntilDue: number;
  priority: AlertPriority;
  status: PaymentStatus;
  message: string;
  messageFA: string;
}

export interface AlertsListResponse {
  total: number;
  urgent: number;
  upcoming: number;
  overdue: number;
  alerts: PaymentAlert[];
}

export interface CreateLoanRequest {
  userId: string;
  loanName: string;
  loanNameFA?: string;
  bankName?: string;
  bankNameFA?: string;
  principalAmount: string;
  interestRate: string;
  loanType?: LoanType;
  totalInstallments: number;
  startDate: string;
  paymentDay: number;
  description?: string;
  notes?: string;
}

export interface UpdateLoanRequest {
  loanName?: string;
  loanNameFA?: string;
  bankName?: string;
  bankNameFA?: string;
  principalAmount?: string;
  interestRate?: string;
  loanType?: LoanType;
  totalInstallments?: number;
  startDate?: string;
  paymentDay?: number;
  description?: string;
  notes?: string;
  isActive?: boolean;
}

export interface PaymentCalculationRequest {
  principalAmount: string;
  interestRate: string;
  totalInstallments: number;
  loanType?: LoanType;
  startDate?: string;
  paymentDay?: number;
}

export interface PaymentCalculationResponse {
  monthlyPayment: string;
  totalPayment: string;
  totalInterest: string;
  effectiveRate: string;
  paymentSchedule: PaymentScheduleItem[];
}

export const remindersService = {
  /**
   * Create a new loan
   */
  createLoan: async (data: CreateLoanRequest): Promise<UserLoanWithSchedule> => {
    const response = await api.post('/reminders/loans', data);
    const validated = validateData(
      apiResponseSchema(userLoanWithScheduleSchema),
      response.data,
      'reminders.createLoan'
    );
    return validated.data;
  },

  /**
   * Get all loans for a user
   */
  getLoans: async (userId: string, activeOnly: boolean = true): Promise<LoanListResponse> => {
    const response = await api.get('/reminders/loans', {
      params: { userId, activeOnly }
    });
    const validated = validateData(
      apiResponseSchema(loanListResponseSchema),
      response.data,
      'reminders.getLoans'
    );
    return validated.data;
  },

  /**
   * Get a specific loan by ID
   */
  getLoan: async (loanId: string, includeSchedule: boolean = true): Promise<UserLoanWithSchedule> => {
    const response = await api.get(`/reminders/loans/${loanId}`, {
      params: { includeSchedule }
    });
    const validated = validateData(
      apiResponseSchema(userLoanWithScheduleSchema),
      response.data,
      'reminders.getLoan'
    );
    return validated.data;
  },

  /**
   * Update a loan
   */
  updateLoan: async (loanId: string, data: UpdateLoanRequest): Promise<UserLoan> => {
    const response = await api.put(`/reminders/loans/${loanId}`, data);
    const validated = validateData(
      apiResponseSchema(userLoanSchema),
      response.data,
      'reminders.updateLoan'
    );
    return validated.data;
  },

  /**
   * Delete a loan
   */
  deleteLoan: async (loanId: string, hardDelete: boolean = false): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/reminders/loans/${loanId}`, {
      params: { hardDelete }
    });
    const deleteResponseSchema = z.object({
      success: z.boolean(),
      message: z.string(),
    });
    const validated = validateData(
      apiResponseSchema(deleteResponseSchema),
      response.data,
      'reminders.deleteLoan'
    );
    return validated.data;
  },

  /**
   * Mark a payment as paid
   */
  markPaymentPaid: async (
    loanId: string,
    installmentNumber: number,
    paidAmount?: string,
    paidDate?: string
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/reminders/loans/${loanId}/payments/${installmentNumber}/pay`, null, {
      params: { paidAmount, paidDate }
    });
    const paymentResponseSchema = z.object({
      success: z.boolean(),
      message: z.string(),
    });
    const validated = validateData(
      apiResponseSchema(paymentResponseSchema),
      response.data,
      'reminders.markPaymentPaid'
    );
    return validated.data;
  },

  /**
   * Get payment alerts for a user
   */
  getAlerts: async (userId: string, daysAhead: number = 30): Promise<AlertsListResponse> => {
    const response = await api.get('/reminders/alerts', {
      params: { userId, daysAhead }
    });
    const validated = validateData(
      apiResponseSchema(alertsListResponseSchema),
      response.data,
      'reminders.getAlerts'
    );
    return validated.data;
  },

  /**
   * Calculate payment schedule without saving
   */
  calculatePayment: async (data: PaymentCalculationRequest): Promise<PaymentCalculationResponse> => {
    const response = await api.post('/reminders/calculate', data);
    const validated = validateData(
      apiResponseSchema(paymentCalculationResponseSchema),
      response.data,
      'reminders.calculatePayment'
    );
    return validated.data;
  },
};

export default remindersService;
