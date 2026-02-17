/**
 * Calculator Results Component
 * Displays loan analysis results with charts and recommendations
 */

import React, { useState } from 'react';
import { TrendingUp, DollarSign, Award, AlertCircle, ChevronDown, ChevronUp, Activity } from 'lucide-react';
import { Card, CardHeader, Badge } from '../../components/ui';
import { formatCurrency } from '../../utils/financialCalculations';
import { LoanCFAMetrics } from '../loans/LoanCFAMetrics';
import type { LoanAnalysis, CalculatorInputs } from './types';
import type { LoanWithBank } from '../../types';

interface CalculatorResultsProps {
  results: LoanAnalysis[];
  inputs: CalculatorInputs;
}

export function CalculatorResults({ results, inputs }: CalculatorResultsProps) {
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);

  if (results.length === 0) {
    return (
      <Card>
        <div className="p-12 text-center">
          <AlertCircle className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">
            وامی پیدا نشد
          </h3>
          <p className="text-sm text-gray-400">
            با پارامترهای وارد شده، وام مناسبی یافت نشد. لطفاً مقادیر را تغییر دهید.
          </p>
        </div>
      </Card>
    );
  }

  const topLoan = results[0];
  const bestIRR = results.reduce((best, loan) =>
    (loan.irr || -999) > (best.irr || -999) ? loan : best
  , results[0]);
  const lowestCost = results.reduce((best, loan) =>
    loan.totalCost < best.totalCost ? loan : best
  , results[0]);

  const toggleExpand = (loanId: string) => {
    setExpandedLoanId(expandedLoanId === loanId ? null : loanId);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Best Overall */}
        <Card padding="sm" className="border-2 border-primary-400/50">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary-800/30 rounded-lg">
              <Award className="w-5 h-5 text-primary-400" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-gray-400 mb-1">بهترین توصیه</div>
              <div className="text-sm font-bold text-gray-50">{topLoan.loanNameFA}</div>
              <div className="text-xs text-gray-300 mt-1">{topLoan.bankNameFA}</div>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="green" size="sm">
                  امتیاز: {Math.round(topLoan.score)}
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Best IRR */}
        <Card padding="sm">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-secondary-800/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-secondary-500" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-gray-400 mb-1">بیشترین IRR</div>
              <div className="text-sm font-bold text-gray-50">{bestIRR.loanNameFA}</div>
              <div className="text-xs text-gray-300 mt-1">{bestIRR.bankNameFA}</div>
              <div className="mt-2">
                <span className="text-lg font-bold text-secondary-500">
                  {bestIRR.irr ? `${(bestIRR.irr * 100).toFixed(1)}%` : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Lowest Cost */}
        <Card padding="sm">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-800/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-gray-400 mb-1">کمترین هزینه</div>
              <div className="text-sm font-bold text-gray-50">{lowestCost.loanNameFA}</div>
              <div className="text-xs text-gray-300 mt-1">{lowestCost.bankNameFA}</div>
              <div className="mt-2 text-xs text-green-500">
                {formatCurrency(lowestCost.totalCost)}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Top Recommendations */}
      <Card>
        <CardHeader title="توصیه‌های برتر" />
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border-light">
            <thead className="bg-surface-50">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-300">
                  رتبه
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-300">
                  وام / بانک
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-300">
                  مبلغ وام
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-300">
                  نرخ بهره
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-300">
                  IRR
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-300">
                  MIRR
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-300">
                  هزینه کل
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-300">
                  قسط ماهانه
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-300">
                  امتیاز
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-300">
                  تحلیل CFA
                </th>
              </tr>
            </thead>
            <tbody className="bg-surface-100 divide-y divide-border-dark">
              {results.slice(0, 10).map((loan, index) => {
                const isExpanded = expandedLoanId === loan.loanId;
                return (
                  <React.Fragment key={`${loan.bankId}-${loan.loanId}`}>
                    <tr className="hover:bg-surface-50">
                      <td className="px-4 py-3 text-sm text-gray-200">
                        <span className={index < 3 ? 'text-primary-400 font-bold' : ''}>
                          #{index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-50">{loan.loanNameFA}</div>
                        <div className="text-xs text-gray-400">{loan.bankNameFA}</div>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-200">
                        {formatCurrency(loan.loanAmount)}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-200">
                        {(loan.interestRate * 100).toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        <span className={loan.irr && loan.irr > 0 ? 'text-green-500' : 'text-red-500'}>
                          {loan.irr ? `${(loan.irr * 100).toFixed(1)}%` : 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        <span className={loan.mirr && loan.mirr > 0 ? 'text-green-500' : 'text-red-500'}>
                          {loan.mirr ? `${(loan.mirr * 100).toFixed(1)}%` : 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-200">
                        {formatCurrency(loan.totalCost)}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-200">
                        {formatCurrency(loan.monthlyPayment)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={loan.score >= 70 ? 'green' : loan.score >= 50 ? 'blue' : 'gray'}
                          size="sm"
                        >
                          {Math.round(loan.score)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleExpand(loan.loanId)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 text-xs font-medium rounded transition-colors"
                        >
                          <Activity className="w-3 h-3" />
                          {isExpanded ? (
                            <>
                              بستن
                              <ChevronUp className="w-3 h-3" />
                            </>
                          ) : (
                            <>
                              مشاهده
                              <ChevronDown className="w-3 h-3" />
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={10} className="px-4 py-6 bg-bg-darker">
                          <LoanCFAMetrics
                            loan={loan as any as LoanWithBank}
                            depositAmount={inputs.depositAmount}
                            depositMonths={inputs.depositMonths}
                            loanMonths={inputs.loanMonths}
                            commission={inputs.commission}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Explanation */}
      <Card padding="sm">
        <div className="space-y-2 text-sm text-gray-300">
          <h4 className="font-semibold text-gray-50">راهنمای مفاهیم:</h4>
          <ul className="space-y-1 mr-4">
            <li>• <strong>IRR (نرخ بازده داخلی):</strong> نرخ بازدهی که NPV را صفر می‌کند. بالاتر بهتر است.</li>
            <li>• <strong>MIRR (نرخ بازده داخلی اصلاح شده):</strong> نسخه بهبود یافته IRR با در نظر گرفتن بازده خارجی.</li>
            <li>• <strong>هزینه کل:</strong> مجموع سود و کارمزدهای پرداختی.</li>
            <li>• <strong>امتیاز:</strong> امتیاز کلی بر اساس تمام پارامترها (0-100). بالاتر بهتر است.</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}

export default CalculatorResults;
