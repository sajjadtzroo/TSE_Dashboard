/**
 * Loan Financial Info Component
 * Displays monthly payment, fees, rates, and repayment details
 */

import { memo } from 'react';
import { Calculator, TrendingUp, Shield, Banknote } from 'lucide-react';
import type { LoanType } from '@/types';

interface LoanFinancialInfoProps {
  loan: LoanType;
}

export const LoanFinancialInfo = memo(function LoanFinancialInfo({
  loan,
}: LoanFinancialInfoProps) {
  const hasMonthlyPayment = !!loan.monthlyPayment;
  const hasFees = loan.fee || loan.creditCheckFee || loan.applicationFee;
  const hasRates = loan.depositRate || loan.latePaymentRate;
  const hasTotals = loan.totalRepayment || loan.totalInterest;
  const hasCollateral = !!loan.collateral;
  const hasAveragePeriod = !!loan.minAveragePeriod;
  const hasAvailableAmounts = loan.availableAmounts || loan.amounts;
  const hasFormula = loan.loanMultiplier || loan.formula;

  // Don't render if no financial info
  if (!hasMonthlyPayment && !hasFees && !hasRates && !hasTotals && !hasCollateral && !hasAveragePeriod && !hasAvailableAmounts && !hasFormula) {
    return null;
  }

  return (
    <>
      {/* Monthly Payment */}
      {hasMonthlyPayment && (
        <div className="bg-primary-800/20 p-4 rounded-lg border border-primary-700/30">
          <div className="flex items-center gap-2 text-primary-400 mb-2">
            <Calculator className="w-5 h-5" />
            <span className="font-medium">قسط ماهانه</span>
          </div>
          <p className="text-2xl font-bold text-primary-300">{loan.monthlyPayment}</p>
          {loan.monthlyPaymentFA && (
            <p className="text-sm text-primary-400/70 mt-1">{loan.monthlyPaymentFA}</p>
          )}
        </div>
      )}

      {/* Fee Info */}
      {hasFees && (
        <div className="flex flex-wrap gap-3">
          {loan.fee && (
            <div className="bg-orange-900/20 px-4 py-2 rounded-lg border border-orange-700/30">
              <span className="text-orange-400 text-sm">کارمزد: </span>
              <span className="font-bold text-orange-300">{loan.fee}</span>
              {loan.feeFA && (
                <p className="text-xs text-orange-400/70 mt-1">{loan.feeFA}</p>
              )}
            </div>
          )}
          {loan.creditCheckFee && (
            <div className="bg-orange-900/20 px-4 py-2 rounded-lg border border-orange-700/30">
              <span className="text-orange-400 text-sm">هزینه اعتبارسنجی: </span>
              <span className="font-bold text-orange-300">{loan.creditCheckFee}</span>
              {loan.creditCheckFeeFA && (
                <p className="text-xs text-orange-400/70 mt-1">{loan.creditCheckFeeFA}</p>
              )}
            </div>
          )}
          {loan.applicationFee && (
            <div className="bg-orange-900/20 px-4 py-2 rounded-lg border border-orange-700/30">
              <span className="text-orange-400 text-sm">هزینه درخواست: </span>
              <span className="font-bold text-orange-300">{loan.applicationFee}</span>
              {loan.applicationFeeFA && (
                <p className="text-xs text-orange-400/70 mt-1">{loan.applicationFeeFA}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Deposit Rate & Late Payment Rate */}
      {hasRates && (
        <div className="flex flex-wrap gap-3">
          {loan.depositRate && (
            <div className="bg-secondary-800/20 px-4 py-2 rounded-lg border border-secondary-700/30">
              <span className="text-secondary-500 text-sm">نرخ سپرده: </span>
              <span className="font-bold text-secondary-400">{loan.depositRate}</span>
              {loan.depositRateFA && (
                <p className="text-xs text-secondary-500/70 mt-1">{loan.depositRateFA}</p>
              )}
            </div>
          )}
          {loan.latePaymentRate && (
            <div className="bg-error-900/20 px-4 py-2 rounded-lg border border-error-700/30">
              <span className="text-error-500 text-sm">نرخ دیرکرد: </span>
              <span className="font-bold text-error-400">{loan.latePaymentRate}</span>
              {loan.latePaymentRateFA && (
                <p className="text-xs text-error-500/70 mt-1">{loan.latePaymentRateFA}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Total Repayment & Interest */}
      {hasTotals && (
        <div className="bg-purple-900/20 p-4 rounded-lg border border-purple-700/30">
          <div className="flex items-center gap-2 text-purple-400 mb-2">
            <TrendingUp className="w-5 h-5" />
            <span className="font-medium">اطلاعات بازپرداخت کل</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {loan.totalRepayment && (
              <div>
                <p className="text-xs text-purple-400/70">کل بازپرداخت</p>
                <p className="font-bold text-purple-300">{loan.totalRepayment}</p>
              </div>
            )}
            {loan.totalInterest && (
              <div>
                <p className="text-xs text-purple-400/70">کل سود</p>
                <p className="font-bold text-purple-300">{loan.totalInterest}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Collateral */}
      {hasCollateral && (
        <div className="bg-yellow-900/20 p-4 rounded-lg border border-yellow-700/30">
          <div className="flex items-center gap-2 text-yellow-400 mb-2">
            <Shield className="w-5 h-5" />
            <span className="font-medium">وثیقه</span>
          </div>
          <p className="text-yellow-300">{loan.collateral}</p>
          {loan.collateralFA && (
            <p className="text-sm text-yellow-400/70 mt-1">{loan.collateralFA}</p>
          )}
        </div>
      )}

      {/* Average Period */}
      {hasAveragePeriod && (
        <div className="bg-cyan-900/20 px-4 py-2 rounded-lg border border-cyan-700/30">
          <span className="text-cyan-400 text-sm">حداقل مدت معدل‌گیری: </span>
          <span className="font-bold text-cyan-300">{loan.minAveragePeriod}</span>
          {loan.averagePeriodFA && (
            <p className="text-xs text-cyan-400/70 mt-1">{loan.averagePeriodFA}</p>
          )}
        </div>
      )}

      {/* Loan Multiplier / Formula */}
      {hasFormula && (
        <div className="bg-cyan-900/20 p-4 rounded-lg border border-cyan-700/30">
          <div className="flex items-center gap-2 text-cyan-400 mb-2">
            <Calculator className="w-5 h-5" />
            <span className="font-medium">فرمول محاسبه</span>
          </div>
          {loan.loanMultiplier && (
            <p className="font-bold text-cyan-300">ضریب: {loan.loanMultiplier}</p>
          )}
          {loan.loanMultiplierFA && (
            <p className="text-sm text-cyan-400/70">{loan.loanMultiplierFA}</p>
          )}
          {loan.formulaFA && (
            <p className="text-sm text-cyan-300 mt-2">{loan.formulaFA}</p>
          )}
        </div>
      )}

      {/* Available Amounts */}
      {hasAvailableAmounts && (
        <div>
          <div className="flex items-center gap-2 text-gray-300 mb-3">
            <Banknote className="w-5 h-5" />
            <span className="font-medium">مبالغ قابل دریافت</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(loan.availableAmounts || loan.amounts)?.map((amount, idx) => (
              <span
                key={idx}
                className="bg-surface-50 text-gray-300 px-3 py-1 rounded-full text-sm border border-surface-50"
              >
                {amount}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
});
