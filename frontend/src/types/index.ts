/**
 * Type definitions for Iranian Banks Loan Dashboard
 */

// ── Bank Contact & Metadata Types ──────────────────────────────────────────
export interface BankContact {
  phone?: string;
  phoneInstruction?: string;
  technicalSupport?: string;
  customerServiceName?: string;
  email?: string;
  support?: string;
  support24_7?: boolean;
}

export interface BankAppDownload {
  android?: string[];
  ios?: string[];
  web?: string;
}

export interface BankStatistics {
  users?: string;
  cities?: string;
  villages?: string;
  rating?: string;
  reviews?: string;
  loansDisbursed?: string;
  topPosition?: string;
  onlineLoans?: string;
  farhangianCards?: string;
  description?: string;
}

export interface BankProcessingTimes {
  accountOpening?: string;
  loanApproval?: string;
  loanApprovalFA?: string;
  note?: string;
  noteFA?: string;
}

export interface BankMandatoryRequirements {
  minimumDeposit?: string;
  minimumDepositFA?: string;
  minimumAccountHistory?: string;
  minimumAccountHistoryFA?: string;
  depositBlocked?: boolean;
  depositBlockedFA?: string;
}

export interface BankUserFeedback {
  rating?: string;
  positives?: string[];
  complaints?: string[];
}

export interface BankCreditRatingSystem {
  systemUsed?: string;
  scoreRange?: string;
  description?: string;
  descriptionFA?: string;
  factors?: string[];
}

export interface BankSocialMedia {
  instagram?: string;
  linkedin?: string;
  telegram?: string;
  twitter?: string;
}

export interface LoanSources {
  urls?: string[];
  screenshots?: string[];
}

// Bank Types
export interface Bank {
  id: string;
  nameFA: string;
  nameEN: string;
  category: BankCategory;
  type?: string;
  parentBank?: string;
  parentBankFA?: string;
  logo?: string;
  website?: string;
  description?: string;
  descriptionFA?: string;
  calculationMethod?: string;
  loansCount: number;
  loanTypes: LoanType[];
  requirements?: BankRequirements;
  generalRequirements?: GeneralRequirements;
  generalFeatures?: Record<string, any>;
  features?: Record<string, any>;
  scoringSystem?: ScoringSystem;
  loanCalculatorExamples?: LoanCalculatorExample[];
  vaminoMonthlyTable?: VaminoTableRow[];
  vaminoInstallmentTable?: VaminoInstallmentRow[];
  coefficientTables?: Record<string, CoefficientRow[]>;
  process?: string[];
  importantNote?: string;
  note?: string;
  stepSystem?: StepSystem;
  guarantorRequirements?: GuarantorRequirements;
  creditRatingRequirements?: CreditRatingRequirements;
  mainProgram?: Record<string, any>;
  guarantorTypes?: Record<string, any>;

  // New Bank-Specific Features
  specialFeatures?: BankSpecialFeatures;
  invitationBased?: boolean;
  pointsSystem?: PointsSystem;
  specialPrograms?: string[];
  loyaltyBenefits?: LoyaltyBenefits;

  // Surfaced JSONB fields (extracted from extra_bank_data by API)
  contact?: BankContact;
  appDownload?: BankAppDownload;
  socialMedia?: BankSocialMedia;
  statistics?: BankStatistics;
  processingTimes?: BankProcessingTimes;
  mandatoryRequirements?: BankMandatoryRequirements;
  userFeedback?: BankUserFeedback;
  creditRatingSystem?: BankCreditRatingSystem;
  images?: string[];
  websitePortal?: string;
  parentBankWebsite?: string;
  launchDateFA?: string;

  // Detail-only: raw JSONB with extra fields (contact, appDownload, websitePortal, etc.)
  extraBankData?: Record<string, any>;
}

export interface ScoringSystem {
  formula?: string;
  formulaFA?: string;
  clubName?: string;
  calculationPeriod?: string;
  calculationPeriodFA?: string;
  minBalanceTracked?: string;
  maxLoan?: string;
  pointPurchase?: boolean;
  pointPurchaseFA?: string;
  pointTransfer?: boolean;
  pointTransferFA?: string;
}

// Bank Special Features
export interface BankSpecialFeatures {
  invitationBased?: boolean;
  pointsSystem?: PointsSystem;
  specialPrograms?: string[];
  loyaltyBenefits?: LoyaltyBenefits;
}

export interface PointsSystem {
  pointsType: string;
  pointsEarningRules?: string;
  pointsToLoanRatio?: string;
  description?: string;
  descriptionFA?: string;
}

export interface LoyaltyBenefits {
  description?: string;
  descriptionFA?: string;
  benefits?: string[];
  benefitsFA?: string[];
}

export interface LoanCalculatorExample {
  amount: string;
  repaymentPeriod: string;
  totalRepayment: string;
  totalInstallments?: string;
  monthlyPayment: string;
  interest?: string;
  interestRate?: string;
  digitalServiceFee?: string;
}

export interface VaminoTableRow {
  points: string;
  creditAmount: string;
}

export interface VaminoInstallmentRow {
  amount: string;
  months: number;
  pointsNoSupporter?: number | null;
  pointsWithSupporter?: number | null;
  creditRating?: string;
}

export type BankCategory = 'traditional-banks' | 'digital-banks';

export interface BankRequirements {
  guarantor?: boolean;
  guarantorFA?: string;
  check?: boolean;
  checkFA?: string;
  promissoryNote?: boolean;
  promissoryNoteFA?: string;
  creditRating?: string;
  creditRatingFA?: string;
  noBadChecks?: boolean;
  noBadChecksFA?: string;
  noOverdueDebts?: boolean;
  noOverdueDebtsFA?: string;
  onlineCreditCheck?: boolean;
  onlineCreditCheckFA?: string;
  noOverduePayments?: boolean;
  noOverduePaymentsFA?: string;
  moneyNotBlocked?: boolean;
  moneyNotBlockedFA?: string;

  // New Credit Rating Fields
  borrowerCreditRating?: string[];
  guarantorCreditRating?: string[];
  minimumCreditScore?: string;
  creditCheckRequired?: boolean;

  // New Deposit Ratio Fields
  depositToFacilityRatio?: string;
  depositRatioPercentage?: string;
  minimumDepositAmount?: string;
  depositDurationRequired?: string;
}

export interface GeneralRequirements {
  guarantor?: boolean;
  check?: boolean;
  creditRating?: string;
  onlineCreditCheck?: boolean;
}

// Guarantor Requirements Matrix (Bank Day style)
export interface GuarantorRequirementTier {
  guarantors: number;
  description?: string;
  descriptionFA?: string;
}

export interface GuarantorRequirements {
  upTo300M?: GuarantorRequirementTier;
  '300Mto500M'?: GuarantorRequirementTier;
  '500Mto1B'?: GuarantorRequirementTier;
  additionalGuarantee?: string;
}

// Credit Rating Requirements Matrix (Bank Day style)
export interface CreditRatingRequirement {
  maxLoan?: string;
  maxLoanFA?: string;
  guarantorRequirement?: string;
}

export interface CreditRatingRequirements {
  ratingA?: CreditRatingRequirement;
  ratingB?: CreditRatingRequirement;
  ratingCandD?: CreditRatingRequirement;
  ratingE?: CreditRatingRequirement;
}

// Step System (Hi Bank style)
export interface StepSystemTier {
  name: string;
  nameFA?: string;
  amount?: string;
  amountFA?: string;
  interestRate?: string;
  requirement?: string;
  requirementFA?: string;
  timeToUnlock?: string;
}

export interface StepSystem {
  description?: string;
  descriptionFA?: string;
  tiers: StepSystemTier[];
}

// Loan Options (for loans with multiple tiers/options)
export interface LoanOption {
  name?: string;
  nameFA?: string;
  amount?: string;
  amountFA?: string;
  interestRate?: string;
  repaymentPeriod?: string;
  fee?: string;
}

// Document Reference (for files)
export interface DocumentReference {
  type: 'pdf' | 'image' | 'document';
  name?: string;
  nameFA?: string;
  url?: string;
  path?: string;
}

// Loan Types
export interface LoanType {
  id: string;
  nameFA: string;
  nameEN?: string;
  category?: string;
  categoryFA?: string;
  interestRate?: string;
  interestRateFA?: string;
  interestRateNumeric?: number;
  minAmount?: string;
  maxAmount?: string;
  maxAmountFA?: string;
  minAmountFA?: string;
  minTerm?: string;
  maxTerm?: string;
  repaymentPeriod?: string;
  repaymentPeriodFA?: string;
  monthlyPayment?: string;
  monthlyPaymentFA?: string;
  guarantor?: boolean | string;
  guarantorFA?: string;
  guarantorNote?: string;
  description?: string;
  descriptionFA?: string;
  requirements?: string[];
  eligibilityRequirements?: string[];
  financialBehaviorFactors?: string[];
  creditRatingRequired?: string[];
  creditRatingRequiredFA?: string;
  creditCheckFee?: string;
  creditCheckFeeFA?: string;
  processingTime?: string;
  formula?: string;
  formulaFA?: string;
  loanMultiplier?: string;
  loanMultiplierFA?: string;
  fee?: string;
  feeFA?: string;
  availableAmounts?: string[];
  amounts?: string[];
  pointsRequired?: number;
  coefficientTable?: CoefficientRow[];
  creditCheckSystems?: string[];
  monthlyAssessment?: string;
  // Additional fields found in bank data
  applicationFee?: string;
  applicationFeeFA?: string;
  depositRate?: string;
  depositRateFA?: string;
  latePaymentRate?: string;
  latePaymentRateFA?: string;
  totalRepayment?: string;
  totalRepaymentFA?: string;
  totalInterest?: string;
  totalInterestFA?: string;
  collateral?: string;
  collateralFA?: string;
  minAveragePeriod?: string;
  averagePeriodFA?: string;
  loanOptions?: LoanOption[];
  files?: DocumentReference[];
  guarantorRequirements?: GuarantorRequirements;
  creditRatingRequirements?: CreditRatingRequirements;
  stepSystem?: StepSystem;

  // New Credit Rating Fields
  borrowerCreditRating?: string[];
  guarantorCreditRating?: string[];
  minimumCreditScore?: string;
  creditCheckRequired?: boolean;

  // New Deposit Ratio Fields
  depositToFacilityRatio?: string;
  depositRatioPercentage?: string;
  minimumDepositAmount?: string;
  depositDurationRequired?: string;

  // New Calculator Data Fields
  depositAmountOneMonth?: string;
  depositAmountThreeMonths?: string;
  depositAmountSixMonths?: string;
  averageBalanceRequired?: string;

  // New Fee Structure Fields
  depositFee?: string;
  feeByDuration?: Record<string, string>;
  feeStructure?: Record<string, any>;

  // Surfaced JSONB fields (extracted from extra_data by API)
  targetAudience?: string;
  targetAudienceFA?: string;
  sources?: LoanSources;
  specialCard?: Record<string, any>;
  teacherLoan?: Record<string, any>;
  processingTimeFA?: string;
  note?: string;
}

export interface CoefficientRow {
  depositMonths?: number;
  avgMonths?: number | string;
  loanPercent?: string;
  coefficient?: string;
  repaymentMonths?: number | string;
  interestRate?: string;
  repaymentMethod?: string;
  pointsNoSupporter?: number | null;
  pointsWithSupporter?: number | null;
  creditRating?: string;
}

export interface LoanRequirements {
  guarantor?: boolean;
  check?: boolean;
  promissoryNote?: boolean;
  collateral?: boolean;
  minAge?: number;
  maxAge?: number;
}

export interface LoanWithBank extends LoanType {
  bankId: string;
  bankNameFA: string;
  bankCategory: BankCategory;
  calculationMethod?: string;
}

// Analytics Types
export interface SummaryStats {
  totalBanks: number;
  traditionalBanks: number;
  digitalBanks: number;
  totalLoans: number;
  noGuarantorLoans: number;
  calculationMethods: Record<string, number>;
}

export interface BankCategoryItem {
  id: string;
  nameFA: string;
  nameEN: string;
  loansCount: number;
}

export interface CategoryData {
  'traditional-banks'?: BankCategoryItem[];
  'digital-banks'?: BankCategoryItem[];
}

export interface InterestRateItem {
  bankId: string;
  bankNameFA: string;
  loanId: string;
  loanNameFA: string;
  interestRate: string;
}

export interface InterestRatesResponse {
  total: number;
  distribution: Record<string, InterestRateItem[]>;
}

export interface LoanAmountRange {
  loanId: string;
  loanNameFA: string;
  minAmount: string | null;
  maxAmount: string | null;
}

export interface BankAmounts {
  bankId: string;
  bankNameFA: string;
  bankCategory: BankCategory;
  loans: LoanAmountRange[];
}

export interface RequirementsMatrixItem {
  bankId: string;
  bankNameFA: string;
  category: BankCategory;
  requirements: {
    guarantor?: boolean;
    check?: boolean;
    promissoryNote?: boolean;
    creditRating?: string;
    noBadChecks?: boolean;
    noOverdueDebts?: boolean;
    onlineCreditCheck?: boolean;
  };
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  status: number;
}

// UI Types
export type ColorVariant = 'blue' | 'green' | 'yellow' | 'purple' | 'red' | 'gray';

export interface SelectOption {
  value: string;
  label: string;
}
