/**
 * Comparison Logic Utilities
 * Determines best/worst values and highlights for loan comparison
 */

import type { LoanType, LoanWithBank } from '../../../types';
import { parsePersianAmount } from '../../../utils/persianNumber';
import { parseInterestRate } from '../../../utils/persianNumber';

export type ComparisonResult = 'best' | 'worst' | 'neutral';

export interface ComparisonField {
  key: string;
  label: string;
  category: string;
  getValue: (loan: LoanType | LoanWithBank) => any;
  compareType: 'higher-better' | 'lower-better' | 'boolean' | 'text';
  format?: (value: any) => string;
}

/**
 * Define all comparison fields organized by category
 */
export const COMPARISON_FIELDS: ComparisonField[] = [
  // Basic Information
  {
    key: 'nameFA',
    label: 'نام وام',
    category: 'اطلاعات پایه',
    getValue: (loan) => loan.nameFA,
    compareType: 'text',
  },
  {
    key: 'category',
    label: 'دسته‌بندی',
    category: 'اطلاعات پایه',
    getValue: (loan) => loan.categoryFA || loan.category,
    compareType: 'text',
  },

  // Interest Rates (lower is better)
  {
    key: 'interestRate',
    label: 'نرخ سود',
    category: 'نرخ‌های سود',
    getValue: (loan) => loan.interestRate,
    compareType: 'lower-better',
  },
  {
    key: 'depositRate',
    label: 'نرخ سود سپرده',
    category: 'نرخ‌های سود',
    getValue: (loan) => loan.depositRate,
    compareType: 'lower-better',
  },
  {
    key: 'latePaymentRate',
    label: 'نرخ دیرکرد',
    category: 'نرخ‌های سود',
    getValue: (loan) => loan.latePaymentRate,
    compareType: 'lower-better',
  },

  // Amounts
  {
    key: 'minAmount',
    label: 'حداقل مبلغ',
    category: 'مبالغ',
    getValue: (loan) => loan.minAmount,
    compareType: 'lower-better',
  },
  {
    key: 'maxAmount',
    label: 'حداکثر مبلغ',
    category: 'مبالغ',
    getValue: (loan) => loan.maxAmount,
    compareType: 'higher-better',
  },
  {
    key: 'monthlyPayment',
    label: 'قسط ماهانه',
    category: 'مبالغ',
    getValue: (loan) => loan.monthlyPayment,
    compareType: 'lower-better',
  },
  {
    key: 'totalRepayment',
    label: 'مجموع بازپرداخت',
    category: 'مبالغ',
    getValue: (loan) => loan.totalRepayment,
    compareType: 'lower-better',
  },
  {
    key: 'totalInterest',
    label: 'مجموع سود',
    category: 'مبالغ',
    getValue: (loan) => loan.totalInterest,
    compareType: 'lower-better',
  },

  // Terms
  {
    key: 'minTerm',
    label: 'حداقل مدت',
    category: 'مدت‌زمان',
    getValue: (loan) => loan.minTerm,
    compareType: 'text',
  },
  {
    key: 'maxTerm',
    label: 'حداکثر مدت',
    category: 'مدت‌زمان',
    getValue: (loan) => loan.maxTerm,
    compareType: 'higher-better',
  },
  {
    key: 'repaymentPeriod',
    label: 'دوره بازپرداخت',
    category: 'مدت‌زمان',
    getValue: (loan) => loan.repaymentPeriodFA || loan.repaymentPeriod,
    compareType: 'text',
  },

  // Requirements (false/no requirement is better)
  {
    key: 'guarantor',
    label: 'ضامن',
    category: 'الزامات',
    getValue: (loan) => loan.guarantor,
    compareType: 'boolean',
    format: (value) => {
      if (value === false) return 'بدون ضامن';
      if (value === true) return 'نیاز به ضامن';
      return value?.toString() || '—';
    },
  },
  {
    key: 'collateral',
    label: 'وثیقه',
    category: 'الزامات',
    getValue: (loan) => loan.collateralFA || loan.collateral,
    compareType: 'text',
  },
  {
    key: 'creditRatingRequired',
    label: 'رتبه اعتباری',
    category: 'الزامات',
    getValue: (loan) => loan.creditRatingRequiredFA || loan.creditRatingRequired,
    compareType: 'text',
  },

  // Fees (lower is better)
  {
    key: 'applicationFee',
    label: 'کارمزد درخواست',
    category: 'هزینه‌ها',
    getValue: (loan) => loan.applicationFeeFA || loan.applicationFee,
    compareType: 'lower-better',
  },
  {
    key: 'creditCheckFee',
    label: 'هزینه استعلام',
    category: 'هزینه‌ها',
    getValue: (loan) => loan.creditCheckFeeFA || loan.creditCheckFee,
    compareType: 'lower-better',
  },
  {
    key: 'fee',
    label: 'کارمزد',
    category: 'هزینه‌ها',
    getValue: (loan) => loan.feeFA || loan.fee,
    compareType: 'lower-better',
  },

  // Calculation Details
  {
    key: 'formula',
    label: 'فرمول محاسبه',
    category: 'جزئیات محاسبه',
    getValue: (loan) => loan.formulaFA || loan.formula,
    compareType: 'text',
  },
  {
    key: 'loanMultiplier',
    label: 'ضریب وام',
    category: 'جزئیات محاسبه',
    getValue: (loan) => loan.loanMultiplierFA || loan.loanMultiplier,
    compareType: 'higher-better',
  },
];

/**
 * Get all unique categories from comparison fields
 */
export function getCategories(): string[] {
  return Array.from(new Set(COMPARISON_FIELDS.map((f) => f.category)));
}

/**
 * Get fields for a specific category
 */
export function getFieldsByCategory(category: string): ComparisonField[] {
  return COMPARISON_FIELDS.filter((f) => f.category === category);
}

/**
 * Compare values and determine which is best/worst
 */
export function compareValues(
  loans: (LoanType | LoanWithBank)[],
  field: ComparisonField
): Map<string, ComparisonResult> {
  const results = new Map<string, ComparisonResult>();

  if (field.compareType === 'text' || field.compareType === 'boolean') {
    // No comparison for text/boolean fields
    loans.forEach((loan) => results.set(loan.id, 'neutral'));
    return results;
  }

  // Extract numeric values
  const values = loans.map((loan) => {
    const rawValue = field.getValue(loan);
    if (rawValue == null || rawValue === undefined || rawValue === '') {
      return { loan, value: null };
    }

    // Parse numeric value
    let numericValue: number | null;

    if (typeof rawValue === 'number') {
      numericValue = rawValue;
    } else if (typeof rawValue === 'string') {
      // Try parsing as Persian amount or interest rate
      numericValue = parsePersianAmount(rawValue);
      if (numericValue === null) {
        numericValue = parseInterestRate(rawValue);
      }
    } else {
      numericValue = null;
    }

    return { loan, value: numericValue };
  });

  // Filter out null values
  const validValues = values.filter((v) => v.value !== null);

  if (validValues.length === 0) {
    loans.forEach((loan) => results.set(loan.id, 'neutral'));
    return results;
  }

  // Find best and worst values
  const numericValues = validValues.map((v) => v.value!);
  const minValue = Math.min(...numericValues);
  const maxValue = Math.max(...numericValues);

  // Determine best/worst based on comparison type
  let bestValue: number;
  let worstValue: number;

  if (field.compareType === 'higher-better') {
    bestValue = maxValue;
    worstValue = minValue;
  } else {
    // lower-better
    bestValue = minValue;
    worstValue = maxValue;
  }

  // Assign results
  values.forEach(({ loan, value }) => {
    if (value === null) {
      results.set(loan.id, 'neutral');
    } else if (value === bestValue && bestValue !== worstValue) {
      results.set(loan.id, 'best');
    } else if (value === worstValue && bestValue !== worstValue) {
      results.set(loan.id, 'worst');
    } else {
      results.set(loan.id, 'neutral');
    }
  });

  return results;
}

/**
 * Check if loans have differences in a specific field
 */
export function hasFieldDifference(
  loans: (LoanType | LoanWithBank)[],
  field: ComparisonField
): boolean {
  const values = loans.map((loan) => field.getValue(loan));
  const uniqueValues = new Set(values.map((v) => JSON.stringify(v)));
  return uniqueValues.size > 1;
}

/**
 * Get only fields that have differences between loans
 */
export function getFieldsWithDifferences(
  loans: (LoanType | LoanWithBank)[]
): ComparisonField[] {
  return COMPARISON_FIELDS.filter((field) => hasFieldDifference(loans, field));
}
