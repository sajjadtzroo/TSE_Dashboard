/**
 * Interest Rates Tab - Interest rate analysis
 */

import { BarChartCard } from '@/components/charts';
import { useLoans, useBanks } from '@/hooks';
import { Loading, Card } from '@/components/ui';
import { parseInterestRate } from '@/utils/persianNumber';
import { InterestRatesTable } from '../components';

export function InterestRatesTab() {
  const { data: loans, isLoading: loansLoading } = useLoans();
  const { data: banks, isLoading: banksLoading } = useBanks();

  if (loansLoading || banksLoading) {
    return <Loading text="در حال بارگذاری داده‌ها..." />;
  }

  // Parse interest rates
  const loansWithRates = loans
    ?.map((loan) => ({
      ...loan,
      rateNumeric: parseInterestRate(loan.interestRate || ''),
    }))
    .filter((loan) => loan.rateNumeric > 0) || [];

  // Rate distribution (histogram buckets)
  const rateBuckets = [
    { range: '۰-۱۰٪', min: 0, max: 10, count: 0 },
    { range: '۱۰-۱۵٪', min: 10, max: 15, count: 0 },
    { range: '۱۵-۲۰٪', min: 15, max: 20, count: 0 },
    { range: '۲۰-۲۵٪', min: 20, max: 25, count: 0 },
    { range: '۲۵+٪', min: 25, max: 100, count: 0 },
  ];

  loansWithRates.forEach((loan) => {
    const bucket = rateBuckets.find(
      (b) => loan.rateNumeric >= b.min && loan.rateNumeric < b.max
    );
    if (bucket) bucket.count++;
  });

  const rateDistributionData = rateBuckets.map((b) => ({
    name: b.range,
    تعداد: b.count,
  }));

  // Average rate statistics
  const avgRate =
    loansWithRates.reduce((sum, l) => sum + l.rateNumeric, 0) / loansWithRates.length || 0;
  const minRate = Math.min(...loansWithRates.map((l) => l.rateNumeric));
  const maxRate = Math.max(...loansWithRates.map((l) => l.rateNumeric));

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="text-sm text-gray-400 mb-2">میانگین نرخ سود</div>
          <div className="text-3xl font-bold text-primary-400">
            {avgRate.toFixed(2)}٪
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-gray-400 mb-2">کمترین نرخ</div>
          <div className="text-3xl font-bold text-teal-400">
            {minRate.toFixed(2)}٪
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-gray-400 mb-2">بیشترین نرخ</div>
          <div className="text-3xl font-bold text-pink-400">
            {maxRate.toFixed(2)}٪
          </div>
        </Card>
      </div>

      {/* Rate Distribution Chart */}
      <BarChartCard
        title="توزیع نرخ سود"
        data={rateDistributionData}
        dataKey="تعداد"
        height={350}
        color="#3b82f6"
      />

      {/* Interest Rates Table */}
      <InterestRatesTable loans={loans || []} banks={banks || []} />
    </div>
  );
}

export default InterestRatesTab;
