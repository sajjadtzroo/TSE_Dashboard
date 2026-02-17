/**
 * Affordability Calculator
 * Calculate maximum affordable loan based on income
 */

import { useState } from 'react';
import { Wallet, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { PieChartCard } from '@/components/charts';
import { formatPersianAmount } from '@/utils/persianNumber';
import { CurrencyInput } from '@/components/inputs/CurrencyInput';
import { PercentageInput } from '@/components/inputs/PercentageInput';
import { NumberInput } from './components/NumberInput';
import { ResultCard } from './components/ResultCard';
import { calculatePV, AnnuityType } from '@/utils/timeValueOfMoney';

export function AffordabilityCalculator() {
  const [monthlyIncome, setMonthlyIncome] = useState(50_000_000);
  const [existingDebts, setExistingDebts] = useState(10_000_000);
  const [maxDTI, setMaxDTI] = useState(40);
  const [interestRate, setInterestRate] = useState(18);
  const [loanTerm, setLoanTerm] = useState(60);
  const [showResults, setShowResults] = useState(false);

  const maxPayment = (monthlyIncome * maxDTI) / 100 - existingDebts;
  const monthlyRate = interestRate / 100 / 12;

  // Calculate max loan using CFA-compliant PV formula
  // PV = present value of annuity (the loan amount we can afford)
  const maxLoan = -calculatePV(
    0,              // No future value (loan paid off)
    -maxPayment,    // Negative payment = outflow
    monthlyRate,
    loanTerm,
    AnnuityType.ORDINARY
  );

  const actualDTI = ((maxPayment + existingDebts) / monthlyIncome) * 100;

  const pieData = [
    { name: 'قسط وام', value: Math.round(maxPayment), fill: '#3b82f6' },
    { name: 'بدهی فعلی', value: existingDebts, fill: '#f59e0b' },
    { name: 'درآمد آزاد', value: monthlyIncome - maxPayment - existingDebts, fill: '#10b981' },
  ];

  return (
    <div className="space-y-6">
      <Card className="p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-teal-500/10 rounded-xl">
            <Wallet className="w-6 h-6 text-teal-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-100">محاسبه توان پرداخت</h2>
            <p className="text-sm text-gray-400 mt-1">تعیین حداکثر وام قابل دریافت بر اساس درآمد</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-5">
            <CurrencyInput
              label="درآمد ماهانه"
              value={monthlyIncome}
              onChange={setMonthlyIncome}
              helperText="مجموع درآمد ثابت ماهانه شما"
              required
            />

            <CurrencyInput
              label="بدهی ماهانه فعلی"
              value={existingDebts}
              onChange={setExistingDebts}
              helperText="مجموع اقساط و بدهی‌های ماهانه فعلی"
            />

            <PercentageInput
              label="حداکثر نسبت بدهی به درآمد (DTI)"
              value={maxDTI}
              onChange={setMaxDTI}
              min={10}
              max={70}
              helperText="معمولاً بین 30-40 درصد توصیه می‌شود"
              required
            />

            <PercentageInput
              label="نرخ سود سالانه"
              value={interestRate}
              onChange={setInterestRate}
              min={0}
              max={50}
              helperText="نرخ سود مورد انتظار وام"
              required
            />

            <NumberInput
              label="مدت وام"
              value={loanTerm}
              onChange={setLoanTerm}
              min={12}
              max={360}
              suffix="ماه"
              helperText="تعداد ماه‌های بازپرداخت"
              required
            />

            <Button
              onClick={() => setShowResults(true)}
              variant="primary"
              className="w-full py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              <Wallet className="w-5 h-5 ml-2" />
              محاسبه توان پرداخت
            </Button>
          </div>

          {showResults ? (
            <div className="space-y-4">
              <ResultCard
                label="حداکثر مبلغ وام قابل دریافت"
                value={formatPersianAmount(maxLoan)}
                icon={TrendingUp}
                color="primary"
                highlight
                subtitle="با توجه به درآمد و نسبت DTI شما"
              />

              <ResultCard
                label="حداکثر قسط ماهانه"
                value={formatPersianAmount(maxPayment)}
                icon={Wallet}
                color="success"
                subtitle={`${actualDTI.toFixed(1)}٪ از درآمد ماهانه شما`}
              />

              <ResultCard
                label="نسبت بدهی به درآمد (DTI)"
                value={`${actualDTI.toFixed(1)}٪`}
                color={actualDTI <= 30 ? 'success' : actualDTI <= 40 ? 'warning' : 'danger'}
                subtitle={`حداکثر مجاز: ${maxDTI}٪`}
              />

              <div className={`p-5 rounded-xl border-2 ${
                actualDTI <= 30
                  ? 'bg-teal-500/10 border-teal-500/30'
                  : actualDTI <= 40
                  ? 'bg-yellow-500/10 border-yellow-500/30'
                  : 'bg-pink-500/10 border-pink-500/30'
              }`}>
                <div className="flex items-center gap-3 mb-2">
                  {actualDTI <= 40 ? (
                    <CheckCircle className="w-5 h-5 text-teal-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-pink-400" />
                  )}
                  <div className="text-sm font-medium text-gray-200">
                    ارزیابی ریسک مالی
                  </div>
                </div>
                <div className={`text-2xl font-bold mb-1 ${
                  actualDTI <= 30 ? 'text-teal-400' :
                  actualDTI <= 40 ? 'text-yellow-400' : 'text-pink-400'
                }`}>
                  {actualDTI <= 30 ? 'ریسک کم' : actualDTI <= 40 ? 'ریسک متوسط' : 'ریسک بالا'}
                </div>
                <div className="text-xs text-gray-400">
                  {actualDTI <= 30
                    ? 'شرایط مالی شما برای دریافت وام مناسب است'
                    : actualDTI <= 40
                    ? 'می‌توانید وام دریافت کنید اما با احتیاط'
                    : 'توصیه می‌شود مبلغ کمتری درخواست کنید'}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center p-12 border-2 border-dashed border-border-dark rounded-xl">
              <div className="text-center">
                <Wallet className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">اطلاعات درآمد خود را وارد کنید</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {showResults && (
        <PieChartCard
          title="تخصیص درآمد ماهانه"
          data={pieData}
          height={300}
        />
      )}
    </div>
  );
}

export default AffordabilityCalculator;
