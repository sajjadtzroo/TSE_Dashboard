/**
 * WACC Calculator Component
 *
 * Calculates Weighted Average Cost of Capital:
 * WACC = (E/V × Re) + (D/V × Rd × (1-Tc))
 */

import { useState } from 'react';
import { Card, Button } from '../../../components/ui';
import { PieChartCard, BarChartCard } from '../../../components/charts';
import { formatPersianAmount, formatPersianNumber } from '../../../utils/persianNumber';
import { calculateWACC, validateWACCInputs } from '../../../utils/advancedFinancial';
import type {
  WACCCalculatorInputs,
  WACCResults,
  CAPMResults,
} from '../../../types/advancedFinancial';
import { DollarSign, AlertCircle, CheckCircle } from 'lucide-react';

interface Props {
  inputs: WACCCalculatorInputs;
  results: WACCResults | null;
  onInputsChange: (inputs: WACCCalculatorInputs) => void;
  onCalculate: (results: WACCResults) => void;
  capmResults: CAPMResults | null;
}

export function WACCCalculator({
  inputs,
  results,
  onInputsChange,
  onCalculate,
  capmResults,
}: Props) {
  const [errors, setErrors] = useState<string[]>([]);

  const handleCalculate = () => {
    // Validate inputs
    const validationErrors = validateWACCInputs(inputs);

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);

    // Calculate WACC
    const waccResults = calculateWACC({
      equityValue: inputs.equityValue,
      debtValue: inputs.debtValue,
      costOfEquity: inputs.costOfEquity,
      costOfDebt: inputs.costOfDebt,
      taxRate: inputs.taxRate,
    });

    onCalculate(waccResults);
  };

  // Use CAPM cost of equity if available
  const handleUseCAPM = () => {
    if (capmResults) {
      onInputsChange({ ...inputs, costOfEquity: capmResults.expectedReturn });
    }
  };

  // Generate capital structure pie chart data
  const capitalStructureData = results
    ? [
        {
          name: 'سهام (E)',
          value: results.equityWeight * 100,
          fill: '#3b82f6',
        },
        {
          name: 'بدهی (D)',
          value: results.debtWeight * 100,
          fill: '#8b5cf6',
        },
      ]
    : [];

  // Generate WACC components bar chart
  const waccComponentsData = results
    ? [
        {
          name: 'هزینه سهام',
          value: Number((results.equityComponent * 100).toFixed(2)),
          percentage: Number((results.equityWeight * 100).toFixed(1)),
        },
        {
          name: 'هزینه بدهی (پس از مالیات)',
          value: Number((results.debtComponent * 100).toFixed(2)),
          percentage: Number((results.debtWeight * 100).toFixed(1)),
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card className="p-6">
        <h3 className="text-xl font-bold text-gray-100 mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary-400" />
          محاسبه WACC
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Input Fields */}
          <div className="space-y-4">
            {/* Capital Structure */}
            <div className="bg-bg-dark rounded-lg p-4 border border-border-dark">
              <div className="text-sm font-medium text-gray-300 mb-3">ساختار سرمایه</div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    ارزش سهام (E) - تومان
                  </label>
                  <input
                    type="number"
                    value={inputs.equityValue}
                    onChange={(e) =>
                      onInputsChange({ ...inputs, equityValue: Number(e.target.value) })
                    }
                    className="w-full px-4 py-2 bg-bg-light border border-border-dark rounded-lg text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    ارزش بدهی (D) - تومان
                  </label>
                  <input
                    type="number"
                    value={inputs.debtValue}
                    onChange={(e) =>
                      onInputsChange({ ...inputs, debtValue: Number(e.target.value) })
                    }
                    className="w-full px-4 py-2 bg-bg-light border border-border-dark rounded-lg text-gray-100"
                  />
                </div>

                <div className="text-xs text-gray-500 pt-2 border-t border-border-dark">
                  ارزش شرکت (V): {formatPersianAmount(inputs.equityValue + inputs.debtValue)}
                </div>
              </div>
            </div>

            {/* Cost Components */}
            <div className="bg-bg-dark rounded-lg p-4 border border-border-dark">
              <div className="text-sm font-medium text-gray-300 mb-3">هزینه‌های سرمایه</div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    هزینه سهام (Re)
                    {capmResults && (
                      <Button
                        onClick={handleUseCAPM}
                        variant="ghost"
                        className="text-xs mr-2 py-0 px-2"
                      >
                        استفاده از CAPM
                      </Button>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={inputs.costOfEquity * 100}
                      onChange={(e) =>
                        onInputsChange({
                          ...inputs,
                          costOfEquity: Number(e.target.value) / 100,
                        })
                      }
                      className="w-full px-4 py-2 bg-bg-light border border-border-dark rounded-lg text-gray-100"
                    />
                    <div className="absolute left-3 top-2.5 text-gray-400">%</div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">هزینه بدهی (Rd)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={inputs.costOfDebt * 100}
                      onChange={(e) =>
                        onInputsChange({
                          ...inputs,
                          costOfDebt: Number(e.target.value) / 100,
                        })
                      }
                      className="w-full px-4 py-2 bg-bg-light border border-border-dark rounded-lg text-gray-100"
                    />
                    <div className="absolute left-3 top-2.5 text-gray-400">%</div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">نرخ مالیات (Tc)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={inputs.taxRate * 100}
                      onChange={(e) =>
                        onInputsChange({ ...inputs, taxRate: Number(e.target.value) / 100 })
                      }
                      className="w-full px-4 py-2 bg-bg-light border border-border-dark rounded-lg text-gray-100"
                    />
                    <div className="absolute left-3 top-2.5 text-gray-400">%</div>
                  </div>
                </div>
              </div>
            </div>

            <Button onClick={handleCalculate} variant="primary" className="w-full">
              محاسبه WACC
            </Button>

            {/* Errors */}
            {errors.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    {errors.map((error, idx) => (
                      <div key={idx} className="text-sm text-red-300">
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Results */}
          {results && (
            <div className="space-y-4">
              <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">WACC</div>
                <div className="text-3xl font-bold text-primary-400">
                  {formatPersianNumber((results.wacc * 100).toFixed(2))}٪
                </div>
                <div className="text-xs text-gray-500 mt-2">نرخ تنزیل مناسب برای ارزیابی پروژه</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-bg-dark border border-border-dark rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">وزن سهام</div>
                  <div className="text-lg font-bold text-blue-400">
                    {formatPersianNumber((results.equityWeight * 100).toFixed(1))}٪
                  </div>
                </div>

                <div className="bg-bg-dark border border-border-dark rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">وزن بدهی</div>
                  <div className="text-lg font-bold text-purple-400">
                    {formatPersianNumber((results.debtWeight * 100).toFixed(1))}٪
                  </div>
                </div>

                <div className="bg-bg-dark border border-border-dark rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">هزینه سهام</div>
                  <div className="text-lg font-bold text-blue-400">
                    {formatPersianNumber((inputs.costOfEquity * 100).toFixed(2))}٪
                  </div>
                </div>

                <div className="bg-bg-dark border border-border-dark rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">هزینه بدهی (پس از مالیات)</div>
                  <div className="text-lg font-bold text-purple-400">
                    {formatPersianNumber((results.afterTaxCostOfDebt * 100).toFixed(2))}٪
                  </div>
                </div>
              </div>

              {/* Formula Breakdown */}
              <div className="bg-bg-dark border border-border-dark rounded-lg p-4">
                <div className="text-sm font-medium text-gray-300 mb-2">محاسبه تفصیلی</div>
                <div className="text-xs text-gray-400 space-y-1 font-mono">
                  <div>
                    WACC = (E/V × Re) + (D/V × Rd × (1-Tc))
                  </div>
                  <div className="text-gray-500">
                    = ({formatPersianNumber((results.equityWeight * 100).toFixed(1))}٪ ×{' '}
                    {formatPersianNumber((inputs.costOfEquity * 100).toFixed(2))}٪) + (
                    {formatPersianNumber((results.debtWeight * 100).toFixed(1))}٪ ×{' '}
                    {formatPersianNumber((inputs.costOfDebt * 100).toFixed(2))}٪ × (1 -{' '}
                    {formatPersianNumber((inputs.taxRate * 100).toFixed(0))}٪))
                  </div>
                  <div className="text-primary-400">
                    = {formatPersianNumber((results.equityComponent * 100).toFixed(2))}٪ +{' '}
                    {formatPersianNumber((results.debtComponent * 100).toFixed(2))}٪
                  </div>
                  <div className="text-primary-400 font-bold">
                    = {formatPersianNumber((results.wacc * 100).toFixed(2))}٪
                  </div>
                </div>
              </div>

              {/* Tax Shield Benefit */}
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-green-300 mb-1">مزیت سپر مالیاتی</div>
                    <div className="text-xs text-gray-300">
                      هزینه بدهی از{' '}
                      {formatPersianNumber((inputs.costOfDebt * 100).toFixed(2))}٪ به{' '}
                      {formatPersianNumber((results.afterTaxCostOfDebt * 100).toFixed(2))}٪ کاهش
                      یافت. صرفه‌جویی مالیاتی:{' '}
                      <span className="text-green-400 font-medium">
                        {formatPersianNumber(
                          ((inputs.costOfDebt - results.afterTaxCostOfDebt) * 100).toFixed(2)
                        )}
                        ٪
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Charts */}
      {results && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PieChartCard
            title="ساختار سرمایه"
            subtitle="نسبت سهام به بدهی"
            data={capitalStructureData}
            height={300}
          />

          <BarChartCard
            title="اجزای WACC"
            subtitle="سهم هر منبع تامین مالی در هزینه سرمایه"
            data={waccComponentsData}
            dataKey="value"
            height={300}
          />
        </div>
      )}

      {/* Educational Section */}
      <Card className="p-6 bg-bg-dark border border-border-dark">
        <h4 className="text-lg font-bold text-gray-100 mb-3">درباره WACC</h4>
        <div className="space-y-3 text-sm text-gray-300">
          <p>
            <strong className="text-primary-400">میانگین موزون هزینه سرمایه (WACC)</strong> نرخ
            تنزیل مناسب برای ارزیابی پروژه‌های سرمایه‌گذاری است که ساختار سرمایه شرکت را در نظر
            می‌گیرد.
          </p>
          <div className="bg-bg-light rounded-lg p-3 font-mono text-xs">
            WACC = (E/V × Re) + (D/V × Rd × (1-Tc))
          </div>
          <div className="space-y-2 text-xs">
            <div>
              <strong className="text-gray-400">چرا WACC مهم است؟</strong>
              <ul className="list-disc list-inside mr-4 text-gray-500 mt-1 space-y-1">
                <li>نرخ بازده حداقلی که پروژه باید کسب کند</li>
                <li>در محاسبه NPV به‌عنوان نرخ تنزیل استفاده می‌شود</li>
                <li>معیاری برای ارزیابی عملکرد شرکت</li>
                <li>در تصمیمات ساختار سرمایه کاربرد دارد</li>
              </ul>
            </div>
            <div className="pt-2 border-t border-border-dark">
              <strong className="text-gray-400">سپر مالیاتی:</strong> بهره بدهی کسر مالیاتی است،
              بنابراین هزینه واقعی بدهی Rd × (1-Tc) می‌شود.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
