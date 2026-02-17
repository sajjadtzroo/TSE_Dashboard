/**
 * Calculator Layout - Main container for all calculators
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calculator, GitCompare, DollarSign, TrendingDown, TrendingUp, Wallet, Activity } from 'lucide-react';
import { LoanPaymentCalculator } from './LoanPaymentCalculator';
import { LoanComparisonCalculator } from './LoanComparisonCalculator';
import { AffordabilityCalculator } from './AffordabilityCalculator';
import { RefinanceCalculator } from './RefinanceCalculator';
import { EarlyPayoffCalculator } from './EarlyPayoffCalculator';
import { InvestmentCalculator } from './InvestmentCalculator';
import { AdvancedFinancialCalculator } from './AdvancedFinancialCalculator';

type CalculatorType =
  | 'payment'
  | 'comparison'
  | 'affordability'
  | 'refinance'
  | 'early-payoff'
  | 'investment'
  | 'advanced';

const CALCULATORS = [
  {
    id: 'payment' as CalculatorType,
    label: 'محاسبه قسط وام',
    icon: Calculator,
    description: 'محاسبه قسط ماهانه و جدول بازپرداخت',
  },
  {
    id: 'comparison' as CalculatorType,
    label: 'مقایسه سناریوها',
    icon: GitCompare,
    description: 'مقایسه چند سناریوی وام',
  },
  {
    id: 'affordability' as CalculatorType,
    label: 'توان پرداخت',
    icon: DollarSign,
    description: 'محاسبه حداکثر وام قابل دریافت',
  },
  {
    id: 'refinance' as CalculatorType,
    label: 'تحلیل بازپرداخت مجدد',
    icon: TrendingDown,
    description: 'تحلیل صرفه‌جویی از بازپرداخت',
  },
  {
    id: 'early-payoff' as CalculatorType,
    label: 'پرداخت زودتر',
    icon: TrendingUp,
    description: 'تأثیر پرداخت اضافی بر وام',
  },
  {
    id: 'investment' as CalculatorType,
    label: 'بازده سرمایه‌گذاری',
    icon: Wallet,
    description: 'محاسبه سود مرکب و بازده',
  },
  {
    id: 'advanced' as CalculatorType,
    label: 'تحلیل مالی پیشرفته (CFA)',
    icon: Activity,
    description: 'CAPM، WACC، و تحلیل جریان نقدی آزاد',
  },
];

const isValidCalculatorType = (type: string | undefined): type is CalculatorType => {
  return CALCULATORS.some((calc) => calc.id === type);
};

export function CalculatorLayout() {
  const { type } = useParams<{ type?: string }>();
  const navigate = useNavigate();

  // Initialize from URL param or default to 'payment'
  const initialCalculator = isValidCalculatorType(type) ? type : 'payment';
  const [activeCalculator, setActiveCalculator] = useState<CalculatorType>(initialCalculator);

  // Sync state with URL param
  useEffect(() => {
    if (isValidCalculatorType(type)) {
      setActiveCalculator(type);
    }
  }, [type]);

  // Update URL when calculator changes
  const handleCalculatorChange = (calcType: CalculatorType) => {
    setActiveCalculator(calcType);
    navigate(`/calculators/${calcType}`, { replace: true });
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-100 mb-2">ماشین‌حساب‌های مالی</h1>
        <p className="text-gray-300">ابزارهای محاسبه و تحلیل وام و سرمایه‌گذاری</p>
      </div>

      {/* Calculator Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {CALCULATORS.map((calc) => {
          const Icon = calc.icon;
          const isActive = activeCalculator === calc.id;

          return (
            <button
              key={calc.id}
              onClick={() => handleCalculatorChange(calc.id)}
              className={`group p-6 rounded-xl border-2 transition-all text-right relative overflow-hidden ${
                isActive
                  ? 'border-primary-500 bg-primary-500/10 shadow-lg'
                  : 'border-border-dark hover:border-primary-400/50 hover:shadow-md'
              }`}
            >
              {/* Background gradient effect */}
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity ${
                isActive ? 'opacity-100' : ''
              }`}>
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent" />
              </div>

              {/* Content */}
              <div className="relative">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-primary-500/20'
                      : 'bg-bg-darker group-hover:bg-primary-500/10'
                  }`}>
                    <Icon
                      className={`w-6 h-6 transition-colors ${
                        isActive ? 'text-primary-400' : 'text-gray-400 group-hover:text-primary-400'
                      }`}
                    />
                  </div>

                  {isActive && (
                    <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                  )}
                </div>

                <div
                  className={`font-semibold text-base mb-2 transition-colors ${
                    isActive ? 'text-gray-100' : 'text-gray-300 group-hover:text-gray-100'
                  }`}
                >
                  {calc.label}
                </div>

                <div className="text-xs text-gray-400 leading-relaxed">
                  {calc.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Calculator Content */}
      <div className="animate-fade-in">
        {activeCalculator === 'payment' && <LoanPaymentCalculator />}
        {activeCalculator === 'comparison' && <LoanComparisonCalculator />}
        {activeCalculator === 'affordability' && <AffordabilityCalculator />}
        {activeCalculator === 'refinance' && <RefinanceCalculator />}
        {activeCalculator === 'early-payoff' && <EarlyPayoffCalculator />}
        {activeCalculator === 'investment' && <InvestmentCalculator />}
        {activeCalculator === 'advanced' && <AdvancedFinancialCalculator />}
      </div>
    </div>
  );
}

export default CalculatorLayout;
