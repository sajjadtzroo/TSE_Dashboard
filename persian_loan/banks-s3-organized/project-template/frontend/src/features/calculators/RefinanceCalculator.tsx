/**
 * Refinance Calculator
 * Analyze savings from refinancing
 */

import { useState } from 'react';
import { Card, Button } from '../../components/ui';
import { LineChartCard } from '../../components/charts';
import { formatPersianAmount, formatPersianNumber } from '../../utils/persianNumber';
import { calculatePMT, AnnuityType } from '../../utils/timeValueOfMoney';

export function RefinanceCalculator() {
  const [currentBalance, setCurrentBalance] = useState(80_000_000);
  const [currentRate, setCurrentRate] = useState(22);
  const [currentMonthsLeft, setCurrentMonthsLeft] = useState(48);
  const [newRate, setNewRate] = useState(18);
  const [newTerm, setNewTerm] = useState(60);
  const [closingCosts, setClosingCosts] = useState(2_000_000);
  const [showResults, setShowResults] = useState(false);

  // Use CFA-compliant TVM calculations
  const currentMonthlyRate = currentRate / 100 / 12;
  const newMonthlyRate = newRate / 100 / 12;

  // Calculate current payment
  const currentPayment = calculatePMT(
    -currentBalance,
    0,
    currentMonthlyRate,
    currentMonthsLeft,
    AnnuityType.ORDINARY
  );

  // Calculate new payment
  const newPayment = calculatePMT(
    -currentBalance,
    0,
    newMonthlyRate,
    newTerm,
    AnnuityType.ORDINARY
  );

  const monthlySavings = currentPayment - newPayment;
  const breakEvenMonths = closingCosts / monthlySavings;

  const currentTotalPayment = currentPayment * currentMonthsLeft;
  const newTotalPayment = newPayment * newTerm + closingCosts;
  const totalSavings = currentTotalPayment - newTotalPayment;

  // Chart data for cumulative savings
  const savingsData = [];
  let cumulativeSavings = -closingCosts;

  for (let month = 1; month <= Math.min(newTerm, 60); month += 6) {
    cumulativeSavings += monthlySavings * 6;
    savingsData.push({
      month: `ماه ${formatPersianNumber(month)}`,
      savings: Math.round(cumulativeSavings / 1_000_000),
    });
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-bold text-gray-100 mb-6">تحلیل بازپرداخت مجدد</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-200">وام فعلی</h3>

            <div>
              <label className="block text-sm text-gray-300 mb-2">مانده بدهی (تومان)</label>
              <input
                type="number"
                value={currentBalance}
                onChange={(e) => setCurrentBalance(Number(e.target.value))}
                className="w-full px-4 py-2 bg-bg-dark border border-border-dark rounded-lg text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">نرخ سود فعلی (%)</label>
              <input
                type="number"
                step="0.1"
                value={currentRate}
                onChange={(e) => setCurrentRate(Number(e.target.value))}
                className="w-full px-4 py-2 bg-bg-dark border border-border-dark rounded-lg text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">ماه‌های باقیمانده</label>
              <input
                type="number"
                value={currentMonthsLeft}
                onChange={(e) => setCurrentMonthsLeft(Number(e.target.value))}
                className="w-full px-4 py-2 bg-bg-dark border border-border-dark rounded-lg text-gray-100"
              />
            </div>

            <h3 className="font-semibold text-gray-200 mt-6">وام جدید</h3>

            <div>
              <label className="block text-sm text-gray-300 mb-2">نرخ سود جدید (%)</label>
              <input
                type="number"
                step="0.1"
                value={newRate}
                onChange={(e) => setNewRate(Number(e.target.value))}
                className="w-full px-4 py-2 bg-bg-dark border border-border-dark rounded-lg text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">مدت جدید (ماه)</label>
              <input
                type="number"
                value={newTerm}
                onChange={(e) => setNewTerm(Number(e.target.value))}
                className="w-full px-4 py-2 bg-bg-dark border border-border-dark rounded-lg text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">هزینه‌های اداری (تومان)</label>
              <input
                type="number"
                value={closingCosts}
                onChange={(e) => setClosingCosts(Number(e.target.value))}
                className="w-full px-4 py-2 bg-bg-dark border border-border-dark rounded-lg text-gray-100"
              />
            </div>

            <Button onClick={() => setShowResults(true)} variant="primary" className="w-full">
              تحلیل
            </Button>
          </div>

          {showResults && (
            <div className="space-y-4">
              <div className="bg-bg-dark p-4 rounded-lg border border-border-dark">
                <div className="text-sm text-gray-400 mb-1">صرفه‌جویی ماهانه</div>
                <div className="text-2xl font-bold text-teal-400">
                  {formatPersianAmount(monthlySavings)}
                </div>
              </div>

              <div className="bg-bg-dark p-4 rounded-lg border border-border-dark">
                <div className="text-sm text-gray-400 mb-1">نقطه سربه‌سر</div>
                <div className="text-2xl font-bold text-primary-400">
                  {formatPersianNumber(Math.ceil(breakEvenMonths))} ماه
                </div>
              </div>

              <div className="bg-bg-dark p-4 rounded-lg border border-border-dark">
                <div className="text-sm text-gray-400 mb-1">صرفه‌جویی کل</div>
                <div className={`text-2xl font-bold ${
                  totalSavings > 0 ? 'text-teal-400' : 'text-pink-400'
                }`}>
                  {formatPersianAmount(totalSavings)}
                </div>
              </div>

              <div className={`p-4 rounded-lg border ${
                totalSavings > 0 && breakEvenMonths < 24
                  ? 'bg-teal-500/10 border-teal-500'
                  : totalSavings > 0
                  ? 'bg-yellow-500/10 border-yellow-500'
                  : 'bg-pink-500/10 border-pink-500'
              }`}>
                <div className="text-sm font-semibold">
                  {totalSavings > 0 && breakEvenMonths < 24
                    ? '✓ بازپرداخت مجدد توصیه می‌شود'
                    : totalSavings > 0
                    ? '⚠ بازپرداخت مجدد ممکن است مفید باشد'
                    : '✗ بازپرداخت مجدد توصیه نمی‌شود'}
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {showResults && (
        <LineChartCard
          title="صرفه‌جویی تجمعی (میلیون تومان)"
          data={savingsData}
          dataKeys={[{ key: 'savings', name: 'صرفه‌جویی', color: '#10b981' }]}
          xAxisKey="month"
          height={300}
        />
      )}
    </div>
  );
}

export default RefinanceCalculator;
