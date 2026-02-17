/**
 * Financial Criteria Utilities (ابزارهای معیارهای مالی)
 * Helper functions for financial calculations based on loan criteria
 */

import type { FinancialCriteria } from '@/schemas';

/**
 * Calculate deposit amount based on loan criteria
 * محاسبه مبلغ سپرده بر اساس معیارهای وام
 */
export function calculateDeposit(
  loanAmount: number,
  criteria?: FinancialCriteria
): number {
  if (!criteria?.depositCalculation) {
    return 0;
  }

  const deposit = criteria.depositCalculation;

  switch (deposit.method) {
    case 'percentage':
      return loanAmount * ((deposit.percentage || 0) / 100);

    case 'fixed':
      return deposit.fixedAmount || 0;

    case 'coefficient':
      return loanAmount * (deposit.coefficient || 0);

    case 'none':
    default:
      return 0;
  }
}

/**
 * Calculate monthly payment based on payment schedule type
 * محاسبه قسط ماهانه بر اساس نوع برنامه پرداخت
 */
export function calculateMonthlyPayment(
  principal: number,
  annualRatePercent: number,
  totalMonths: number,
  criteria?: FinancialCriteria
): number {
  const r = annualRatePercent / 12 / 100; // Monthly rate
  const n = totalMonths;

  const scheduleType = criteria?.paymentSchedule?.type || 'equal_installments';

  switch (scheduleType) {
    case 'equal_installments':
    case 'annuity':
      // PMT = P × [r(1+r)^n] / [(1+r)^n - 1]
      if (r === 0) return principal / n;
      return (principal * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);

    case 'reducing_balance':
      // First month payment: (P/n) + (P × r)
      return principal / n + principal * r;

    case 'interest_only':
      // Only interest payment
      return principal * r;

    case 'graduated':
      // Simplified: starts with lower payment
      const basePayment =
        (principal * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
      return basePayment * 0.8; // 80% of standard payment initially

    case 'balloon':
      // Simplified: smaller payments, large final payment
      return (principal * r) / 2; // Half of interest-only payment

    default:
      return (principal * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
  }
}

/**
 * Calculate total interest based on interest calculation method
 * محاسبه کل سود بر اساس روش محاسبه سود
 */
export function calculateTotalInterest(
  principal: number,
  annualRatePercent: number,
  years: number,
  criteria?: FinancialCriteria
): number {
  const method = criteria?.interestCalculation?.method || 'simple';
  const r = annualRatePercent / 100;

  switch (method) {
    case 'simple':
      // I = P × r × t
      return principal * r * years;

    case 'compound': {
      const frequency = criteria?.interestCalculation?.compoundingFrequency || 'annually';
      const n = getCompoundingFrequency(frequency);
      // A = P × (1 + r/n)^(n×t)
      const totalAmount = principal * Math.pow(1 + r / n, n * years);
      return totalAmount - principal;
    }

    case 'reducing_balance': {
      // Calculate using monthly reducing balance
      const months = years * 12;
      const monthlyPayment = calculateMonthlyPayment(
        principal,
        annualRatePercent,
        months,
        criteria
      );
      return monthlyPayment * months - principal;
    }

    case 'flat_rate':
      // Total interest spread equally
      return principal * r * years;

    case 'annuity': {
      const months = years * 12;
      const monthlyPayment = calculateMonthlyPayment(
        principal,
        annualRatePercent,
        months,
        criteria
      );
      return monthlyPayment * months - principal;
    }

    default:
      return principal * r * years;
  }
}

/**
 * Get compounding frequency as number per year
 */
function getCompoundingFrequency(
  frequency: 'monthly' | 'quarterly' | 'annually' | 'daily'
): number {
  switch (frequency) {
    case 'daily':
      return 365;
    case 'monthly':
      return 12;
    case 'quarterly':
      return 4;
    case 'annually':
    default:
      return 1;
  }
}

/**
 * Calculate processing fee
 * محاسبه کارمزد پردازش
 */
export function calculateProcessingFee(
  principal: number,
  criteria?: FinancialCriteria
): number {
  const fee = criteria?.feesAndCharges?.processingFee;
  if (!fee) return 0;

  switch (fee.type) {
    case 'percentage':
      return principal * ((fee.amount || 0) / 100);
    case 'fixed':
      return fee.amount || 0;
    case 'none':
    default:
      return 0;
  }
}

/**
 * Calculate administrative fee
 * محاسبه کارمزد اداری
 */
export function calculateAdministrativeFee(
  principal: number,
  criteria?: FinancialCriteria
): number {
  const fee = criteria?.feesAndCharges?.administrativeFee;
  if (!fee) return 0;

  switch (fee.type) {
    case 'percentage':
      return principal * ((fee.amount || 0) / 100);
    case 'fixed':
      return fee.amount || 0;
    case 'none':
    default:
      return 0;
  }
}

/**
 * Calculate late payment penalty
 * محاسبه جریمه تاخیر
 */
export function calculateLatePaymentPenalty(
  overdueAmount: number,
  daysLate: number,
  criteria?: FinancialCriteria
): number {
  const penalty = criteria?.feesAndCharges?.latePaymentPenalty;
  if (!penalty) return 0;

  switch (penalty.type) {
    case 'percentage':
      return overdueAmount * ((penalty.amount || 0) / 100);

    case 'fixed':
      return penalty.amount || 0;

    case 'daily_interest':
      // Daily interest on overdue amount
      return overdueAmount * ((penalty.amount || 0) / 100) * daysLate;

    case 'none':
    default:
      return 0;
  }
}

/**
 * Calculate early payment penalty
 * محاسبه جریمه پرداخت زودتر
 */
export function calculateEarlyPaymentPenalty(
  remainingPrincipal: number,
  criteria?: FinancialCriteria
): number {
  const penalty = criteria?.feesAndCharges?.earlyPaymentPenalty;

  if (!penalty?.applicable) return 0;

  switch (penalty.type) {
    case 'percentage':
      return remainingPrincipal * ((penalty.amount || 0) / 100);
    case 'fixed':
      return penalty.amount || 0;
    case 'none':
    default:
      return 0;
  }
}

/**
 * Calculate APR (Annual Percentage Rate)
 * محاسبه نرخ درصد سالانه
 */
export function calculateAPR(
  principal: number,
  totalPaid: number,
  years: number,
  criteria?: FinancialCriteria
): number {
  if (criteria?.aprCalculation?.effectiveAPR) {
    return criteria.aprCalculation.effectiveAPR;
  }

  const totalInterest = totalPaid - principal;
  return (totalInterest / principal / years) * 100;
}

/**
 * Calculate debt-to-income ratio
 * محاسبه نسبت بدهی به درآمد
 */
export function calculateDebtToIncomeRatio(
  monthlyDebtPayment: number,
  grossMonthlyIncome: number
): number {
  if (grossMonthlyIncome === 0) return 0;
  return (monthlyDebtPayment / grossMonthlyIncome) * 100;
}

/**
 * Check if debt-to-income ratio is acceptable
 * بررسی قابل قبول بودن نسبت بدهی به درآمد
 */
export function isDebtToIncomeRatioAcceptable(
  monthlyDebtPayment: number,
  grossMonthlyIncome: number,
  criteria?: FinancialCriteria
): boolean {
  const ratio = calculateDebtToIncomeRatio(monthlyDebtPayment, grossMonthlyIncome);
  const maxRatio =
    (criteria?.riskAssessment?.debtToIncomeRatio?.maximum || 0.4) * 100;
  return ratio <= maxRatio;
}

/**
 * Calculate loan-to-value ratio
 * محاسبه نسبت وام به ارزش
 */
export function calculateLoanToValueRatio(
  loanAmount: number,
  propertyValue: number
): number {
  if (propertyValue === 0) return 0;
  return (loanAmount / propertyValue) * 100;
}

/**
 * Check if loan-to-value ratio is acceptable
 * بررسی قابل قبول بودن نسبت وام به ارزش
 */
export function isLoanToValueRatioAcceptable(
  loanAmount: number,
  propertyValue: number,
  criteria?: FinancialCriteria
): boolean {
  const ratio = calculateLoanToValueRatio(loanAmount, propertyValue);
  const maxRatio = (criteria?.riskAssessment?.loanToValueRatio?.maximum || 0.8) * 100;
  return ratio <= maxRatio;
}

/**
 * Calculate NPV (Net Present Value)
 * محاسبه ارزش فعلی خالص
 */
export function calculateNPV(
  cashFlows: number[],
  discountRate: number,
  initialInvestment: number
): number {
  const npv = cashFlows.reduce((sum, cf, t) => {
    return sum + cf / Math.pow(1 + discountRate / 100, t + 1);
  }, 0);

  return npv - initialInvestment;
}

/**
 * Generate amortization schedule
 * ایجاد جدول استهلاک (برنامه پرداخت)
 */
export interface AmortizationRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export function generateAmortizationSchedule(
  principal: number,
  annualRatePercent: number,
  totalMonths: number,
  criteria?: FinancialCriteria
): AmortizationRow[] {
  const schedule: AmortizationRow[] = [];
  const r = annualRatePercent / 12 / 100; // Monthly rate
  const scheduleType = criteria?.paymentSchedule?.type || 'equal_installments';

  let balance = principal;

  for (let month = 1; month <= totalMonths; month++) {
    let payment: number;
    let interest: number;
    let principalPayment: number;

    switch (scheduleType) {
      case 'equal_installments':
      case 'annuity':
        payment = calculateMonthlyPayment(principal, annualRatePercent, totalMonths, criteria);
        interest = balance * r;
        principalPayment = payment - interest;
        break;

      case 'reducing_balance':
        principalPayment = principal / totalMonths;
        interest = balance * r;
        payment = principalPayment + interest;
        break;

      case 'interest_only':
        if (month < totalMonths) {
          payment = balance * r;
          interest = payment;
          principalPayment = 0;
        } else {
          // Final month: pay all principal + interest
          interest = balance * r;
          principalPayment = balance;
          payment = interest + principalPayment;
        }
        break;

      default:
        payment = calculateMonthlyPayment(principal, annualRatePercent, totalMonths, criteria);
        interest = balance * r;
        principalPayment = payment - interest;
    }

    balance = Math.max(0, balance - principalPayment);

    schedule.push({
      month,
      payment: Math.round(payment),
      principal: Math.round(principalPayment),
      interest: Math.round(interest),
      balance: Math.round(balance),
    });
  }

  return schedule;
}

/**
 * Calculate total cost of loan (principal + interest + fees)
 * محاسبه کل هزینه وام (اصل + سود + کارمزد)
 */
export function calculateTotalLoanCost(
  principal: number,
  annualRatePercent: number,
  years: number,
  criteria?: FinancialCriteria
): {
  principal: number;
  interest: number;
  processingFee: number;
  administrativeFee: number;
  total: number;
} {
  const interest = calculateTotalInterest(principal, annualRatePercent, years, criteria);
  const processingFee = calculateProcessingFee(principal, criteria);
  const administrativeFee = calculateAdministrativeFee(principal, criteria);

  return {
    principal,
    interest,
    processingFee,
    administrativeFee,
    total: principal + interest + processingFee + administrativeFee,
  };
}

/**
 * Format number as Persian currency
 * فرمت کردن عدد به صورت واحد پول فارسی
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fa-IR').format(Math.round(amount));
}

/**
 * Format percentage
 * فرمت کردن درصد
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('fa-IR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
