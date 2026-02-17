/**
 * Tests for Financial Calculations
 */

import { describe, it, expect } from 'vitest';
import {
  parseAmount,
  formatAmount,
  calculateMonthlyPayment,
  calculateTotalLoanCost,
  calculateIRR,
  calculateNPV,
} from '../../utils/financialCalculations';

describe('Financial Calculations', () => {
  describe('parseAmount', () => {
    it('should parse Persian numbers correctly', () => {
      expect(parseAmount('۱۲۳۴۵۶')).toBe(123456);
    });

    it('should parse comma-separated numbers', () => {
      expect(parseAmount('1,234,567')).toBe(1234567);
    });

    it('should handle million suffix', () => {
      expect(parseAmount('100 میلیون')).toBe(100000000);
    });

    it('should handle billion suffix', () => {
      expect(parseAmount('10 میلیارد')).toBe(10000000000);
    });

    it('should return 0 for invalid input', () => {
      expect(parseAmount('invalid')).toBe(0);
      expect(parseAmount('')).toBe(0);
    });
  });

  describe('formatAmount', () => {
    it('should format numbers with commas', () => {
      expect(formatAmount(1234567)).toBe('1,234,567');
    });

    it('should handle zero', () => {
      expect(formatAmount(0)).toBe('0');
    });

    it('should handle large numbers', () => {
      expect(formatAmount(1000000000)).toBe('1,000,000,000');
    });
  });

  describe('calculateMonthlyPayment', () => {
    it('should calculate monthly payment correctly', () => {
      const principal = 100000000; // 100 million
      const annualRate = 0.18; // 18%
      const months = 60;

      const payment = calculateMonthlyPayment(principal, annualRate, months);

      expect(payment).toBeGreaterThan(0);
      expect(payment).toBeLessThan(principal);
    });

    it('should handle zero interest rate', () => {
      const principal = 100000000;
      const annualRate = 0;
      const months = 60;

      const payment = calculateMonthlyPayment(principal, annualRate, months);

      expect(payment).toBe(principal / months);
    });

    it('should handle edge cases', () => {
      expect(calculateMonthlyPayment(0, 0.18, 60)).toBe(0);
      expect(calculateMonthlyPayment(100000000, 0.18, 0)).toBe(0);
    });
  });

  describe('calculateTotalLoanCost', () => {
    it('should calculate total loan cost correctly', () => {
      const principal = 100000000;
      const annualRate = 0.18;
      const months = 60;
      const commission = 0.01;

      const totalCost = calculateTotalLoanCost(
        principal,
        annualRate,
        months,
        commission
      );

      expect(totalCost).toBeGreaterThan(principal);
    });

    it('should include commission in cost', () => {
      const principal = 100000000;
      const annualRate = 0;
      const months = 12;
      const commission = 0.05;

      const totalCost = calculateTotalLoanCost(
        principal,
        annualRate,
        months,
        commission
      );

      expect(totalCost).toBe(principal * commission);
    });
  });

  describe('calculateIRR', () => {
    it('should calculate IRR for simple cash flows', () => {
      const cashFlows = [-100000000, 10000000, 10000000, 110000000];
      const irr = calculateIRR(cashFlows);

      expect(irr).toBeGreaterThan(-1);
      expect(irr).toBeLessThan(1);
    });

    it('should return null for invalid cash flows', () => {
      const cashFlows = [100000, 100000, 100000]; // All positive
      const irr = calculateIRR(cashFlows);

      expect(irr).toBeNull();
    });
  });

  describe('calculateNPV', () => {
    it('should calculate NPV correctly', () => {
      const cashFlows = [-100000000, 50000000, 60000000];
      const discountRate = 0.1;

      const npv = calculateNPV(cashFlows, discountRate);

      expect(typeof npv).toBe('number');
      expect(isFinite(npv)).toBe(true);
    });

    it('should handle zero discount rate', () => {
      const cashFlows = [-100, 50, 60];
      const discountRate = 0;

      const npv = calculateNPV(cashFlows, discountRate);

      expect(npv).toBe(10); // Sum of cash flows
    });
  });
});
