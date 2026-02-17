/**
 * Loan Selection Context
 * Global state for loan selection across the application
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { LoanType, LoanWithBank } from '../types';
import { MAX_LOAN_SELECTION, STORAGE_KEYS, STORAGE_VERSION } from '../constants/loans/app.constants';

interface LoanSelectionContextType {
  selectedLoans: (LoanType | LoanWithBank)[];
  toggleLoan: (loan: LoanType | LoanWithBank) => void;
  isLoanSelected: (loanId: string) => boolean;
  clearSelection: () => void;
  selectionCount: number;
  canSelectMore: boolean;
  maxSelection: number;
}

const LoanSelectionContext = createContext<LoanSelectionContextType | undefined>(undefined);

export function LoanSelectionProvider({ children }: { children: React.ReactNode }) {
  const isInitialized = useRef(false);

  const [selectedLoans, setSelectedLoans] = useState<(LoanType | LoanWithBank)[]>(() => {
    // Load from localStorage on mount with version check
    try {
      const storedVersion = localStorage.getItem(STORAGE_KEYS.LOAN_SELECTION_VERSION);

      // If version mismatch, clear old data
      if (storedVersion !== STORAGE_VERSION.LOAN_SELECTION) {
        localStorage.removeItem(STORAGE_KEYS.LOAN_SELECTION);
        localStorage.setItem(STORAGE_KEYS.LOAN_SELECTION_VERSION, STORAGE_VERSION.LOAN_SELECTION);
        return [];
      }

      const stored = localStorage.getItem(STORAGE_KEYS.LOAN_SELECTION);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate that parsed data is an array
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
      return [];
    } catch (error) {
      console.warn('Failed to load loan selection from localStorage:', error);
      // Clear corrupted data
      localStorage.removeItem(STORAGE_KEYS.LOAN_SELECTION);
      return [];
    }
  });

  // Persist to localStorage whenever selection changes
  useEffect(() => {
    // Skip first render to avoid unnecessary writes
    if (!isInitialized.current) {
      isInitialized.current = true;
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEYS.LOAN_SELECTION, JSON.stringify(selectedLoans));
      localStorage.setItem(STORAGE_KEYS.LOAN_SELECTION_VERSION, STORAGE_VERSION.LOAN_SELECTION);
    } catch (error) {
      console.error('Failed to save loan selection to localStorage:', error);
    }
  }, [selectedLoans]);

  const toggleLoan = useCallback((loan: LoanType | LoanWithBank) => {
    setSelectedLoans((prev) => {
      const isAlreadySelected = prev.some((l) => l.id === loan.id);

      if (isAlreadySelected) {
        // Remove from selection
        return prev.filter((l) => l.id !== loan.id);
      } else if (prev.length < MAX_LOAN_SELECTION) {
        // Add to selection
        return [...prev, loan];
      }

      // Max reached, don't add
      return prev;
    });
  }, []);

  const isLoanSelected = useCallback(
    (loanId: string) => selectedLoans.some((l) => l.id === loanId),
    [selectedLoans]
  );

  const clearSelection = useCallback(() => {
    setSelectedLoans([]);
  }, []);

  const value: LoanSelectionContextType = {
    selectedLoans,
    toggleLoan,
    isLoanSelected,
    clearSelection,
    selectionCount: selectedLoans.length,
    canSelectMore: selectedLoans.length < MAX_LOAN_SELECTION,
    maxSelection: MAX_LOAN_SELECTION,
  };

  return (
    <LoanSelectionContext.Provider value={value}>
      {children}
    </LoanSelectionContext.Provider>
  );
}

export function useLoanSelection() {
  const context = useContext(LoanSelectionContext);
  if (context === undefined) {
    throw new Error('useLoanSelection must be used within a LoanSelectionProvider');
  }
  return context;
}
