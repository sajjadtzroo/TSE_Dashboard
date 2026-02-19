/**
 * Loan Analysis Engine
 * Ported from persian_loan/frontend/src/features/calculator/calculatorEngine.ts
 * Adapted to use the main app's LoanWithBank type.
 */

import type { LoanWithBank } from '../../../types';
import {
  calculateIRR,
  calculateMIRR,
  calculateNPV,
  calculateMonthlyPayment,
  generateLoanCashFlow,
  calculateTotalLoanCost,
  calculateOpportunityCost,
  calculateEAR,
  parseAmount,
  parseRepaymentMonths,
} from '../../../utils/loans/financialCalculations';

export interface AnalysisInputs {
  depositAmount: number;        // How much the user deposits (Rials)
  depositMonths: number;        // Lock-up period (1–24 months)
  loanMonths: number;           // Repayment duration (from product range)
  externalReturnRate: number;   // Alternative investment rate (decimal, e.g. 0.25)
  riskTolerance: 'low' | 'medium' | 'high';
}

export interface LoanAnalysisResult {
  productId: string;
  bankName: string;
  loanName: string;
  method: string;
  loanAmount: number;
  depositMultiplier: number | null;
  monthlyPayment: number;
  irr: number | null;           // Annualized IRR (decimal)
  mirr: number | null;          // Annualized MIRR
  npv: number;                  // Net Present Value (Rials)
  totalCost: number;
  effectiveRate: number;        // EAR
  opportunityCost: number;
  score: number;                // 0–100 recommendation score
  guarantorRequired: boolean;
  cashFlows: number[];
}

/**
 * Resolve the loan amount from the product's deposit multiplier / ratio / max amount.
 */
function resolveLoanAmount(
  loan: LoanWithBank,
  depositAmount: number,
  maxAmount: number,
): { loanAmount: number; depositMultiplier: number | null } {
  let loanAmount = 0;
  let depositMultiplier: number | null = null;

  // 1. Try coefficientTable first (closest match)
  if (loan.coefficientTable && loan.coefficientTable.length > 0) {
    // Attempt exact month match on the inputs (loanMonths not a deposit duration — use depositMonths)
    // We just pick the first / best row available since depositMonths isn't passed here.
    // Use first row as a representative value.
    const firstRow = loan.coefficientTable[0];
    const coeffStr = firstRow.loanPercent || firstRow.coefficient || '100%';
    const match = coeffStr.match(/(\d+)/);
    if (match) {
      depositMultiplier = parseFloat(match[1]) / 100;
      loanAmount = depositAmount * depositMultiplier;
    }
  }

  // 2. Try loanMultiplier field (e.g., "370%", "200%")
  if (depositMultiplier === null && loan.loanMultiplier) {
    const match = loan.loanMultiplier.match(/(\d+)/);
    if (match) {
      depositMultiplier = parseFloat(match[1]) / 100;
      loanAmount = depositAmount * depositMultiplier;
    }
  }

  // 3. Try depositToFacilityRatio (e.g., "1:3.7", "1:2")
  if (depositMultiplier === null && loan.depositToFacilityRatio) {
    const ratioMatch = loan.depositToFacilityRatio.match(/1[:\s]*(\d+\.?\d*)/);
    if (ratioMatch) {
      depositMultiplier = parseFloat(ratioMatch[1]);
      loanAmount = depositAmount * depositMultiplier;
    }
  }

  // 4. Fallback: use max amount (for deposit-free loans)
  if (depositMultiplier === null) {
    loanAmount = maxAmount;
  }

  // Cap at max
  loanAmount = Math.min(loanAmount, maxAmount);

  return { loanAmount, depositMultiplier };
}

/**
 * Calculate recommendation score for a loan (0–100).
 */
function calculateScore(
  irr: number | null,
  npv: number,
  loanAmount: number,
  totalCost: number,
  effectiveRate: number,
  opportunityCost: number,
  riskTolerance: 'low' | 'medium' | 'high',
): number {
  let score = 50; // Base score

  // IRR contribution: max +25
  if (irr !== null) {
    score += Math.min(irr * 100, 25);
  }

  // NPV contribution: positive = max +15, negative = -10
  if (npv > 0) {
    const npvRatio = npv / loanAmount;
    score += Math.min(npvRatio * 100, 15);
  } else {
    score -= 10;
  }

  // Cost efficiency: max +10
  const costRatio = totalCost / loanAmount;
  if (costRatio < 0.2) {
    score += 10;
  } else if (costRatio < 0.4) {
    score += 5;
  }

  // Opportunity cost: +5 if low
  const opportunityCostRatio = opportunityCost / (loanAmount || 1);
  if (opportunityCostRatio < 0.1) {
    score += 5;
  }

  // Risk adjustments
  if (riskTolerance === 'low') {
    // Prefer lower effective rates
    score -= effectiveRate * 20;
  } else if (riskTolerance === 'high') {
    // Prefer higher loan amounts
    score += (loanAmount / 1_000_000_000) * 5;
    score += 10; // bonus for high-risk tolerance acceptance
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Analyze a single loan product.
 * Returns null if the loan cannot be analyzed (missing data, zero amount).
 */
export function analyzeLoan(
  loan: LoanWithBank,
  inputs: AnalysisInputs,
): LoanAnalysisResult | null {
  try {
    const maxAmount = parseAmount(loan.maxAmount || '0');
    const interestRate = (loan.interestRateNumeric || 0) / 100;

    if (maxAmount === 0) {
      return null;
    }

    const { loanAmount, depositMultiplier } = resolveLoanAmount(loan, inputs.depositAmount, maxAmount);

    if (loanAmount === 0) {
      return null;
    }

    const commission = 0; // No commission info available

    // Generate cash flows
    const cashFlows = generateLoanCashFlow(
      loanAmount,
      inputs.depositAmount,
      inputs.depositMonths,
      interestRate,
      inputs.loanMonths,
      commission,
    );

    const irr = calculateIRR(cashFlows);

    const mirr = calculateMIRR(
      cashFlows,
      inputs.externalReturnRate,
      inputs.externalReturnRate,
    );

    const npv = calculateNPV(cashFlows, inputs.externalReturnRate / 12); // monthly discount

    const totalCost = calculateTotalLoanCost(loanAmount, interestRate, inputs.loanMonths, commission);

    const monthlyPayment = calculateMonthlyPayment(loanAmount, interestRate, inputs.loanMonths);

    const opportunityCost = calculateOpportunityCost(
      inputs.depositAmount,
      inputs.depositMonths,
      inputs.externalReturnRate,
    );

    const effectiveRate = calculateEAR(interestRate, 12);

    const score = calculateScore(
      irr,
      npv,
      loanAmount,
      totalCost,
      effectiveRate,
      opportunityCost,
      inputs.riskTolerance,
    );

    // Determine guarantor requirement
    const guarantorRequired = !!(
      loan.guarantor === true ||
      loan.guarantor === 'required' ||
      loan.guarantor === 'بله'
    );

    return {
      productId: loan.id,
      bankName: loan.bankNameFA,
      loanName: loan.nameFA,
      method: loan.calculationMethod || loan.category || 'نامشخص',
      loanAmount,
      depositMultiplier,
      monthlyPayment,
      irr,
      mirr,
      npv,
      totalCost,
      effectiveRate,
      opportunityCost,
      score,
      guarantorRequired,
      cashFlows,
    };
  } catch (error) {
    console.error('Error analyzing loan:', loan.id, error);
    return null;
  }
}

/**
 * Analyze all loan products and return sorted results (highest score first).
 */
export function analyzeAllLoans(
  loans: LoanWithBank[],
  inputs: AnalysisInputs,
): LoanAnalysisResult[] {
  const results: LoanAnalysisResult[] = [];

  for (const loan of loans) {
    const result = analyzeLoan(loan, inputs);
    if (result !== null) {
      results.push(result);
    }
  }

  return results.sort((a, b) => b.score - a.score);
}
