/**
 * Mock Bank Data for Testing
 */

export const mockBanks = [
  {
    id: 'bank-melli',
    nameFA: 'بانک ملی',
    nameEN: 'Bank Melli',
    category: 'traditional-banks',
    type: 'traditional',
    loansCount: 2,
    calculationMethod: 'points-based',
  },
  {
    id: 'digikala-finance',
    nameFA: 'دیجی‌کالا فاینانس',
    nameEN: 'Digikala Finance',
    category: 'digital-banks',
    type: 'neobank',
    loansCount: 1,
    calculationMethod: 'deposit-based',
  },
];

export const mockBankDetail = {
  id: 'bank-melli',
  nameFA: 'بانک ملی',
  nameEN: 'Bank Melli',
  category: 'traditional-banks',
  type: 'traditional',
  website: 'https://bmi.ir',
  loansCount: 2,
  calculationMethod: 'points-based',
  loanTypes: [
    {
      id: 'general-loan',
      nameFA: 'وام عمومی',
      nameEN: 'General Loan',
      minAmount: '10000000',
      maxAmount: '500000000',
      interestRate: '18%',
      repaymentPeriod: '60 ماه',
      guarantor: true,
    },
    {
      id: 'no-guarantor-loan',
      nameFA: 'وام بدون ضامن',
      nameEN: 'No Guarantor Loan',
      minAmount: '5000000',
      maxAmount: '100000000',
      interestRate: '20%',
      repaymentPeriod: '36 ماه',
      guarantor: false,
    },
  ],
  requirements: {
    guarantor: true,
    check: true,
    creditRating: ['A', 'B'],
  },
};

export const mockLoans = [
  {
    bankId: 'bank-melli',
    bankNameFA: 'بانک ملی',
    bankNameEN: 'Bank Melli',
    id: 'general-loan',
    nameFA: 'وام عمومی',
    nameEN: 'General Loan',
    minAmount: '10000000',
    maxAmount: '500000000',
    interestRate: '18%',
    repaymentPeriod: '60 ماه',
    guarantor: true,
  },
  {
    bankId: 'digikala-finance',
    bankNameFA: 'دیجی‌کالا فاینانس',
    bankNameEN: 'Digikala Finance',
    id: 'deposit-loan',
    nameFA: 'وام ودیعه‌ای',
    nameEN: 'Deposit Loan',
    minAmount: '1000000',
    maxAmount: '200000000',
    interestRate: '15%',
    repaymentPeriod: '24 ماه',
    guarantor: false,
  },
];

export const mockAnalytics = {
  summary: {
    totalBanks: 2,
    traditionalBanks: 1,
    digitalBanks: 1,
    totalLoans: 3,
    noGuarantorLoans: 1,
    calculationMethods: {
      'points-based': 1,
      'deposit-based': 1,
    },
  },
  byCategory: {
    'traditional-banks': [
      {
        id: 'bank-melli',
        nameFA: 'بانک ملی',
        nameEN: 'Bank Melli',
        loansCount: 2,
      },
    ],
    'digital-banks': [
      {
        id: 'digikala-finance',
        nameFA: 'دیجی‌کالا فاینانس',
        nameEN: 'Digikala Finance',
        loansCount: 1,
      },
    ],
  },
};
