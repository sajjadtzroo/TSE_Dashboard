/**
 * Loans API Service
 */

import api from './api';
import type { LoanWithBank } from '../../types';

export interface LoanFilters {
  no_guarantor?: boolean;
  max_amount?: number;
}

export const loansService = {
  /**
   * Get all loans with optional filters
   */
  getAll: async (params?: LoanFilters): Promise<LoanWithBank[]> => {
    const response = await api.get('/list', {
      params: {
        ...params,
        page_size: 100 // Fetch up to 100 loans (API maximum)
      }
    });
    // API returns standardized envelope: { success, data, meta, errors }
    return response.data.data || [];
  },

  /**
   * Get loans without guarantor requirement
   */
  getNoGuarantor: async (): Promise<LoanWithBank[]> => {
    const response = await api.get('/no-guarantor', {
      params: { page_size: 100 } // Fetch up to 100 loans (API maximum)
    });
    // API returns standardized envelope: { success, data, meta, errors }
    return response.data.data || [];
  },

  /**
   * Get loans by calculation method
   */
  getByMethod: async (method: string): Promise<LoanWithBank[]> => {
    const response = await api.get(`/by-method/${method}/`);
    // API returns standardized envelope: { success, data, meta, errors }
    return response.data.data || [];
  },
};

export default loansService;
