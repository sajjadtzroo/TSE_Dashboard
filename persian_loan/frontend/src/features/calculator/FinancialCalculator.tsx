/**
 * Financial Calculator Component
 * Analyzes loans and recommends best options based on user inputs
 */

import { useState } from 'react';
import { Calculator as CalcIcon, TrendingUp, DollarSign } from 'lucide-react';
import { useLoans } from '@/hooks';
import { Card, CardHeader, Button, LoadingPage } from '@/components/ui';
import { CalculatorForm } from './CalculatorForm';
import { CalculatorResults } from './CalculatorResults';
import { analyzeLoan, rankLoans } from './calculatorEngine';
import type { CalculatorInputs, LoanAnalysis } from './types';

export function FinancialCalculator() {
  const { data: allLoans, isLoading } = useLoans();
  const [inputs, setInputs] = useState<CalculatorInputs>({
    depositAmount: 100000000, // 100M Toman default
    depositMonths: 3,
    externalReturnRate: 0.30, // 30% annual return
    commission: 5000000, // 5M Toman
    loanMonths: 36,
    riskTolerance: 'medium',
  });
  const [results, setResults] = useState<LoanAnalysis[] | null>(null);
  const [showResults, setShowResults] = useState(false);

  const handleCalculate = () => {
    if (!allLoans) return;

    // Analyze all loans
    const analyses: LoanAnalysis[] = [];

    for (const loan of allLoans) {
      try {
        const analysis = analyzeLoan(loan, inputs);
        if (analysis) {
          analyses.push(analysis);
        }
      } catch (error) {
        console.error('Error analyzing loan:', loan.id, error);
      }
    }

    // Rank and sort by score
    const rankedLoans = rankLoans(analyses, inputs.riskTolerance);
    setResults(rankedLoans);
    setShowResults(true);
  };

  const handleReset = () => {
    setShowResults(false);
    setResults(null);
  };

  if (isLoading) {
    return <LoadingPage />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <CalcIcon className="w-7 h-7 text-primary-400" />
        <div>
          <h1 className="text-2xl font-bold text-gray-50">ماشین حساب مالی هوشمند</h1>
          <p className="text-sm text-gray-300 mt-1">
            تحلیل مالی وام‌ها با محاسبه IRR، MIRR، NPV و توصیه بهترین گزینه
          </p>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card padding="sm" hover>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-800/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <div className="text-xs text-gray-400">تعداد وام‌های تحلیل شده</div>
              <div className="text-xl font-bold text-gray-50">{allLoans?.length || 0}</div>
            </div>
          </div>
        </Card>
        <Card padding="sm" hover>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary-800/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-secondary-500" />
            </div>
            <div>
              <div className="text-xs text-gray-400">محاسبات مالی</div>
              <div className="text-sm font-semibold text-gray-200">
                IRR · MIRR · NPV
              </div>
            </div>
          </div>
        </Card>
        <Card padding="sm" hover>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-800/20 rounded-lg">
              <CalcIcon className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <div className="text-xs text-gray-400">توصیه هوشمند</div>
              <div className="text-sm font-semibold text-gray-200">
                بهترین گزینه برای شما
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Calculator Form */}
      {!showResults ? (
        <Card>
          <CardHeader title="اطلاعات مالی خود را وارد کنید" />
          <div className="p-6">
            <CalculatorForm inputs={inputs} onChange={setInputs} />
            <div className="mt-6 flex gap-3">
              <Button
                variant="primary"
                onClick={handleCalculate}
                className="flex-1"
              >
                محاسبه و توصیه بهترین وام
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-50">نتایج تحلیل مالی</h2>
            <Button variant="outline" size="sm" onClick={handleReset}>
              محاسبه مجدد
            </Button>
          </div>
          {results && <CalculatorResults results={results} inputs={inputs} />}
        </>
      )}
    </div>
  );
}

export default FinancialCalculator;
