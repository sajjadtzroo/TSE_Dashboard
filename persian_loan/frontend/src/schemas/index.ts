/**
 * Zod Runtime Validation Schemas
 * Ensures API responses match expected types at runtime
 */

import { z } from 'zod';

/**
 * Bank Schema
 */
export const bankSchema = z.object({
  id: z.string(),
  nameFA: z.string(),
  nameEN: z.string(),
  category: z.enum(['traditional-banks', 'digital-banks']),
  type: z.string().optional(),
  description: z.string().optional(),
  descriptionFA: z.string().optional(),
  website: z.string().optional(),
  loanTypes: z.array(z.any()).optional(),
  loansCount: z.number().optional(),
  requirements: z.any().optional(),
  specialFeatures: z.any().optional(),
  parentBank: z.string().optional(),
  parentBankFA: z.string().optional(),
  calculationMethod: z.string().nullish(), // Can be string, null, or undefined
  scoringSystem: z.any().optional(),
  generalFeatures: z.any().optional(),
}).passthrough();

export type Bank = z.infer<typeof bankSchema>;

/**
 * Financial Criteria Schema (معیارهای مالی)
 * Defines calculation methods and formulas for loan analysis
 */
export const financialCriteriaSchema = z.object({
  // Deposit Calculations (محاسبات سپرده)
  depositCalculation: z.object({
    method: z.enum(['percentage', 'fixed', 'coefficient', 'none']).optional(),
    methodFA: z.string().optional(), // "درصدی" | "ثابت" | "ضریبی" | "بدون سپرده"
    percentage: z.number().optional(), // e.g., 10 for 10%
    fixedAmount: z.number().optional(),
    coefficient: z.number().optional(), // e.g., 0.1 means 10%
    formula: z.string().optional(), // e.g., "principal * 0.10"
    formulaFA: z.string().optional(),
    description: z.string().optional(),
    descriptionFA: z.string().optional(),
  }).optional(),

  // Cash Flow Analysis (تحلیل جریان نقدی)
  cashFlowAnalysis: z.object({
    method: z.enum(['npv', 'irr', 'payback', 'simple']).optional(),
    methodFA: z.string().optional(), // "ارزش فعلی خالص" | "نرخ بازده داخلی" | "دوره بازگشت" | "ساده"
    discountRate: z.number().optional(), // For NPV calculations
    inflationRate: z.number().optional(),
    formula: z.string().optional(),
    formulaFA: z.string().optional(),
  }).optional(),

  // Interest Calculation (محاسبه سود)
  interestCalculation: z.object({
    method: z.enum(['simple', 'compound', 'reducing_balance', 'flat_rate', 'annuity']).optional(),
    methodFA: z.string().optional(), // "ساده" | "مرکب" | "کاهنده" | "ثابت" | "سالیانه"
    compoundingFrequency: z.enum(['monthly', 'quarterly', 'annually', 'daily']).optional(),
    compoundingFrequencyFA: z.string().optional(),
    formula: z.string().optional(), // e.g., "P * r * t" or "P * (1 + r/n)^(n*t)"
    formulaFA: z.string().optional(),
    effectiveRate: z.boolean().optional(), // Calculate effective annual rate?
  }).optional(),

  // Payment Schedule (برنامه پرداخت)
  paymentSchedule: z.object({
    type: z.enum(['equal_installments', 'annuity', 'reducing_balance', 'graduated', 'balloon', 'interest_only', 'custom']).optional(),
    typeFA: z.string().optional(), // "اقساط مساوی" | "آنوئیتی" | "کاهنده" | "تدریجی" | "بالونی" | "فقط سود" | "سفارشی"
    formula: z.string().optional(), // Payment calculation formula
    formulaFA: z.string().optional(),
    gracePeriod: z.number().optional(), // Months before first payment
    gracePeriodFA: z.string().optional(),
  }).optional(),

  // Profit Calculation (محاسبه سود بانک)
  profitCalculation: z.object({
    method: z.enum(['islamic', 'conventional', 'murabaha', 'musharaka', 'ijara']).optional(),
    methodFA: z.string().optional(), // "اسلامی" | "مرسوم" | "مرابحه" | "مشارکت" | "اجاره"
    profitRate: z.number().optional(),
    profitRateFA: z.string().optional(),
    formula: z.string().optional(),
    formulaFA: z.string().optional(),
  }).optional(),

  // Fees and Charges (کارمزد و هزینه‌ها)
  feesAndCharges: z.object({
    processingFee: z.object({
      type: z.enum(['percentage', 'fixed', 'none']).optional(),
      amount: z.number().optional(),
      formula: z.string().optional(),
    }).optional(),
    administrativeFee: z.object({
      type: z.enum(['percentage', 'fixed', 'none']).optional(),
      amount: z.number().optional(),
      formula: z.string().optional(),
    }).optional(),
    earlyPaymentPenalty: z.object({
      applicable: z.boolean().optional(),
      type: z.enum(['percentage', 'fixed', 'none']).optional(),
      amount: z.number().optional(),
      formula: z.string().optional(),
    }).optional(),
    latePaymentPenalty: z.object({
      type: z.enum(['percentage', 'fixed', 'daily_interest', 'none']).optional(),
      amount: z.number().optional(),
      formula: z.string().optional(),
    }).optional(),
  }).optional(),

  // APR/APY Calculations (نرخ درصد سالانه)
  aprCalculation: z.object({
    includesFees: z.boolean().optional(),
    includesInsurance: z.boolean().optional(),
    formula: z.string().optional(),
    formulaFA: z.string().optional(),
    effectiveAPR: z.number().optional(),
  }).optional(),

  // Amortization (استهلاک)
  amortization: z.object({
    method: z.enum(['straight_line', 'declining_balance', 'annuity', 'bullet']).optional(),
    methodFA: z.string().optional(),
    formula: z.string().optional(),
    formulaFA: z.string().optional(),
  }).optional(),

  // Risk Assessment (ارزیابی ریسک)
  riskAssessment: z.object({
    debtToIncomeRatio: z.object({
      maximum: z.number().optional(), // e.g., 0.40 for 40%
      formula: z.string().optional(),
    }).optional(),
    loanToValueRatio: z.object({
      maximum: z.number().optional(),
      formula: z.string().optional(),
    }).optional(),
    creditScoreRequirement: z.object({
      minimum: z.number().optional(),
      methodology: z.string().optional(),
    }).optional(),
  }).optional(),
}).passthrough();

export type FinancialCriteria = z.infer<typeof financialCriteriaSchema>;

/**
 * Loan Type Schema
 */
export const loanTypeSchema = z.object({
  id: z.string(),
  nameFA: z.string(),
  nameEN: z.string().optional(),
  category: z.string().optional(),
  categoryFA: z.string().optional(),

  // Amount fields (strings with Persian/English numbers)
  minAmount: z.string().optional(),
  maxAmount: z.string().optional(),

  // Numeric fields (computed from strings)
  minAmountNumeric: z.number().optional(),
  maxAmountNumeric: z.number().optional(),

  // Interest rate
  interestRate: z.string().optional(),
  interestRateNumeric: z.number().optional(),

  // Other fields
  repaymentPeriod: z.string().optional(),
  guarantor: z.union([z.boolean(), z.string()]).optional(),
  requirements: z.array(z.string()).optional(),
  description: z.string().optional(),
  descriptionFA: z.string().optional(),

  // Financial Criteria (معیارهای مالی)
  financialCriteria: financialCriteriaSchema.optional(),

  // Allow additional fields
}).passthrough();

export type LoanType = z.infer<typeof loanTypeSchema>;

/**
 * Loan with Bank Schema (flattened loan from API)
 */
export const loanWithBankSchema = loanTypeSchema.extend({
  bankId: z.string(),
  bankNameFA: z.string(),
  bankNameEN: z.string().optional(),
  bankCategory: z.string().optional(),
  calculationMethod: z.string().optional(),
});

export type LoanWithBank = z.infer<typeof loanWithBankSchema>;

/**
 * API Response Pagination Metadata
 */
export const paginationMetadataSchema = z.object({
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
  has_next: z.boolean(),
  has_prev: z.boolean(),
});

/**
 * API Response Metadata
 */
export const responseMetaSchema = z.object({
  timestamp: z.string(),
  pagination: paginationMetadataSchema.nullish(), // Allow null, undefined, or object
  cached: z.boolean().optional(),
  cache_ttl: z.number().nullable().optional(),
});

/**
 * API Response Envelope (standardized format from backend)
 */
export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema,
    meta: responseMetaSchema,
    errors: z.array(z.any()).nullable().optional(),
  });

/**
 * API List Response Schema (standardized format)
 * DEPRECATED: Use apiResponseSchema instead
 */
export const listResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number(),
  });

/**
 * Banks List Response
 */
export const banksListResponseSchema = listResponseSchema(bankSchema);

/**
 * Loans List Response
 */
export const loansListResponseSchema = listResponseSchema(loanWithBankSchema);

/**
 * Summary Stats Schema
 */
export const summaryStatsSchema = z.object({
  totalBanks: z.number(),
  totalLoans: z.number(),
  digitalBanks: z.number(),
  traditionalBanks: z.number(),
  noGuarantorLoans: z.number(),
  averageInterestRate: z.number().optional(),
  calculationMethods: z.record(z.string(), z.number()).optional(),
});

export type SummaryStats = z.infer<typeof summaryStatsSchema>;

/**
 * Analytics Category Data Schema
 */
export const categoryDataSchema = z.object({
  'traditional-banks': z.array(z.any()),
  'digital-banks': z.array(z.any()),
}).passthrough();

export type CategoryData = z.infer<typeof categoryDataSchema>;

/**
 * Interest Rates Response Schema
 */
export const interestRatesResponseSchema = z.object({
  distribution: z.array(z.any()),
  avgRate: z.number(),
  minRate: z.number(),
  maxRate: z.number(),
}).passthrough();

export type InterestRatesResponse = z.infer<typeof interestRatesResponseSchema>;

/**
 * Bank Amounts Schema
 */
export const bankAmountsSchema = z.object({
  banks: z.array(z.any()),
  totalBanks: z.number(),
}).passthrough();

export type BankAmountsResponse = z.infer<typeof bankAmountsSchema>;

/**
 * Requirements Matrix Response Schema
 */
export const requirementsMatrixResponseSchema = z.object({
  matrix: z.array(z.any()),
  totalBanks: z.number(),
}).passthrough();

export type RequirementsMatrixResponse = z.infer<typeof requirementsMatrixResponseSchema>;

/**
 * Validation Helper
 * Validates data against schema and throws descriptive error if invalid
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context: string
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(`❌ Validation error in ${context}:`, {
        errors: error.issues,
        data,
      });
      // Detailed error table for debugging
      console.table(error.issues.map(i => ({
        path: i.path.join('.'),
        expected: (i as any).expected,
        received: (i as any).received,
        message: i.message,
        code: i.code,
      })));
      throw new Error(
        `Invalid data received from API (${context}): ${error.issues.map((e) => e.message).join(', ')}`
      );
    }
    throw error;
  }
}

/**
 * Safe Validation Helper
 * Returns validated data or null if validation fails (doesn't throw)
 */
export function safeValidateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context: string
): T | null {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.warn(`⚠️ Validation warning in ${context}:`, {
        errors: error.issues,
        data,
      });
      return null;
    }
    return null;
  }
}

/**
 * Reminders Service Schemas
 */
export const paymentScheduleItemSchema = z.object({
  installmentNumber: z.number(),
  dueDate: z.string(),
  dueDateJalali: z.string(),
  principalPayment: z.string(),
  interestPayment: z.string(),
  totalPayment: z.string(),
  remainingBalance: z.string(),
  status: z.enum(['pending', 'paid', 'overdue', 'partial']),
  paidDate: z.string().optional(),
  paidAmount: z.string().optional(),
}).passthrough();

export const userLoanSchema = z.object({
  id: z.string(),
  userId: z.string(),
  loanName: z.string(),
  loanNameFA: z.string().optional(),
  bankName: z.string().optional(),
  bankNameFA: z.string().optional(),
  principalAmount: z.string(),
  interestRate: z.string(),
  loanType: z.enum(['equal_installments', 'reducing_balance', 'graduated', 'balloon', 'interest_only']),
  totalInstallments: z.number(),
  startDate: z.string(),
  paymentDay: z.number(),
  description: z.string().optional(),
  notes: z.string().optional(),
  monthlyPayment: z.string(),
  totalPayment: z.string(),
  totalInterest: z.string(),
  paidInstallments: z.number(),
  remainingInstallments: z.number(),
  nextPaymentDate: z.string().optional(),
  nextPaymentDateJalali: z.string().optional(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).passthrough();

export const userLoanWithScheduleSchema = userLoanSchema.extend({
  paymentSchedule: z.array(paymentScheduleItemSchema),
});

export const loanListResponseSchema = z.object({
  total: z.number(),
  active: z.number(),
  completed: z.number(),
  loans: z.array(userLoanSchema),
}).passthrough();

export const paymentAlertSchema = z.object({
  id: z.string(),
  loanId: z.string(),
  loanName: z.string(),
  loanNameFA: z.string().optional(),
  bankName: z.string().optional(),
  bankNameFA: z.string().optional(),
  installmentNumber: z.number(),
  dueDate: z.string(),
  dueDateJalali: z.string(),
  amount: z.string(),
  daysUntilDue: z.number(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  status: z.enum(['pending', 'paid', 'overdue', 'partial']),
  message: z.string(),
  messageFA: z.string(),
}).passthrough();

export const alertsListResponseSchema = z.object({
  total: z.number(),
  urgent: z.number(),
  upcoming: z.number(),
  overdue: z.number(),
  alerts: z.array(paymentAlertSchema),
}).passthrough();

export const paymentCalculationResponseSchema = z.object({
  monthlyPayment: z.string(),
  totalPayment: z.string(),
  totalInterest: z.string(),
  effectiveRate: z.string(),
  paymentSchedule: z.array(paymentScheduleItemSchema),
}).passthrough();

/**
 * Import Service Schemas
 */
export const importResultSchema = z.object({
  fileId: z.string().optional(),
  importId: z.string().optional(),
  status: z.string().optional(),
  message: z.string().optional(),
}).passthrough();

export const ocrResultSchema = z.object({
  file_id: z.string(),
  language: z.string(),
  text: z.string(),
  confidence: z.number().optional(),
  page_count: z.number().optional(),
}).passthrough();

export const importStatusSchema = z.object({
  id: z.string(),
  type: z.string(),
  status: z.string(),
  source: z.any().optional(),
  results: z.any().optional(),
  error: z.string().optional(),
}).passthrough();

export const importListSchema = z.object({
  total: z.number(),
  imports: z.array(importStatusSchema),
}).passthrough();

export const importStatsSchema = z.object({
  total: z.number(),
  byType: z.any().optional(),
  byStatus: z.any().optional(),
}).passthrough();
