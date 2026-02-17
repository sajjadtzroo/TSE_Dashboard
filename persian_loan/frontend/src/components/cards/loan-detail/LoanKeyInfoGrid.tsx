/**
 * Loan Key Info Grid Component
 * Displays interest rate, amount, repayment period, and guarantor status in a grid
 */

import { memo } from 'react';
import { Percent, Banknote, Clock, UserCheck } from 'lucide-react';
import type { LoanType } from '@/types';

interface LoanKeyInfoGridProps {
  loan: LoanType;
  hasGuarantor: boolean;
}

export const LoanKeyInfoGrid = memo(function LoanKeyInfoGrid({
  loan,
  hasGuarantor,
}: LoanKeyInfoGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Interest Rate */}
      {loan.interestRate && (
        <div className="bg-primary-800/20 p-3 rounded-lg border border-primary-700/30">
          <div className="flex items-center gap-2 text-primary-400 mb-1">
            <Percent className="w-4 h-4" />
            <span className="text-xs">نرخ سود</span>
          </div>
          <p className="font-bold text-primary-300">{loan.interestRate}</p>
          {loan.interestRateFA && (
            <p className="text-xs text-primary-400/70 mt-1">{loan.interestRateFA}</p>
          )}
        </div>
      )}

      {/* Amount */}
      {(loan.minAmount || loan.maxAmount) && (
        <div className="bg-secondary-800/20 p-3 rounded-lg border border-secondary-700/30">
          <div className="flex items-center gap-2 text-secondary-500 mb-1">
            <Banknote className="w-4 h-4" />
            <span className="text-xs">مبلغ</span>
          </div>
          <p className="font-bold text-secondary-400">
            {loan.maxAmount || loan.minAmount}
          </p>
          {loan.maxAmountFA && (
            <p className="text-xs text-secondary-500/70 mt-1">{loan.maxAmountFA}</p>
          )}
        </div>
      )}

      {/* Repayment Period */}
      {(loan.repaymentPeriod || loan.minTerm || loan.maxTerm) && (
        <div className="bg-purple-900/20 p-3 rounded-lg border border-purple-700/30">
          <div className="flex items-center gap-2 text-purple-400 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs">بازپرداخت</span>
          </div>
          <p className="font-bold text-purple-300">
            {loan.repaymentPeriod || `${loan.minTerm} تا ${loan.maxTerm}`}
          </p>
          {loan.repaymentPeriodFA && (
            <p className="text-xs text-purple-400/70 mt-1">{loan.repaymentPeriodFA}</p>
          )}
        </div>
      )}

      {/* Guarantor */}
      <div className={`p-3 rounded-lg border ${hasGuarantor ? 'bg-yellow-900/20 border-yellow-700/30' : 'bg-secondary-800/20 border-secondary-700/30'}`}>
        <div className={`flex items-center gap-2 mb-1 ${hasGuarantor ? 'text-yellow-400' : 'text-secondary-500'}`}>
          <UserCheck className="w-4 h-4" />
          <span className="text-xs">ضامن</span>
        </div>
        <p className={`font-bold ${hasGuarantor ? 'text-yellow-300' : 'text-secondary-400'}`}>
          {hasGuarantor ? 'نیاز به ضامن' : 'بدون ضامن'}
        </p>
        {loan.guarantorFA && (
          <p className={`text-xs mt-1 ${hasGuarantor ? 'text-yellow-400/70' : 'text-secondary-500/70'}`}>
            {loan.guarantorFA}
          </p>
        )}
      </div>
    </div>
  );
});
