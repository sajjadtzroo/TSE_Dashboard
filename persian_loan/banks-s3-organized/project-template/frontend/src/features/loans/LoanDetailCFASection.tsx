/**
 * Loan Detail CFA Section Component
 *
 * Displays CFA analysis for a specific loan with customizable parameters
 */

import { useState } from 'react';
import { Card, Button } from '../../components/ui';
import { LoanCFAMetrics } from './LoanCFAMetrics';
import { Activity, Settings } from 'lucide-react';
import { formatPersianNumber } from '../../utils/persianNumber';
import type { LoanWithBank } from '../../types';

interface LoanDetailCFASectionProps {
  loan: LoanWithBank;
}

export function LoanDetailCFASection({ loan }: LoanDetailCFASectionProps) {
  // Default values based on typical loan usage
  const [depositAmount, setDepositAmount] = useState(100_000_000); // 100M Toman
  const [depositMonths, setDepositMonths] = useState(6); // 6 months
  const [loanMonths, setLoanMonths] = useState(24); // 24 months
  const [commission, setCommission] = useState(0);
  const [showInputs, setShowInputs] = useState(true);
  const [calculatedOnce, setCalculatedOnce] = useState(false);

  // Auto-calculate loan amount based on coefficient table
  const estimatedLoanAmount = (() => {
    if (loan.coefficientTable && depositAmount > 0) {
      const matchingCoeff = loan.coefficientTable.find(
        (row) => row.depositMonths === depositMonths
      );
      if (matchingCoeff) {
        const coefficient = parseFloat(matchingCoeff.loanPercent || '100') / 100;
        return depositAmount * coefficient;
      }
    }
    // Use deposit ratio if available
    const ratio = parseFloat(loan.depositToFacilityRatio || '2');
    return depositAmount * ratio;
  })();

  const handleCalculate = () => {
    setCalculatedOnce(true);
    setShowInputs(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-br from-primary-500/10 to-transparent border border-primary-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-primary-400" />
            <div>
              <h2 className="text-2xl font-bold text-gray-100">تحلیل مالی CFA</h2>
              <p className="text-sm text-gray-400">
                ارزیابی حرفه‌ای با استانداردهای مهندسی مالی
              </p>
            </div>
          </div>
          {calculatedOnce && (
            <Button
              onClick={() => setShowInputs(!showInputs)}
              variant="ghost"
              className="text-primary-400"
            >
              <Settings className="w-4 h-4 ml-2" />
              {showInputs ? 'پنهان کردن تنظیمات' : 'تغییر پارامترها'}
            </Button>
          )}
        </div>
      </Card>

      {/* Input Parameters */}
      {showInputs && (
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-100 mb-4">
            پارامترهای محاسبه
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  مبلغ سپرده (تومان)
                </label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-bg-dark border border-border-dark rounded-lg text-gray-100 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="100,000,000"
                />
                <div className="text-xs text-gray-500 mt-1">
                  مبلغ سپرده‌ای که برای دریافت وام نیاز است
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  مدت سپرده (ماه)
                </label>
                <input
                  type="number"
                  value={depositMonths}
                  onChange={(e) => setDepositMonths(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-bg-dark border border-border-dark rounded-lg text-gray-100 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="6"
                  min="1"
                  max="60"
                />
                <div className="text-xs text-gray-500 mt-1">
                  مدت زمانی که سپرده باید نگهداری شود
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  کارمزد (تومان)
                </label>
                <input
                  type="number"
                  value={commission}
                  onChange={(e) => setCommission(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-bg-dark border border-border-dark rounded-lg text-gray-100 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="0"
                />
                <div className="text-xs text-gray-500 mt-1">
                  کارمزد و هزینه‌های جانبی
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  مدت بازپرداخت وام (ماه)
                </label>
                <input
                  type="number"
                  value={loanMonths}
                  onChange={(e) => setLoanMonths(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-bg-dark border border-border-dark rounded-lg text-gray-100 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="24"
                  min="1"
                  max="360"
                />
                <div className="text-xs text-gray-500 mt-1">
                  تعداد ماه‌های بازپرداخت وام
                </div>
              </div>

              {/* Estimated Loan Amount */}
              <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">مبلغ وام تخمینی</div>
                <div className="text-2xl font-bold text-primary-400">
                  {formatPersianNumber(Math.round(estimatedLoanAmount).toLocaleString('fa-IR'))} تومان
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  بر اساس ضرایب وام و مبلغ سپرده
                </div>
              </div>

              {/* Loan Details */}
              <div className="bg-bg-dark rounded-lg p-4 border border-border-dark">
                <div className="text-sm font-medium text-gray-300 mb-2">
                  مشخصات وام
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">نرخ بهره:</span>
                    <span className="text-gray-200 font-medium">
                      {loan.interestRateNumeric
                        ? formatPersianNumber(loan.interestRateNumeric.toFixed(1))
                        : 'N/A'}٪
                    </span>
                  </div>
                  {loan.depositToFacilityRatio && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">نسبت سپرده به وام:</span>
                      <span className="text-gray-200 font-medium">
                        1:{formatPersianNumber(loan.depositToFacilityRatio)}
                      </span>
                    </div>
                  )}
                  {loan.category && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">نوع وام:</span>
                      <span className="text-gray-200 font-medium">
                        {loan.categoryFA || loan.category}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Calculate Button */}
          <div className="mt-6">
            <Button
              onClick={handleCalculate}
              variant="primary"
              className="w-full"
            >
              <Activity className="w-4 h-4 ml-2" />
              محاسبه تحلیل CFA
            </Button>
          </div>
        </Card>
      )}

      {/* CFA Analysis Results */}
      {calculatedOnce && (
        <LoanCFAMetrics
          loan={loan}
          depositAmount={depositAmount}
          depositMonths={depositMonths}
          loanMonths={loanMonths}
          commission={commission}
        />
      )}

      {/* Instructions */}
      {!calculatedOnce && (
        <Card className="p-6 bg-blue-500/5 border border-blue-500/20">
          <h4 className="text-lg font-bold text-blue-400 mb-3">
            راهنمای استفاده
          </h4>
          <div className="space-y-2 text-sm text-gray-300">
            <p>
              <strong className="text-blue-300">1. مبلغ سپرده:</strong> مبلغی که باید برای دریافت این وام سپرده‌گذاری کنید.
            </p>
            <p>
              <strong className="text-blue-300">2. مدت سپرده:</strong> مدت زمانی که سپرده شما باید در بانک باقی بماند (معمولاً 3 تا 12 ماه).
            </p>
            <p>
              <strong className="text-blue-300">3. مدت بازپرداخت:</strong> تعداد ماه‌هایی که برای بازپرداخت وام زمان دارید.
            </p>
            <p className="pt-2 border-t border-blue-500/20 mt-3">
              پس از وارد کردن اطلاعات، دکمه <strong>"محاسبه تحلیل CFA"</strong> را بزنید تا تحلیل جامع مالی شامل:
            </p>
            <ul className="list-disc list-inside mr-4 space-y-1 text-xs text-gray-400">
              <li>محاسبه CAPM (بازده مورد انتظار)</li>
              <li>محاسبه WACC (هزینه سرمایه)</li>
              <li>تحلیل جریان نقدی (NPV, IRR)</li>
              <li>معیارهای ریسک (Sharpe, Treynor, Jensen's Alpha)</li>
              <li>توصیه سرمایه‌گذاری (قبول/رد/بررسی)</li>
            </ul>
          </div>
        </Card>
      )}
    </div>
  );
}
