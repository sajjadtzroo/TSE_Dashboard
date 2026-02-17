/**
 * CAPM Calculator Component
 *
 * Calculates expected return using Capital Asset Pricing Model:
 * E(Ri) = Rf + β × [E(Rm) - Rf]
 */

import { useState } from 'react';
import { Card, Button } from '@/components/ui';
import { LineChartCard } from '@/components/charts';
import { formatPersianNumber } from '@/utils/persianNumber';
import { calculateCAPM, validateCAPMInputs } from '@/utils/advancedFinancial';
import type { CAPMInputs, CAPMResults } from '@/types/advancedFinancial';
import { TrendingUp, AlertCircle } from 'lucide-react';

interface Props {
  inputs: CAPMInputs;
  results: CAPMResults | null;
  onInputsChange: (inputs: CAPMInputs) => void;
  onCalculate: (results: CAPMResults) => void;
}

export function CAPMCalculator({ inputs, results, onInputsChange, onCalculate }: Props) {
  const [errors, setErrors] = useState<string[]>([]);

  const handleCalculate = () => {
    // Validate inputs
    const validationErrors = validateCAPMInputs(
      inputs.riskFreeRate,
      inputs.beta,
      inputs.marketReturn
    );

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);

    // Calculate CAPM
    const capm = calculateCAPM(inputs.riskFreeRate, inputs.beta, inputs.marketReturn);

    const calculatedResults: CAPMResults = {
      expectedReturn: capm.expectedReturn,
      riskPremium: capm.riskPremium,
      requiredReturn: capm.expectedReturn, // Alias for clarity
    };

    onCalculate(calculatedResults);
  };

  // Generate Security Market Line (SML) data
  const generateSMLData = () => {
    if (!results) return [];

    const points = [];
    for (let beta = 0; beta <= 2; beta += 0.2) {
      const capm = calculateCAPM(inputs.riskFreeRate, beta, inputs.marketReturn);
      points.push({
        beta: formatPersianNumber(beta.toFixed(1)),
        expectedReturn: Number((capm.expectedReturn * 100).toFixed(1)),
      });
    }
    return points;
  };

  const smlData = generateSMLData();

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card className="p-6">
        <h3 className="text-xl font-bold text-gray-100 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary-400" />
          محاسبه CAPM
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Input Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-2">
                نرخ بدون ریسک (Rf)
                <span className="text-gray-500 text-xs mr-2">- سپرده بانکی یا اوراق دولتی</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={inputs.riskFreeRate * 100}
                  onChange={(e) =>
                    onInputsChange({ ...inputs, riskFreeRate: Number(e.target.value) / 100 })
                  }
                  className="w-full px-4 py-2 bg-bg-dark border border-border-dark rounded-lg text-gray-100"
                />
                <div className="absolute left-3 top-2.5 text-gray-400">%</div>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">
                بازده بازار (Rm)
                <span className="text-gray-500 text-xs mr-2">- شاخص بورس تهران</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={inputs.marketReturn * 100}
                  onChange={(e) =>
                    onInputsChange({ ...inputs, marketReturn: Number(e.target.value) / 100 })
                  }
                  className="w-full px-4 py-2 bg-bg-dark border border-border-dark rounded-lg text-gray-100"
                />
                <div className="absolute left-3 top-2.5 text-gray-400">%</div>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2 flex items-center gap-2">
                ضریب بتا (β)
                <span className="text-xs text-gray-500">(معیار ریسک سیستماتیک)</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={inputs.beta}
                onChange={(e) => onInputsChange({ ...inputs, beta: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-bg-dark border border-border-dark rounded-lg text-gray-100"
              />
              <div className="mt-1 text-xs text-gray-500">
                β = 1: ریسک برابر با بازار | β &gt; 1: پرریسک‌تر | β &lt; 1: کم‌ریسک‌تر
              </div>
            </div>

            <Button onClick={handleCalculate} variant="primary" className="w-full">
              محاسبه بازده مورد انتظار
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
                <div className="text-sm text-gray-400 mb-1">بازده مورد انتظار</div>
                <div className="text-3xl font-bold text-primary-400">
                  {formatPersianNumber((results.expectedReturn * 100).toFixed(2))}٪
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  E(Ri) = {formatPersianNumber((inputs.riskFreeRate * 100).toFixed(1))}٪ +{' '}
                  {formatPersianNumber(inputs.beta.toFixed(2))} ×{' '}
                  {formatPersianNumber((results.riskPremium * 100).toFixed(1))}٪
                </div>
              </div>

              <div className="bg-bg-dark border border-border-dark rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">صرف ریسک بازار</div>
                <div className="text-2xl font-bold text-teal-400">
                  {formatPersianNumber((results.riskPremium * 100).toFixed(2))}٪
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Rm - Rf = {formatPersianNumber((inputs.marketReturn * 100).toFixed(1))}٪ -{' '}
                  {formatPersianNumber((inputs.riskFreeRate * 100).toFixed(1))}٪
                </div>
              </div>

              <div className="bg-bg-dark border border-border-dark rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">ریسک سیستماتیک</div>
                <div className="text-2xl font-bold text-gray-100">
                  β = {formatPersianNumber(inputs.beta.toFixed(2))}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {inputs.beta > 1.2
                    ? 'دارایی پرریسک - نوسانات بیشتر از بازار'
                    : inputs.beta > 0.8
                    ? 'ریسک متوسط - مشابه بازار'
                    : 'دارایی کم‌ریسک - نوسانات کمتر از بازار'}
                </div>
              </div>

              {/* Interpretation */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <div className="text-sm font-medium text-blue-300 mb-2">تفسیر نتایج</div>
                <div className="text-xs text-gray-300 space-y-1">
                  <p>
                    • سرمایه‌گذاران باید حداقل{' '}
                    <span className="text-primary-400 font-medium">
                      {formatPersianNumber((results.expectedReturn * 100).toFixed(2))}٪
                    </span>{' '}
                    بازده سالانه را از این سرمایه‌گذاری انتظار داشته باشند.
                  </p>
                  <p>
                    • این نرخ جبران‌کننده ریسک سیستماتیک (β ={' '}
                    {formatPersianNumber(inputs.beta.toFixed(2))}) است.
                  </p>
                  <p>
                    • برای ارزیابی پروژه‌ها، این نرخ به‌عنوان هزینه سهام در WACC استفاده می‌شود.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Security Market Line Chart */}
      {results && smlData.length > 0 && (
        <LineChartCard
          title="خط بازار اوراق بهادار (SML)"
          subtitle="رابطه بین ریسک سیستماتیک (β) و بازده مورد انتظار"
          data={smlData}
          xAxisKey="beta"
          dataKeys={[{ key: 'expectedReturn', name: 'بازده مورد انتظار (%)', color: '#3b82f6' }]}
          height={300}
        />
      )}

      {/* Educational Section */}
      <Card className="p-6 bg-bg-dark border border-border-dark">
        <h4 className="text-lg font-bold text-gray-100 mb-3">درباره CAPM</h4>
        <div className="space-y-3 text-sm text-gray-300">
          <p>
            <strong className="text-primary-400">مدل قیمت‌گذاری دارایی سرمایه‌ای (CAPM)</strong>{' '}
            یکی از مهم‌ترین مدل‌های مالی برای تعیین بازده مورد انتظار با توجه به ریسک است.
          </p>
          <div className="bg-bg-light rounded-lg p-3 font-mono text-xs">
            E(Ri) = Rf + β<sub>i</sub> × [E(Rm) - Rf]
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-400">E(Ri):</span> بازده مورد انتظار دارایی
            </div>
            <div>
              <span className="text-gray-400">Rf:</span> نرخ بدون ریسک
            </div>
            <div>
              <span className="text-gray-400">β<sub>i</sub>:</span> ضریب بتای دارایی
            </div>
            <div>
              <span className="text-gray-400">E(Rm):</span> بازده مورد انتظار بازار
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            این مدل فقط ریسک سیستماتیک (غیرقابل تنوع‌بخشی) را در نظر می‌گیرد و فرض می‌کند
            سرمایه‌گذاران پرتفوی متنوع دارند.
          </p>
        </div>
      </Card>
    </div>
  );
}
