/**
 * Loan Optimizer Hook
 * Core calculation engine for comparing all loans
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { loansService } from '@/services/loans/loans.service';
import { analyzeLoanWithAdvancedMetrics } from '@/features/loans/calculator/calculatorEngine';
import type { LoanWithBank } from '@/types';
import type { OptimizerInputs, LoanAnalysisResult } from '../types';
import { IRANIAN_MARKET_DEFAULTS } from '@/utils/loans/advancedFinancial';
import {
  calculateBreakEvenPrice,
  calculateMaxWaitTime,
  analyzeScenarios,
  suggestAlternatives,
} from '@/utils/loans/privilegeAnalysis';
import { parseRepaymentMonths } from '@/utils/loans/financialCalculations';

export interface UseLoanOptimizerResult {
  loans: LoanAnalysisResult[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  rawLoans: LoanWithBank[];
}

/**
 * Calculate percentile rank for a value in an array
 * @param value The value to rank
 * @param allValues All values in the dataset
 * @param ascending Whether lower values are better (true) or higher values are better (false)
 */
function calculatePercentile(
  value: number,
  allValues: number[],
  ascending: boolean = false
): number {
  const sorted = [...allValues].sort((a, b) => (ascending ? a - b : b - a));
  const index = sorted.indexOf(value);
  return index / sorted.length;
}

/**
 * Main hook for loan optimizer
 */
export function useLoanOptimizer(
  inputs: OptimizerInputs
): UseLoanOptimizerResult {
  const [rawLoans, setRawLoans] = useState<LoanWithBank[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch loans from API
  const fetchLoans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const loans = await loansService.getAll();
      setRawLoans(loans);
    } catch (err) {
      console.error('Error fetching loans:', err);
      setError('خطا در دریافت اطلاعات وام‌ها. لطفاً دوباره تلاش کنید.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch loans on mount
  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  // Analyze all loans with advanced metrics
  const analyzedLoans = useMemo(() => {
    if (!rawLoans.length || !inputs.depositAmount || !inputs.loanAmountNeeded) {
      return [];
    }

    // Determine beta based on risk tolerance
    let beta = IRANIAN_MARKET_DEFAULTS.defaultBeta;
    if (inputs.riskTolerance === 'low') {
      beta = 0.8;
    } else if (inputs.riskTolerance === 'high') {
      beta = 1.5;
    }

    // Determine discount rate based on method
    let externalReturnRate = 0;
    if (inputs.discountRateMethod === 'custom' && inputs.customDiscountRate !== undefined) {
      externalReturnRate = inputs.customDiscountRate / 100;
    } else if (inputs.discountRateMethod === 'capm') {
      externalReturnRate = IRANIAN_MARKET_DEFAULTS.riskFreeRate +
        (beta * (IRANIAN_MARKET_DEFAULTS.marketReturn - IRANIAN_MARKET_DEFAULTS.riskFreeRate));
    } else if (inputs.discountRateMethod === 'wacc') {
      // WACC will be calculated per loan in analyzeLoanWithAdvancedMetrics
      externalReturnRate = IRANIAN_MARKET_DEFAULTS.riskFreeRate; // Fallback
    }

    // Analyze each loan
    const analyses = rawLoans
      .map((loan) => {
        try {
          const analysis = analyzeLoanWithAdvancedMetrics(
            loan,
            {
              depositAmount: inputs.depositAmount,
              depositMonths: inputs.depositMonths,
              loanMonths: parseRepaymentMonths(loan.repaymentPeriod),
              externalReturnRate,
              commission: 0,
              riskTolerance: inputs.riskTolerance,
            },
            beta
          );

          if (!analysis) {
            return null;
          }

          // Use WACC-based discount rate if available
          const discountRate = inputs.discountRateMethod === 'wacc' && analysis.wacc
            ? analysis.wacc.wacc
            : externalReturnRate;

          const loanRateDecimal = (loan.interestRateNumeric || 0) / 100;
          const calculatedLoanAmount = analysis.loanAmount;
          const repaymentMonths = parseRepaymentMonths(loan.repaymentPeriod);

          // NEW: Privilege Analysis (if enabled)
          let privilegeAnalysis = null;
          let breakEven = null;
          let maxWait = null;
          let alternatives: any[] = [];

          if (inputs.considerPrivilegePurchase) {
            privilegeAnalysis = analyzeScenarios(
              inputs.depositAmount,
              inputs.depositMonths,
              calculatedLoanAmount,
              loanRateDecimal,
              repaymentMonths,
              externalReturnRate,
              inputs.privilegePurchasePrice
            );

            breakEven = calculateBreakEvenPrice(
              inputs.depositAmount,
              inputs.depositMonths,
              calculatedLoanAmount,
              loanRateDecimal,
              repaymentMonths,
              externalReturnRate
            );

            maxWait = calculateMaxWaitTime(
              inputs.depositAmount,
              calculatedLoanAmount,
              loanRateDecimal,
              repaymentMonths,
              externalReturnRate
            );

            // Generate alternatives if current deal is bad
            if (analysis.npv < 0) {
              alternatives = suggestAlternatives(
                inputs.depositAmount,
                inputs.depositMonths,
                calculatedLoanAmount,
                loanRateDecimal,
                repaymentMonths,
                externalReturnRate
              );
            }
          } else {
            // Simple analysis without privilege purchase
            breakEven = calculateBreakEvenPrice(
              inputs.depositAmount,
              inputs.depositMonths,
              calculatedLoanAmount,
              loanRateDecimal,
              repaymentMonths,
              externalReturnRate
            );

            maxWait = calculateMaxWaitTime(
              inputs.depositAmount,
              calculatedLoanAmount,
              loanRateDecimal,
              repaymentMonths,
              externalReturnRate
            );
          }

          // Build per-loan deposit ratio label
          const depMultiplier = analysis.depositMultiplier;
          let depositRatioLabel = 'حداکثر مبلغ';
          if (depMultiplier !== null) {
            depositRatioLabel = `1:${depMultiplier}`;
            if (loan.depositToFacilityRatio) {
              depositRatioLabel = loan.depositToFacilityRatio;
            }
          }

          return {
            loanId: loan.id,
            bankNameFA: loan.bankNameFA,
            loanNameFA: loan.nameFA,
            loanAmount: calculatedLoanAmount,
            npv: inputs.discountRateMethod === 'wacc' && analysis.waccBasedNPV !== undefined
              ? analysis.waccBasedNPV
              : analysis.npv,
            irr: analysis.irr || 0,
            monthlyPayment: analysis.monthlyPayment,
            totalCost: analysis.totalCost,
            effectiveRate: analysis.effectiveRate,
            discountRate,
            riskScore: analysis.riskAdjustedScore || analysis.score,
            meetsRequirement: calculatedLoanAmount >= inputs.loanAmountNeeded,

            // Privilege analysis fields
            breakEvenPrivilegePrice: breakEven?.breakEvenPrice || 0,
            maxWaitMonths: maxWait?.maxWaitMonths || 0,
            canAffordCurrentWait: maxWait?.canAffordWait(inputs.depositMonths) || false,

            scenarios: privilegeAnalysis ? {
              wait: privilegeAnalysis.scenarioA,
              buyPrivilege: privilegeAnalysis.scenarioB || undefined,
              reject: privilegeAnalysis.scenarioC,
            } : {
              wait: {
                name: 'انتظار',
                npv: analysis.npv,
                decision: analysis.npv > 0 ? 'ACCEPT' as const : 'REJECT' as const,
                description: `انتظار ${inputs.depositMonths} ماه`
              },
              reject: {
                name: 'رد',
                npv: 0,
                decision: 'BASELINE' as const,
                description: 'سرمایه‌گذاری جایگزین'
              }
            },

            recommendation: privilegeAnalysis?.recommendation || (analysis.npv > 0 ? 'WAIT' : 'REJECT'),
            reasoning: privilegeAnalysis?.reasoning || '',
            alternatives: alternatives.length > 0 ? alternatives : undefined,

            // Pre-calculated cash flows from analyzeLoan
            cashFlows: analysis.cashFlows,

            // Additional context
            depositAmount: inputs.depositAmount,
            waitMonths: inputs.depositMonths,
            repaymentMonths,
            loanRate: loanRateDecimal,

            // Per-loan deposit info
            depositMultiplier: depMultiplier,
            depositRatioLabel,
            loanCategory: loan.category || '',
          };
        } catch (err) {
          console.error(`Error analyzing loan ${loan.id}:`, err);
          return null;
        }
      })
      .filter((analysis) => analysis !== null) as LoanAnalysisResult[];

    // Calculate percentiles for color coding
    if (analyses.length > 0) {
      const npvValues = analyses.map((a) => a.npv);
      const irrValues = analyses.map((a) => a.irr);
      const costValues = analyses.map((a) => a.totalCost);

      analyses.forEach((analysis) => {
        analysis.percentileNPV = calculatePercentile(analysis.npv, npvValues, false);
        analysis.percentileIRR = calculatePercentile(analysis.irr, irrValues, false);
        analysis.percentileCost = calculatePercentile(analysis.totalCost, costValues, true);
      });

      // Debug: Check for duplicate loan IDs
      const loanIds = analyses.map((a) => a.loanId);
      const duplicateIds = loanIds.filter((id, index) => loanIds.indexOf(id) !== index);
      if (duplicateIds.length > 0) {
        console.warn('⚠️ Duplicate loan IDs found in database:', [...new Set(duplicateIds)]);
      }
    }

    return analyses;
  }, [rawLoans, inputs]);

  return {
    loans: analyzedLoans,
    loading,
    error,
    refetch: fetchLoans,
    rawLoans,
  };
}
