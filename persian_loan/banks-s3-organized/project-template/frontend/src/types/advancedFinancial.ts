/**
 * TypeScript Interfaces for Advanced Financial Analysis
 *
 * Defines type-safe interfaces for:
 * - CAPM calculations
 * - WACC calculations
 * - Free Cash Flow analysis
 * - Comprehensive advanced metrics
 */

// ============================================================================
// CAPM Interfaces
// ============================================================================

export interface CAPMInputs {
  riskFreeRate: number;      // Iranian deposit rate or government bond yield
  marketReturn: number;      // Tehran Stock Exchange expected return
  beta: number;              // Systematic risk (default 1.0 for market)
  loanAmount?: number;       // Optional: for integration with loan system
  depositAmount?: number;    // Optional: for integration with deposit system
}

export interface CAPMResults {
  expectedReturn: number;    // E(Ri) = Rf + β(Rm - Rf)
  riskPremium: number;       // Market risk premium: Rm - Rf
  requiredReturn: number;    // Same as expectedReturn (alias for clarity)
  impliedValue?: number;     // Optional: PV of cash flows at required return
}

// ============================================================================
// WACC Interfaces
// ============================================================================

export interface WACCCalculatorInputs {
  equityValue: number;       // Market value of equity (can use depositAmount)
  debtValue: number;         // Market value of debt (can use loanAmount)
  costOfEquity: number;      // Required return on equity (from CAPM or manual)
  costOfDebt: number;        // Interest rate on debt (from loan.interestRateNumeric)
  taxRate: number;           // Corporate tax rate (default 0.25 for Iran)
  loanId?: string;           // Optional: link to specific loan
  useDepositAsEquity?: boolean; // Use deposit amount as equity proxy
}

export interface WACCResults {
  wacc: number;                 // Weighted average cost of capital
  equityWeight: number;         // E/V (proportion of equity)
  debtWeight: number;           // D/V (proportion of debt)
  afterTaxCostOfDebt: number;   // Rd × (1-Tc)
  firmValue: number;            // V = E + D (total firm value)
  equityComponent: number;      // (E/V) × Re
  debtComponent: number;        // (D/V) × Rd × (1-Tc)
}

// ============================================================================
// Free Cash Flow Interfaces
// ============================================================================

export interface FCFAnalysisInputs {
  // Revenue and Operating Performance
  revenue: number;                      // Total revenue
  operatingExpenses: number;            // Operating expenses (excl. depreciation)
  taxes: number;                        // Taxes paid

  // Investment Activities
  capitalExpenditure: number;           // Fixed capital investments
  changeInWorkingCapital: number;       // Δ Working Capital

  // Financing Activities
  debtIssued: number;                   // New debt raised
  debtRepaid: number;                   // Debt payments

  // Non-cash Items
  depreciation: number;                 // Depreciation expense
  amortization: number;                 // Amortization expense

  // Integration with Loan System
  depositPeriods?: number;              // Number of deposit periods
  loanPeriods?: number;                 // Number of loan periods
  interestExpense?: number;             // Interest expense for FCFF
}

export interface FCFResults {
  fcff: number;                         // Free Cash Flow to Firm
  fcfe: number;                         // Free Cash Flow to Equity
  operatingCashFlow: number;            // Cash from operations
  cashFlowSchedule: number[];           // Period-by-period cash flows
  npvAtWACC: number;                    // NPV discounted at WACC
  irr: number | null;                   // Internal rate of return
}

// ============================================================================
// Advanced Metrics Interfaces
// ============================================================================

export interface RiskAdjustedMetrics {
  sharpeRatio?: number;      // (Rp - Rf) / σp
  treynorRatio?: number;     // (Rp - Rf) / βp
  jensensAlpha?: number;     // Rp - [Rf + β(Rm - Rf)]
  informationRatio?: number; // (Rp - Rb) / TE
}

export interface AdvancedMetrics {
  capm: CAPMResults;
  wacc: WACCResults;
  fcf: FCFResults;
  riskAdjusted: RiskAdjustedMetrics;

  // Investment Decision Support
  recommendation: 'accept' | 'reject' | 'investigate';
  recommendationScore: number;        // 0-100 composite score
  keyInsights: string[];              // Bulleted insights for user
  warnings: string[];                 // Risk warnings
}

// ============================================================================
// Integrated Analysis Interfaces
// ============================================================================

/**
 * Comprehensive inputs combining all analysis types
 * Used for the integrated analysis tab
 */
export interface IntegratedAnalysisInputs {
  // CAPM Inputs
  capm: CAPMInputs;

  // WACC Inputs
  wacc: WACCCalculatorInputs;

  // FCF Inputs
  fcf: FCFAnalysisInputs;

  // Optional: Link to loan for auto-population
  loanId?: string;

  // Optional: Risk metrics calculation inputs
  portfolioStandardDeviation?: number;
  benchmarkReturn?: number;
  trackingError?: number;
}

/**
 * Comprehensive results from integrated analysis
 */
export interface IntegratedAnalysisResults {
  metrics: AdvancedMetrics;

  // Comparative Analysis
  traditionalNPV: number;              // NPV at loan interest rate
  waccBasedNPV: number;                // NPV at WACC
  npvDifference: number;               // Difference between methods

  traditionalIRR: number | null;       // Traditional IRR
  capmRequiredReturn: number;          // CAPM required return
  irrVsCAPM: number;                   // IRR - CAPM (excess return)

  // Capital Structure Analysis
  debtToEquityRatio: number;           // D/E
  debtRatio: number;                   // D/V
  equityMultiplier: number;            // V/E = 1 + D/E

  // Valuation Summary
  firmValue: number;                   // Total firm value
  equityValue: number;                 // Equity value
  debtValue: number;                   // Debt value

  // Decision Support
  acceptAtWACC: boolean;               // NPV > 0 at WACC
  acceptAtCAPM: boolean;               // IRR > CAPM required return
  overallRecommendation: 'accept' | 'reject' | 'investigate';
}

// ============================================================================
// Visualization Data Interfaces
// ============================================================================

/**
 * Data for Security Market Line (SML) chart
 */
export interface SMLChartData {
  beta: number;
  expectedReturn: number;
  label: string;
}

/**
 * Data for capital structure pie chart
 */
export interface CapitalStructureData {
  equity: number;
  debt: number;
  equityPercentage: number;
  debtPercentage: number;
}

/**
 * Data for WACC component bar chart
 */
export interface WACCComponentData {
  component: string;
  value: number;
  percentage: number;
}

/**
 * Data for cash flow waterfall chart
 */
export interface CashFlowWaterfallData {
  category: string;
  value: number;
  cumulative: number;
  isSubtotal: boolean;
}

/**
 * Data for comparative radar chart
 */
export interface ComparativeRadarData {
  metric: string;
  value: number;
  benchmark: number;
}

// ============================================================================
// Calculator State Management
// ============================================================================

/**
 * State for Advanced Financial Calculator component
 */
export interface AdvancedCalculatorState {
  activeTab: 'capm' | 'wacc' | 'fcf' | 'integrated';

  capmInputs: CAPMInputs;
  capmResults: CAPMResults | null;

  waccInputs: WACCCalculatorInputs;
  waccResults: WACCResults | null;

  fcfInputs: FCFAnalysisInputs;
  fcfResults: FCFResults | null;

  integratedInputs: IntegratedAnalysisInputs | null;
  integratedResults: IntegratedAnalysisResults | null;

  selectedLoanId: string | null;

  errors: Record<string, string[]>;
  isCalculating: boolean;
}

// ============================================================================
// Form Validation
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FieldValidation {
  field: string;
  isValid: boolean;
  error?: string;
}

// ============================================================================
// Auto-population from Loan Data
// ============================================================================

/**
 * Mapping configuration for auto-populating from loan data
 */
export interface LoanDataMapping {
  // WACC Mappings
  debtValue: 'loanAmount' | 'facilityAmount';
  equityValue: 'depositAmount' | 'calculatedEquity';
  costOfDebt: 'interestRateNumeric' | 'effectiveRate';

  // Capital Structure Mappings
  useDepositRatio: boolean;
  useCoefficientTable: boolean;

  // FCF Mappings
  periods: 'depositPeriods' | 'loanPeriods';
  interestExpense: 'calculated' | 'manual';
}

// ============================================================================
// Export Helper Types
// ============================================================================

/**
 * Type guard to check if a value is a valid recommendation
 */
export function isValidRecommendation(
  value: string
): value is 'accept' | 'reject' | 'investigate' {
  return ['accept', 'reject', 'investigate'].includes(value);
}

/**
 * Type guard to check if a value is a valid calculator tab
 */
export function isValidCalculatorTab(
  value: string
): value is 'capm' | 'wacc' | 'fcf' | 'integrated' {
  return ['capm', 'wacc', 'fcf', 'integrated'].includes(value);
}
