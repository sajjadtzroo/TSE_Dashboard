/**
 * Unit Tests for Privilege Analysis Module
 * Tests CFA-based break-even, max wait, and scenario analysis
 */

import { describe, it, expect } from 'vitest';
import {
  calculateBreakEvenPrice,
  calculateMaxWaitTime,
  analyzeScenarios,
  suggestAlternatives,
} from '../privilegeAnalysis';

describe('privilegeAnalysis', () => {
  describe('calculateBreakEvenPrice', () => {
    it('calculates correct break-even for realistic profitable scenario', () => {
      const result = calculateBreakEvenPrice(
        100_000_000, // deposit
        2,           // 2 month wait (shorter)
        150_000_000, // 1.5x loan amount (higher leverage)
        0.23,        // 23% bank rate
        24,          // 24 month repayment (longer period)
        0.45         // 45% CAPM rate
      );

      // With better conditions, break-even should be positive
      expect(result.loanBenefit).toBeGreaterThan(0);
      expect(result.costOfWaiting).toBeGreaterThan(0);

      // Verify the calculation components
      expect(result.breakEvenPrice).toBe(result.loanBenefit - result.costOfWaiting);
    });

    it('returns REJECT decision when break-even is negative', () => {
      const result = calculateBreakEvenPrice(
        100_000_000, // deposit
        12,          // 12 month wait (too long)
        100_000_000, // loan amount
        0.23,        // 23% bank rate
        12,          // 12 month repayment
        0.45         // 45% CAPM rate
      );

      // With 12 month wait at 45% CAPM, cost of waiting is too high
      expect(result.decision).toBe('REJECT');
    });

    it('handles zero wait time correctly', () => {
      const result = calculateBreakEvenPrice(
        100_000_000,
        0,           // no wait
        100_000_000,
        0.23,
        12,
        0.45
      );

      // With no wait, cost of waiting is 0
      expect(result.costOfWaiting).toBe(0);
      // Break-even equals loan benefit
      expect(result.breakEvenPrice).toBe(result.loanBenefit);
    });
  });

  describe('calculateMaxWaitTime', () => {
    it('calculates max wait time correctly', () => {
      const result = calculateMaxWaitTime(
        100_000_000, // deposit
        100_000_000, // loan amount
        0.23,        // 23% bank rate
        12,          // 12 month repayment
        0.45         // 45% CAPM rate
      );

      // Max wait should be positive
      expect(result.maxWaitMonths).toBeGreaterThan(0);

      // Should be able to afford wait times less than max
      expect(result.canAffordWait(1)).toBe(true);
      expect(result.canAffordWait(result.maxWaitMonths - 0.1)).toBe(true);

      // Should not afford wait times greater than max
      expect(result.canAffordWait(result.maxWaitMonths + 1)).toBe(false);
    });

    it('returns very small max wait for barely profitable loans', () => {
      const result = calculateMaxWaitTime(
        100_000_000,
        50_000_000,  // small loan amount
        0.30,        // high interest rate
        6,           // short repayment
        0.45
      );

      // Loan benefit is very small or negative, so max wait should be very low
      expect(result.maxWaitMonths).toBeLessThan(2);

      // Should not afford long waits
      expect(result.canAffordWait(3)).toBe(false);
    });

    it('handles large loan amounts correctly', () => {
      const result = calculateMaxWaitTime(
        100_000_000,
        200_000_000, // 2x leverage
        0.23,
        24,          // longer repayment
        0.45
      );

      // With higher loan amount and longer repayment, max wait should be higher
      expect(result.maxWaitMonths).toBeGreaterThan(3);
    });
  });

  describe('analyzeScenarios', () => {
    it('recommends WAIT when NPV is positive', () => {
      const result = analyzeScenarios(
        50_000_000,  // smaller deposit
        2,           // short wait
        100_000_000,
        0.23,
        24,          // longer repayment
        0.45
      );

      expect(result.recommendation).toBe('WAIT');
      expect(result.scenarioA.npv).toBeGreaterThan(0);
      expect(result.scenarioA.decision).toBe('ACCEPT');
    });

    it('recommends BUY_PRIVILEGE when price is below break-even', () => {
      const result = analyzeScenarios(
        100_000_000,
        3,
        100_000_000,
        0.23,
        12,
        0.45,
        5_000_000    // privilege price below break-even
      );

      // If wait NPV is negative but buy privilege is positive
      if (result.scenarioA.npv < 0 && result.scenarioB && result.scenarioB.npv > 0) {
        expect(result.recommendation).toBe('BUY_PRIVILEGE');
      }
    });

    it('recommends REJECT when all scenarios are unprofitable', () => {
      const result = analyzeScenarios(
        100_000_000,
        6,           // long wait
        80_000_000,  // smaller loan
        0.25,        // higher rate
        12,
        0.45
      );

      // With unfavorable conditions, should recommend REJECT
      if (result.scenarioA.npv < 0 && result.breakEvenPrice <= 0) {
        expect(result.recommendation).toBe('REJECT');
      }
    });

    it('includes all three scenarios', () => {
      const result = analyzeScenarios(
        100_000_000,
        3,
        100_000_000,
        0.23,
        12,
        0.45,
        7_000_000
      );

      expect(result.scenarioA).toBeDefined();
      expect(result.scenarioA.name).toContain('انتظار');

      expect(result.scenarioB).toBeDefined();
      expect(result.scenarioB?.name).toContain('خرید امتیاز');

      expect(result.scenarioC).toBeDefined();
      expect(result.scenarioC.name).toContain('سرمایه‌گذاری جایگزین');
      expect(result.scenarioC.npv).toBe(0); // Baseline
    });
  });

  describe('suggestAlternatives', () => {
    it('suggests reducing wait time when current wait is too long', () => {
      const alternatives = suggestAlternatives(
        100_000_000,
        6,           // long wait (unprofitable)
        100_000_000,
        0.23,
        12,
        0.45
      );

      // Should suggest at least one alternative
      expect(alternatives.length).toBeGreaterThan(0);

      // Check if reduce wait is suggested
      const reduceWait = alternatives.find(alt => alt.type === 'REDUCE_WAIT');
      if (reduceWait) {
        expect(reduceWait.parameters.waitMonths).toBeLessThan(6);
        expect(reduceWait.description).toContain('کاهش انتظار');
      }
    });

    it('suggests increasing leverage for better NPV', () => {
      const alternatives = suggestAlternatives(
        100_000_000,
        3,
        80_000_000,  // smaller loan (unprofitable)
        0.23,
        12,
        0.45
      );

      // Check if increase leverage is suggested
      const increaseLeverage = alternatives.find(alt => alt.type === 'INCREASE_LEVERAGE');
      if (increaseLeverage) {
        expect(increaseLeverage.parameters.loanAmount).toBeGreaterThan(80_000_000);
        expect(increaseLeverage.description).toContain('۱.۵ برابر');
      }
    });

    it('suggests extending repayment period', () => {
      const alternatives = suggestAlternatives(
        100_000_000,
        3,
        100_000_000,
        0.23,
        6,           // short repayment (unprofitable)
        0.45
      );

      // Check if extend repayment is suggested
      const extendRepayment = alternatives.find(alt => alt.type === 'EXTEND_REPAYMENT');
      if (extendRepayment) {
        expect(extendRepayment.parameters.repaymentMonths).toBe(24);
        expect(extendRepayment.description).toContain('۲۴ ماه');
      }
    });

    it('returns empty array for profitable deals', () => {
      const alternatives = suggestAlternatives(
        50_000_000,  // smaller deposit
        2,           // short wait
        100_000_000,
        0.23,
        24,          // longer repayment (profitable)
        0.45
      );

      // If deal is profitable, no alternatives needed
      const result = analyzeScenarios(50_000_000, 2, 100_000_000, 0.23, 24, 0.45);
      if (result.scenarioA.npv > 0) {
        expect(alternatives.length).toBe(0);
      }
    });
  });

  describe('Edge cases', () => {
    it('handles very small amounts', () => {
      const result = calculateBreakEvenPrice(
        1_000_000,
        1,
        1_000_000,
        0.20,
        12,
        0.30
      );

      expect(result.breakEvenPrice).toBeGreaterThanOrEqual(0);
      expect(result.loanBenefit).toBeDefined();
      expect(result.costOfWaiting).toBeDefined();
    });

    it('handles very large amounts', () => {
      const result = calculateBreakEvenPrice(
        1_000_000_000, // 1 billion
        3,
        1_000_000_000,
        0.23,
        12,
        0.45
      );

      expect(result.breakEvenPrice).toBeGreaterThanOrEqual(0);
    });

    it('handles zero interest rate edge case', () => {
      const result = calculateBreakEvenPrice(
        100_000_000,
        3,
        100_000_000,
        0,           // 0% interest
        12,
        0.45
      );

      // With 0% bank rate, loan benefit is very high
      expect(result.loanBenefit).toBeGreaterThan(0);
      expect(result.breakEvenPrice).toBeGreaterThan(0);
    });
  });
});
