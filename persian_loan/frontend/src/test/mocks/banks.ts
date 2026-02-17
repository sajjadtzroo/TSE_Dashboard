/**
 * Mock Bank Data for Testing
 */

import type { Bank } from '@/types';

export const mockBank: Bank = {
  id: 'bank-test-1',
  nameFA: 'بانک ملت',
  nameEN: 'Bank Mellat',
  category: 'traditional-banks',
  type: 'دولتی',
  website: 'https://bankmellat.ir',
  descriptionFA: 'بانک ملت یکی از بزرگترین بانک‌های ایران است',
  calculationMethod: 'reducing-balance',
  loanTypes: [],
  loansCount: 0,
};

export const mockDigitalBank: Bank = {
  id: 'bank-test-2',
  nameFA: 'بانکینو',
  nameEN: 'Bankino',
  category: 'digital-banks',
  type: 'خصوصی',
  website: 'https://bankino.ir',
  descriptionFA: 'بانک دیجیتال بانکینو',
  parentBankFA: 'بانک ملت',
  calculationMethod: 'flat-rate',
  loanTypes: [],
  loansCount: 0,
  scoringSystem: {
    formulaFA: 'امتیاز = موجودی × ۰.۱',
    clubName: 'باشگاه بانکینو',
    calculationPeriodFA: 'محاسبه ماهانه',
    maxLoan: '۱ میلیارد تومان',
  },
  generalFeatures: {
    fullyOnlineFA: 'کاملاً آنلاین',
  },
};

export const mockBankWithLoans: Bank = {
  ...mockBank,
  loanTypes: [
    {
      id: 'loan-1',
      nameFA: 'وام قرض‌الحسنه',
      nameEN: 'Interest-Free Loan',
      minAmount: '۱۰ میلیون تومان',
      maxAmount: '۵۰۰ میلیون تومان',
      interestRate: '۰٪',
      interestRateNumeric: 0,
      guarantor: false,
    },
  ],
  loansCount: 1,
};

export const mockBanks: Bank[] = [
  mockBank,
  mockDigitalBank,
  mockBankWithLoans,
];

export const createMockBank = (overrides?: Partial<Bank>): Bank => ({
  ...mockBank,
  ...overrides,
});
