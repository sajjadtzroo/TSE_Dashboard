/**
 * Scenario Comparison Component
 * Displays detailed analysis of Wait vs Buy vs Reject scenarios
 */

import React from 'react';
import type { LoanAnalysisResult } from '../types';
import type { ScenarioResult } from '@/utils/privilegeAnalysis';
import { formatCurrency } from '@/utils/financialCalculations';

interface ScenarioComparisonProps {
  loan: LoanAnalysisResult;
}

const ScenarioComparison: React.FC<ScenarioComparisonProps> = ({ loan }) => {
  const scenarios = [
    loan.scenarios.wait,
    loan.scenarios.buyPrivilege,
    loan.scenarios.reject,
  ].filter((s) => s !== undefined) as ScenarioResult[];

  return (
    <div className="bg-surface-800 rounded-lg shadow-lg p-6 border border-surface-700">
      <h3 className="text-lg font-semibold text-gray-100 mb-4">
        مقایسه سناریوها: {loan.loanNameFA}
      </h3>
      <p className="text-sm text-gray-400 mb-6">
        بانک: {loan.bankNameFA}
      </p>

      {/* Scenarios Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {scenarios.map((scenario, index) => (
          <div
            key={`scenario-${scenario.name}-${index}`}
            className={`border rounded-lg p-4 ${
              scenario.decision === 'ACCEPT'
                ? 'border-green-500 bg-green-500/5'
                : scenario.decision === 'REJECT'
                ? 'border-red-500 bg-red-500/5'
                : 'border-gray-600 bg-surface-900'
            }`}
          >
            <div className="font-semibold text-base mb-2 text-gray-100">
              {scenario.name}
            </div>
            <div className="text-xs text-gray-400 mb-3 min-h-[2.5rem]">
              {scenario.description}
            </div>
            <div className="text-2xl font-bold mb-2">
              <span className={scenario.npv >= 0 ? 'text-green-400' : 'text-red-400'}>
                NPV: {formatCurrency(scenario.npv)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {scenario.decision === 'ACCEPT' && (
                <span className="text-green-400 font-semibold flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  سودآور
                </span>
              )}
              {scenario.decision === 'REJECT' && (
                <span className="text-red-400 font-semibold flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  زیان‌ده
                </span>
              )}
              {scenario.decision === 'BASELINE' && (
                <span className="text-gray-400 font-semibold">— مبنا</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="bg-surface-900 rounded-lg p-4 mb-6 border border-surface-700">
        <h4 className="font-semibold text-gray-200 mb-3">معیارهای کلیدی</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-400 text-xs mb-1">قیمت سر‌به‌سر امتیاز</div>
            <div className="font-semibold text-gray-100" style={{ fontFamily: 'Vazirmatn, sans-serif' }}>
              {formatCurrency(loan.breakEvenPrivilegePrice)}
            </div>
          </div>
          <div>
            <div className="text-gray-400 text-xs mb-1">حداکثر انتظار</div>
            <div className="font-semibold text-gray-100" style={{ fontFamily: 'Vazirmatn, sans-serif' }}>
              {loan.maxWaitMonths.toFixed(1)} ماه
            </div>
          </div>
          <div>
            <div className="text-gray-400 text-xs mb-1">قسط ماهانه</div>
            <div className="font-semibold text-gray-100" style={{ fontFamily: 'Vazirmatn, sans-serif' }}>
              {formatCurrency(loan.monthlyPayment)}
            </div>
          </div>
          <div>
            <div className="text-gray-400 text-xs mb-1">نرخ بهره</div>
            <div className="font-semibold text-gray-100" style={{ fontFamily: 'Vazirmatn, sans-serif' }}>
              {(loan.loanRate * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Alternatives Section */}
      {loan.alternatives && loan.alternatives.length > 0 && (
        <div className="pt-6 border-t border-surface-700">
          <h4 className="font-semibold text-gray-200 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
            </svg>
            پیشنهادات جایگزین برای بهبود سودآوری
          </h4>
          <div className="space-y-3">
            {loan.alternatives.map((alt, index) => (
              <div key={`alternative-${alt.type}-${index}`} className="flex items-start gap-3 bg-blue-500/5 border border-blue-500/20 p-4 rounded">
                <span className="text-blue-400 font-bold text-lg mt-0.5">•</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-200 mb-1">{alt.description}</div>
                  <div className="text-sm">
                    <span className="text-gray-400">NPV جدید:</span>{' '}
                    <span className={`font-semibold ${alt.newNPV >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(alt.newNPV)}
                    </span>
                  </div>
                  {alt.parameters && (
                    <div className="text-xs text-gray-500 mt-1">
                      {alt.parameters.waitMonths && `انتظار: ${alt.parameters.waitMonths} ماه`}
                      {alt.parameters.loanAmount && `مبلغ وام: ${formatCurrency(alt.parameters.loanAmount)}`}
                      {alt.parameters.repaymentMonths && `دوره بازپرداخت: ${alt.parameters.repaymentMonths} ماه`}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Python Code Section */}
      <div className="mt-6 pt-6 border-t border-surface-700">
        <details className="cursor-pointer group">
          <summary className="font-semibold text-sm mb-2 text-gray-300 hover:text-gray-100 flex items-center gap-2">
            <svg className="w-4 h-4 transform group-open:rotate-90 transition-transform" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            کد پایتون برای تحلیل این وام
          </summary>
          <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs overflow-x-auto mt-2 border border-gray-700" dir="ltr">
{`# Loan: ${loan.loanNameFA}
# Bank: ${loan.bankNameFA}

from privilegeAnalysis import analyze_loan_scenarios

result = analyze_loan_scenarios(
    deposit_amount=${loan.depositAmount},
    wait_months=${loan.waitMonths},
    loan_amount=${loan.loanAmount},
    loan_rate=${(loan.loanRate * 100).toFixed(2)},  # ${(loan.loanRate * 100).toFixed(2)}% annual
    repayment_months=${loan.repaymentMonths},
    capm_rate=${(loan.discountRate * 100).toFixed(2)}  # ${(loan.discountRate * 100).toFixed(2)}% opportunity cost
)

print("Analysis Results:")
print(f"NPV (Wait): {result['npv_wait']:,.0f} Toman")
print(f"Break-even price: {result['break_even_price']:,.0f} Toman")
print(f"Max wait time: {result['max_wait_months']:.1f} months")
print(f"Recommendation: {result['recommendation']}")

# Output:
${JSON.stringify({
  npv_wait: Math.round(loan.npv),
  break_even_price: Math.round(loan.breakEvenPrivilegePrice),
  max_wait_months: parseFloat(loan.maxWaitMonths.toFixed(1)),
  recommendation: loan.recommendation,
  reasoning: loan.reasoning
}, null, 2)}`}
          </pre>
        </details>
      </div>
    </div>
  );
};

export default ScenarioComparison;
