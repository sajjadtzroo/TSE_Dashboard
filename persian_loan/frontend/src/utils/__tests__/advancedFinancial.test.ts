/**
 * Tests for Advanced Financial Calculations
 *
 * Comprehensive test suite for CFA Level 1 & 2 financial functions:
 * - CAPM (Capital Asset Pricing Model)
 * - WACC (Weighted Average Cost of Capital)
 * - Free Cash Flow (FCFF, FCFE)
 * - Risk-Adjusted Metrics (Sharpe, Treynor, Jensen's Alpha, IR)
 * - Beta Calculations (Levered/Unlevered)
 */

import { describe, it, expect } from 'vitest';
import {
  calculateCAPM,
  calculateWACC,
  leverBeta,
  unleverBeta,
  calculateFCFF,
  calculateFCFE,
  calculateSharpeRatio,
  calculateTreynorRatio,
  calculateJensensAlpha,
  calculateInformationRatio,
  validateCAPMInputs,
  validateWACCInputs,
  validateFCFFInputs,
  IRANIAN_MARKET_DEFAULTS,
} from '../advancedFinancial';

describe('CAPM Calculations', () => {
  it('should calculate expected return correctly with positive beta', () => {
    const riskFreeRate = 0.05; // 5%
    const beta = 1.2;
    const marketReturn = 0.12; // 12%

    const result = calculateCAPM(riskFreeRate, beta, marketReturn);

    // E(R) = 0.05 + 1.2 × (0.12 - 0.05) = 0.05 + 1.2 × 0.07 = 0.05 + 0.084 = 0.134
    expect(result.expectedReturn).toBeCloseTo(0.134, 3);
    expect(result.riskPremium).toBeCloseTo(0.07, 3);
  });

  it('should calculate expected return with beta = 1 (market portfolio)', () => {
    const riskFreeRate = 0.05;
    const beta = 1.0;
    const marketReturn = 0.12;

    const result = calculateCAPM(riskFreeRate, beta, marketReturn);

    // E(R) should equal market return when beta = 1
    expect(result.expectedReturn).toBeCloseTo(marketReturn, 3);
  });

  it('should calculate expected return with beta = 0 (risk-free asset)', () => {
    const riskFreeRate = 0.05;
    const beta = 0;
    const marketReturn = 0.12;

    const result = calculateCAPM(riskFreeRate, beta, marketReturn);

    // E(R) should equal risk-free rate when beta = 0
    expect(result.expectedReturn).toBeCloseTo(riskFreeRate, 3);
  });

  it('should handle negative beta (defensive asset)', () => {
    const riskFreeRate = 0.05;
    const beta = -0.5;
    const marketReturn = 0.12;

    const result = calculateCAPM(riskFreeRate, beta, marketReturn);

    // E(R) = 0.05 + (-0.5) × 0.07 = 0.05 - 0.035 = 0.015
    expect(result.expectedReturn).toBeCloseTo(0.015, 3);
  });

  it('should work with Iranian market defaults', () => {
    const result = calculateCAPM(
      IRANIAN_MARKET_DEFAULTS.riskFreeRate,
      IRANIAN_MARKET_DEFAULTS.defaultBeta,
      IRANIAN_MARKET_DEFAULTS.marketReturn
    );

    // Rf = 20%, β = 1.2, Rm = 35%
    // E(R) = 0.20 + 1.2 × (0.35 - 0.20) = 0.20 + 1.2 × 0.15 = 0.20 + 0.18 = 0.38
    expect(result.expectedReturn).toBeCloseTo(0.38, 3);
  });
});

describe('WACC Calculations', () => {
  it('should calculate WACC correctly with tax shield', () => {
    const inputs = {
      equityValue: 100_000_000,
      debtValue: 50_000_000,
      costOfEquity: 0.15,
      costOfDebt: 0.08,
      taxRate: 0.25,
    };

    const result = calculateWACC(inputs);

    // V = 150M, E/V = 2/3, D/V = 1/3
    // WACC = (2/3 × 0.15) + (1/3 × 0.08 × 0.75)
    // WACC = 0.10 + 0.02 = 0.12
    expect(result.wacc).toBeCloseTo(0.12, 3);
    expect(result.equityWeight).toBeCloseTo(2 / 3, 3);
    expect(result.debtWeight).toBeCloseTo(1 / 3, 3);
    expect(result.afterTaxCostOfDebt).toBeCloseTo(0.06, 3);
    expect(result.firmValue).toBe(150_000_000);
  });

  it('should handle all-equity capital structure', () => {
    const inputs = {
      equityValue: 100_000_000,
      debtValue: 0,
      costOfEquity: 0.15,
      costOfDebt: 0.08,
      taxRate: 0.25,
    };

    const result = calculateWACC(inputs);

    // WACC should equal cost of equity when no debt
    expect(result.wacc).toBeCloseTo(0.15, 3);
    expect(result.equityWeight).toBe(1);
    expect(result.debtWeight).toBe(0);
  });

  it('should calculate correct tax shield benefit', () => {
    const inputs = {
      equityValue: 100_000_000,
      debtValue: 100_000_000,
      costOfEquity: 0.20,
      costOfDebt: 0.10,
      taxRate: 0.30,
    };

    const result = calculateWACC(inputs);

    // After-tax cost of debt = 0.10 × (1 - 0.30) = 0.07
    expect(result.afterTaxCostOfDebt).toBeCloseTo(0.07, 3);

    // WACC = (0.5 × 0.20) + (0.5 × 0.07) = 0.10 + 0.035 = 0.135
    expect(result.wacc).toBeCloseTo(0.135, 3);
  });

  it('should work with Iranian market parameters', () => {
    const inputs = {
      equityValue: 100_000_000,
      debtValue: 50_000_000,
      costOfEquity: 0.38, // From CAPM
      costOfDebt: 0.23,
      taxRate: IRANIAN_MARKET_DEFAULTS.corporateTaxRate,
    };

    const result = calculateWACC(inputs);

    // After-tax debt cost = 0.23 × 0.75 = 0.1725
    // WACC = (2/3 × 0.38) + (1/3 × 0.1725)
    expect(result.afterTaxCostOfDebt).toBeCloseTo(0.1725, 3);
    expect(result.wacc).toBeGreaterThan(0.25);
    expect(result.wacc).toBeLessThan(0.35);
  });
});

describe('Beta Calculations', () => {
  it('should lever beta correctly', () => {
    const unleveredBeta = 1.0;
    const debtToEquityRatio = 1.0; // D/E = 1
    const taxRate = 0.25;

    const leveredBeta = leverBeta(unleveredBeta, debtToEquityRatio, taxRate);

    // βL = 1.0 × [1 + (1 - 0.25) × 1.0] = 1.0 × 1.75 = 1.75
    expect(leveredBeta).toBeCloseTo(1.75, 3);
  });

  it('should unlever beta correctly', () => {
    const leveredBeta = 1.75;
    const debtToEquityRatio = 1.0;
    const taxRate = 0.25;

    const unleveredBeta = unleverBeta(leveredBeta, debtToEquityRatio, taxRate);

    // βU = 1.75 / [1 + (1 - 0.25) × 1.0] = 1.75 / 1.75 = 1.0
    expect(unleveredBeta).toBeCloseTo(1.0, 3);
  });

  it('should handle zero debt (beta unchanged)', () => {
    const unleveredBeta = 1.2;
    const debtToEquityRatio = 0;
    const taxRate = 0.25;

    const leveredBeta = leverBeta(unleveredBeta, debtToEquityRatio, taxRate);

    // With no debt, levered beta equals unlevered beta
    expect(leveredBeta).toBeCloseTo(unleveredBeta, 3);
  });

  it('should be reversible (lever then unlever)', () => {
    const originalBeta = 1.0;
    const debtToEquityRatio = 1.5;
    const taxRate = 0.30;

    const levered = leverBeta(originalBeta, debtToEquityRatio, taxRate);
    const unlevered = unleverBeta(levered, debtToEquityRatio, taxRate);

    expect(unlevered).toBeCloseTo(originalBeta, 3);
  });
});

describe('Free Cash Flow Calculations', () => {
  it('should calculate FCFF correctly', () => {
    const inputs = {
      netIncome: 100_000_000,
      nonCashCharges: 20_000_000,
      interestExpense: 10_000_000,
      taxRate: 0.25,
      fixedCapitalInvestment: 30_000_000,
      workingCapitalInvestment: 5_000_000,
    };

    const fcff = calculateFCFF(inputs);

    // FCFF = NI + NCC + Int(1-T) - FCInv - WCInv
    // FCFF = 100M + 20M + 10M(0.75) - 30M - 5M
    // FCFF = 100M + 20M + 7.5M - 30M - 5M = 92.5M
    expect(fcff).toBeCloseTo(92_500_000, -3);
  });

  it('should calculate FCFE correctly', () => {
    const inputs = {
      cashFlowFromOperations: 120_000_000,
      fixedCapitalInvestment: 30_000_000,
      netBorrowing: 10_000_000,
    };

    const fcfe = calculateFCFE(inputs);

    // FCFE = CFO - FCInv + Net Borrowing
    // FCFE = 120M - 30M + 10M = 100M
    expect(fcfe).toBe(100_000_000);
  });

  it('should handle negative net borrowing (debt repayment)', () => {
    const inputs = {
      cashFlowFromOperations: 120_000_000,
      fixedCapitalInvestment: 30_000_000,
      netBorrowing: -10_000_000, // Debt repayment
    };

    const fcfe = calculateFCFE(inputs);

    // FCFE = 120M - 30M - 10M = 80M
    expect(fcfe).toBe(80_000_000);
  });
});

describe('Risk-Adjusted Metrics', () => {
  it('should calculate Sharpe Ratio correctly', () => {
    const portfolioReturn = 0.15;
    const riskFreeRate = 0.05;
    const standardDeviation = 0.20;

    const sharpe = calculateSharpeRatio(portfolioReturn, riskFreeRate, standardDeviation);

    // Sharpe = (0.15 - 0.05) / 0.20 = 0.10 / 0.20 = 0.5
    expect(sharpe).toBeCloseTo(0.5, 3);
  });

  it('should handle zero standard deviation in Sharpe Ratio', () => {
    const sharpe = calculateSharpeRatio(0.15, 0.05, 0);
    expect(sharpe).toBe(0);
  });

  it('should calculate Treynor Ratio correctly', () => {
    const portfolioReturn = 0.15;
    const riskFreeRate = 0.05;
    const beta = 1.2;

    const treynor = calculateTreynorRatio(portfolioReturn, riskFreeRate, beta);

    // Treynor = (0.15 - 0.05) / 1.2 = 0.10 / 1.2 = 0.0833...
    expect(treynor).toBeCloseTo(0.0833, 3);
  });

  it('should handle zero beta in Treynor Ratio', () => {
    const treynor = calculateTreynorRatio(0.15, 0.05, 0);
    expect(treynor).toBe(0);
  });

  it("should calculate Jensen's Alpha correctly", () => {
    const portfolioReturn = 0.15;
    const riskFreeRate = 0.05;
    const beta = 1.2;
    const marketReturn = 0.12;

    const alpha = calculateJensensAlpha(portfolioReturn, riskFreeRate, beta, marketReturn);

    // Expected return (CAPM) = 0.05 + 1.2 × (0.12 - 0.05) = 0.134
    // Alpha = 0.15 - 0.134 = 0.016
    expect(alpha).toBeCloseTo(0.016, 3);
  });

  it("should return negative alpha for underperformance", () => {
    const portfolioReturn = 0.10;
    const riskFreeRate = 0.05;
    const beta = 1.2;
    const marketReturn = 0.12;

    const alpha = calculateJensensAlpha(portfolioReturn, riskFreeRate, beta, marketReturn);

    // Expected return = 0.134, Actual = 0.10
    // Alpha = 0.10 - 0.134 = -0.034
    expect(alpha).toBeLessThan(0);
  });

  it('should calculate Information Ratio correctly', () => {
    const portfolioReturn = 0.15;
    const benchmarkReturn = 0.12;
    const trackingError = 0.05;

    const ir = calculateInformationRatio(portfolioReturn, benchmarkReturn, trackingError);

    // IR = (0.15 - 0.12) / 0.05 = 0.03 / 0.05 = 0.6
    expect(ir).toBeCloseTo(0.6, 3);
  });

  it('should handle zero tracking error in Information Ratio', () => {
    const ir = calculateInformationRatio(0.15, 0.12, 0);
    expect(ir).toBe(0);
  });
});

describe('Input Validation', () => {
  describe('CAPM Validation', () => {
    it('should accept valid CAPM inputs', () => {
      const errors = validateCAPMInputs(0.20, 1.2, 0.35);
      expect(errors).toHaveLength(0);
    });

    it('should reject risk-free rate outside valid range', () => {
      const errors1 = validateCAPMInputs(-0.01, 1.2, 0.35);
      expect(errors1.length).toBeGreaterThan(0);

      const errors2 = validateCAPMInputs(0.51, 1.2, 0.35);
      expect(errors2.length).toBeGreaterThan(0);
    });

    it('should reject beta outside valid range', () => {
      const errors1 = validateCAPMInputs(0.20, -2.1, 0.35);
      expect(errors1.length).toBeGreaterThan(0);

      const errors2 = validateCAPMInputs(0.20, 3.1, 0.35);
      expect(errors2.length).toBeGreaterThan(0);
    });

    it('should reject market return outside valid range', () => {
      const errors1 = validateCAPMInputs(0.20, 1.2, -0.51);
      expect(errors1.length).toBeGreaterThan(0);

      const errors2 = validateCAPMInputs(0.20, 1.2, 1.01);
      expect(errors2.length).toBeGreaterThan(0);
    });
  });

  describe('WACC Validation', () => {
    it('should accept valid WACC inputs', () => {
      const inputs = {
        equityValue: 100_000_000,
        debtValue: 50_000_000,
        costOfEquity: 0.15,
        costOfDebt: 0.08,
        taxRate: 0.25,
      };

      const errors = validateWACCInputs(inputs);
      expect(errors).toHaveLength(0);
    });

    it('should reject zero or negative equity value', () => {
      const inputs = {
        equityValue: 0,
        debtValue: 50_000_000,
        costOfEquity: 0.15,
        costOfDebt: 0.08,
        taxRate: 0.25,
      };

      const errors = validateWACCInputs(inputs);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject negative debt value', () => {
      const inputs = {
        equityValue: 100_000_000,
        debtValue: -10_000_000,
        costOfEquity: 0.15,
        costOfDebt: 0.08,
        taxRate: 0.25,
      };

      const errors = validateWACCInputs(inputs);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should warn when cost of equity is less than cost of debt', () => {
      const inputs = {
        equityValue: 100_000_000,
        debtValue: 50_000_000,
        costOfEquity: 0.06, // Lower than debt cost
        costOfDebt: 0.08,
        taxRate: 0.25,
      };

      const errors = validateWACCInputs(inputs);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('هشدار');
    });
  });

  describe('FCFF Validation', () => {
    it('should accept valid FCFF inputs', () => {
      const inputs = {
        netIncome: 100_000_000,
        nonCashCharges: 20_000_000,
        interestExpense: 10_000_000,
        taxRate: 0.25,
        fixedCapitalInvestment: 30_000_000,
        workingCapitalInvestment: 5_000_000,
      };

      const errors = validateFCFFInputs(inputs);
      expect(errors).toHaveLength(0);
    });

    it('should reject negative non-cash charges', () => {
      const inputs = {
        netIncome: 100_000_000,
        nonCashCharges: -20_000_000,
        interestExpense: 10_000_000,
        taxRate: 0.25,
        fixedCapitalInvestment: 30_000_000,
        workingCapitalInvestment: 5_000_000,
      };

      const errors = validateFCFFInputs(inputs);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject tax rate outside valid range', () => {
      const inputs1 = {
        netIncome: 100_000_000,
        nonCashCharges: 20_000_000,
        interestExpense: 10_000_000,
        taxRate: -0.01,
        fixedCapitalInvestment: 30_000_000,
        workingCapitalInvestment: 5_000_000,
      };

      const errors1 = validateFCFFInputs(inputs1);
      expect(errors1.length).toBeGreaterThan(0);

      const inputs2 = { ...inputs1, taxRate: 1.01 };
      const errors2 = validateFCFFInputs(inputs2);
      expect(errors2.length).toBeGreaterThan(0);
    });
  });
});

describe('Edge Cases', () => {
  it('should handle very large numbers in WACC', () => {
    const inputs = {
      equityValue: 1_000_000_000_000, // 1 trillion
      debtValue: 500_000_000_000,
      costOfEquity: 0.15,
      costOfDebt: 0.08,
      taxRate: 0.25,
    };

    const result = calculateWACC(inputs);
    expect(result.wacc).toBeCloseTo(0.12, 3);
  });

  it('should handle very small numbers in Sharpe Ratio', () => {
    const sharpe = calculateSharpeRatio(0.0001, 0.00005, 0.0002);
    expect(sharpe).toBeCloseTo(0.25, 3);
  });

  it('should handle negative net income in FCFF', () => {
    const inputs = {
      netIncome: -50_000_000,
      nonCashCharges: 20_000_000,
      interestExpense: 10_000_000,
      taxRate: 0.25,
      fixedCapitalInvestment: 30_000_000,
      workingCapitalInvestment: 5_000_000,
    };

    const fcff = calculateFCFF(inputs);
    expect(fcff).toBeLessThan(0); // Negative FCFF is valid
  });
});

describe('Iranian Market Defaults', () => {
  it('should have reasonable default values', () => {
    expect(IRANIAN_MARKET_DEFAULTS.marketReturn).toBeGreaterThan(0);
    expect(IRANIAN_MARKET_DEFAULTS.riskFreeRate).toBeGreaterThan(0);
    expect(IRANIAN_MARKET_DEFAULTS.riskFreeRate).toBeLessThan(IRANIAN_MARKET_DEFAULTS.marketReturn);
    expect(IRANIAN_MARKET_DEFAULTS.corporateTaxRate).toBeGreaterThanOrEqual(0);
    expect(IRANIAN_MARKET_DEFAULTS.corporateTaxRate).toBeLessThanOrEqual(1);
    expect(IRANIAN_MARKET_DEFAULTS.defaultBeta).toBeGreaterThan(0);
  });

  it('should produce reasonable CAPM results with defaults', () => {
    const result = calculateCAPM(
      IRANIAN_MARKET_DEFAULTS.riskFreeRate,
      IRANIAN_MARKET_DEFAULTS.defaultBeta,
      IRANIAN_MARKET_DEFAULTS.marketReturn
    );

    // Expected return should be between risk-free and market + risk premium
    expect(result.expectedReturn).toBeGreaterThan(IRANIAN_MARKET_DEFAULTS.riskFreeRate);
    expect(result.expectedReturn).toBeLessThan(IRANIAN_MARKET_DEFAULTS.marketReturn + 0.1);
  });
});
