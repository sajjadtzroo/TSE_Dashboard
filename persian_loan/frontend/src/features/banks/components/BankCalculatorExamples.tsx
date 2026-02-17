/**
 * Bank Calculator Examples Component
 * Displays loan calculator examples in a responsive grid
 */

import { memo } from 'react';
import { Calculator } from 'lucide-react';
import type { Bank } from '@/types';

interface BankCalculatorExamplesProps {
  examples: Bank['loanCalculatorExamples'];
}

export const BankCalculatorExamples = memo(function BankCalculatorExamples({
  examples,
}: BankCalculatorExamplesProps) {
  if (!examples || examples.length === 0) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border-dark">
        <Calculator className="w-5 h-5 text-primary-400" />
        <h2 className="text-lg font-semibold text-gray-50">نمونه محاسبه وام</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {examples.map((example, idx) => (
          <div
            key={idx}
            className="bg-primary-800/15 border border-primary-700/40 p-4 rounded-lg space-y-2 hover:border-primary-600/50 transition-colors"
          >
            <div className="flex justify-between">
              <span className="text-primary-300 text-sm font-medium">
                مبلغ وام:
              </span>
              <span className="font-bold text-gray-50">{example.amount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-primary-300 text-sm font-medium">
                مدت بازپرداخت:
              </span>
              <span className="text-gray-100">{example.repaymentPeriod}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-primary-300 text-sm font-medium">
                قسط ماهانه:
              </span>
              <span className="font-bold text-gray-50">
                {example.monthlyPayment}
              </span>
            </div>
            {example.interest && (
              <div className="flex justify-between">
                <span className="text-primary-300 text-sm font-medium">
                  سود ({example.interestRate}):
                </span>
                <span className="text-gray-100">{example.interest}</span>
              </div>
            )}
            {example.digitalServiceFee && (
              <div className="flex justify-between">
                <span className="text-primary-300 text-sm font-medium">
                  کارمزد خدمات:
                </span>
                <span className="text-gray-100">
                  {example.digitalServiceFee}
                </span>
              </div>
            )}
            <div className="pt-2 border-t border-primary-700/40">
              <div className="flex justify-between">
                <span className="text-primary-200 font-medium">
                  جمع بازپرداخت:
                </span>
                <span className="font-bold text-gray-50">
                  {example.totalRepayment}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
});
