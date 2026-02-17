/**
 * Free Cash Flow Analyzer Component
 *
 * Calculates FCFF and FCFE:
 * - FCFF: Free Cash Flow to Firm
 * - FCFE: Free Cash Flow to Equity
 */

import { useState, useMemo } from 'react';
import { Card, Button } from '../../../components/ui';
import { BarChartCard } from '../../../components/charts';
import { formatPersianAmount, formatPersianNumber } from '../../../utils/persianNumber';
import { calculateFCFF, calculateFCFE } from '../../../utils/advancedFinancial';
import { calculateNPV, calculateIRR } from '../../../utils/timeValueOfMoney';
import type {
  FCFAnalysisInputs,
  FCFResults,
  WACCResults,
} from '../../../types/advancedFinancial';
import { TrendingUp, AlertCircle } from 'lucide-react';

interface Props {
  inputs: FCFAnalysisInputs;
  results: FCFResults | null;
  onInputsChange: (inputs: FCFAnalysisInputs) => void;
  onCalculate: (results: FCFResults) => void;
  waccResults: WACCResults | null;
}

export function FreeCashFlowAnalyzer({
  inputs,
  results,
  onInputsChange,
  onCalculate,
  waccResults,
}: Props) {
  const [errors, setErrors] = useState<string[]>([]);

  const handleCalculate = () => {
    setErrors([]);

    try {
      // Calculate EBIT (Earnings Before Interest and Taxes)
      const ebit = inputs.revenue - inputs.operatingExpenses - inputs.depreciation - inputs.amortization;
      const netIncome = ebit - (inputs.interestExpense || 0) - inputs.taxes;

      // Calculate FCFF
      const fcff = calculateFCFF({
        netIncome: netIncome,
        nonCashCharges: inputs.depreciation + inputs.amortization,
        interestExpense: inputs.interestExpense || 0,
        taxRate: inputs.taxes / (ebit - (inputs.interestExpense || 0) || 1),
        fixedCapitalInvestment: inputs.capitalExpenditure,
        workingCapitalInvestment: inputs.changeInWorkingCapital,
      });

      // Calculate FCFE
      const operatingCashFlow = netIncome + inputs.depreciation + inputs.amortization - inputs.changeInWorkingCapital;
      const netBorrowing = inputs.debtIssued - inputs.debtRepaid;

      const fcfe = calculateFCFE({
        cashFlowFromOperations: operatingCashFlow,
        fixedCapitalInvestment: inputs.capitalExpenditure,
        netBorrowing: netBorrowing,
      });

      // Generate cash flow schedule (simplified - assumes stable FCF)
      const periods = inputs.loanPeriods || 5;
      const cashFlowSchedule = Array(periods).fill(fcff);

      // Calculate NPV at WACC
      const discountRate = waccResults ? waccResults.wacc : 0.20; // Default 20%
      const npvAtWACC = calculateNPV(cashFlowSchedule, discountRate);

      // Calculate IRR
      const irr = calculateIRR([-inputs.capitalExpenditure, ...cashFlowSchedule]);

      const calculatedResults: FCFResults = {
        fcff,
        fcfe,
        operatingCashFlow,
        cashFlowSchedule,
        npvAtWACC,
        irr,
      };

      onCalculate(calculatedResults);
    } catch (error) {
      setErrors(['خطا در محاسبه جریان نقدی. لطفاً ورودی‌ها را بررسی کنید.']);
    }
  };

  // Generate waterfall chart data
  const waterfallData = useMemo(() => {
    if (!results) return [];

    const ebit = inputs.revenue - inputs.operatingExpenses - inputs.depreciation - inputs.amortization;
    const taxes = inputs.taxes;
    const nopat = ebit - taxes; // Net Operating Profit After Tax

    return [
      {
        name: 'درآمد',
        value: Number((inputs.revenue / 1_000_000).toFixed(0)),
        cumulative: Number((inputs.revenue / 1_000_000).toFixed(0)),
        isSubtotal: 0,
      },
      {
        name: 'هزینه‌های عملیاتی',
        value: Number((-(inputs.operatingExpenses + inputs.depreciation + inputs.amortization) / 1_000_000).toFixed(0)),
        cumulative: Number((ebit / 1_000_000).toFixed(0)),
        isSubtotal: 0,
      },
      {
        name: 'مالیات',
        value: Number((-taxes / 1_000_000).toFixed(0)),
        cumulative: Number((nopat / 1_000_000).toFixed(0)),
        isSubtotal: 1,
      },
      {
        name: 'سرمایه‌گذاری',
        value: Number((-(inputs.capitalExpenditure + inputs.changeInWorkingCapital) / 1_000_000).toFixed(0)),
        cumulative: Number((results.fcff / 1_000_000).toFixed(0)),
        isSubtotal: 0,
      },
      {
        name: 'FCFF',
        value: Number((results.fcff / 1_000_000).toFixed(0)),
        cumulative: Number((results.fcff / 1_000_000).toFixed(0)),
        isSubtotal: 1,
      },
    ];
  }, [results, inputs]);

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card className="p-6">
        <h3 className="text-xl font-bold text-gray-100 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary-400" />
          تحلیل جریان نقدی آزاد
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Input Fields */}
          <div className="space-y-4">
            {/* Operating Performance */}
            <div className="bg-bg-dark rounded-lg p-4 border border-border-dark">
              <div className="text-sm font-medium text-gray-300 mb-3">عملکرد عملیاتی</div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">درآمد (تومان)</label>
                  <input
                    type="number"
                    value={inputs.revenue}
                    onChange={(e) => onInputsChange({ ...inputs, revenue: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm bg-bg-light border border-border-dark rounded-lg text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">هزینه‌های عملیاتی</label>
                  <input
                    type="number"
                    value={inputs.operatingExpenses}
                    onChange={(e) => onInputsChange({ ...inputs, operatingExpenses: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm bg-bg-light border border-border-dark rounded-lg text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">استهلاک</label>
                  <input
                    type="number"
                    value={inputs.depreciation}
                    onChange={(e) => onInputsChange({ ...inputs, depreciation: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm bg-bg-light border border-border-dark rounded-lg text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">استهلاک اموال غیرملموس</label>
                  <input
                    type="number"
                    value={inputs.amortization}
                    onChange={(e) => onInputsChange({ ...inputs, amortization: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm bg-bg-light border border-border-dark rounded-lg text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">مالیات</label>
                  <input
                    type="number"
                    value={inputs.taxes}
                    onChange={(e) => onInputsChange({ ...inputs, taxes: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm bg-bg-light border border-border-dark rounded-lg text-gray-100"
                  />
                </div>
              </div>
            </div>

            {/* Investment & Financing */}
            <div className="bg-bg-dark rounded-lg p-4 border border-border-dark">
              <div className="text-sm font-medium text-gray-300 mb-3">سرمایه‌گذاری و تامین مالی</div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">سرمایه‌گذاری ثابت (CAPEX)</label>
                  <input
                    type="number"
                    value={inputs.capitalExpenditure}
                    onChange={(e) => onInputsChange({ ...inputs, capitalExpenditure: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm bg-bg-light border border-border-dark rounded-lg text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">تغییر سرمایه در گردش</label>
                  <input
                    type="number"
                    value={inputs.changeInWorkingCapital}
                    onChange={(e) => onInputsChange({ ...inputs, changeInWorkingCapital: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm bg-bg-light border border-border-dark rounded-lg text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">بدهی جدید</label>
                  <input
                    type="number"
                    value={inputs.debtIssued}
                    onChange={(e) => onInputsChange({ ...inputs, debtIssued: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm bg-bg-light border border-border-dark rounded-lg text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">بازپرداخت بدهی</label>
                  <input
                    type="number"
                    value={inputs.debtRepaid}
                    onChange={(e) => onInputsChange({ ...inputs, debtRepaid: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm bg-bg-light border border-border-dark rounded-lg text-gray-100"
                  />
                </div>
              </div>
            </div>

            <Button onClick={handleCalculate} variant="primary" className="w-full">
              محاسبه جریان نقدی آزاد
            </Button>

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
                <div className="text-sm text-gray-400 mb-1">
                  FCFF (جریان نقدی آزاد برای شرکت)
                </div>
                <div className="text-3xl font-bold text-primary-400">
                  {formatPersianAmount(results.fcff)}
                </div>
                <div className="text-xs text-gray-500 mt-1">در دسترس همه سرمایه‌گذاران</div>
              </div>

              <div className="bg-teal-500/10 border border-teal-500/20 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">
                  FCFE (جریان نقدی آزاد برای سهامداران)
                </div>
                <div className="text-3xl font-bold text-teal-400">
                  {formatPersianAmount(results.fcfe)}
                </div>
                <div className="text-xs text-gray-500 mt-1">در دسترس سهامداران</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-bg-dark border border-border-dark rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">جریان نقدی عملیاتی</div>
                  <div className="text-lg font-bold text-blue-400">
                    {formatPersianAmount(results.operatingCashFlow)}
                  </div>
                </div>

                <div className="bg-bg-dark border border-border-dark rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">NPV (با WACC)</div>
                  <div className={`text-lg font-bold ${results.npvAtWACC > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatPersianAmount(results.npvAtWACC)}
                  </div>
                </div>
              </div>

              {results.irr !== null && (
                <div className="bg-bg-dark border border-border-dark rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">نرخ بازده داخلی (IRR)</div>
                  <div className="text-2xl font-bold text-gray-100">
                    {formatPersianNumber((results.irr * 100).toFixed(2))}٪
                  </div>
                  {waccResults && (
                    <div className="text-xs text-gray-500 mt-2">
                      {results.irr > waccResults.wacc ? (
                        <span className="text-green-400">✓ IRR بیشتر از WACC - پروژه قابل قبول</span>
                      ) : (
                        <span className="text-red-400">✗ IRR کمتر از WACC - پروژه رد می‌شود</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Decision Support */}
              <div className={`rounded-lg p-4 ${results.npvAtWACC > 0 ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                <div className="text-sm font-medium mb-2" style={{ color: results.npvAtWACC > 0 ? '#4ade80' : '#f87171' }}>
                  توصیه سرمایه‌گذاری
                </div>
                <div className="text-xs text-gray-300">
                  {results.npvAtWACC > 0 ? (
                    <>
                      NPV مثبت است. این پروژه بیشتر از هزینه سرمایه بازده دارد و قابل قبول است.
                    </>
                  ) : (
                    <>
                      NPV منفی است. این پروژه کمتر از هزینه سرمایه بازده دارد و باید رد شود.
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Waterfall Chart */}
      {results && waterfallData.length > 0 && (
        <BarChartCard
          title="آبشار جریان نقدی (میلیون تومان)"
          subtitle="از درآمد تا FCFF"
          data={waterfallData}
          dataKey="value"
          height={300}
        />
      )}

      {/* Educational Section */}
      <Card className="p-6 bg-bg-dark border border-border-dark">
        <h4 className="text-lg font-bold text-gray-100 mb-3">درباره جریان نقدی آزاد</h4>
        <div className="space-y-3 text-sm text-gray-300">
          <div>
            <strong className="text-primary-400">FCFF (Free Cash Flow to Firm):</strong> جریان نقدی در
            دسترس همه سرمایه‌گذاران (سهامداران و طلبکاران) پس از سرمایه‌گذاری‌های لازم.
          </div>
          <div className="bg-bg-light rounded-lg p-3 font-mono text-xs">
            FCFF = NI + NCC + Int(1-T) - FCInv - WCInv
          </div>
          <div>
            <strong className="text-teal-400">FCFE (Free Cash Flow to Equity):</strong> جریان نقدی در
            دسترس سهامداران پس از پرداخت همه تعهدات و سرمایه‌گذاری‌ها.
          </div>
          <div className="bg-bg-light rounded-lg p-3 font-mono text-xs">
            FCFE = CFO - FCInv + Net Borrowing
          </div>
        </div>
      </Card>
    </div>
  );
}
