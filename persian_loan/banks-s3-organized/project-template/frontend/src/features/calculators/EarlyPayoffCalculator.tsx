/**
 * Early Payoff Calculator
 * Calculate impact of extra payments on loan
 */

import { useState } from 'react';
import { Card, Button } from '../../components/ui';
import { LineChartCard } from '../../components/charts';
import { formatPersianAmount, formatPersianNumber } from '../../utils/persianNumber';
import { calculatePMT, calculateEarlyPayoff, AnnuityType } from '../../utils/timeValueOfMoney';

export function EarlyPayoffCalculator() {
  const [principal, setPrincipal] = useState(100_000_000);
  const [rate, setRate] = useState(18);
  const [term, setTerm] = useState(60);
  const [extraMonthly, setExtraMonthly] = useState(2_000_000);
  const [extraYearly, setExtraYearly] = useState(0);
  const [oneTime, setOneTime] = useState(0);
  const [showResults, setShowResults] = useState(false);

  // Use CFA-compliant TVM calculations
  const monthlyRate = rate / 100 / 12;

  // Calculate regular payment using CFA standard
  const regularPayment = calculatePMT(
    -principal,
    0,
    monthlyRate,
    term,
    AnnuityType.ORDINARY
  );

  // Calculate early payoff using CFA-compliant function
  const earlyPayoffResult = calculateEarlyPayoff(
    principal,
    rate / 100,
    term,
    extraMonthly,
    12 // monthly payments
  );

  const monthsToPayoff = earlyPayoffResult.periodsToPayoff;
  const interestSaved = earlyPayoffResult.interestSaved;
  const monthsSaved = term - monthsToPayoff;

  // Chart data
  const chartData = [];
  let originalBalance = principal;
  let acceleratedBalance = principal;

  for (let month = 0; month <= Math.min(term, 60); month += 3) {
    if (month > 0) {
      for (let i = 0; i < 3; i++) {
        const originalInterest = originalBalance * monthlyRate;
        originalBalance -= regularPayment - originalInterest;

        const acceleratedInterest = acceleratedBalance * monthlyRate;
        let accPrincipal = regularPayment - acceleratedInterest + extraMonthly;
        acceleratedBalance -= accPrincipal;
      }
    }

    chartData.push({
      month: `ماه ${formatPersianNumber(month)}`,
      original: Math.max(0, Math.round(originalBalance / 1_000_000)),
      accelerated: Math.max(0, Math.round(acceleratedBalance / 1_000_000)),
    });

    if (acceleratedBalance <= 0) break;
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-bold text-gray-100 mb-6">محاسبه پرداخت زودتر</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-2">مبلغ وام (تومان)</label>
              <input
                type="number"
                value={principal}
                onChange={(e) => setPrincipal(Number(e.target.value))}
                className="w-full px-4 py-2 bg-bg-dark border border-border-dark rounded-lg text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">نرخ سود سالانه (%)</label>
              <input
                type="number"
                step="0.1"
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="w-full px-4 py-2 bg-bg-dark border border-border-dark rounded-lg text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">مدت وام (ماه)</label>
              <input
                type="number"
                value={term}
                onChange={(e) => setTerm(Number(e.target.value))}
                className="w-full px-4 py-2 bg-bg-dark border border-border-dark rounded-lg text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">پرداخت اضافی ماهانه (تومان)</label>
              <input
                type="number"
                value={extraMonthly}
                onChange={(e) => setExtraMonthly(Number(e.target.value))}
                className="w-full px-4 py-2 bg-bg-dark border border-border-dark rounded-lg text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">پرداخت اضافی سالانه (تومان)</label>
              <input
                type="number"
                value={extraYearly}
                onChange={(e) => setExtraYearly(Number(e.target.value))}
                className="w-full px-4 py-2 bg-bg-dark border border-border-dark rounded-lg text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">پرداخت یکباره (تومان)</label>
              <input
                type="number"
                value={oneTime}
                onChange={(e) => setOneTime(Number(e.target.value))}
                className="w-full px-4 py-2 bg-bg-dark border border-border-dark rounded-lg text-gray-100"
              />
            </div>

            <Button onClick={() => setShowResults(true)} variant="primary" className="w-full">
              محاسبه
            </Button>
          </div>

          {showResults && (
            <div className="space-y-4">
              <div className="bg-bg-dark p-4 rounded-lg border border-border-dark">
                <div className="text-sm text-gray-400 mb-1">قسط معمولی</div>
                <div className="text-2xl font-bold text-gray-100">
                  {formatPersianAmount(regularPayment)}
                </div>
              </div>

              <div className="bg-bg-dark p-4 rounded-lg border border-border-dark">
                <div className="text-sm text-gray-400 mb-1">زمان تسویه</div>
                <div className="text-2xl font-bold text-primary-400">
                  {formatPersianNumber(monthsToPayoff)} ماه
                </div>
              </div>

              <div className="bg-bg-dark p-4 rounded-lg border border-border-dark">
                <div className="text-sm text-gray-400 mb-1">زمان صرفه‌جویی شده</div>
                <div className="text-2xl font-bold text-teal-400">
                  {formatPersianNumber(monthsSaved)} ماه
                </div>
              </div>

              <div className="bg-bg-dark p-4 rounded-lg border border-border-dark">
                <div className="text-sm text-gray-400 mb-1">سود صرفه‌جویی شده</div>
                <div className="text-2xl font-bold text-teal-400">
                  {formatPersianAmount(interestSaved)}
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {showResults && (
        <LineChartCard
          title="مقایسه مانده بدهی (میلیون تومان)"
          data={chartData}
          dataKeys={[
            { key: 'original', name: 'عادی', color: '#ef4444' },
            { key: 'accelerated', name: 'با پرداخت اضافی', color: '#10b981' },
          ]}
          xAxisKey="month"
          height={300}
        />
      )}
    </div>
  );
}

export default EarlyPayoffCalculator;
