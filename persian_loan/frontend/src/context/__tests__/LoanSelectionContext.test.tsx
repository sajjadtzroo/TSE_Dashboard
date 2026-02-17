/**
 * Tests for LoanSelectionContext
 * تست‌های Context انتخاب وام
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoanSelectionProvider, useLoanSelection } from '../LoanSelectionContext';
import { MAX_LOAN_SELECTION, STORAGE_KEYS, STORAGE_VERSION } from '@/constants/app.constants';
import type { LoanType, LoanWithBank } from '@/types';
import { ReactNode } from 'react';

// Mock loan data for testing
const mockLoan1: LoanType = {
  id: 'loan-1',
  nameFA: 'وام مسکن',
  nameEN: 'Housing Loan',
  interestRate: '18%',
  maxAmount: '500M',
};

const mockLoan2: LoanType = {
  id: 'loan-2',
  nameFA: 'وام خودرو',
  nameEN: 'Car Loan',
  interestRate: '20%',
  maxAmount: '200M',
};

const mockLoan3: LoanType = {
  id: 'loan-3',
  nameFA: 'وام تحصیلی',
  nameEN: 'Education Loan',
  interestRate: '15%',
  maxAmount: '100M',
};

const mockLoan4: LoanType = {
  id: 'loan-4',
  nameFA: 'وام کسب و کار',
  nameEN: 'Business Loan',
  interestRate: '22%',
  maxAmount: '1B',
};

const mockLoan5: LoanType = {
  id: 'loan-5',
  nameFA: 'وام فوری',
  nameEN: 'Emergency Loan',
  interestRate: '25%',
  maxAmount: '50M',
};

const mockLoanWithBank: LoanWithBank = {
  id: 'loan-bank-1',
  nameFA: 'وام قرض‌الحسنه',
  nameEN: 'Interest-Free Loan',
  bankId: 'bank-1',
  bankNameFA: 'بانک ملی',
  bankCategory: 'traditional-banks',
  interestRate: '0%',
  maxAmount: '150M',
};

describe('LoanSelectionContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Provider Rendering - رندر کردن Provider', () => {
    it('should render children correctly', () => {
      render(
        <LoanSelectionProvider>
          <div>Test Content</div>
        </LoanSelectionProvider>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should render multiple children correctly', () => {
      render(
        <LoanSelectionProvider>
          <div>Child 1</div>
          <div>Child 2</div>
          <div>Child 3</div>
        </LoanSelectionProvider>
      );

      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
      expect(screen.getByText('Child 3')).toBeInTheDocument();
    });

    it('should not crash with null children', () => {
      expect(() => {
        render(<LoanSelectionProvider>{null}</LoanSelectionProvider>);
      }).not.toThrow();
    });
  });

  describe('Default State - وضعیت پیش‌فرض', () => {
    it('should have empty selectedLoans by default', () => {
      const { result } = renderHook(() => useLoanSelection(), {
        wrapper: LoanSelectionProvider,
      });

      expect(result.current.selectedLoans).toEqual([]);
    });

    it('should have selectionCount of 0 by default', () => {
      const { result } = renderHook(() => useLoanSelection(), {
        wrapper: LoanSelectionProvider,
      });

      expect(result.current.selectionCount).toBe(0);
    });

    it('should have canSelectMore as true by default', () => {
      const { result } = renderHook(() => useLoanSelection(), {
        wrapper: LoanSelectionProvider,
      });

      expect(result.current.canSelectMore).toBe(true);
    });

    it('should have maxSelection equal to MAX_LOAN_SELECTION constant', () => {
      const { result } = renderHook(() => useLoanSelection(), {
        wrapper: LoanSelectionProvider,
      });

      expect(result.current.maxSelection).toBe(MAX_LOAN_SELECTION);
    });
  });

  describe('toggleLoan Function - تابع تغییر وضعیت وام', () => {
    it('should add loan to selection when not selected', () => {
      const { result } = renderHook(() => useLoanSelection(), {
        wrapper: LoanSelectionProvider,
      });

      act(() => {
        result.current.toggleLoan(mockLoan1);
      });

      expect(result.current.selectedLoans).toContainEqual(mockLoan1);
      expect(result.current.selectionCount).toBe(1);
    });

    it('should remove loan from selection when already selected', () => {
      const { result } = renderHook(() => useLoanSelection(), {
        wrapper: LoanSelectionProvider,
      });

      act(() => {
        result.current.toggleLoan(mockLoan1);
      });

      expect(result.current.selectedLoans).toContainEqual(mockLoan1);

      act(() => {
        result.current.toggleLoan(mockLoan1);
      });

      expect(result.current.selectedLoans).not.toContainEqual(mockLoan1);
      expect(result.current.selectionCount).toBe(0);
    });

    it('should add multiple different loans', () => {
      const { result } = renderHook(() => useLoanSelection(), {
        wrapper: LoanSelectionProvider,
      });

      act(() => {
        result.current.toggleLoan(mockLoan1);
        result.current.toggleLoan(mockLoan2);
        result.current.toggleLoan(mockLoan3);
      });

      expect(result.current.selectedLoans).toHaveLength(3);
      expect(result.current.selectedLoans).toContainEqual(mockLoan1);
      expect(result.current.selectedLoans).toContainEqual(mockLoan2);
      expect(result.current.selectedLoans).toContainEqual(mockLoan3);
    });

    it('should respect MAX_LOAN_SELECTION limit', () => {
      const { result } = renderHook(() => useLoanSelection(), {
        wrapper: LoanSelectionProvider,
      });

      act(() => {
        result.current.toggleLoan(mockLoan1);
        result.current.toggleLoan(mockLoan2);
        result.current.toggleLoan(mockLoan3);
        result.current.toggleLoan(mockLoan4);
      });

      expect(result.current.selectedLoans).toHaveLength(MAX_LOAN_SELECTION);

      // Try to add one more (should be ignored)
      act(() => {
        result.current.toggleLoan(mockLoan5);
      });

      expect(result.current.selectedLoans).toHaveLength(MAX_LOAN_SELECTION);
      expect(result.current.selectedLoans).not.toContainEqual(mockLoan5);
    });

    it('should update canSelectMore when reaching limit', () => {
      const { result } = renderHook(() => useLoanSelection(), {
        wrapper: LoanSelectionProvider,
      });

      // Add loans up to limit
      act(() => {
        result.current.toggleLoan(mockLoan1);
        result.current.toggleLoan(mockLoan2);
        result.current.toggleLoan(mockLoan3);
      });

      expect(result.current.canSelectMore).toBe(true);

      act(() => {
        result.current.toggleLoan(mockLoan4);
      });

      expect(result.current.canSelectMore).toBe(false);
    });

    it('should handle LoanWithBank type correctly', () => {
      const { result } = renderHook(() => useLoanSelection(), {
        wrapper: LoanSelectionProvider,
      });

      act(() => {
        result.current.toggleLoan(mockLoanWithBank);
      });

      expect(result.current.selectedLoans).toContainEqual(mockLoanWithBank);
      expect(result.current.selectionCount).toBe(1);
    });

    it('should allow removal when at max capacity', () => {
      const { result } = renderHook(() => useLoanSelection(), {
        wrapper: LoanSelectionProvider,
      });

      // Fill to capacity
      act(() => {
        result.current.toggleLoan(mockLoan1);
        result.current.toggleLoan(mockLoan2);
        result.current.toggleLoan(mockLoan3);
        result.current.toggleLoan(mockLoan4);
      });

      expect(result.current.canSelectMore).toBe(false);

      // Remove one
      act(() => {
        result.current.toggleLoan(mockLoan2);
      });

      expect(result.current.selectedLoans).toHaveLength(3);
      expect(result.current.canSelectMore).toBe(true);
    });
  });

  describe('isLoanSelected Function - تابع بررسی انتخاب وام', () => {
    it('should return false for unselected loan', () => {
      const { result } = renderHook(() => useLoanSelection(), {
        wrapper: LoanSelectionProvider,
      });

      expect(result.current.isLoanSelected('loan-1')).toBe(false);
    });

    it('should return true for selected loan', () => {
      const { result } = renderHook(() => useLoanSelection(), {
        wrapper: LoanSelectionProvider,
      });

      act(() => {
        result.current.toggleLoan(mockLoan1);
      });

      expect(result.current.isLoanSelected('loan-1')).toBe(true);
    });

    it('should return false after loan is deselected', () => {
      const { result } = renderHook(() => useLoanSelection(), {
        wrapper: LoanSelectionProvider,
      });

      act(() => {
        result.current.toggleLoan(mockLoan1);
      });

      expect(result.current.isLoanSelected('loan-1')).toBe(true);

      act(() => {
        result.current.toggleLoan(mockLoan1);
      });

      expect(result.current.isLoanSelected('loan-1')).toBe(false);
    });

    it('should handle multiple selected loans correctly', () => {
      const { result } = renderHook(() => useLoanSelection(), {
        wrapper: LoanSelectionProvider,
      });

      act(() => {
        result.current.toggleLoan(mockLoan1);
        result.current.toggleLoan(mockLoan2);
        result.current.toggleLoan(mockLoan3);
      });

      expect(result.current.isLoanSelected('loan-1')).toBe(true);
      expect(result.current.isLoanSelected('loan-2')).toBe(true);
      expect(result.current.isLoanSelected('loan-3')).toBe(true);
      expect(result.current.isLoanSelected('loan-4')).toBe(false);
    });
  });

  describe('clearSelection Function - تابع پاک کردن انتخاب‌ها', () => {
    it('should clear all selected loans', () => {
      const { result } = renderHook(() => useLoanSelection(), {
        wrapper: LoanSelectionProvider,
      });

      act(() => {
        result.current.toggleLoan(mockLoan1);
        result.current.toggleLoan(mockLoan2);
        result.current.toggleLoan(mockLoan3);
      });

      expect(result.current.selectedLoans).toHaveLength(3);

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedLoans).toHaveLength(0);
      expect(result.current.selectionCount).toBe(0);
    });

    it('should reset canSelectMore to true after clearing', () => {
      const { result } = renderHook(() => useLoanSelection(), {
        wrapper: LoanSelectionProvider,
      });

      // Fill to capacity
      act(() => {
        result.current.toggleLoan(mockLoan1);
        result.current.toggleLoan(mockLoan2);
        result.current.toggleLoan(mockLoan3);
        result.current.toggleLoan(mockLoan4);
      });

      expect(result.current.canSelectMore).toBe(false);

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.canSelectMore).toBe(true);
    });

    it('should handle clearing empty selection gracefully', () => {
      const { result } = renderHook(() => useLoanSelection(), {
        wrapper: LoanSelectionProvider,
      });

      expect(() => {
        act(() => {
          result.current.clearSelection();
        });
      }).not.toThrow();

      expect(result.current.selectedLoans).toHaveLength(0);
    });
  });

  describe('localStorage Persistence - ذخیره در localStorage', () => {
    it('should persist selected loans to localStorage', async () => {
      const { result } = renderHook(() => useLoanSelection(), {
        wrapper: LoanSelectionProvider,
      });

      act(() => {
        result.current.toggleLoan(mockLoan1);
        result.current.toggleLoan(mockLoan2);
      });

      // Wait for useEffect to run
      await waitFor(() => {
        const stored = localStorage.getItem(STORAGE_KEYS.LOAN_SELECTION);
        expect(stored).toBeTruthy();
        if (stored) {
          const parsed = JSON.parse(stored);
          expect(parsed).toHaveLength(2);
        }
      });
    });

    it('should persist version to localStorage', async () => {
      const { result } = renderHook(() => useLoanSelection(), {
        wrapper: LoanSelectionProvider,
      });

      act(() => {
        result.current.toggleLoan(mockLoan1);
      });

      await waitFor(() => {
        const version = localStorage.getItem(STORAGE_KEYS.LOAN_SELECTION_VERSION);
        expect(version).toBe(STORAGE_VERSION.LOAN_SELECTION);
      });
    });

    it('should load selected loans from localStorage on mount', () => {
      // Pre-populate localStorage
      const storedLoans = [mockLoan1, mockLoan2];
      localStorage.setItem(STORAGE_KEYS.LOAN_SELECTION, JSON.stringify(storedLoans));
      localStorage.setItem(STORAGE_KEYS.LOAN_SELECTION_VERSION, STORAGE_VERSION.LOAN_SELECTION);

      const { result } = renderHook(() => useLoanSelection(), {
        wrapper: LoanSelectionProvider,
      });

      expect(result.current.selectedLoans).toHaveLength(2);
      expect(result.current.selectionCount).toBe(2);
    });

    it('should clear old version data from localStorage', () => {
      // Set old version
      localStorage.setItem(STORAGE_KEYS.LOAN_SELECTION, JSON.stringify([mockLoan1]));
      localStorage.setItem(STORAGE_KEYS.LOAN_SELECTION_VERSION, '0.9');

      const { result } = renderHook(() => useLoanSelection(), {
        wrapper: LoanSelectionProvider,
      });

      // Should start with empty selection due to version mismatch
      expect(result.current.selectedLoans).toHaveLength(0);

      // Version should be updated
      const version = localStorage.getItem(STORAGE_KEYS.LOAN_SELECTION_VERSION);
      expect(version).toBe(STORAGE_VERSION.LOAN_SELECTION);
    });

    it('should handle corrupted localStorage data gracefully', () => {
      // Set invalid JSON
      localStorage.setItem(STORAGE_KEYS.LOAN_SELECTION, '{invalid json');

      // Should not throw and should return empty selection
      expect(() => {
        renderHook(() => useLoanSelection(), {
          wrapper: LoanSelectionProvider,
        });
      }).not.toThrow();

      const { result } = renderHook(() => useLoanSelection(), {
        wrapper: LoanSelectionProvider,
      });

      expect(result.current.selectedLoans).toHaveLength(0);

      // Corrupted data should be removed
      const stored = localStorage.getItem(STORAGE_KEYS.LOAN_SELECTION);
      expect(stored).toBeNull();
    });

    it('should handle non-array data in localStorage', () => {
      // Set non-array data
      localStorage.setItem(STORAGE_KEYS.LOAN_SELECTION, JSON.stringify({ invalid: 'data' }));
      localStorage.setItem(STORAGE_KEYS.LOAN_SELECTION_VERSION, STORAGE_VERSION.LOAN_SELECTION);

      const { result } = renderHook(() => useLoanSelection(), {
        wrapper: LoanSelectionProvider,
      });

      expect(result.current.selectedLoans).toHaveLength(0);
    });

    it('should handle localStorage quota exceeded error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock localStorage.setItem to throw quota error
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error('QuotaExceededError');
      });

      const { result } = renderHook(() => useLoanSelection(), {
        wrapper: LoanSelectionProvider,
      });

      act(() => {
        result.current.toggleLoan(mockLoan1);
      });

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      // Restore
      Storage.prototype.setItem = originalSetItem;
      consoleErrorSpy.mockRestore();
    });

    it('should not persist on first render (initial load)', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

      renderHook(() => useLoanSelection(), {
        wrapper: LoanSelectionProvider,
      });

      // Should not call setItem on mount (only reads)
      // The initial render shouldn't trigger the persistence effect
      expect(setItemSpy).not.toHaveBeenCalledWith(
        STORAGE_KEYS.LOAN_SELECTION,
        expect.any(String)
      );

      setItemSpy.mockRestore();
    });
  });

  describe('Multiple Consumers - چند مصرف‌کننده', () => {
    it('should share state across multiple consumers', () => {
      function Consumer1() {
        const { selectedLoans } = useLoanSelection();
        return <div>Consumer 1: {selectedLoans.length}</div>;
      }

      function Consumer2() {
        const { selectedLoans } = useLoanSelection();
        return <div>Consumer 2: {selectedLoans.length}</div>;
      }

      function Consumer3() {
        const { toggleLoan } = useLoanSelection();
        return (
          <button onClick={() => toggleLoan(mockLoan1)}>
            Add Loan
          </button>
        );
      }

      render(
        <LoanSelectionProvider>
          <Consumer1 />
          <Consumer2 />
          <Consumer3 />
        </LoanSelectionProvider>
      );

      expect(screen.getByText('Consumer 1: 0')).toBeInTheDocument();
      expect(screen.getByText('Consumer 2: 0')).toBeInTheDocument();
    });

    it('should update all consumers when state changes', async () => {
      function Consumer1() {
        const { selectionCount } = useLoanSelection();
        return <div data-testid="count1">{selectionCount}</div>;
      }

      function Consumer2() {
        const { selectionCount } = useLoanSelection();
        return <div data-testid="count2">{selectionCount}</div>;
      }

      function Controller() {
        const { toggleLoan } = useLoanSelection();
        return (
          <button onClick={() => toggleLoan(mockLoan1)}>
            Toggle
          </button>
        );
      }

      const user = userEvent.setup();

      render(
        <LoanSelectionProvider>
          <Consumer1 />
          <Consumer2 />
          <Controller />
        </LoanSelectionProvider>
      );

      const button = screen.getByText('Toggle');
      await user.click(button);

      expect(screen.getByTestId('count1')).toHaveTextContent('1');
      expect(screen.getByTestId('count2')).toHaveTextContent('1');
    });
  });

  describe('Custom Hook Error Cases - موارد خطای هوک سفارشی', () => {
    it('should throw error when used outside provider', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useLoanSelection());
      }).toThrow('useLoanSelection must be used within a LoanSelectionProvider');

      consoleErrorSpy.mockRestore();
    });

    it('should not throw error when used inside provider', () => {
      expect(() => {
        renderHook(() => useLoanSelection(), {
          wrapper: LoanSelectionProvider,
        });
      }).not.toThrow();
    });
  });

  describe('Edge Cases - موارد خاص', () => {
    it('should handle rapid toggles of same loan', () => {
      const { result } = renderHook(() => useLoanSelection(), {
        wrapper: LoanSelectionProvider,
      });

      act(() => {
        result.current.toggleLoan(mockLoan1);
        result.current.toggleLoan(mockLoan1);
        result.current.toggleLoan(mockLoan1);
        result.current.toggleLoan(mockLoan1);
      });

      expect(result.current.selectedLoans).toHaveLength(0);
    });

    it('should maintain correct count during complex operations', () => {
      const { result } = renderHook(() => useLoanSelection(), {
        wrapper: LoanSelectionProvider,
      });

      act(() => {
        result.current.toggleLoan(mockLoan1);
        result.current.toggleLoan(mockLoan2);
        result.current.toggleLoan(mockLoan1); // Remove
        result.current.toggleLoan(mockLoan3);
        result.current.clearSelection();
        result.current.toggleLoan(mockLoan4);
      });

      expect(result.current.selectionCount).toBe(1);
      expect(result.current.selectedLoans).toHaveLength(1);
      expect(result.current.selectedLoans).toContainEqual(mockLoan4);
    });

    it('should handle loans with identical data but different references', () => {
      const { result } = renderHook(() => useLoanSelection(), {
        wrapper: LoanSelectionProvider,
      });

      const loan1Copy = { ...mockLoan1 };

      act(() => {
        result.current.toggleLoan(mockLoan1);
        result.current.toggleLoan(loan1Copy);
      });

      // Should remove because IDs match
      expect(result.current.selectedLoans).toHaveLength(0);
    });

    it('should preserve selection order', () => {
      const { result } = renderHook(() => useLoanSelection(), {
        wrapper: LoanSelectionProvider,
      });

      act(() => {
        result.current.toggleLoan(mockLoan3);
        result.current.toggleLoan(mockLoan1);
        result.current.toggleLoan(mockLoan2);
      });

      expect(result.current.selectedLoans[0]).toEqual(mockLoan3);
      expect(result.current.selectedLoans[1]).toEqual(mockLoan1);
      expect(result.current.selectedLoans[2]).toEqual(mockLoan2);
    });
  });

  describe('Computed Values - مقادیر محاسبه شده', () => {
    it('should keep selectionCount in sync with array length', () => {
      const { result } = renderHook(() => useLoanSelection(), {
        wrapper: LoanSelectionProvider,
      });

      act(() => {
        result.current.toggleLoan(mockLoan1);
        result.current.toggleLoan(mockLoan2);
      });

      expect(result.current.selectionCount).toBe(result.current.selectedLoans.length);

      act(() => {
        result.current.toggleLoan(mockLoan1);
      });

      expect(result.current.selectionCount).toBe(result.current.selectedLoans.length);
    });

    it('should update canSelectMore correctly throughout operations', () => {
      const { result } = renderHook(() => useLoanSelection(), {
        wrapper: LoanSelectionProvider,
      });

      expect(result.current.canSelectMore).toBe(true);

      act(() => {
        result.current.toggleLoan(mockLoan1);
        result.current.toggleLoan(mockLoan2);
        result.current.toggleLoan(mockLoan3);
      });

      expect(result.current.canSelectMore).toBe(true);

      act(() => {
        result.current.toggleLoan(mockLoan4);
      });

      expect(result.current.canSelectMore).toBe(false);

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.canSelectMore).toBe(true);
    });
  });
});
