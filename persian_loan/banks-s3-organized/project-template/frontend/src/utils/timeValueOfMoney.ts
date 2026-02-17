/**
 * Time Value of Money (TVM) Module
 * CFA Level 2 Compliant Financial Calculations
 *
 * Based on CFA Institute standards and BAII Plus calculator functions
 * References:
 * - CFA Institute Calculator Guide: https://www.cfainstitute.org
 * - TVM Formulas: Standard financial mathematics
 *
 * Key Variables:
 * - N: Number of periods
 * - I/Y: Interest rate per period
 * - PV: Present Value (negative = cash outflow)
 * - PMT: Payment per period (negative = cash outflow)
 * - FV: Future Value (positive = cash inflow)
 */

export interface TVMInputs {
  pv?: number;        // Present Value
  fv?: number;        // Future Value
  pmt?: number;       // Payment
  n?: number;         // Number of periods
  rate?: number;      // Interest rate per period (as decimal, e.g., 0.05 for 5%)
  type?: 0 | 1;       // 0 = ordinary annuity (end), 1 = annuity due (beginning)
}

export enum AnnuityType {
  ORDINARY = 0,       // Payments at end of period
  DUE = 1,            // Payments at beginning of period
}

export enum CompoundingFrequency {
  ANNUAL = 1,
  SEMIANNUAL = 2,
  QUARTERLY = 4,
  MONTHLY = 12,
  DAILY = 365,
  CONTINUOUS = 0,
}

/**
 * Calculate Future Value (FV)
 * Formula: FV = PV × (1 + r)^n + PMT × [((1 + r)^n - 1) / r] × (1 + r × type)
 *
 * @param pv - Present Value (initial amount)
 * @param pmt - Payment per period
 * @param rate - Interest rate per period (decimal)
 * @param n - Number of periods
 * @param type - 0 for ordinary annuity, 1 for annuity due
 * @returns Future Value
 */
export function calculateFV(
  pv: number,
  pmt: number,
  rate: number,
  n: number,
  type: AnnuityType = AnnuityType.ORDINARY
): number {
  if (rate === 0) {
    return -pv - pmt * n;
  }

  const pvFactor = Math.pow(1 + rate, n);
  const pmtFactor = ((pvFactor - 1) / rate) * (1 + rate * type);

  return -pv * pvFactor - pmt * pmtFactor;
}

/**
 * Calculate Present Value (PV)
 * Formula: PV = FV / (1 + r)^n + PMT × [1 - (1 + r)^-n] / r × (1 + r × type)
 *
 * @param fv - Future Value
 * @param pmt - Payment per period
 * @param rate - Interest rate per period (decimal)
 * @param n - Number of periods
 * @param type - 0 for ordinary annuity, 1 for annuity due
 * @returns Present Value
 */
export function calculatePV(
  fv: number,
  pmt: number,
  rate: number,
  n: number,
  type: AnnuityType = AnnuityType.ORDINARY
): number {
  if (rate === 0) {
    return -fv - pmt * n;
  }

  const pvFactor = Math.pow(1 + rate, -n);
  const pmtFactor = ((1 - pvFactor) / rate) * (1 + rate * type);

  return -fv * pvFactor - pmt * pmtFactor;
}

/**
 * Calculate Payment (PMT)
 * Formula: PMT = [r × (PV × (1 + r)^n + FV)] / [((1 + r)^n - 1) × (1 + r × type)]
 *
 * @param pv - Present Value
 * @param fv - Future Value
 * @param rate - Interest rate per period (decimal)
 * @param n - Number of periods
 * @param type - 0 for ordinary annuity, 1 for annuity due
 * @returns Payment per period
 */
export function calculatePMT(
  pv: number,
  fv: number,
  rate: number,
  n: number,
  type: AnnuityType = AnnuityType.ORDINARY
): number {
  if (rate === 0) {
    return -(pv + fv) / n;
  }

  const pvFactor = Math.pow(1 + rate, n);
  const numerator = rate * (pv * pvFactor + fv);
  const denominator = (pvFactor - 1) * (1 + rate * type);

  return -numerator / denominator;
}

/**
 * Calculate Number of Periods (NPER)
 * Uses iterative method (Newton-Raphson) to solve for n
 *
 * @param pv - Present Value
 * @param pmt - Payment per period
 * @param fv - Future Value
 * @param rate - Interest rate per period (decimal)
 * @param type - 0 for ordinary annuity, 1 for annuity due
 * @returns Number of periods
 */
export function calculateNPER(
  pv: number,
  pmt: number,
  fv: number,
  rate: number,
  type: AnnuityType = AnnuityType.ORDINARY
): number | null {
  // Special case: rate = 0
  if (rate === 0) {
    return -(pv + fv) / pmt;
  }

  // Special case: no payment
  if (pmt === 0) {
    return Math.log(-fv / pv) / Math.log(1 + rate);
  }

  // Newton-Raphson method
  const maxIterations = 100;
  const tolerance = 0.0001;
  let n = 10; // Initial guess

  for (let i = 0; i < maxIterations; i++) {
    const pvFactor = Math.pow(1 + rate, n);
    const pmtFactor = ((pvFactor - 1) / rate) * (1 + rate * type);

    const f = pv * pvFactor + pmt * pmtFactor + fv;
    const df = pv * pvFactor * Math.log(1 + rate) +
               pmt * pmtFactor * Math.log(1 + rate) * n / (pvFactor - 1);

    const newN = n - f / df;

    if (Math.abs(newN - n) < tolerance) {
      return newN;
    }

    n = newN;

    if (n < 0) return null; // Invalid solution
  }

  return null; // No convergence
}

/**
 * Calculate Interest Rate (RATE)
 * Uses Newton-Raphson method to solve for rate
 *
 * @param pv - Present Value
 * @param pmt - Payment per period
 * @param fv - Future Value
 * @param n - Number of periods
 * @param type - 0 for ordinary annuity, 1 for annuity due
 * @returns Interest rate per period (decimal)
 */
export function calculateRATE(
  pv: number,
  pmt: number,
  fv: number,
  n: number,
  type: AnnuityType = AnnuityType.ORDINARY
): number | null {
  // Special case: can solve directly
  if (pmt === 0) {
    return Math.pow(-fv / pv, 1 / n) - 1;
  }

  // Newton-Raphson method
  const maxIterations = 100;
  const tolerance = 0.000001;
  let rate = 0.1; // Initial guess: 10%

  for (let i = 0; i < maxIterations; i++) {
    const pvFactor = Math.pow(1 + rate, n);
    const pmtFactor = ((pvFactor - 1) / rate) * (1 + rate * type);

    const f = pv * pvFactor + pmt * pmtFactor + fv;

    // Derivative
    const df = n * pv * Math.pow(1 + rate, n - 1) +
               pmt * (((n * pvFactor) / rate - (pvFactor - 1) / (rate * rate)) * (1 + rate * type) +
               pmtFactor * type);

    if (Math.abs(df) < 0.0000001) break;

    const newRate = rate - f / df;

    if (Math.abs(newRate - rate) < tolerance) {
      return newRate;
    }

    rate = newRate;

    if (rate < -0.99 || rate > 10) break; // Invalid range
  }

  return null; // No convergence
}

/**
 * Calculate Net Present Value (NPV)
 * Formula: NPV = Σ [CFt / (1 + r)^t] for t = 0 to n
 *
 * @param cashFlows - Array of cash flows (CF0, CF1, CF2, ...)
 * @param rate - Discount rate per period (decimal)
 * @returns Net Present Value
 */
export function calculateNPV(cashFlows: number[], rate: number): number {
  return cashFlows.reduce((npv, cf, period) => {
    return npv + cf / Math.pow(1 + rate, period);
  }, 0);
}

/**
 * Calculate Internal Rate of Return (IRR)
 * Uses Newton-Raphson method to find rate where NPV = 0
 *
 * @param cashFlows - Array of cash flows
 * @returns IRR as decimal (e.g., 0.15 for 15%) or null if no solution
 */
export function calculateIRR(cashFlows: number[]): number | null {
  const maxIterations = 1000;
  const tolerance = 0.00001;
  let rate = 0.1; // Initial guess: 10%

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let derivative = 0;

    for (let t = 0; t < cashFlows.length; t++) {
      const discountFactor = Math.pow(1 + rate, t);
      npv += cashFlows[t] / discountFactor;
      derivative -= (t * cashFlows[t]) / (discountFactor * (1 + rate));
    }

    if (Math.abs(npv) < tolerance) {
      return rate;
    }

    if (Math.abs(derivative) < 0.0000001) {
      return null; // Cannot continue
    }

    rate = rate - npv / derivative;

    if (rate < -0.99 || rate > 10) {
      return null; // Out of reasonable range
    }
  }

  return null; // No convergence
}

/**
 * Calculate Modified Internal Rate of Return (MIRR)
 * Formula: MIRR = [(FV of positive CFs / PV of negative CFs)^(1/n)] - 1
 *
 * @param cashFlows - Array of cash flows
 * @param financeRate - Financing rate for negative cash flows
 * @param reinvestRate - Reinvestment rate for positive cash flows
 * @returns MIRR as decimal
 */
export function calculateMIRR(
  cashFlows: number[],
  financeRate: number,
  reinvestRate: number
): number | null {
  const n = cashFlows.length - 1;

  if (n <= 0) return null;

  // Present value of negative cash flows (financed at financeRate)
  let pvNegative = 0;
  // Future value of positive cash flows (reinvested at reinvestRate)
  let fvPositive = 0;

  for (let t = 0; t < cashFlows.length; t++) {
    if (cashFlows[t] < 0) {
      pvNegative += cashFlows[t] / Math.pow(1 + financeRate, t);
    } else if (cashFlows[t] > 0) {
      fvPositive += cashFlows[t] * Math.pow(1 + reinvestRate, n - t);
    }
  }

  if (pvNegative === 0 || fvPositive === 0) {
    return null;
  }

  // MIRR = [(FV+ / |PV-|)^(1/n)] - 1
  const mirr = Math.pow(-fvPositive / pvNegative, 1 / n) - 1;

  return mirr;
}

/**
 * Convert nominal rate to effective annual rate (EAR)
 * Formula: EAR = (1 + r/m)^m - 1
 *
 * @param nominalRate - Nominal annual rate (decimal)
 * @param compoundingFrequency - Number of compounding periods per year
 * @returns Effective annual rate (decimal)
 */
export function calculateEAR(
  nominalRate: number,
  compoundingFrequency: CompoundingFrequency
): number {
  if (compoundingFrequency === CompoundingFrequency.CONTINUOUS) {
    return Math.exp(nominalRate) - 1;
  }

  return Math.pow(1 + nominalRate / compoundingFrequency, compoundingFrequency) - 1;
}

/**
 * Generate complete amortization schedule
 *
 * @param principal - Loan amount
 * @param annualRate - Annual interest rate (decimal)
 * @param periods - Number of payment periods
 * @returns Array of payment details
 */
export interface AmortizationPayment {
  period: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export function generateAmortizationSchedule(
  principal: number,
  annualRate: number,
  periods: number,
  paymentsPerYear: number = 12
): AmortizationPayment[] {
  const schedule: AmortizationPayment[] = [];
  const periodRate = annualRate / paymentsPerYear;
  const payment = calculatePMT(-principal, 0, periodRate, periods, AnnuityType.ORDINARY);

  let balance = principal;

  for (let period = 1; period <= periods; period++) {
    const interestPayment = balance * periodRate;
    const principalPayment = payment - interestPayment;
    balance -= principalPayment;

    schedule.push({
      period,
      payment,
      principal: principalPayment,
      interest: interestPayment,
      balance: Math.max(0, balance), // Prevent negative balance due to rounding
    });
  }

  return schedule;
}

/**
 * Calculate loan payment with extra principal payments
 *
 * @param principal - Loan amount
 * @param annualRate - Annual interest rate (decimal)
 * @param periods - Number of payment periods
 * @param extraPayment - Extra principal payment per period
 * @returns Object with payoff time and interest saved
 */
export function calculateEarlyPayoff(
  principal: number,
  annualRate: number,
  periods: number,
  extraPayment: number,
  paymentsPerYear: number = 12
): {
  periodsToPayoff: number;
  interestSaved: number;
  totalPayment: number;
} {
  const periodRate = annualRate / paymentsPerYear;
  const regularPayment = calculatePMT(-principal, 0, periodRate, periods, AnnuityType.ORDINARY);

  // Original scenario
  const originalInterest = regularPayment * periods - principal;

  // With extra payments
  let balance = principal;
  let periodsToPayoff = 0;
  let totalInterest = 0;

  while (balance > 0 && periodsToPayoff < periods * 2) {
    const interestPayment = balance * periodRate;
    const principalPayment = Math.min(
      regularPayment - interestPayment + extraPayment,
      balance + interestPayment
    );

    totalInterest += interestPayment;
    balance -= (principalPayment - interestPayment);
    periodsToPayoff++;
  }

  return {
    periodsToPayoff,
    interestSaved: originalInterest - totalInterest,
    totalPayment: principal + totalInterest,
  };
}
