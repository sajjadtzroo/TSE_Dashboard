/**
 * Optimizer Metrics Cards Component
 * Displays top 3 best loans summary
 */

import React, { useMemo } from 'react';
import type { LoanAnalysisResult } from '../types';
import ResultCard from '@/features/calculators/components/ResultCard';

interface OptimizerMetricsCardsProps {
  results: LoanAnalysisResult[];
}

/**
 * Format number as Persian currency
 */
const formatPersianAmount = (amount: number): string => {
  const billions = Math.floor(amount / 1_000_000_000);
  const millions = Math.floor((amount % 1_000_000_000) / 1_000_000);

  if (billions > 0) {
    if (millions > 0) {
      return `${billions.toLocaleString('fa-IR')} میلیارد و ${millions.toLocaleString('fa-IR')} میلیون تومان`;
    }
    return `${billions.toLocaleString('fa-IR')} میلیارد تومان`;
  }
  return `${millions.toLocaleString('fa-IR')} میلیون تومان`;
};

const OptimizerMetricsCards: React.FC<OptimizerMetricsCardsProps> = ({ results }) => {
  // Memoize expensive calculations
  const { bestNPV, bestIRR, lowestCost, bestOverall, hasPrivilegeAnalysis } = useMemo(() => {
    if (results.length === 0) {
      return {
        bestNPV: null,
        bestIRR: null,
        lowestCost: null,
        bestOverall: null,
        hasPrivilegeAnalysis: false,
      };
    }

    // Find best loans
    const bestNPV = [...results].sort((a, b) => b.npv - a.npv)[0];
    const bestIRR = [...results].sort((a, b) => b.irr - a.irr)[0];
    const lowestCost = [...results].sort((a, b) => a.totalCost - b.totalCost)[0];

    // Find best overall deal considering scenarios
    const bestOverall = [...results]
      .filter((loan) => loan.scenarios && (loan.scenarios.wait.npv > 0 || (loan.scenarios.buyPrivilege && loan.scenarios.buyPrivilege.npv > 0)))
      .sort((a, b) => {
        const maxNPVa = Math.max(
          a.scenarios.wait.npv,
          a.scenarios.buyPrivilege?.npv || -Infinity
        );
        const maxNPVb = Math.max(
          b.scenarios.wait.npv,
          b.scenarios.buyPrivilege?.npv || -Infinity
        );
        return maxNPVb - maxNPVa;
      })[0];

    // Check if privilege analysis is enabled (if any loan has break-even price > 0)
    const hasPrivilegeAnalysis = results.some((loan) => loan.breakEvenPrivilegePrice > 0);

    return { bestNPV, bestIRR, lowestCost, bestOverall, hasPrivilegeAnalysis };
  }, [results]);

  if (!bestNPV || !bestIRR || !lowestCost) {
    return null;
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-${hasPrivilegeAnalysis && bestOverall ? '4' : '3'} gap-4`}>
      <ResultCard
        label="بهترین NPV"
        value={formatPersianAmount(bestNPV.npv)}
        subtitle={`${bestNPV.bankNameFA} - ${bestNPV.loanNameFA}`}
        color="success"
        highlight
      />

      <ResultCard
        label="بهترین IRR"
        value={`${(bestIRR.irr * 100).toLocaleString('fa-IR', { maximumFractionDigits: 2 })}%`}
        subtitle={`${bestIRR.bankNameFA} - ${bestIRR.loanNameFA}`}
        color="primary"
        highlight
      />

      <ResultCard
        label="کمترین هزینه کل"
        value={formatPersianAmount(lowestCost.totalCost)}
        subtitle={`${lowestCost.bankNameFA} - ${lowestCost.loanNameFA}`}
        color="info"
        highlight
      />

      {hasPrivilegeAnalysis && bestOverall && (
        <ResultCard
          label="بهترین معامله کلی"
          value={
            bestOverall.recommendation === 'BUY_PRIVILEGE'
              ? 'خرید امتیاز'
              : bestOverall.recommendation === 'WAIT'
              ? 'انتظار'
              : 'مذاکره'
          }
          subtitle={`${bestOverall.bankNameFA} - ${bestOverall.loanNameFA} | NPV: ${formatPersianAmount(Math.max(
            bestOverall.scenarios.wait.npv,
            bestOverall.scenarios.buyPrivilege?.npv || -Infinity
          ))}`}
          color="warning"
          highlight
        />
      )}
    </div>
  );
};

export default React.memo(OptimizerMetricsCards);
