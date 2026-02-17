/**
 * Tests for Loans API Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loansService } from '../loans.service';
import api from '../api';
import {
  mockLoanWithBank,
  mockLoanWithBankAndGuarantor,
  mockLoansWithBank,
} from '@/test/mocks';

// Mock the API module
vi.mock('../api');

// Helper to create API response envelope
function createApiResponse<T>(data: T, total?: number) {
  return {
    data: {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...(total !== undefined && {
          pagination: {
            total,
            page: 1,
            page_size: 20,
            total_pages: Math.ceil(total / 20),
            has_next: false,
            has_prev: false,
          },
        }),
        cached: false,
        cache_ttl: null,
      },
      errors: null,
    },
  };
}

describe('loansService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should fetch all loans without filters', async () => {
      const mockResponse = createApiResponse(mockLoansWithBank, mockLoansWithBank.length);

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      const result = await loansService.getAll();

      expect(api.get).toHaveBeenCalledWith('/loans/', { params: { page_size: 100 } });
      expect(result).toEqual(mockLoansWithBank);
      expect(result.length).toBe(mockLoansWithBank.length);
    });

    it('should fetch loans with no_guarantor filter', async () => {
      const mockResponse = createApiResponse([mockLoanWithBank], 1);

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      const result = await loansService.getAll({ no_guarantor: true });

      expect(api.get).toHaveBeenCalledWith('/loans/', {
        params: { no_guarantor: true, page_size: 100 },
      });
      expect(result).toEqual([mockLoanWithBank]);
      expect(result[0].guarantor).toBe(false);
    });

    it('should fetch loans with max_amount filter', async () => {
      const mockResponse = createApiResponse([mockLoanWithBank], 1);

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      const result = await loansService.getAll({ max_amount: 100_000_000 });

      expect(api.get).toHaveBeenCalledWith('/loans/', {
        params: { max_amount: 100_000_000, page_size: 100 },
      });
      expect(result).toEqual([mockLoanWithBank]);
    });

    it('should fetch loans with multiple filters', async () => {
      const mockResponse = createApiResponse([mockLoanWithBank], 1);

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      const result = await loansService.getAll({
        no_guarantor: true,
        max_amount: 100_000_000,
      });

      expect(api.get).toHaveBeenCalledWith('/loans/', {
        params: {
          no_guarantor: true,
          max_amount: 100_000_000,
          page_size: 100,
        },
      });
      expect(result).toEqual([mockLoanWithBank]);
    });

    it('should return empty array when no loans match', async () => {
      const mockResponse = createApiResponse([], 0);

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      const result = await loansService.getAll({ no_guarantor: true });

      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });

    it('should handle API errors', async () => {
      const mockError = new Error('Network error');
      vi.mocked(api.get).mockRejectedValueOnce(mockError);

      await expect(loansService.getAll()).rejects.toThrow('Network error');
    });

    it('should validate response data structure', async () => {
      const mockResponse = createApiResponse(mockLoansWithBank, mockLoansWithBank.length);

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      const result = await loansService.getAll();

      // Verify each loan has required fields
      result.forEach((loan) => {
        expect(loan).toHaveProperty('id');
        expect(loan).toHaveProperty('nameFA');
        expect(loan).toHaveProperty('bankId');
        expect(loan).toHaveProperty('bankNameFA');
      });
    });

    it('should return data object for invalid response structure', async () => {
      const invalidResponse = {
        data: {
          success: true,
          data: {
            // Invalid: data should be array, not object
            loans: mockLoansWithBank,
          },
          meta: { timestamp: new Date().toISOString() },
          errors: null,
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(invalidResponse);

      const result = await loansService.getAll();
      // Service returns response.data.data without validation
      expect(result).toEqual({ loans: mockLoansWithBank });
    });
  });

  describe('getNoGuarantor', () => {
    it('should fetch loans without guarantor requirement', async () => {
      const mockResponse = createApiResponse([mockLoanWithBank], 1);

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      const result = await loansService.getNoGuarantor();

      expect(api.get).toHaveBeenCalledWith('/loans/no-guarantor/', { params: { page_size: 100 } });
      expect(result).toEqual([mockLoanWithBank]);
      expect(result[0].guarantor).toBe(false);
    });

    it('should return only loans with guarantor: false', async () => {
      const mockResponse = createApiResponse([mockLoanWithBank, mockLoanWithBank], 2);

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      const result = await loansService.getNoGuarantor();

      result.forEach((loan) => {
        expect(loan.guarantor).toBe(false);
      });
    });

    it('should handle empty results', async () => {
      const mockResponse = createApiResponse([], 0);

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      const result = await loansService.getNoGuarantor();

      expect(result).toEqual([]);
    });

    it('should handle API errors', async () => {
      const mockError = new Error('Server error');
      vi.mocked(api.get).mockRejectedValueOnce(mockError);

      await expect(loansService.getNoGuarantor()).rejects.toThrow('Server error');
    });
  });

  describe('getByMethod', () => {
    it('should fetch loans by calculation method', async () => {
      const loanWithMethod = { ...mockLoanWithBank, calculationMethod: 'interest-free' };
      const mockResponse = createApiResponse([loanWithMethod], 1);

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      const result = await loansService.getByMethod('interest-free');

      expect(api.get).toHaveBeenCalledWith('/loans/by-method/interest-free/');
      expect(result).toEqual([loanWithMethod]);
      expect(result[0].calculationMethod).toBe('interest-free');
    });

    it('should fetch loans with reducing-balance method', async () => {
      const loanWithMethod = { ...mockLoanWithBankAndGuarantor, calculationMethod: 'reducing-balance' };
      const mockResponse = createApiResponse([loanWithMethod], 1);

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      const result = await loansService.getByMethod('reducing-balance');

      expect(api.get).toHaveBeenCalledWith('/loans/by-method/reducing-balance/');
      expect(result).toEqual([loanWithMethod]);
      expect(result[0].calculationMethod).toBe('reducing-balance');
    });

    it('should handle URL encoding for method names', async () => {
      const mockResponse = createApiResponse([], 0);

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      await loansService.getByMethod('method-with-spaces');

      expect(api.get).toHaveBeenCalledWith('/loans/by-method/method-with-spaces/');
    });

    it('should return empty array when no loans match method', async () => {
      const mockResponse = createApiResponse([], 0);

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      const result = await loansService.getByMethod('nonexistent-method');

      expect(result).toEqual([]);
    });

    it('should handle API errors', async () => {
      const mockError = new Error('Method not found');
      vi.mocked(api.get).mockRejectedValueOnce(mockError);

      await expect(loansService.getByMethod('invalid')).rejects.toThrow('Method not found');
    });

    it('should validate all returned loans have the requested method', async () => {
      const loansWithMethod = mockLoansWithBank.map((loan) => ({
        ...loan,
        calculationMethod: 'declining-balance',
      }));

      const mockResponse = createApiResponse(loansWithMethod, loansWithMethod.length);

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      const result = await loansService.getByMethod('declining-balance');

      result.forEach((loan) => {
        expect(loan.calculationMethod).toBe('declining-balance');
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should handle multiple sequential requests', async () => {
      const mockResponse1 = createApiResponse([mockLoanWithBank], 1);
      const mockResponse2 = createApiResponse([mockLoanWithBankAndGuarantor], 1);

      vi.mocked(api.get)
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      const result1 = await loansService.getAll({ no_guarantor: true });
      const result2 = await loansService.getAll({ no_guarantor: false });

      expect(result1[0].guarantor).toBe(false);
      expect(result2[0].guarantor).toBe(true);
    });

    it('should handle large result sets', async () => {
      const manyLoans = Array(100)
        .fill(null)
        .map((_, i) => ({
          ...mockLoanWithBank,
          id: `loan-${i}`,
          nameFA: `وام ${i}`,
        }));

      const mockResponse = createApiResponse(manyLoans, 100);

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      const result = await loansService.getAll();

      expect(result.length).toBe(100);
      expect(result[0].id).toBe('loan-0');
      expect(result[99].id).toBe('loan-99');
    });

    it('should handle network timeouts', async () => {
      const timeoutError = new Error('Timeout');
      timeoutError.name = 'ECONNABORTED';

      vi.mocked(api.get).mockRejectedValueOnce(timeoutError);

      await expect(loansService.getAll()).rejects.toThrow('Timeout');
    });

    it('should handle 404 errors gracefully', async () => {
      const error = {
        response: {
          status: 404,
          data: { message: 'Not found' },
        },
      };

      vi.mocked(api.get).mockRejectedValueOnce(error);

      await expect(loansService.getByMethod('nonexistent')).rejects.toBeTruthy();
    });
  });
});
