/**
 * Loan Optimizer Types
 * Type definitions for the advanced loan optimizer feature
 */

import type { ScenarioResult, Alternative } from '@/utils/loans/privilegeAnalysis';

export type DiscountRateMethod = 'capm' | 'wacc' | 'custom';
export type RiskTolerance = 'low' | 'medium' | 'high';

export interface OptimizerInputs {
  depositAmount: number;
  depositMonths: number;
  loanAmountNeeded: number;
  discountRateMethod: DiscountRateMethod;
  customDiscountRate?: number;
  riskTolerance: RiskTolerance;
  beta?: number;
  // NEW: Privilege analysis fields
  considerPrivilegePurchase: boolean;
  privilegePurchasePrice?: number;
}

export interface LoanAnalysisResult {
  loanId: string;
  bankNameFA: string;
  loanNameFA: string;
  loanAmount: number;
  npv: number;
  irr: number;
  monthlyPayment: number;
  totalCost: number;
  effectiveRate: number;
  discountRate: number;
  riskScore: number;
  meetsRequirement: boolean;
  percentileNPV?: number;
  percentileIRR?: number;
  percentileCost?: number;

  // NEW: Privilege Analysis Fields
  breakEvenPrivilegePrice: number;
  maxWaitMonths: number;
  canAffordCurrentWait: boolean;

  // NEW: Scenario Analysis
  scenarios: {
    wait: ScenarioResult;
    buyPrivilege?: ScenarioResult;
    reject: ScenarioResult;
  };

  // NEW: Recommendations
  recommendation: 'WAIT' | 'BUY_PRIVILEGE' | 'REJECT' | 'NEGOTIATE';
  reasoning: string;

  // NEW: Alternatives
  alternatives?: Alternative[];

  // Pre-calculated cash flow series
  cashFlows: number[];

  // Additional context for analysis
  depositAmount: number;
  waitMonths: number;
  repaymentMonths: number;
  loanRate: number;

  // Per-loan deposit info
  depositMultiplier: number | null;    // e.g., 2.0 for 200%, 3.7 for 370%
  depositRatioLabel: string;           // e.g., "1:3.7", "200%"
  loanCategory: string;               // e.g., "deposit-based", "average-based"
}

export interface FilterOptions {
  selectedBanks: string[];
  onlySuitable: boolean;
  minLoanAmount?: number;
  maxLoanAmount?: number;
}

export interface SortConfig {
  key: keyof LoanAnalysisResult;
  direction: 'asc' | 'desc';
}
