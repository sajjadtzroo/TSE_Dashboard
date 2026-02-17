/**
 * Privilege Analysis Module
 * CFA Level 1 & 2 Framework for Buy vs Wait Decision Analysis
 *
 * This module calculates:
 * - Break-even privilege purchase price
 * - Maximum acceptable waiting period
 * - Scenario comparisons (Wait vs Buy vs Reject)
 * - Alternative strategy suggestions
 */

import { calculatePMT, AnnuityType } from './timeValueOfMoney';
import { formatCurrency } from './financialCalculations';

export interface ScenarioResult {
  name: string;
  npv: number;
  decision: 'ACCEPT' | 'REJECT' | 'BASELINE';
  description: string;
}

export interface Alternative {
  type: 'REDUCE_WAIT' | 'INCREASE_LEVERAGE' | 'EXTEND_REPAYMENT';
  description: string;
  newNPV: number;
  parameters: {
    waitMonths?: number;
    loanAmount?: number;
    repaymentMonths?: number;
  };
}

export interface BreakEvenResult {
  breakEvenPrice: number;
  loanBenefit: number;
  costOfWaiting: number;
  decision: 'BUY' | 'REJECT';
}

export interface MaxWaitResult {
  maxWaitMonths: number;
  canAffordWait: (actualMonths: number) => boolean;
}

export interface ScenarioAnalysis {
  scenarioA: ScenarioResult;  // Wait
  scenarioB: ScenarioResult | null;  // Buy privilege (if price provided)
  scenarioC: ScenarioResult;  // Reject
  recommendation: 'WAIT' | 'BUY_PRIVILEGE' | 'REJECT' | 'NEGOTIATE';
  reasoning: string;
  breakEvenPrice: number;
  maxWaitMonths: number;
}

/**
 * Calculate break-even price for purchasing loan privilege
 * Based on CFA Level 2 framework
 *
 * Formula:
 * Break-Even Price = PV(Loan Benefit) - Cost of Waiting
 *
 * Where:
 * - PV(Loan Benefit) = Loan Amount - PV(Future Payments discounted at CAPM rate)
 * - Cost of Waiting = Deposit × ((1 + r_capm)^months - 1)
 *
 * @param depositAmount Amount of deposit required
 * @param waitMonths Number of months to wait
 * @param loanAmount Loan amount to receive
 * @param loanRate Bank's annual interest rate (e.g., 0.23 for 23%)
 * @param repaymentMonths Loan repayment period in months
 * @param capmRate Opportunity cost / CAPM rate (e.g., 0.45 for 45%)
 * @returns Break-even analysis result
 */
export function calculateBreakEvenPrice(
  depositAmount: number,
  waitMonths: number,
  loanAmount: number,
  loanRate: number,
  repaymentMonths: number,
  capmRate: number
): BreakEvenResult {
  // 1. Calculate monthly rates
  const r_capm_monthly = Math.pow(1 + capmRate, 1/12) - 1;
  const r_bank_monthly = loanRate / 12;

  // 2. Calculate monthly payment (negative value means outflow)
  const monthlyPayment = calculatePMT(
    -loanAmount,  // Negative because it's money received
    0,            // No future value
    r_bank_monthly,
    repaymentMonths,
    AnnuityType.ORDINARY
  );

  // 3. Calculate PV of future payments discounted at CAPM rate
  // (This represents the true cost of payments in today's dollars)
  let pvPayments = 0;
  for (let i = 1; i <= repaymentMonths; i++) {
    pvPayments += monthlyPayment / Math.pow(1 + r_capm_monthly, i);
  }

  // 4. Loan benefit = What you get - What you pay (in PV terms)
  // This is the net present value of having access to the loan
  const loanBenefit = loanAmount - pvPayments;

  // 5. Cost of waiting = Opportunity cost of blocked deposit
  // This is what you could have earned if you invested the deposit elsewhere
  const costOfWaiting = depositAmount * (
    Math.pow(1 + r_capm_monthly, waitMonths) - 1
  );

  // 6. Break-even price = Maximum you should pay to skip the wait
  // If the market price is below this, buying privilege is profitable
  const breakEvenPrice = loanBenefit - costOfWaiting;

  return {
    breakEvenPrice: Math.max(0, breakEvenPrice),
    loanBenefit,
    costOfWaiting,
    decision: breakEvenPrice > 0 ? 'BUY' : 'REJECT'
  };
}

/**
 * Calculate maximum acceptable wait time
 * Returns months before deal becomes unprofitable
 *
 * Solves for t where: depositAmount × ((1 + r)^t - 1) = loanBenefit
 * Uses binary search for efficient calculation
 *
 * @param depositAmount Amount of deposit required
 * @param loanAmount Loan amount to receive
 * @param loanRate Bank's annual interest rate
 * @param repaymentMonths Loan repayment period in months
 * @param capmRate Opportunity cost / CAPM rate
 * @returns Maximum wait time analysis
 */
export function calculateMaxWaitTime(
  depositAmount: number,
  loanAmount: number,
  loanRate: number,
  repaymentMonths: number,
  capmRate: number
): MaxWaitResult {
  const r_capm_monthly = Math.pow(1 + capmRate, 1/12) - 1;
  const r_bank_monthly = loanRate / 12;

  // Calculate loan benefit (constant regardless of wait time)
  const monthlyPayment = calculatePMT(
    -loanAmount,
    0,
    r_bank_monthly,
    repaymentMonths,
    AnnuityType.ORDINARY
  );

  let pvPayments = 0;
  for (let i = 1; i <= repaymentMonths; i++) {
    pvPayments += monthlyPayment / Math.pow(1 + r_capm_monthly, i);
  }
  const loanBenefit = loanAmount - pvPayments;

  // If loan benefit is negative, even 0 wait time is too much
  if (loanBenefit <= 0) {
    return {
      maxWaitMonths: 0,
      canAffordWait: (actualMonths: number) => actualMonths === 0
    };
  }

  // Binary search for max wait time
  // Find t where: depositAmount × ((1 + r)^t - 1) = loanBenefit
  let low = 0;
  let high = 120; // Max search 120 months (10 years)
  let maxMonths = 0;

  while (high - low > 0.01) {
    const mid = (low + high) / 2;
    const cost = depositAmount * (Math.pow(1 + r_capm_monthly, mid) - 1);

    if (cost < loanBenefit) {
      low = mid;
      maxMonths = mid;
    } else {
      high = mid;
    }
  }

  return {
    maxWaitMonths: Math.floor(maxMonths * 10) / 10, // Round to 0.1 precision
    canAffordWait: (actualMonths: number) => actualMonths <= maxMonths
  };
}

/**
 * Analyze three scenarios: Wait, Buy Privilege, Reject
 * Provides comprehensive comparison with recommendations
 *
 * @param depositAmount Amount of deposit required
 * @param waitMonths Number of months to wait
 * @param loanAmount Loan amount to receive
 * @param loanRate Bank's annual interest rate
 * @param repaymentMonths Loan repayment period in months
 * @param capmRate Opportunity cost / CAPM rate
 * @param privilegePrice Optional market price for privilege (if available)
 * @returns Complete scenario analysis with recommendation
 */
export function analyzeScenarios(
  depositAmount: number,
  waitMonths: number,
  loanAmount: number,
  loanRate: number,
  repaymentMonths: number,
  capmRate: number,
  privilegePrice?: number
): ScenarioAnalysis {
  const r_capm_monthly = Math.pow(1 + capmRate, 1/12) - 1;
  const r_bank_monthly = loanRate / 12;

  // Calculate common values
  const monthlyPayment = calculatePMT(
    -loanAmount,
    0,
    r_bank_monthly,
    repaymentMonths,
    AnnuityType.ORDINARY
  );

  let pvPayments = 0;
  for (let i = 1; i <= repaymentMonths; i++) {
    pvPayments += monthlyPayment / Math.pow(1 + r_capm_monthly, i);
  }
  const loanBenefit = loanAmount - pvPayments;

  // Scenario A: Wait
  const costOfWaiting = depositAmount * (Math.pow(1 + r_capm_monthly, waitMonths) - 1);
  const npvWait = loanBenefit - costOfWaiting;

  // Scenario B: Buy Privilege (if price provided)
  const npvBuy = privilegePrice !== undefined ? loanBenefit - privilegePrice : null;

  // Scenario C: Reject (baseline = 0, invest elsewhere at CAPM rate)
  const npvReject = 0;

  // Break-even analysis
  const breakEven = calculateBreakEvenPrice(
    depositAmount,
    waitMonths,
    loanAmount,
    loanRate,
    repaymentMonths,
    capmRate
  );

  // Max wait time
  const maxWait = calculateMaxWaitTime(
    depositAmount,
    loanAmount,
    loanRate,
    repaymentMonths,
    capmRate
  );

  // Determine recommendation
  let recommendation: 'WAIT' | 'BUY_PRIVILEGE' | 'REJECT' | 'NEGOTIATE';
  let reasoning: string;

  if (npvWait > 0) {
    recommendation = 'WAIT';
    reasoning = `NPV از انتظار مثبت است (${formatCurrency(npvWait)}). می‌توانید ${waitMonths} ماه منتظر بمانید.`;
  } else if (npvBuy !== null && npvBuy > 0) {
    recommendation = 'BUY_PRIVILEGE';
    reasoning = `خرید امتیاز با قیمت ${formatCurrency(privilegePrice!)} سودآور است (NPV: ${formatCurrency(npvBuy)}).`;
  } else if (breakEven.breakEvenPrice > 0) {
    recommendation = 'NEGOTIATE';
    reasoning = `حداکثر می‌توانید ${formatCurrency(breakEven.breakEvenPrice)} برای خرید امتیاز بپردازید. با این قیمت یا کمتر مذاکره کنید.`;
  } else {
    recommendation = 'REJECT';
    reasoning = `این وام به صرفه نیست. بهتر است سرمایه را با نرخ ${(capmRate * 100).toFixed(1)}% سرمایه‌گذاری کنید.`;
  }

  return {
    scenarioA: {
      name: `انتظار ${waitMonths} ماهه`,
      npv: npvWait,
      decision: npvWait > 0 ? 'ACCEPT' : 'REJECT',
      description: `سپرده ${formatCurrency(depositAmount)} و انتظار ${waitMonths} ماه`
    },
    scenarioB: npvBuy !== null ? {
      name: `خرید امتیاز (${formatCurrency(privilegePrice!)})`,
      npv: npvBuy,
      decision: npvBuy > 0 ? 'ACCEPT' : 'REJECT',
      description: `پرداخت نقدی بدون انتظار`
    } : null,
    scenarioC: {
      name: 'سرمایه‌گذاری جایگزین',
      npv: npvReject,
      decision: 'BASELINE',
      description: `سرمایه‌گذاری با نرخ ${(capmRate * 100).toFixed(1)}%`
    },
    recommendation,
    reasoning,
    breakEvenPrice: breakEven.breakEvenPrice,
    maxWaitMonths: maxWait.maxWaitMonths
  };
}

/**
 * Suggest alternative parameters to make deal profitable
 * Analyzes different scenarios to find better options
 *
 * @param depositAmount Amount of deposit required
 * @param waitMonths Number of months to wait
 * @param loanAmount Loan amount to receive
 * @param loanRate Bank's annual interest rate
 * @param repaymentMonths Loan repayment period in months
 * @param capmRate Opportunity cost / CAPM rate
 * @returns Array of alternative suggestions
 */
export function suggestAlternatives(
  depositAmount: number,
  waitMonths: number,
  loanAmount: number,
  loanRate: number,
  repaymentMonths: number,
  capmRate: number
): Alternative[] {
  const alternatives: Alternative[] = [];
  const current = analyzeScenarios(
    depositAmount,
    waitMonths,
    loanAmount,
    loanRate,
    repaymentMonths,
    capmRate
  );

  // If current deal is unprofitable
  if (current.scenarioA.npv < 0) {
    // Alternative 1: Reduce wait time
    const maxWait = calculateMaxWaitTime(
      depositAmount,
      loanAmount,
      loanRate,
      repaymentMonths,
      capmRate
    );

    if (maxWait.maxWaitMonths > 0 && maxWait.maxWaitMonths < waitMonths) {
      const reducedWaitNPV = analyzeScenarios(
        depositAmount,
        Math.floor(maxWait.maxWaitMonths),
        loanAmount,
        loanRate,
        repaymentMonths,
        capmRate
      );

      alternatives.push({
        type: 'REDUCE_WAIT',
        description: `کاهش انتظار به ${Math.floor(maxWait.maxWaitMonths)} ماه`,
        newNPV: reducedWaitNPV.scenarioA.npv,
        parameters: { waitMonths: Math.floor(maxWait.maxWaitMonths) }
      });
    }

    // Alternative 2: Increase loan leverage (1.5x)
    const higherLoan = loanAmount * 1.5;
    const higherResult = analyzeScenarios(
      depositAmount,
      waitMonths,
      higherLoan,
      loanRate,
      repaymentMonths,
      capmRate
    );

    if (higherResult.scenarioA.npv > current.scenarioA.npv) {
      alternatives.push({
        type: 'INCREASE_LEVERAGE',
        description: `دریافت ${formatCurrency(higherLoan)} (نسبت ۱.۵ برابر)`,
        newNPV: higherResult.scenarioA.npv,
        parameters: { loanAmount: higherLoan }
      });
    }

    // Alternative 3: Extend repayment period (if currently < 24 months)
    if (repaymentMonths < 24) {
      const longerResult = analyzeScenarios(
        depositAmount,
        waitMonths,
        loanAmount,
        loanRate,
        24,
        capmRate
      );

      if (longerResult.scenarioA.npv > current.scenarioA.npv) {
        alternatives.push({
          type: 'EXTEND_REPAYMENT',
          description: `افزایش بازپرداخت به ۲۴ ماه`,
          newNPV: longerResult.scenarioA.npv,
          parameters: { repaymentMonths: 24 }
        });
      }
    }
  }

  return alternatives;
}
