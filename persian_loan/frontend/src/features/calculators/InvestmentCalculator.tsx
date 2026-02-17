/**
 * Investment Calculator
 * Calculate compound growth and ROI projections
 */

import { useState } from 'react';
import { Card, Button } from '@/components/ui';
import { LineChartCard, PieChartCard } from '@/components/charts';
import { formatPersianAmount, formatPersianNumber } from '@/utils/persianNumber';
import { calculateFV, AnnuityType } from '@/utils/timeValueOfMoney';

export function InvestmentCalculator() {
  const [initialInvestment, setInitialInvestment] = useState(50_000_000);
  const [monthlyContribution, setMonthlyContribution] = useState(5_000_000);
  const [annualReturn, setAnnualReturn] = useState(25);
  const [years, setYears] = useState(5);
  const [inflationRate, setInflationRate] = useState(30);
  const [showResults, setShowResults] = useState(false);

  const monthlyRate = annualReturn / 100 / 12;
  const months = years * 12;

  // Calculate future value using CFA-compliant FV formula
  const futureValue = calculateFV(
    -initialInvestment,     // Negative = initial cash outflow
    -monthlyContribution,   // Negative = periodic cash outflows
    monthlyRate,
    months,
    AnnuityType.ORDINARY
  );

  const totalContributions = initialInvestment + monthlyContribution * months;
  const totalEarnings = futureValue - totalContributions;
  const roi = (totalEarnings / totalContributions) * 100;

  // Inflation-adjusted value
  const inflationMultiplier = Math.pow(1 + inflationRate / 100, years);
  const inflationAdjustedValue = futureValue / inflationMultiplier;
  const realReturn = ((inflationAdjustedValue - totalContributions) / totalContributions) * 100;

  // Generate chart data using CFA-compliant calculations
  const chartData = [];

  for (let year = 0; year <= years; year++) {
    const periodsElapsed = year * 12;
    const contributionsToDate = initialInvestment + monthlyContribution * periodsElapsed;

    // Calculate FV at this point in time
    const valueAtYear = year === 0
      ? initialInvestment
      : calculateFV(
          -initialInvestment,
          -monthlyContribution,
          monthlyRate,
          periodsElapsed,
          AnnuityType.ORDINARY
        );

    chartData.push({
      year: `سال ${formatPersianNumber(year)}`,
      contributions: Math.round(contributionsToDate / 1_000_000),
      earnings: Math.round((valueAtYear - contributionsToDate) / 1_000_000),
      total: Math.round(valueAtYear / 1_000_000),
    });
  }

  const pieData = [
    { name: 'سرمایه اولیه', value: initialInvestment, fill: '#3b82f6' },
    { name: 'واریزی‌ها', value: totalContributions - initialInvestment, fill: '#8b5cf6' },
    { name: 'سود', value: Math.round(totalEarnings), fill: '#10b981' },
  ];

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-bold text-gray-100 mb-6">محاسبه بازده سرمایه‌گذاری</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-2">سرمایه اولیه (تومان)</label>
              <input
                type="number"
                value={initialInvestment}
                onChange={(e) => setInitialInvestment(Number(e.target.value))}
                className="w-full px-4 py-2 bg-bg-dark border border-border-dark rounded-lg text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">واریز ماهانه (تومان)</label>
              <input
                type="number"
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                className="w-full px-4 py-2 bg-bg-dark border border-border-dark rounded-lg text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">بازده سالانه (%)</label>
              <input
                type="number"
                step="0.1"
                value={annualReturn}
                onChange={(e) => setAnnualReturn(Number(e.target.value))}
                className="w-full px-4 py-2 bg-bg-dark border border-border-dark rounded-lg text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">مدت (سال)</label>
              <input
                type="number"
                value={years}
                onChange={(e) => setYears(Number(e.target.value))}
                className="w-full px-4 py-2 bg-bg-dark border border-border-dark rounded-lg text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">نرخ تورم سالانه (%)</label>
              <input
                type="number"
                step="0.1"
                value={inflationRate}
                onChange={(e) => setInflationRate(Number(e.target.value))}
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
                <div className="text-sm text-gray-400 mb-1">ارزش نهایی</div>
                <div className="text-2xl font-bold text-primary-400">
                  {formatPersianAmount(futureValue)}
                </div>
              </div>

              <div className="bg-bg-dark p-4 rounded-lg border border-border-dark">
                <div className="text-sm text-gray-400 mb-1">مجموع سود</div>
                <div className="text-2xl font-bold text-teal-400">
                  {formatPersianAmount(totalEarnings)}
                </div>
              </div>

              <div className="bg-bg-dark p-4 rounded-lg border border-border-dark">
                <div className="text-sm text-gray-400 mb-1">بازده سرمایه (ROI)</div>
                <div className="text-2xl font-bold text-yellow-400">
                  {roi.toFixed(1)}٪
                </div>
              </div>

              <div className="bg-bg-dark p-4 rounded-lg border border-border-dark">
                <div className="text-sm text-gray-400 mb-1">ارزش تعدیل شده با تورم</div>
                <div className="text-xl font-bold text-gray-100">
                  {formatPersianAmount(inflationAdjustedValue)}
                </div>
              </div>

              <div className="bg-bg-dark p-4 rounded-lg border border-border-dark">
                <div className="text-sm text-gray-400 mb-1">بازده واقعی</div>
                <div className={`text-xl font-bold ${
                  realReturn > 0 ? 'text-teal-400' : 'text-pink-400'
                }`}>
                  {realReturn.toFixed(1)}٪
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {showResults && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <LineChartCard
            title="رشد سرمایه (میلیون تومان)"
            data={chartData}
            dataKeys={[
              { key: 'contributions', name: 'واریزی‌ها', color: '#8b5cf6' },
              { key: 'total', name: 'کل دارایی', color: '#10b981' },
            ]}
            xAxisKey="year"
            height={300}
          />

          <PieChartCard
            title="ترکیب دارایی نهایی"
            data={pieData}
            height={300}
          />
        </div>
      )}
    </div>
  );
}

export default InvestmentCalculator;
