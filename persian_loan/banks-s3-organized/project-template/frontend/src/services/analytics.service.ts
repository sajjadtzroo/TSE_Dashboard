/**
 * Analytics API Service
 */

import api from './api';
import {
  validateData,
  apiResponseSchema,
  summaryStatsSchema,
  categoryDataSchema,
  interestRatesResponseSchema,
  bankAmountsSchema,
  requirementsMatrixResponseSchema,
  type SummaryStats,
  type CategoryData,
  type InterestRatesResponse,
  type BankAmountsResponse,
  type RequirementsMatrixResponse,
} from '../schemas';

export const analyticsService = {
  /**
   * Get summary statistics
   */
  getSummary: async (): Promise<SummaryStats> => {
    const response = await api.get('/analytics/summary/');
    const validated = validateData(
      apiResponseSchema(summaryStatsSchema),
      response.data,
      'analytics.getSummary'
    );
    return validated.data;
  },

  /**
   * Get banks grouped by category
   */
  getByCategory: async (): Promise<CategoryData> => {
    const response = await api.get('/analytics/by-category/');
    const validated = validateData(
      apiResponseSchema(categoryDataSchema),
      response.data,
      'analytics.getByCategory'
    );
    return validated.data;
  },

  /**
   * Get interest rates distribution
   */
  getInterestRates: async (): Promise<InterestRatesResponse> => {
    const response = await api.get('/analytics/interest-rates/');
    const validated = validateData(
      apiResponseSchema(interestRatesResponseSchema),
      response.data,
      'analytics.getInterestRates'
    );
    return validated.data;
  },

  /**
   * Get loan amounts range for each bank
   */
  getLoanAmounts: async (): Promise<BankAmountsResponse> => {
    const response = await api.get('/analytics/loan-amounts/');
    const validated = validateData(
      apiResponseSchema(bankAmountsSchema),
      response.data,
      'analytics.getLoanAmounts'
    );
    return validated.data;
  },

  /**
   * Get requirements matrix for all banks
   */
  getRequirementsMatrix: async (): Promise<RequirementsMatrixResponse> => {
    const response = await api.get('/analytics/requirements-matrix/');
    const validated = validateData(
      apiResponseSchema(requirementsMatrixResponseSchema),
      response.data,
      'analytics.getRequirementsMatrix'
    );
    return validated.data;
  },
};

export default analyticsService;
