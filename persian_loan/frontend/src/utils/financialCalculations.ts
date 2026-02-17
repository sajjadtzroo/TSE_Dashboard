/**
 * Financial Calculations Utility
 * Includes IRR, MIRR, NPV, and loan analysis functions
 */

/**
 * Calculate IRR (Internal Rate of Return)
 * @param cashFlows Array of cash flows (negative for outflows, positive for inflows)
 * @returns IRR as a decimal (e.g., 0.15 for 15%)
 */
export function calculateIRR(cashFlows: number[]): number | null {
  const maxIterations = 1000;
  const tolerance = 0.00001;
  let rate = 0.1; // Initial guess

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let derivative = 0;

    for (let j = 0; j < cashFlows.length; j++) {
      npv += cashFlows[j] / Math.pow(1 + rate, j);
      derivative -= (j * cashFlows[j]) / Math.pow(1 + rate, j + 1);
    }

    if (Math.abs(npv) < tolerance) {
      return rate;
    }

    if (derivative === 0) {
      return null; // Cannot continue
    }

    rate = rate - npv / derivative;

    if (rate < -0.99) {
      rate = -0.99; // Prevent negative rates below -99%
    }
  }

  return null; // No convergence
}

/**
 * Calculate MIRR (Modified Internal Rate of Return)
 * @param cashFlows Array of cash flows
 * @param financeRate Financing rate (cost of borrowing)
 * @param reinvestRate Reinvestment rate (return on investments)
 * @returns MIRR as a decimal
 */
export function calculateMIRR(
  cashFlows: number[],
  financeRate: number,
  reinvestRate: number
): number | null {
  const n = cashFlows.length - 1;

  // Present value of negative cash flows
  let pvNegative = 0;
  // Future value of positive cash flows
  let fvPositive = 0;

  for (let i = 0; i < cashFlows.length; i++) {
    if (cashFlows[i] < 0) {
      pvNegative += cashFlows[i] / Math.pow(1 + financeRate, i);
    } else if (cashFlows[i] > 0) {
      fvPositive += cashFlows[i] * Math.pow(1 + reinvestRate, n - i);
    }
  }

  if (pvNegative === 0) {
    return null;
  }

  const mirr = Math.pow(-fvPositive / pvNegative, 1 / n) - 1;
  return mirr;
}

/**
 * Calculate NPV (Net Present Value)
 * @param cashFlows Array of cash flows
 * @param discountRate Discount rate as decimal
 * @returns NPV value
 */
export function calculateNPV(cashFlows: number[], discountRate: number): number {
  return cashFlows.reduce((npv, cashFlow, period) => {
    return npv + cashFlow / Math.pow(1 + discountRate, period);
  }, 0);
}

/**
 * Calculate monthly payment for a loan
 * @param principal Loan amount
 * @param annualRate Annual interest rate as decimal
 * @param months Number of months
 * @returns Monthly payment amount
 */
export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  months: number
): number {
  if (annualRate === 0) {
    return principal / months;
  }

  const monthlyRate = annualRate / 12;
  const payment =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
    (Math.pow(1 + monthlyRate, months) - 1);

  return payment;
}

/**
 * Generate loan cash flow schedule
 * @param loanAmount Loan amount received
 * @param depositAmount Deposit amount (if applicable)
 * @param depositMonths Duration of deposit
 * @param interestRate Annual interest rate
 * @param loanMonths Loan repayment period in months
 * @param commission Commission/fees
 * @returns Array of cash flows
 */
export function generateLoanCashFlow(
  loanAmount: number,
  depositAmount: number,
  depositMonths: number,
  interestRate: number,
  loanMonths: number,
  commission: number
): number[] {
  const cashFlows: number[] = [];

  // Month 0: Initial deposit (negative outflow)
  cashFlows.push(-depositAmount);

  // Months 1 to depositMonths: Deposit period (no cash flow if deposit is locked)
  for (let i = 1; i <= depositMonths; i++) {
    cashFlows.push(0);
  }

  // Month after deposit: Receive loan amount minus commission (positive inflow)
  cashFlows.push(loanAmount - commission);

  // Subsequent months: Monthly loan payments (negative outflows)
  const monthlyPayment = calculateMonthlyPayment(loanAmount, interestRate, loanMonths);
  for (let i = 0; i < loanMonths; i++) {
    cashFlows.push(-monthlyPayment);
  }

  return cashFlows;
}

/**
 * Calculate effective annual rate (EAR) from nominal rate
 * @param nominalRate Nominal annual rate
 * @param compoundingPeriods Number of compounding periods per year
 * @returns Effective annual rate
 */
export function calculateEAR(nominalRate: number, compoundingPeriods: number): number {
  return Math.pow(1 + nominalRate / compoundingPeriods, compoundingPeriods) - 1;
}

/**
 * Calculate total cost of loan including all fees
 * @param loanAmount Principal amount
 * @param interestRate Annual interest rate
 * @param months Loan term in months
 * @param commission Upfront commission/fees
 * @returns Total cost
 */
export function calculateTotalLoanCost(
  loanAmount: number,
  interestRate: number,
  months: number,
  commission: number
): number {
  const monthlyPayment = calculateMonthlyPayment(loanAmount, interestRate, months);
  const totalPayments = monthlyPayment * months;
  return totalPayments + commission - loanAmount;
}

/**
 * Parse Persian/Farsi amount string to number
 * @param amountStr Amount string (e.g., "500,000,000 تومان")
 * @returns Numeric value
 */
export function parseAmount(amountStr: string): number {
  if (!amountStr) return 0;

  // Remove Persian text and commas
  const cleaned = amountStr
    .replace(/تومان|ریال|میلیون/g, '')
    .replace(/,/g, '')
    .trim();

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Format number with commas
 * @param amount Number to format
 * @returns Formatted string with commas
 */
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(amount));
}

/**
 * Format number as currency
 * @param amount Number to format
 * @returns Formatted string
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fa-IR').format(Math.round(amount)) + ' تومان';
}

/**
 * Parse Persian repayment period string to number of months
 * Handles formats like "تا 24 ماه", "6-12 ماه", "36, 48, 60 ماه", "1-6 ماه", "12 ماه", "90 روز", "2 سال"
 * @param period Persian repayment period string
 * @param fallback Default value if parsing fails
 * @returns Number of months (uses first number for ranges/lists, matching parseInt behavior)
 */
export function parseRepaymentMonths(period: string | undefined, fallback: number = 60): number {
  if (!period) return fallback;

  // Extract all numbers from the string
  const numbers = period.match(/\d+/g);
  if (!numbers || numbers.length === 0) return fallback;

  const parsed = numbers.map(Number);

  // Check for days (روز)
  if (period.includes('روز')) {
    return Math.max(1, Math.ceil(parsed[0] / 30));
  }

  // Check for years (سال)
  if (period.includes('سال')) {
    return parsed[0] * 12;
  }

  // Default: months — use first number (matches parseInt behavior for ranges like "12-24 ماه")
  return parsed[0];
}

/**
 * Calculate opportunity cost of deposit
 * @param depositAmount Amount deposited
 * @param depositMonths Duration in months
 * @param alternativeRate Alternative investment return rate (annual)
 * @returns Opportunity cost
 */
export function calculateOpportunityCost(
  depositAmount: number,
  depositMonths: number,
  alternativeRate: number
): number {
  const monthlyRate = alternativeRate / 12;
  const futureValue = depositAmount * Math.pow(1 + monthlyRate, depositMonths);
  return futureValue - depositAmount;
}
