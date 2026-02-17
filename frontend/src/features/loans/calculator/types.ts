/**
 * Calculator Types
 */

export interface CalculatorInputs {
  depositAmount: number;
  depositMonths: number;
  externalReturnRate: number; // Alternative investment return rate (annual %)
  commission: number; // Willing to pay as commission
  loanMonths: number; // Desired loan repayment period
  riskTolerance: 'low' | 'medium' | 'high';
}

export interface LoanAnalysis {
  loanId: string;
  bankId: string;
  bankNameFA: string;
  loanNameFA: string;
  loanAmount: number;
  interestRate: number;
  irr: number | null;
  mirr: number | null;
  npv: number;
  totalCost: number;
  monthlyPayment: number;
  effectiveRate: number;
  opportunityCost: number;
  score: number; // Overall recommendation score
  cashFlows: number[];
  depositMultiplier: number | null; // Per-loan deposit-to-loan multiplier
}

export interface CalculatorResults {
  topRecommendations: LoanAnalysis[];
  allAnalyses: LoanAnalysis[];
  summary: {
    bestIRR: LoanAnalysis;
    lowestCost: LoanAnalysis;
    highestLoan: LoanAnalysis;
  };
}
