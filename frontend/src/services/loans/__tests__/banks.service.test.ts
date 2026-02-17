/**
 * Tests for Banks API Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { banksService } from '../banks.service';
import api from '../api';
import { mockBank, mockDigitalBank, mockBankWithLoans, mockBanks } from '@/test/mocks';

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

describe('banksService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should fetch all banks', async () => {
      const mockResponse = createApiResponse(mockBanks, mockBanks.length);

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      const result = await banksService.getAll();

      expect(api.get).toHaveBeenCalledWith('/banks/');
      expect(result).toEqual(mockBanks);
      expect(result.length).toBe(mockBanks.length);
    });

    it('should include both traditional and digital banks', async () => {
      const mockResponse = createApiResponse([mockBank, mockDigitalBank], 2);

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      const result = await banksService.getAll();

      expect(result).toHaveLength(2);
      expect(result.some((b) => b.category === 'traditional-banks')).toBe(true);
      expect(result.some((b) => b.category === 'digital-banks')).toBe(true);
    });

    it('should return empty array when no banks exist', async () => {
      const mockResponse = createApiResponse([], 0);

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      const result = await banksService.getAll();

      expect(result).toEqual([]);
    });

    it('should validate response data structure', async () => {
      const mockResponse = createApiResponse(mockBanks, mockBanks.length);

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      const result = await banksService.getAll();

      // Verify each bank has required fields
      result.forEach((bank) => {
        expect(bank).toHaveProperty('id');
        expect(bank).toHaveProperty('nameFA');
        expect(bank).toHaveProperty('nameEN');
        expect(bank).toHaveProperty('category');
      });
    });

    it('should handle API errors', async () => {
      const mockError = new Error('Network error');
      vi.mocked(api.get).mockRejectedValueOnce(mockError);

      await expect(banksService.getAll()).rejects.toThrow('Network error');
    });

    it('should throw validation error for invalid response', async () => {
      const invalidResponse = {
        data: {
          success: true,
          data: {
            // Invalid: data should be array, not object
            banks: mockBanks,
          },
          meta: { timestamp: new Date().toISOString() },
          errors: null,
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(invalidResponse);

      await expect(banksService.getAll()).rejects.toThrow();
    });
  });

  describe('getTraditional', () => {
    it('should fetch only traditional banks', async () => {
      const traditionalBanks = [mockBank];
      const mockResponse = createApiResponse(traditionalBanks, traditionalBanks.length);

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      const result = await banksService.getTraditional();

      expect(api.get).toHaveBeenCalledWith('/banks/traditional');
      expect(result).toEqual(traditionalBanks);
      expect(result.every((b) => b.category === 'traditional-banks')).toBe(true);
    });

    it('should return empty array when no traditional banks exist', async () => {
      const mockResponse = createApiResponse([], 0);

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      const result = await banksService.getTraditional();

      expect(result).toEqual([]);
    });

    it('should handle API errors', async () => {
      const mockError = new Error('Network error');
      vi.mocked(api.get).mockRejectedValueOnce(mockError);

      await expect(banksService.getTraditional()).rejects.toThrow('Network error');
    });
  });

  describe('getDigital', () => {
    it('should fetch only digital banks', async () => {
      const digitalBanks = [mockDigitalBank];
      const mockResponse = createApiResponse(digitalBanks, digitalBanks.length);

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      const result = await banksService.getDigital();

      expect(api.get).toHaveBeenCalledWith('/banks/digital');
      expect(result).toEqual(digitalBanks);
      expect(result.every((b) => b.category === 'digital-banks')).toBe(true);
    });

    it('should return empty array when no digital banks exist', async () => {
      const mockResponse = createApiResponse([], 0);

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      const result = await banksService.getDigital();

      expect(result).toEqual([]);
    });

    it('should handle API errors', async () => {
      const mockError = new Error('Network error');
      vi.mocked(api.get).mockRejectedValueOnce(mockError);

      await expect(banksService.getDigital()).rejects.toThrow('Network error');
    });
  });

  describe('getById', () => {
    it('should fetch bank by ID', async () => {
      const mockResponse = createApiResponse(mockBank);

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      const result = await banksService.getById('test-bank');

      expect(api.get).toHaveBeenCalledWith('/banks/test-bank');
      expect(result).toEqual(mockBank);
    });

    it('should handle API errors', async () => {
      const mockError = new Error('Bank not found');
      vi.mocked(api.get).mockRejectedValueOnce(mockError);

      await expect(banksService.getById('nonexistent')).rejects.toThrow('Bank not found');
    });
  });

  describe('getLoans', () => {
    it('should fetch loans for a bank', async () => {
      const loansData = {
        bankId: 'test-bank',
        bankNameFA: mockBankWithLoans.nameFA,
        bankNameEN: mockBankWithLoans.nameEN,
        loans: mockBankWithLoans.loanTypes || [],
      };
      const mockResponse = createApiResponse(loansData);

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      const result = await banksService.getLoans('test-bank');

      expect(api.get).toHaveBeenCalledWith('/banks/test-bank/loans');
      expect(result).toEqual(mockBankWithLoans.loanTypes || []);
    });

    it('should return empty array when bank has no loans', async () => {
      const loansData = {
        bankId: 'test-bank',
        bankNameFA: 'بانک تست',
        bankNameEN: 'Test Bank',
        loans: [],
      };
      const mockResponse = createApiResponse(loansData);

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      const result = await banksService.getLoans('test-bank');

      expect(result).toEqual([]);
    });

    it('should handle API errors', async () => {
      const mockError = new Error('Network error');
      vi.mocked(api.get).mockRejectedValueOnce(mockError);

      await expect(banksService.getLoans('test-bank')).rejects.toThrow('Network error');
    });
  });
});
