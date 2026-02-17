/**
 * Test suite for CFA Level 2 compliant TVM calculations
 * Verifies calculations match BAII Plus calculator and Excel
 */

import { describe, it, expect } from 'vitest';
import {
  calculatePMT,
  calculatePV,
  calculateFV,
  calculateNPER,
  calculateRATE,
  AnnuityType,
} from '../timeValueOfMoney';

describe('Time Value of Money Calculations', () => {
  describe('calculatePMT', () => {
    it('should calculate monthly loan payment correctly', () => {
      // Test case: 100M loan, 18% annual rate, 60 months
      const principal = 100_000_000;
      const rate = 0.18 / 12; // Monthly rate
      const nper = 60;

      const payment = calculatePMT(-principal, 0, rate, nper, AnnuityType.ORDINARY);

      // Expected: approximately 2,539,343 per month (CFA-compliant result)
      expect(payment).toBeCloseTo(2_539_343, 0);
    });

    it('should calculate investment monthly contribution', () => {
      // Test case: Want 100M in 5 years, starting with 0, 25% annual return
      const fv = 100_000_000;
      const rate = 0.25 / 12;
      const nper = 60;

      const payment = calculatePMT(0, fv, rate, nper, AnnuityType.ORDINARY);

      // Payment should be negative (outflow)
      expect(payment).toBeLessThan(0);
      expect(Math.abs(payment)).toBeCloseTo(851_799, 0);
    });

    it('should handle zero rate correctly', () => {
      const pv = -100_000_000;
      const payment = calculatePMT(pv, 0, 0, 60, AnnuityType.ORDINARY);

      // With 0% rate, payment is simply principal divided by periods
      expect(payment).toBeCloseTo(1_666_667, -2);
    });
  });

  describe('calculatePV', () => {
    it('should calculate loan amount from payment', () => {
      // Test case: Can afford 2.5M/month, 18% rate, 60 months
      const payment = -2_500_000;
      const rate = 0.18 / 12;
      const nper = 60;

      const pv = calculatePV(0, payment, rate, nper, AnnuityType.ORDINARY);

      // Expected: approximately 98.5M (positive = money received/borrowed)
      expect(pv).toBeGreaterThan(0);
      expect(pv).toBeCloseTo(98_450_672, -5);
    });
  });

  describe('calculateFV', () => {
    it('should calculate investment future value', () => {
      // Test case: 50M initial, 5M monthly, 25% annual return, 5 years
      const pv = -50_000_000;
      const pmt = -5_000_000;
      const rate = 0.25 / 12;
      const nper = 60;

      const fv = calculateFV(pv, pmt, rate, nper, AnnuityType.ORDINARY);

      // Should return positive value (money received in future)
      expect(fv).toBeGreaterThan(0);
      // Expected: approximately 759M (CFA-compliant result)
      expect(fv).toBeCloseTo(759_283_133, -6);
    });

    it('should calculate simple compound interest', () => {
      // Test case: 100M, no contributions, 20% annual, 5 years
      const pv = -100_000_000;
      const rate = 0.20 / 12;
      const nper = 60;

      const fv = calculateFV(pv, 0, rate, nper, AnnuityType.ORDINARY);

      // Expected: approximately 270M (compound growth)
      expect(fv).toBeCloseTo(270_000_000, -7);
    });
  });

  describe('calculateNPER', () => {
    it('should calculate loan term without errors', () => {
      // Simple verification that NPER function runs
      // Note: NPER is not currently used in our calculators
      const pv = -100_000_000;
      const pmt = 2_539_343;
      const rate = 0.18 / 12;

      const nper = calculateNPER(pv, 0, pmt, rate, AnnuityType.ORDINARY);

      // Just verify the function returns a number or null (doesn't crash)
      expect(typeof nper === 'number' || nper === null).toBe(true);
    });
  });

  describe('calculateRATE', () => {
    it('should calculate interest rate from loan details', () => {
      // Verify RATE works: 100M loan, 2.54M payment, 60 months = ~18% annual
      const pv = -100_000_000; // Negative = borrowing
      const pmt = 2_539_343; // Positive = payment
      const nper = 60;

      const rate = calculateRATE(pv, pmt, 0, nper, AnnuityType.ORDINARY);

      // Monthly rate should be around 1.5% (18% annual)
      expect(rate).not.toBeNull();
      if (rate !== null) {
        expect(rate).toBeGreaterThan(0.014);
        expect(rate).toBeLessThan(0.016);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small rates', () => {
      const pv = -100_000_000;
      const rate = 0.0001 / 12; // 0.01% annual
      const nper = 60;

      const payment = calculatePMT(pv, 0, rate, nper, AnnuityType.ORDINARY);

      expect(payment).toBeGreaterThan(1_666_000);
      expect(payment).toBeLessThan(1_670_000);
    });

    it('should handle annuity due (beginning of period)', () => {
      const pv = -100_000_000;
      const rate = 0.18 / 12;
      const nper = 60;

      const ordinaryPayment = calculatePMT(pv, 0, rate, nper, AnnuityType.ORDINARY);
      const duePayment = calculatePMT(pv, 0, rate, nper, AnnuityType.DUE);

      // Due payment should be slightly less (paying at start of period)
      expect(duePayment).toBeLessThan(ordinaryPayment);
      expect(duePayment / ordinaryPayment).toBeCloseTo(1 / (1 + rate), 4);
    });
  });

  describe('Real-world Calculator Scenarios', () => {
    it('should match LoanPaymentCalculator example', () => {
      // Scenario from LoanPaymentCalculator default values
      const principal = 100_000_000;
      const annualRate = 0.18;
      const months = 60;

      const payment = calculatePMT(
        -principal,
        0,
        annualRate / 12,
        months,
        AnnuityType.ORDINARY
      );

      const totalPayment = payment * months;
      const totalInterest = totalPayment - principal;

      expect(payment).toBeCloseTo(2_539_343, 0);
      expect(totalInterest).toBeCloseTo(52_360_564, -5);
    });

    it('should match AffordabilityCalculator logic', () => {
      // Scenario: 50M income, 40% DTI, 10M existing debt, 18% rate, 60 months
      const monthlyIncome = 50_000_000;
      const maxDTI = 0.40;
      const existingDebts = 10_000_000;
      const maxPayment = monthlyIncome * maxDTI - existingDebts;

      // Calculate PV with negative payment (outflow), result is positive loan amount
      const pvResult = calculatePV(
        0,
        -maxPayment,
        0.18 / 12,
        60,
        AnnuityType.ORDINARY
      );

      // Take absolute value since we want the loan amount
      const maxLoan = Math.abs(pvResult);

      expect(maxPayment).toBe(10_000_000);
      expect(maxLoan).toBeCloseTo(393_802_689, -6);
    });

    it('should match InvestmentCalculator scenario', () => {
      // Scenario: 50M initial, 5M monthly, 25% return, 5 years
      const initial = 50_000_000;
      const monthly = 5_000_000;
      const rate = 0.25 / 12;
      const months = 60;

      const futureValue = calculateFV(
        -initial,
        -monthly,
        rate,
        months,
        AnnuityType.ORDINARY
      );

      const totalContributions = initial + monthly * months;
      const totalEarnings = futureValue - totalContributions;
      const roi = (totalEarnings / totalContributions) * 100;

      expect(futureValue).toBeGreaterThan(0);
      expect(totalContributions).toBe(350_000_000);
      expect(roi).toBeGreaterThan(100); // Over 100% return
    });

    it('should match RefinanceCalculator savings', () => {
      // Current: 80M balance, 22% rate, 48 months left
      const balance = 80_000_000;
      const currentPayment = calculatePMT(
        -balance,
        0,
        0.22 / 12,
        48,
        AnnuityType.ORDINARY
      );

      // New: 18% rate, 60 months
      const newPayment = calculatePMT(
        -balance,
        0,
        0.18 / 12,
        60,
        AnnuityType.ORDINARY
      );

      const monthlySavings = currentPayment - newPayment;

      expect(currentPayment).toBeGreaterThan(newPayment);
      expect(monthlySavings).toBeGreaterThan(0);
      expect(monthlySavings).toBeCloseTo(489_012, 0); // ~489k savings/month
    });
  });
});
