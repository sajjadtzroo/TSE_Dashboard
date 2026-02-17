/**
 * Tests for Calculator Engine
 */

import { describe, it, expect } from 'vitest';
import { analyzeLoan, rankLoans } from '../../features/calculator/calculatorEngine';
import type { LoanWithBank } from '../../types';
import type { CalculatorInputs } from '../../features/calculator/types';

describe('Calculator Engine', () => {
  const mockInputs: CalculatorInputs = {
    depositAmount: 100000000, // 100 million
    depositMonths: 12,
    loanMonths: 60,
    externalReturnRate: 0.2,
    commission: 0.01,
    riskTolerance: 'medium',
  };

  const mockLoan: LoanWithBank = {
    id: 'test-loan',
    bankId: 'test-bank',
    bankNameFA: 'بانک تست',
    bankCategory: 'traditional-banks',
    nameFA: 'وام تست',
    nameEN: 'Test Loan',
    minAmount: '10000000',
    maxAmount: '500000000',
    interestRate: '18%',
    interestRateNumeric: 18,
    repaymentPeriod: '60 ماه',
    guarantor: false,
    category: 'general',
  };

  describe('analyzeLoan', () => {
    it('should analyze loan and return valid analysis', () => {
      const analysis = analyzeLoan(mockLoan, mockInputs);

      expect(analysis).not.toBeNull();
      if (analysis) {
        expect(analysis.loanId).toBe('test-loan');
        expect(analysis.bankId).toBe('test-bank');
        expect(analysis.loanAmount).toBeGreaterThan(0);
        expect(analysis.interestRate).toBeGreaterThan(0);
        expect(analysis.monthlyPayment).toBeGreaterThan(0);
        expect(analysis.totalCost).toBeGreaterThan(0);
        expect(analysis.score).toBeGreaterThanOrEqual(0);
        expect(analysis.score).toBeLessThanOrEqual(100);
      }
    });

    it('should return null for loan without interest rate', () => {
      const invalidLoan = {
        ...mockLoan,
        interestRate: undefined,
        interestRateNumeric: undefined,
      };

      const analysis = analyzeLoan(invalidLoan, mockInputs);
      expect(analysis).toBeNull();
    });

    it('should return null for loan without max amount', () => {
      const invalidLoan = {
        ...mockLoan,
        maxAmount: '0',
      };

      const analysis = analyzeLoan(invalidLoan, mockInputs);
      expect(analysis).toBeNull();
    });

    it('should calculate IRR and NPV', () => {
      const analysis = analyzeLoan(mockLoan, mockInputs);

      if (analysis) {
        expect(typeof analysis.irr).toBe('number');
        expect(typeof analysis.npv).toBe('number');
        expect(analysis.cashFlows).toBeInstanceOf(Array);
        expect(analysis.cashFlows.length).toBeGreaterThan(0);
      }
    });

    it('should generate cash flows', () => {
      const analysis = analyzeLoan(mockLoan, mockInputs);

      if (analysis) {
        expect(analysis.cashFlows).toBeDefined();
        expect(analysis.cashFlows.length).toBe(mockInputs.loanMonths + 1);
        // First cash flow should be negative (deposit + loan disbursement)
        expect(analysis.cashFlows[0]).toBeLessThan(0);
      }
    });
  });

  describe('rankLoans', () => {
    it('should rank loans by score', () => {
      const loan1 = {
        ...mockLoan,
        id: 'loan-1',
        interestRateNumeric: 18,
      };

      const loan2 = {
        ...mockLoan,
        id: 'loan-2',
        interestRateNumeric: 15,
      };

      const analysis1 = analyzeLoan(loan1, mockInputs);
      const analysis2 = analyzeLoan(loan2, mockInputs);

      const validAnalyses = [analysis1, analysis2].filter((a) => a !== null);
      const ranked = rankLoans(validAnalyses, 'medium');

      expect(ranked.length).toBe(2);
      // Higher score should come first
      expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
    });

    it('should filter out analyses with zero score', () => {
      const validAnalysis = {
        loanId: 'valid',
        bankId: 'bank-1',
        bankNameFA: 'بانک',
        loanNameFA: 'وام',
        loanAmount: 100000000,
        interestRate: 0.18,
        irr: 0.1,
        mirr: 0.12,
        npv: 5000000,
        totalCost: 20000000,
        monthlyPayment: 2000000,
        effectiveRate: 0.19,
        opportunityCost: 10000000,
        score: 75,
        cashFlows: [],
      };

      const zeroScoreAnalysis = {
        ...validAnalysis,
        loanId: 'zero',
        score: 0,
      };

      const ranked = rankLoans([validAnalysis, zeroScoreAnalysis], 'medium');

      expect(ranked.length).toBe(1);
      expect(ranked[0].loanId).toBe('valid');
    });

    it('should handle empty array', () => {
      const ranked = rankLoans([], 'medium');
      expect(ranked).toEqual([]);
    });
  });
});
