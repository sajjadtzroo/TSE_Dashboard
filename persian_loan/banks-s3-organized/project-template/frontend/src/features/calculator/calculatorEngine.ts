/**
 * Calculator Engine
 * Core logic for analyzing loans and ranking them
 */

import type { LoanWithBank } from '../../types';
import type { CalculatorInputs, LoanAnalysis } from './types';
import {
  calculateIRR,
  calculateMIRR,
  calculateNPV,
  calculateMonthlyPayment,
  generateLoanCashFlow,
  calculateTotalLoanCost,
  calculateOpportunityCost,
  parseAmount,
} from '../../utils/financialCalculations';
import {
  calculateCAPM,
  calculateWACC,
  IRANIAN_MARKET_DEFAULTS,
} from '../../utils/advancedFinancial';
import type { WACCResults, CAPMResults } from '../../types/advancedFinancial';

/**
 * Analyze a single loan based on user inputs
 */
export function analyzeLoan(
  loan: LoanWithBank,
  inputs: CalculatorInputs
): LoanAnalysis | null {
  try {
    // Extract loan parameters
    const maxAmount = parseAmount(loan.maxAmount || '0');
    const interestRate = (loan.interestRateNumeric || 0) / 100; // Convert to decimal

    if (maxAmount === 0 || !loan.interestRate) {
      return null; // Skip loans without amount or rate info
    }

    // Calculate loan amount based on deposit (varies by loan type)
    let loanAmount = 0;

    // For deposit-based loans, calculate based on coefficient
    if (loan.category?.includes('deposit') && loan.coefficientTable) {
      // Find matching coefficient for user's deposit duration
      const matchingCoefficient = loan.coefficientTable.find(
        (row) => row.depositMonths === inputs.depositMonths
      );

      if (matchingCoefficient) {
        const coefficientStr = matchingCoefficient.loanPercent || '100%';
        const coefficient = parseFloat(coefficientStr) / 100;
        loanAmount = inputs.depositAmount * coefficient;
      } else {
        // Use a default multiplier if no exact match
        loanAmount = inputs.depositAmount * 2;
      }
    } else {
      // For non-deposit loans, use max amount
      loanAmount = maxAmount;
    }

    // Cap loan amount at max
    loanAmount = Math.min(loanAmount, maxAmount);

    if (loanAmount === 0) {
      return null;
    }

    // Generate cash flows
    const cashFlows = generateLoanCashFlow(
      loanAmount,
      inputs.depositAmount,
      inputs.depositMonths,
      interestRate,
      inputs.loanMonths,
      inputs.commission
    );

    // Calculate IRR
    const irr = calculateIRR(cashFlows);

    // Calculate MIRR (using external return rate for both financing and reinvestment)
    const mirr = calculateMIRR(
      cashFlows,
      inputs.externalReturnRate,
      inputs.externalReturnRate
    );

    // Calculate NPV using external return rate as discount rate
    const npv = calculateNPV(cashFlows, inputs.externalReturnRate);

    // Calculate total cost
    const totalCost = calculateTotalLoanCost(
      loanAmount,
      interestRate,
      inputs.loanMonths,
      inputs.commission
    );

    // Calculate monthly payment
    const monthlyPayment = calculateMonthlyPayment(
      loanAmount,
      interestRate,
      inputs.loanMonths
    );

    // Calculate opportunity cost of deposit
    const opportunityCost = calculateOpportunityCost(
      inputs.depositAmount,
      inputs.depositMonths,
      inputs.externalReturnRate
    );

    // Calculate effective rate (APR to EAR)
    const effectiveRate = Math.pow(1 + interestRate / 12, 12) - 1;

    // Calculate recommendation score (0-100)
    const score = calculateScore(
      {
        loanId: loan.id,
        bankId: loan.bankId,
        bankNameFA: loan.bankNameFA,
        loanNameFA: loan.nameFA,
        loanAmount,
        interestRate,
        irr,
        mirr,
        npv,
        totalCost,
        monthlyPayment,
        effectiveRate,
        opportunityCost,
        score: 0,
        cashFlows,
      },
      inputs.riskTolerance
    );

    return {
      loanId: loan.id,
      bankId: loan.bankId,
      bankNameFA: loan.bankNameFA,
      loanNameFA: loan.nameFA,
      loanAmount,
      interestRate,
      irr,
      mirr,
      npv,
      totalCost,
      monthlyPayment,
      effectiveRate,
      opportunityCost,
      score,
      cashFlows,
    };
  } catch (error) {
    console.error('Error analyzing loan:', loan.id, error);
    return null;
  }
}

/**
 * Calculate recommendation score for a loan analysis
 * Higher score = better recommendation
 */
function calculateScore(analysis: LoanAnalysis, riskTolerance: string): number {
  let score = 50; // Base score

  // IRR contribution (higher IRR = better, max +25 points)
  if (analysis.irr) {
    const irrPoints = Math.min(analysis.irr * 100, 25); // Cap at 25%
    score += irrPoints;
  }

  // NPV contribution (positive NPV = better, max +15 points)
  if (analysis.npv > 0) {
    const npvRatio = analysis.npv / analysis.loanAmount;
    score += Math.min(npvRatio * 100, 15);
  } else {
    // Negative NPV penalty
    score -= 10;
  }

  // Cost efficiency (lower cost ratio = better, max +10 points)
  const costRatio = analysis.totalCost / analysis.loanAmount;
  if (costRatio < 0.2) {
    score += 10;
  } else if (costRatio < 0.4) {
    score += 5;
  }

  // Loan amount (higher = better for high risk tolerance)
  if (riskTolerance === 'high') {
    score += (analysis.loanAmount / 1000000000) * 5; // +5 per billion
  }

  // Opportunity cost consideration (lower = better)
  const opportunityCostRatio = analysis.opportunityCost / analysis.loanAmount;
  if (opportunityCostRatio < 0.1) {
    score += 5;
  }

  // Risk adjustment
  if (riskTolerance === 'low') {
    // Prefer lower interest rates
    score -= analysis.effectiveRate * 20;
  } else if (riskTolerance === 'high') {
    // Prefer higher loan amounts
    score += (analysis.loanAmount / analysis.loanAmount) * 10;
  }

  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, score));
}

/**
 * Rank loans by score
 */
export function rankLoans(
  analyses: LoanAnalysis[],
  _riskTolerance: string
): LoanAnalysis[] {
  return analyses
    .filter((a) => a.score > 0)
    .sort((a, b) => b.score - a.score);
}

/**
 * Extended loan analysis with advanced financial metrics (CAPM, WACC)
 */
export interface AdvancedLoanAnalysis extends LoanAnalysis {
  capm?: CAPMResults;
  wacc?: WACCResults;
  waccBasedNPV?: number;
  riskAdjustedScore?: number;
}

/**
 * Analyze a loan with advanced financial metrics
 * Uses CAPM for cost of equity and WACC for risk-adjusted discount rate
 */
export function analyzeLoanWithAdvancedMetrics(
  loan: LoanWithBank,
  inputs: CalculatorInputs,
  beta: number = IRANIAN_MARKET_DEFAULTS.defaultBeta
): AdvancedLoanAnalysis | null {
  // First get traditional analysis
  const baseAnalysis = analyzeLoan(loan, inputs);
  if (!baseAnalysis) {
    return null;
  }

  try {
    const interestRate = (loan.interestRateNumeric || 0) / 100;

    // Calculate CAPM for cost of equity
    const capm = calculateCAPM(
      IRANIAN_MARKET_DEFAULTS.riskFreeRate,
      beta,
      IRANIAN_MARKET_DEFAULTS.marketReturn
    );

    // Determine equity and debt values from deposit ratio
    let equityValue = inputs.depositAmount;
    let debtValue = baseAnalysis.loanAmount;

    // For deposit-based loans, use deposit as equity proxy
    if (loan.category?.includes('deposit')) {
      // Equity = deposit, Debt = loan amount
      equityValue = inputs.depositAmount;
      debtValue = baseAnalysis.loanAmount;
    } else {
      // For non-deposit loans, assume 50/50 split
      const totalValue = baseAnalysis.loanAmount;
      equityValue = totalValue * 0.5;
      debtValue = totalValue * 0.5;
    }

    // Calculate WACC
    const wacc = calculateWACC({
      equityValue,
      debtValue,
      costOfEquity: capm.expectedReturn,
      costOfDebt: interestRate,
      taxRate: IRANIAN_MARKET_DEFAULTS.corporateTaxRate,
    });

    // Calculate NPV using WACC as discount rate
    const waccBasedNPV = calculateNPV(baseAnalysis.cashFlows, wacc.wacc);

    // Calculate risk-adjusted score
    let riskAdjustedScore = baseAnalysis.score;

    // Adjust score based on WACC-based NPV
    if (waccBasedNPV > 0) {
      const npvRatio = waccBasedNPV / baseAnalysis.loanAmount;
      riskAdjustedScore += Math.min(npvRatio * 100, 10); // Up to +10 points
    } else {
      riskAdjustedScore -= 15; // Penalty for negative WACC-based NPV
    }

    // Adjust score based on cost of capital efficiency
    if (baseAnalysis.irr && baseAnalysis.irr > wacc.wacc) {
      const spread = (baseAnalysis.irr - wacc.wacc) * 100;
      riskAdjustedScore += Math.min(spread, 10); // Up to +10 points
    }

    // Ensure score is between 0 and 100
    riskAdjustedScore = Math.max(0, Math.min(100, riskAdjustedScore));

    return {
      ...baseAnalysis,
      capm: {
        expectedReturn: capm.expectedReturn,
        riskPremium: capm.riskPremium,
        requiredReturn: capm.expectedReturn,
      },
      wacc,
      waccBasedNPV,
      riskAdjustedScore,
    };
  } catch (error) {
    console.error('Error calculating advanced metrics for loan:', loan.id, error);
    // Return base analysis if advanced metrics fail
    return baseAnalysis;
  }
}

/**
 * Rank loans using risk-adjusted scores from advanced metrics
 */
export function rankLoansAdvanced(
  analyses: AdvancedLoanAnalysis[]
): AdvancedLoanAnalysis[] {
  return analyses
    .filter((a) => a.riskAdjustedScore !== undefined && a.riskAdjustedScore > 0)
    .sort((a, b) => (b.riskAdjustedScore || 0) - (a.riskAdjustedScore || 0));
}
