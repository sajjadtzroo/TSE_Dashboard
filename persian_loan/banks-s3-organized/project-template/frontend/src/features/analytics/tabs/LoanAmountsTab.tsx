/**
 * Loan Amounts Tab - Amount range analysis
 */

import { BarChartCard } from '../../../components/charts';
import { useLoans } from '../../../hooks';
import { Loading, Card } from '../../../components/ui';
import { parsePersianAmount, formatPersianAmount } from '../../../utils/persianNumber';

export function LoanAmountsTab() {
  const { data: loans, isLoading } = useLoans();

  if (isLoading) {
    return <Loading text="در حال بارگذاری داده‌ها..." />;
  }

  // Parse amounts
  const loansWithAmounts = loans
    ?.map((loan) => ({
      ...loan,
      minAmountNumeric: parsePersianAmount(loan.minAmount),
      maxAmountNumeric: parsePersianAmount(loan.maxAmount),
    }))
    .filter((loan) => loan.maxAmountNumeric && loan.maxAmountNumeric > 0) || [];

  // Amount distribution (buckets in millions)
  const amountBuckets = [
    { range: 'کمتر از ۱۰۰ میلیون', max: 100_000_000, count: 0 },
    { range: '۱۰۰-۵۰۰ میلیون', min: 100_000_000, max: 500_000_000, count: 0 },
    { range: '۵۰۰ میلیون - ۱ میلیارد', min: 500_000_000, max: 1_000_000_000, count: 0 },
    { range: '۱-۵ میلیارد', min: 1_000_000_000, max: 5_000_000_000, count: 0 },
    { range: 'بیش از ۵ میلیارد', min: 5_000_000_000, count: 0 },
  ];

  loansWithAmounts.forEach((loan) => {
    const amount = loan.maxAmountNumeric!;
    const bucket = amountBuckets.find(
      (b) => (!b.min || amount >= b.min) && (!b.max || amount < b.max)
    );
    if (bucket) bucket.count++;
  });

  const amountDistributionData = amountBuckets.map((b) => ({
    name: b.range,
    تعداد: b.count,
  }));

  // Statistics
  const maxAmounts = loansWithAmounts.map((l) => l.maxAmountNumeric!);
  const avgMaxAmount = maxAmounts.reduce((sum, amt) => sum + amt, 0) / maxAmounts.length || 0;
  const minMaxAmount = Math.min(...maxAmounts);
  const maxMaxAmount = Math.max(...maxAmounts);

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="text-sm text-gray-400 mb-2">میانگین حداکثر مبلغ</div>
          <div className="text-2xl font-bold text-primary-400">
            {formatPersianAmount(avgMaxAmount)}
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-gray-400 mb-2">کمترین حداکثر</div>
          <div className="text-2xl font-bold text-teal-400">
            {formatPersianAmount(minMaxAmount)}
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-gray-400 mb-2">بیشترین حداکثر</div>
          <div className="text-2xl font-bold text-pink-400">
            {formatPersianAmount(maxMaxAmount)}
          </div>
        </Card>
      </div>

      {/* Amount Distribution Chart */}
      <BarChartCard
        title="توزیع حداکثر مبلغ وام"
        data={amountDistributionData}
        dataKey="تعداد"
        height={350}
        color="#8b5cf6"
      />
    </div>
  );
}

export default LoanAmountsTab;
