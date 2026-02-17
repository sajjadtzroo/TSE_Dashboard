/**
 * Mock Loan Data for Testing
 */

import type { LoanType, LoanWithBank } from '@/types';

export const mockLoan: LoanType = {
  id: 'loan-test-1',
  nameFA: 'وام قرض‌الحسنه ازدواج',
  nameEN: 'Marriage Loan',
  category: 'traditional-banks',
  minAmount: '۱۰ میلیون تومان',
  maxAmount: '۵۰۰ میلیون تومان',
  minAmountFA: '۱۰ میلیون تومان',
  maxAmountFA: '۵۰۰ میلیون تومان',
  interestRate: '۰٪',
  interestRateNumeric: 0,
  repaymentPeriod: '12-60 ماه',
  guarantor: false,
  descriptionFA: 'وام قرض‌الحسنه برای ازدواج',
  requirements: [
    'کارت ملی',
    'شناسنامه',
    'سند ازدواج',
  ],
  monthlyPayment: '۸,۳۳۳,۳۳۳ تومان',
};

export const mockLoanWithGuarantor: LoanType = {
  id: 'loan-test-2',
  nameFA: 'وام خرید خودرو',
  nameEN: 'Car Purchase Loan',
  category: 'traditional-banks',
  minAmount: '۵۰ میلیون تومان',
  maxAmount: '۱ میلیارد تومان',
  minAmountFA: '۵۰ میلیون تومان',
  maxAmountFA: '۱ میلیارد تومان',
  interestRate: '۱۸٪',
  interestRateNumeric: 18,
  repaymentPeriod: '12-48 ماه',
  guarantor: true,
  descriptionFA: 'وام خرید خودرو با ضامن',
  guarantorRequirements: {
    upTo300M: {
      guarantors: 1,
      descriptionFA: 'یک نفر ضامن',
    },
    '300Mto500M': {
      guarantors: 2,
      descriptionFA: 'دو نفر ضامن',
    },
  },
  creditRatingRequired: ['A', 'B'],
  creditRatingRequiredFA: 'رتبه اعتباری A یا B',
};

export const mockLoanWithCoefficients: LoanType = {
  id: 'loan-test-3',
  nameFA: 'وام سپرده‌ای',
  nameEN: 'Deposit-Based Loan',
  category: 'traditional-banks',
  minAmount: '۱۰ میلیون تومان',
  maxAmount: '۲ میلیارد تومان',
  interestRate: '۱۸٪',
  interestRateNumeric: 18,
  minTerm: '۶ ماه',
  maxTerm: '۶۰ ماه',
  guarantor: false,
  coefficientTable: [
    {
      depositMonths: 3,
      coefficient: '2.5',
      repaymentMonths: '12',
    },
    {
      depositMonths: 6,
      coefficient: '3.0',
      repaymentMonths: '24',
    },
    {
      depositMonths: 12,
      coefficient: '4.0',
      repaymentMonths: '36',
    },
  ],
};

export const mockLoans: LoanType[] = [
  mockLoan,
  mockLoanWithGuarantor,
  mockLoanWithCoefficients,
];

export const createMockLoan = (overrides?: Partial<LoanType>): LoanType => ({
  ...mockLoan,
  ...overrides,
});

/**
 * LoanWithBank mocks (includes bank information for API responses)
 */
export const mockLoanWithBank: LoanWithBank = {
  ...mockLoan,
  bankId: 'bank-test-1',
  bankNameFA: 'بانک ملت',
  bankCategory: 'traditional-banks',
};

export const mockLoanWithBankAndGuarantor: LoanWithBank = {
  ...mockLoanWithGuarantor,
  bankId: 'bank-test-1',
  bankNameFA: 'بانک ملت',
  bankCategory: 'traditional-banks',
};

export const mockLoanWithBankAndCoefficients: LoanWithBank = {
  ...mockLoanWithCoefficients,
  bankId: 'bank-test-1',
  bankNameFA: 'بانک ملت',
  bankCategory: 'traditional-banks',
};

export const mockLoansWithBank: LoanWithBank[] = [
  mockLoanWithBank,
  mockLoanWithBankAndGuarantor,
  mockLoanWithBankAndCoefficients,
];

export const createMockLoanWithBank = (overrides?: Partial<LoanWithBank>): LoanWithBank => ({
  ...mockLoanWithBank,
  ...overrides,
});
