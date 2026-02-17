/**
 * Loan Options Section Component
 * Displays loan options and step system (Hi Bank style)
 */

import { memo } from 'react';
import { Layers } from 'lucide-react';
import type { LoanType } from '@/types';

interface LoanOptionsSectionProps {
  loan: LoanType;
}

export const LoanOptionsSection = memo(function LoanOptionsSection({
  loan,
}: LoanOptionsSectionProps) {
  const hasLoanOptions = loan.loanOptions && loan.loanOptions.length > 0;
  const hasStepSystem = !!loan.stepSystem;

  // Don't render if no options
  if (!hasLoanOptions && !hasStepSystem) {
    return null;
  }

  return (
    <>
      {/* Loan Options */}
      {hasLoanOptions && (
        <div>
          <div className="flex items-center gap-2 text-gray-300 mb-3">
            <Layers className="w-5 h-5" />
            <span className="font-medium">گزینه‌های وام</span>
          </div>
          <div className="grid gap-3">
            {loan.loanOptions!.map((option, idx) => (
              <div key={idx} className="bg-surface-50 p-3 rounded-lg border border-surface-50">
                {(option.name || option.nameFA) && (
                  <p className="font-medium text-gray-200 mb-2">{option.nameFA || option.name}</p>
                )}
                <div className="flex flex-wrap gap-4 text-sm">
                  {option.amount && (
                    <span><span className="text-gray-500">مبلغ: </span><span className="text-gray-300">{option.amountFA || option.amount}</span></span>
                  )}
                  {option.interestRate && (
                    <span><span className="text-gray-500">نرخ سود: </span><span className="text-gray-300">{option.interestRate}</span></span>
                  )}
                  {option.repaymentPeriod && (
                    <span><span className="text-gray-500">بازپرداخت: </span><span className="text-gray-300">{option.repaymentPeriod}</span></span>
                  )}
                  {option.fee && (
                    <span><span className="text-gray-500">کارمزد: </span><span className="text-gray-300">{option.fee}</span></span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step System (Hi Bank style) */}
      {hasStepSystem && (
        <div>
          <div className="flex items-center gap-2 text-gray-300 mb-3">
            <Layers className="w-5 h-5" />
            <span className="font-medium">سیستم پلکانی</span>
          </div>
          {loan.stepSystem!.descriptionFA && (
            <p className="text-sm text-gray-400 mb-3">{loan.stepSystem!.descriptionFA}</p>
          )}
          <div className="space-y-2">
            {loan.stepSystem!.tiers.map((tier, idx) => (
              <div key={idx} className="bg-gradient-to-l from-primary-800/20 to-surface-100 p-3 rounded-lg border-r-4 border-primary-400">
                <p className="font-medium text-gray-200">{tier.nameFA || tier.name}</p>
                <div className="flex flex-wrap gap-4 text-sm mt-1">
                  {tier.amount && (
                    <span><span className="text-gray-500">مبلغ: </span><span className="text-gray-300">{tier.amountFA || tier.amount}</span></span>
                  )}
                  {tier.interestRate && (
                    <span><span className="text-gray-500">نرخ: </span><span className="text-gray-300">{tier.interestRate}</span></span>
                  )}
                  {tier.timeToUnlock && (
                    <span><span className="text-gray-500">زمان باز شدن: </span><span className="text-gray-300">{tier.timeToUnlock}</span></span>
                  )}
                </div>
                {tier.requirementFA && (
                  <p className="text-xs text-gray-500 mt-1">{tier.requirementFA}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
});
