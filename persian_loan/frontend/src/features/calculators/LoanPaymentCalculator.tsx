/**
 * Loan Payment Calculator
 * Calculate monthly payments and amortization schedule
 */

import { useState } from 'react';
import { Calculator, TrendingUp, DollarSign, PiggyBank } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { PieChartCard, LineChartCard } from '@/components/charts';
import { formatPersianAmount, formatPersianNumber } from '@/utils/persianNumber';
import { CurrencyInput } from '@/components/inputs/CurrencyInput';
import { PercentageInput } from '@/components/inputs/PercentageInput';
import { NumberInput } from './components/NumberInput';
import { ResultCard } from './components/ResultCard';
import {
  calculatePMT,
  generateAmortizationSchedule,
  AnnuityType
} from '@/utils/timeValueOfMoney';

interface PaymentInputs {
  principal: number;
  annualRate: number;
  termMonths: number;
  extraPayment: number;
}

export function LoanPaymentCalculator() {
  const [inputs, setInputs] = useState<PaymentInputs>({
    principal: 100_000_000,
    annualRate: 18,
    termMonths: 60,
    extraPayment: 0,
  });
  const [showResults, setShowResults] = useState(false);

  const handleCalculate = () => {
    setShowResults(true);
  };

  // Use CFA-compliant TVM calculations
  const monthlyRate = inputs.annualRate / 100 / 12;

  // Calculate monthly payment using CFA standard PMT formula
  const monthlyPayment = calculatePMT(
    -inputs.principal,  // Negative = cash outflow (borrowing)
    0,                  // No future value (loan paid off)
    monthlyRate,
    inputs.termMonths,
    AnnuityType.ORDINARY // Payments at end of period
  );

  const totalPayment = monthlyPayment * inputs.termMonths;
  const totalInterest = totalPayment - inputs.principal;

  // Generate amortization schedule using CFA-compliant function
  const fullSchedule = generateAmortizationSchedule(
    inputs.principal,
    inputs.annualRate / 100,
    inputs.termMonths,
    12 // Monthly payments
  );

  // Format first 12 months for chart
  const schedule = fullSchedule.slice(0, 12).map((payment) => ({
    month: `ماه ${formatPersianNumber(payment.period)}`,
    interest: Math.round(payment.interest),
    principal: Math.round(payment.principal),
    balance: Math.round(payment.balance),
  }));

  const pieData = [
    { name: 'اصل وام', value: inputs.principal, fill: '#3b82f6' },
    { name: 'سود', value: Math.round(totalInterest), fill: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      <Card className="p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-primary-500/10 rounded-xl">
            <Calculator className="w-6 h-6 text-primary-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-100">محاسبه قسط وام</h2>
            <p className="text-sm text-gray-400 mt-1">محاسبه دقیق قسط ماهانه و جدول بازپرداخت</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Inputs */}
          <div className="space-y-5">
            <CurrencyInput
              label="مبلغ وام"
              value={inputs.principal}
              onChange={(value) => setInputs({ ...inputs, principal: value })}
              helperText="مبلغ اصلی وام به تومان"
              required
            />

            <PercentageInput
              label="نرخ سود سالانه"
              value={inputs.annualRate}
              onChange={(value) => setInputs({ ...inputs, annualRate: value })}
              min={0}
              max={50}
              step={0.1}
              helperText="نرخ سود سالانه بانک"
              required
            />

            <NumberInput
              label="مدت بازپرداخت"
              value={inputs.termMonths}
              onChange={(value) => setInputs({ ...inputs, termMonths: value })}
              min={1}
              max={360}
              suffix="ماه"
              helperText="تعداد ماه‌های بازپرداخت"
              required
            />

            <CurrencyInput
              label="پرداخت اضافی ماهانه"
              value={inputs.extraPayment}
              onChange={(value) => setInputs({ ...inputs, extraPayment: value })}
              helperText="مبلغ اضافی که هر ماه می‌پردازید (اختیاری)"
            />

            <Button
              onClick={handleCalculate}
              variant="primary"
              className="w-full py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              <Calculator className="w-5 h-5 ml-2" />
              محاسبه کنید
            </Button>
          </div>

          {/* Results */}
          {showResults ? (
            <div className="space-y-4">
              <ResultCard
                label="قسط ماهانه"
                value={formatPersianAmount(monthlyPayment)}
                icon={DollarSign}
                color="primary"
                highlight
                subtitle="مبلغی که هر ماه باید بپردازید"
              />

              <ResultCard
                label="مجموع پرداختی"
                value={formatPersianAmount(totalPayment)}
                icon={TrendingUp}
                subtitle={`شامل ${formatPersianAmount(inputs.principal)} اصل + ${formatPersianAmount(totalInterest)} سود`}
              />

              <ResultCard
                label="مجموع سود پرداختی"
                value={formatPersianAmount(totalInterest)}
                icon={PiggyBank}
                color="danger"
                subtitle="مجموع سودی که به بانک می‌پردازید"
              />

              <ResultCard
                label="نسبت سود به اصل"
                value={`${((totalInterest / inputs.principal) * 100).toFixed(1)}٪`}
                color="warning"
                subtitle={totalInterest > inputs.principal ? 'سود بیشتر از اصل است!' : 'نسبت قابل قبول'}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center p-12 border-2 border-dashed border-border-dark rounded-xl">
              <div className="text-center">
                <Calculator className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">اطلاعات وام را وارد کرده و محاسبه کنید</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Charts */}
      {showResults && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PieChartCard title="ترکیب پرداختی" data={pieData} height={300} />

          <LineChartCard
            title="جدول بازپرداخت (۱۲ ماه اول)"
            data={schedule}
            dataKeys={[
              { key: 'principal', name: 'اصل', color: '#3b82f6' },
              { key: 'interest', name: 'سود', color: '#ef4444' },
            ]}
            xAxisKey="month"
            height={300}
          />
        </div>
      )}
    </div>
  );
}

export default LoanPaymentCalculator;
