/**
 * Banks API Service
 */

import api from './api';
import { validateData, apiResponseSchema, bankSchema, loanTypeSchema } from '../schemas';
import type { Bank, LoanType } from '../types';
import { z } from 'zod';

export const banksService = {
  /**
   * Get all banks
   */
  getAll: async (): Promise<Bank[]> => {
    const response = await api.get('/banks/');
    const validated = validateData(
      apiResponseSchema(z.array(bankSchema)),
      response.data,
      'banks.getAll'
    );
    return validated.data as Bank[];
  },

  /**
   * Get traditional banks only
   */
  getTraditional: async (): Promise<Bank[]> => {
    const response = await api.get('/banks/traditional');
    const validated = validateData(
      apiResponseSchema(z.array(bankSchema)),
      response.data,
      'banks.getTraditional'
    );
    return validated.data as Bank[];
  },

  /**
   * Get digital banks only
   */
  getDigital: async (): Promise<Bank[]> => {
    const response = await api.get('/banks/digital');
    const validated = validateData(
      apiResponseSchema(z.array(bankSchema)),
      response.data,
      'banks.getDigital'
    );
    return validated.data as Bank[];
  },

  /**
   * Get bank by ID
   */
  getById: async (id: string): Promise<Bank> => {
    const response = await api.get(`/banks/${id}`);
    const validated = validateData(
      apiResponseSchema(bankSchema),
      response.data,
      'banks.getById'
    );
    return validated.data as Bank;
  },

  /**
   * Get loans for a specific bank
   */
  getLoans: async (id: string): Promise<LoanType[]> => {
    const response = await api.get(`/banks/${id}/loans`);
    const loansResponseSchema = z.object({
      bankId: z.string().optional(),
      bankNameFA: z.string().optional(),
      bankNameEN: z.string().optional(),
      loans: z.array(loanTypeSchema),
    }).passthrough();
    const validated = validateData(
      apiResponseSchema(loansResponseSchema),
      response.data,
      'banks.getLoans'
    );
    return validated.data.loans || [];
  },
};

export default banksService;
