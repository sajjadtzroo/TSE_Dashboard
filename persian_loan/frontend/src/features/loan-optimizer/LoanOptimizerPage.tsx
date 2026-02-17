/**
 * Loan Optimizer Page
 * Main page that assembles all optimizer components
 */

import React, { useState, useCallback } from 'react';
import { useLoanOptimizer } from './hooks/useLoanOptimizer';
import OptimizerInputForm from './components/OptimizerInputForm';
import OptimizerMetricsCards from './components/OptimizerMetricsCards';
import OptimizerResultsTable from './components/OptimizerResultsTable';
import OptimizerFilters from './components/OptimizerFilters';
import OptimizerCharts from './components/OptimizerCharts';
import ScenarioComparison from './components/ScenarioComparison';
import type { OptimizerInputs } from './types';

const LoanOptimizerPage: React.FC = () => {
  const [inputs, setInputs] = useState<OptimizerInputs>({
    depositAmount: 10_000_000,
    depositMonths: 3,
    loanAmountNeeded: 50_000_000,
    discountRateMethod: 'capm',
    riskTolerance: 'medium',
    considerPrivilegePurchase: false,
  });

  const [showResults, setShowResults] = useState(false);
  const [selectedBanks, setSelectedBanks] = useState<string[]>([]);
  const [onlySuitable, setOnlySuitable] = useState(false);
  const [expandedScenarios, setExpandedScenarios] = useState<boolean>(false);

  const { loans, loading, error } = useLoanOptimizer(inputs);

  // Initialize selected banks when loans load
  React.useEffect(() => {
    if (loans.length > 0 && selectedBanks.length === 0) {
      const uniqueBanks = Array.from(new Set(loans.map((l) => l.bankNameFA)));
      setSelectedBanks(uniqueBanks);
    }
  }, [loans, selectedBanks.length]);

  // Filter loans by selected banks
  const filteredLoans = React.useMemo(() => {
    if (selectedBanks.length === 0) {
      return loans;
    }
    return loans.filter((loan) => selectedBanks.includes(loan.bankNameFA));
  }, [loans, selectedBanks]);

  const handleCalculate = useCallback((newInputs: OptimizerInputs) => {
    setInputs(newInputs);
    setShowResults(true);
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">
            بهینه‌ساز وام
          </h1>
          <p className="text-gray-400 mt-1">
            مقایسه جامع همه وام‌ها با معیارهای پیشرفته مالی
          </p>
        </div>
        {loans.length > 0 && (
          <div className="bg-primary-400/10 text-primary-400 px-4 py-2 rounded-lg border border-primary-400/20">
            <span className="font-semibold text-lg">
              {loans.length.toLocaleString('fa-IR')}
            </span>
            <span className="text-sm mr-2">وام</span>
          </div>
        )}
      </div>

      {/* Input Form */}
      <OptimizerInputForm onSubmit={handleCalculate} loading={loading} />

      {/* Error Message */}
      {error && (
        <div className="bg-pink-500/10 border border-pink-500/20 rounded-lg p-4">
          <p className="text-pink-400">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-surface-800 rounded-lg p-8 border border-surface-700">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-400"></div>
            <p className="text-gray-400">در حال محاسبه و مقایسه وام‌ها...</p>
          </div>
        </div>
      )}

      {/* Results Section */}
      {showResults && !loading && loans.length > 0 && (
        <>
          {/* Summary Cards */}
          <OptimizerMetricsCards results={filteredLoans} />

          {/* Filters */}
          <OptimizerFilters
            results={loans}
            selectedBanks={selectedBanks}
            onSelectedBanksChange={setSelectedBanks}
            onlySuitable={onlySuitable}
            onOnlySuitableChange={setOnlySuitable}
          />

          {/* NEW: Scenario Analysis for Top Loans (if privilege analysis enabled) */}
          {inputs.considerPrivilegePurchase && filteredLoans.length > 0 && (
            <div className="bg-surface-800 rounded-lg p-6 border border-surface-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-100">
                  تحلیل جزئی ۵ وام برتر
                </h3>
                <button
                  onClick={() => setExpandedScenarios(!expandedScenarios)}
                  className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-2"
                >
                  {expandedScenarios ? 'بستن همه' : 'نمایش همه'}
                  <svg
                    className={`w-4 h-4 transform transition-transform ${expandedScenarios ? 'rotate-180' : ''}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                {filteredLoans.slice(0, 5).map((loan, index) => (
                  <details key={`${loan.loanId}-${loan.bankNameFA}-detail-${index}`} open={expandedScenarios} className="group">
                    <summary className="cursor-pointer list-none">
                      <div className="bg-surface-900 hover:bg-surface-700 p-4 rounded-lg border border-surface-600 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className="text-lg font-bold text-primary-400">
                              {index + 1}
                            </span>
                            <div>
                              <div className="font-semibold text-gray-100">
                                {loan.bankNameFA} - {loan.loanNameFA}
                              </div>
                              <div className="text-sm text-gray-400 mt-1">
                                NPV: {(loan.npv / 1_000_000).toFixed(1)} م • توصیه: {
                                  loan.recommendation === 'WAIT' ? 'منتظر بمانید' :
                                  loan.recommendation === 'BUY_PRIVILEGE' ? 'خرید امتیاز' :
                                  loan.recommendation === 'NEGOTIATE' ? 'مذاکره کنید' :
                                  'رد کنید'
                                }
                              </div>
                            </div>
                          </div>
                          <svg
                            className="w-5 h-5 text-gray-400 transform group-open:rotate-180 transition-transform"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    </summary>
                    <div className="mt-4">
                      <ScenarioComparison loan={loan} />
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}

          {/* Results Table */}
          <OptimizerResultsTable
            data={filteredLoans}
            onlySuitable={onlySuitable}
          />

          {/* Charts */}
          <OptimizerCharts data={filteredLoans} />
        </>
      )}

      {/* Empty State */}
      {showResults && !loading && loans.length === 0 && !error && (
        <div className="bg-surface-800 rounded-lg p-8 border border-surface-700 text-center">
          <p className="text-gray-400 text-lg">
            هیچ وامی یافت نشد. لطفاً پارامترهای ورودی را بررسی کنید.
          </p>
        </div>
      )}

      {/* Info Footer */}
      <div className="bg-surface-800 rounded-lg p-4 border border-surface-700">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">
          راهنمای استفاده
        </h3>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• رنگ سبز: بهترین 10٪ وام‌ها</li>
          <li>• رنگ قرمز: ضعیف‌ترین 10٪ وام‌ها</li>
          <li>• رنگ خاکستری: وام‌های متوسط</li>
          <li>• برای مرتب‌سازی روی عنوان ستون‌ها کلیک کنید</li>
          <li>• CAPM: مدل قیمت‌گذاری دارایی سرمایه‌ای (برای محاسبه نرخ بازده مورد انتظار)</li>
          <li>• WACC: میانگین موزون هزینه سرمایه (برای تنزیل ریسک‌آگاهانه)</li>
          <li>• NPV: ارزش خالص فعلی (هرچه بیشتر، بهتر)</li>
          <li>• IRR: نرخ بازده داخلی (هرچه بیشتر، بهتر)</li>
        </ul>
      </div>
    </div>
  );
};

export default LoanOptimizerPage;
