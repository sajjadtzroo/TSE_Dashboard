/**
 * Calculator Form Component
 */

import type { CalculatorInputs } from './types';
import { formatCurrency } from '@/utils/financialCalculations';

interface CalculatorFormProps {
  inputs: CalculatorInputs;
  onChange: (inputs: CalculatorInputs) => void;
}

export function CalculatorForm({ inputs, onChange }: CalculatorFormProps) {
  const handleChange = (field: keyof CalculatorInputs, value: any) => {
    onChange({ ...inputs, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Deposit Amount */}
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">
          مبلغ سپرده (تومان)
        </label>
        <input
          type="number"
          value={inputs.depositAmount}
          onChange={(e) => handleChange('depositAmount', Number(e.target.value))}
          className="w-full px-4 py-3 bg-surface-50 border border-border-light rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400"
          step="1000000"
        />
        <p className="mt-1 text-xs text-gray-400">
          مبلغی که می‌توانید به عنوان سپرده بگذارید: {formatCurrency(inputs.depositAmount)}
        </p>
      </div>

      {/* Deposit Duration */}
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">
          مدت سپرده‌گذاری (ماه)
        </label>
        <input
          type="number"
          value={inputs.depositMonths}
          onChange={(e) => handleChange('depositMonths', Number(e.target.value))}
          className="w-full px-4 py-3 bg-surface-50 border border-border-light rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400"
          min="1"
          max="60"
        />
        <p className="mt-1 text-xs text-gray-400">
          حداقل ۱ ماه، حداکثر ۶۰ ماه
        </p>
      </div>

      {/* External Return Rate */}
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">
          نرخ بازدهی سرمایه‌گذاری جایگزین (% سالانه)
        </label>
        <input
          type="number"
          value={inputs.externalReturnRate * 100}
          onChange={(e) => handleChange('externalReturnRate', Number(e.target.value) / 100)}
          className="w-full px-4 py-3 bg-surface-50 border border-border-light rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400"
          step="1"
        />
        <p className="mt-1 text-xs text-gray-400">
          بازدهی سالانه‌ای که می‌توانید از سرمایه‌گذاری‌های دیگر بگیرید (مثلاً بورس، ملک)
        </p>
      </div>

      {/* Loan Repayment Period */}
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">
          مدت بازپرداخت وام (ماه)
        </label>
        <input
          type="number"
          value={inputs.loanMonths}
          onChange={(e) => handleChange('loanMonths', Number(e.target.value))}
          className="w-full px-4 py-3 bg-surface-50 border border-border-light rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400"
          min="6"
          max="120"
        />
        <p className="mt-1 text-xs text-gray-400">
          دوره‌ای که می‌خواهید وام را بازپرداخت کنید
        </p>
      </div>

      {/* Commission */}
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">
          کارمزد مورد انتظار (تومان)
        </label>
        <input
          type="number"
          value={inputs.commission}
          onChange={(e) => handleChange('commission', Number(e.target.value))}
          className="w-full px-4 py-3 bg-surface-50 border border-border-light rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400"
          step="100000"
        />
        <p className="mt-1 text-xs text-gray-400">
          حداکثر کارمزدی که حاضرید برای وام بپردازید: {formatCurrency(inputs.commission)}
        </p>
      </div>

      {/* Risk Tolerance */}
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">
          تحمل ریسک
        </label>
        <div className="grid grid-cols-3 gap-3">
          {(['low', 'medium', 'high'] as const).map((risk) => (
            <button
              key={risk}
              onClick={() => handleChange('riskTolerance', risk)}
              className={`px-4 py-3 rounded-lg border-2 transition-all ${
                inputs.riskTolerance === risk
                  ? 'bg-primary-800/30 border-primary-400 text-primary-400'
                  : 'bg-surface-50 border-border-light text-gray-300 hover:border-gray-400'
              }`}
            >
              {risk === 'low' && 'کم'}
              {risk === 'medium' && 'متوسط'}
              {risk === 'high' && 'زیاد'}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-400">
          {inputs.riskTolerance === 'low' && 'اولویت با امنیت و پایین‌ترین هزینه'}
          {inputs.riskTolerance === 'medium' && 'تعادل بین امنیت و بازدهی'}
          {inputs.riskTolerance === 'high' && 'اولویت با حداکثر مبلغ وام و بازدهی'}
        </p>
      </div>
    </div>
  );
}

export default CalculatorForm;
