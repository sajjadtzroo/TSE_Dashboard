/**
 * Advanced Financial Calculations - CFA Level 1 & 2
 *
 * This module implements professional-grade financial calculations including:
 * - CAPM (Capital Asset Pricing Model)
 * - WACC (Weighted Average Cost of Capital)
 * - Free Cash Flow Analysis (FCFF, FCFE)
 * - Risk-Adjusted Performance Metrics
 *
 * All formulas follow CFA Institute standards.
 */

// ============================================================================
// CAPM - Capital Asset Pricing Model
// ============================================================================

/**
 * Calculate expected return using CAPM
 * Formula: E(Ri) = Rf + βi × [E(Rm) - Rf]
 *
 * @param riskFreeRate - Risk-free rate (e.g., government bond yield)
 * @param beta - Beta coefficient (systematic risk)
 * @param marketReturn - Expected market return
 * @returns Expected return and risk premium
 */
export function calculateCAPM(
  riskFreeRate: number,
  beta: number,
  marketReturn: number
): { expectedReturn: number; riskPremium: number } {
  const marketRiskPremium = marketReturn - riskFreeRate;
  const expectedReturn = riskFreeRate + (beta * marketRiskPremium);

  return {
    expectedReturn,
    riskPremium: marketRiskPremium,
  };
}

// ============================================================================
// WACC - Weighted Average Cost of Capital
// ============================================================================

export interface WACCInputs {
  equityValue: number;      // Market value of equity
  debtValue: number;        // Market value of debt
  costOfEquity: number;     // Required return on equity (often from CAPM)
  costOfDebt: number;       // Interest rate on debt
  taxRate: number;          // Corporate tax rate
}

export interface WACCResults {
  wacc: number;                 // Weighted average cost of capital
  equityWeight: number;         // E/V
  debtWeight: number;           // D/V
  afterTaxCostOfDebt: number;   // Rd × (1-Tc)
  firmValue: number;            // V = E + D
  equityComponent: number;      // (E/V) × Re
  debtComponent: number;        // (D/V) × Rd × (1-Tc)
}

/**
 * Calculate Weighted Average Cost of Capital
 * Formula: WACC = (E/V × Re) + (D/V × Rd × (1-Tc))
 *
 * @param inputs - WACC calculation inputs
 * @returns Comprehensive WACC results
 */
export function calculateWACC(inputs: WACCInputs): WACCResults {
  const { equityValue, debtValue, costOfEquity, costOfDebt, taxRate } = inputs;

  const firmValue = equityValue + debtValue;
  const equityWeight = equityValue / firmValue;
  const debtWeight = debtValue / firmValue;
  const afterTaxCostOfDebt = costOfDebt * (1 - taxRate);

  const equityComponent = equityWeight * costOfEquity;
  const debtComponent = debtWeight * afterTaxCostOfDebt;
  const wacc = equityComponent + debtComponent;

  return {
    wacc,
    equityWeight,
    debtWeight,
    afterTaxCostOfDebt,
    firmValue,
    equityComponent,
    debtComponent,
  };
}

// ============================================================================
// Beta Calculations - Levered and Unlevered
// ============================================================================

/**
 * Convert unlevered beta to levered beta
 * Formula: βL = βU × [1 + (1-T) × (D/E)]
 *
 * @param unleveredBeta - Beta without financial leverage
 * @param debtToEquityRatio - D/E ratio
 * @param taxRate - Corporate tax rate
 * @returns Levered beta
 */
export function leverBeta(
  unleveredBeta: number,
  debtToEquityRatio: number,
  taxRate: number
): number {
  return unleveredBeta * (1 + (1 - taxRate) * debtToEquityRatio);
}

/**
 * Convert levered beta to unlevered beta
 * Formula: βU = βL / [1 + (1-T) × (D/E)]
 *
 * @param leveredBeta - Beta with financial leverage
 * @param debtToEquityRatio - D/E ratio
 * @param taxRate - Corporate tax rate
 * @returns Unlevered beta
 */
export function unleverBeta(
  leveredBeta: number,
  debtToEquityRatio: number,
  taxRate: number
): number {
  return leveredBeta / (1 + (1 - taxRate) * debtToEquityRatio);
}

// ============================================================================
// Free Cash Flow Analysis
// ============================================================================

export interface FCFFInputs {
  netIncome: number;                  // Net income
  nonCashCharges: number;             // Depreciation + Amortization
  interestExpense: number;            // Interest expense
  taxRate: number;                    // Tax rate
  fixedCapitalInvestment: number;     // Capital expenditures
  workingCapitalInvestment: number;   // Change in working capital
}

/**
 * Calculate Free Cash Flow to Firm
 * Formula: FCFF = NI + NCC + Int(1-T) - FCInv - WCInv
 *
 * @param inputs - FCFF calculation inputs
 * @returns Free cash flow to firm
 */
export function calculateFCFF(inputs: FCFFInputs): number {
  const {
    netIncome,
    nonCashCharges,
    interestExpense,
    taxRate,
    fixedCapitalInvestment,
    workingCapitalInvestment,
  } = inputs;

  const afterTaxInterest = interestExpense * (1 - taxRate);

  return (
    netIncome +
    nonCashCharges +
    afterTaxInterest -
    fixedCapitalInvestment -
    workingCapitalInvestment
  );
}

export interface FCFEInputs {
  cashFlowFromOperations: number;     // Operating cash flow
  fixedCapitalInvestment: number;     // Capital expenditures
  netBorrowing: number;               // New debt issued - debt repaid
}

/**
 * Calculate Free Cash Flow to Equity
 * Formula: FCFE = CFO - FCInv + Net Borrowing
 *
 * @param inputs - FCFE calculation inputs
 * @returns Free cash flow to equity
 */
export function calculateFCFE(inputs: FCFEInputs): number {
  const {
    cashFlowFromOperations,
    fixedCapitalInvestment,
    netBorrowing,
  } = inputs;

  return (
    cashFlowFromOperations -
    fixedCapitalInvestment +
    netBorrowing
  );
}

// ============================================================================
// Risk-Adjusted Performance Metrics
// ============================================================================

/**
 * Calculate Sharpe Ratio
 * Formula: (Rp - Rf) / σp
 *
 * @param portfolioReturn - Portfolio return
 * @param riskFreeRate - Risk-free rate
 * @param standardDeviation - Portfolio standard deviation
 * @returns Sharpe ratio (return per unit of total risk)
 */
export function calculateSharpeRatio(
  portfolioReturn: number,
  riskFreeRate: number,
  standardDeviation: number
): number {
  if (standardDeviation === 0) return 0;
  return (portfolioReturn - riskFreeRate) / standardDeviation;
}

/**
 * Calculate Treynor Ratio
 * Formula: (Rp - Rf) / βp
 *
 * @param portfolioReturn - Portfolio return
 * @param riskFreeRate - Risk-free rate
 * @param beta - Portfolio beta
 * @returns Treynor ratio (return per unit of systematic risk)
 */
export function calculateTreynorRatio(
  portfolioReturn: number,
  riskFreeRate: number,
  beta: number
): number {
  if (beta === 0) return 0;
  return (portfolioReturn - riskFreeRate) / beta;
}

/**
 * Calculate Jensen's Alpha
 * Formula: αp = Rp - [Rf + βp(Rm - Rf)]
 *
 * @param portfolioReturn - Actual portfolio return
 * @param riskFreeRate - Risk-free rate
 * @param beta - Portfolio beta
 * @param marketReturn - Market return
 * @returns Jensen's alpha (excess return above CAPM expectation)
 */
export function calculateJensensAlpha(
  portfolioReturn: number,
  riskFreeRate: number,
  beta: number,
  marketReturn: number
): number {
  const capm = calculateCAPM(riskFreeRate, beta, marketReturn);
  return portfolioReturn - capm.expectedReturn;
}

/**
 * Calculate Information Ratio
 * Formula: (Rp - Rb) / TE
 *
 * @param portfolioReturn - Portfolio return
 * @param benchmarkReturn - Benchmark return
 * @param trackingError - Standard deviation of excess returns
 * @returns Information ratio (active return per unit of active risk)
 */
export function calculateInformationRatio(
  portfolioReturn: number,
  benchmarkReturn: number,
  trackingError: number
): number {
  if (trackingError === 0) return 0;
  return (portfolioReturn - benchmarkReturn) / trackingError;
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validate CAPM inputs
 */
export function validateCAPMInputs(
  riskFreeRate: number,
  beta: number,
  marketReturn: number
): string[] {
  const errors: string[] = [];

  if (riskFreeRate < 0 || riskFreeRate > 0.5) {
    errors.push('نرخ بدون ریسک باید بین 0٪ تا 50٪ باشد');
  }

  if (beta < -2 || beta > 3) {
    errors.push('بتا باید بین -2 تا 3 باشد');
  }

  if (marketReturn < -0.5 || marketReturn > 1) {
    errors.push('بازده بازار باید بین -50٪ تا 100٪ باشد');
  }

  return errors;
}

/**
 * Validate WACC inputs
 */
export function validateWACCInputs(inputs: WACCInputs): string[] {
  const errors: string[] = [];

  if (inputs.equityValue <= 0) {
    errors.push('ارزش سهام باید بزرگتر از صفر باشد');
  }

  if (inputs.debtValue < 0) {
    errors.push('ارزش بدهی نمی‌تواند منفی باشد');
  }

  if (inputs.costOfEquity < inputs.costOfDebt) {
    errors.push('هشدار: هزینه سهام معمولاً باید بیشتر از هزینه بدهی باشد');
  }

  if (inputs.taxRate < 0 || inputs.taxRate > 1) {
    errors.push('نرخ مالیات باید بین 0٪ تا 100٪ باشد');
  }

  if (inputs.costOfDebt < 0 || inputs.costOfDebt > 1) {
    errors.push('هزینه بدهی باید بین 0٪ تا 100٪ باشد');
  }

  return errors;
}

/**
 * Validate Free Cash Flow inputs
 */
export function validateFCFFInputs(inputs: FCFFInputs): string[] {
  const errors: string[] = [];

  if (inputs.nonCashCharges < 0) {
    errors.push('هزینه‌های غیرنقدی نمی‌تواند منفی باشد');
  }

  if (inputs.taxRate < 0 || inputs.taxRate > 1) {
    errors.push('نرخ مالیات باید بین 0٪ تا 100٪ باشد');
  }

  return errors;
}

// ============================================================================
// Iranian Market Defaults
// ============================================================================

export const IRANIAN_MARKET_DEFAULTS = {
  marketReturn: 0.35,        // 35% annual (Tehran Stock Exchange historical)
  riskFreeRate: 0.20,        // 20% annual (government bonds/deposits)
  corporateTaxRate: 0.25,    // 25% corporate tax rate
  defaultBeta: 1.2,          // Financial sector typical beta
  conservativeDE: 0.5,       // Conservative debt-to-equity ratio
  moderateDE: 1.0,           // Moderate debt-to-equity ratio
  aggressiveDE: 2.0,         // Aggressive debt-to-equity ratio
};
