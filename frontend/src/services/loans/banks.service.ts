/**
 * Banks API Service
 * Backend returns camelCase data in {success, data, meta, errors} envelope.
 */

import api from './api';
import type { Bank, LoanType } from '../../types';

/**
 * Extract data from API envelope {success, data, ...}.
 * Falls back to raw response if not wrapped.
 */
function unwrap(responseData: any): any {
  if (responseData?.success != null && 'data' in responseData) {
    return responseData.data;
  }
  return responseData;
}

export const banksService = {
  /**
   * Get all banks
   */
  getAll: async (): Promise<Bank[]> => {
    const response = await api.get('/banks/');
    const data = unwrap(response.data);
    return Array.isArray(data) ? data : [];
  },

  /**
   * Get traditional banks only
   */
  getTraditional: async (): Promise<Bank[]> => {
    const response = await api.get('/banks/traditional');
    const data = unwrap(response.data);
    return Array.isArray(data) ? data : [];
  },

  /**
   * Get digital banks only
   */
  getDigital: async (): Promise<Bank[]> => {
    const response = await api.get('/banks/digital');
    const data = unwrap(response.data);
    return Array.isArray(data) ? data : [];
  },

  /**
   * Get bank by ID
   */
  getById: async (id: string): Promise<Bank> => {
    const response = await api.get(`/banks/${id}`);
    return unwrap(response.data) as Bank;
  },

  /**
   * Get loans for a specific bank
   */
  getLoans: async (id: string): Promise<LoanType[]> => {
    const response = await api.get(`/banks/${id}/loans`);
    const data = unwrap(response.data);
    // Backend returns {bankId, bankNameFA, bankNameEN, loans: [...]}
    return data?.loans || (Array.isArray(data) ? data : []);
  },
};

export default banksService;
