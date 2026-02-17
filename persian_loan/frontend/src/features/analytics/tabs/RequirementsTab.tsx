/**
 * Requirements Tab - Loan requirements analysis
 */

import { PieChartCard, BarChartCard } from '@/components/charts';
import { useLoans } from '@/hooks';
import { Loading } from '@/components/ui';

export function RequirementsTab() {
  const { data: loans, isLoading } = useLoans();

  if (isLoading) {
    return <Loading text="در حال بارگذاری داده‌ها..." />;
  }

  // Guarantor analysis
  const withGuarantor = loans?.filter((l) => l.guarantor !== false).length || 0;
  const withoutGuarantor = loans?.filter((l) => l.guarantor === false).length || 0;

  const guarantorData = [
    { name: 'با ضامن', value: withGuarantor, fill: '#f59e0b' },
    { name: 'بدون ضامن', value: withoutGuarantor, fill: '#10b981' },
  ];

  // Collateral analysis
  const withCollateral = loans?.filter((l) => l.collateral).length || 0;
  const withoutCollateral = (loans?.length || 0) - withCollateral;

  const collateralData = [
    { name: 'با وثیقه', value: withCollateral, fill: '#ef4444' },
    { name: 'بدون وثیقه', value: withoutCollateral, fill: '#3b82f6' },
  ];

  // Credit rating requirements
  const withCreditRating = loans?.filter((l) => l.creditRatingRequired).length || 0;
  const withoutCreditRating = (loans?.length || 0) - withCreditRating;

  const creditRatingData = [
    { name: 'نیاز به رتبه', value: withCreditRating },
    { name: 'بدون نیاز', value: withoutCreditRating },
  ];

  const creditRatingChartData = creditRatingData.map((item) => ({
    name: item.name,
    تعداد: item.value,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PieChartCard
          title="تحلیل نیاز به ضامن"
          data={guarantorData}
          height={300}
        />

        <PieChartCard
          title="تحلیل نیاز به وثیقه"
          data={collateralData}
          height={300}
        />
      </div>

      <BarChartCard
        title="نیاز به رتبه اعتباری"
        data={creditRatingChartData}
        dataKey="تعداد"
        height={300}
        color="#06b6d4"
      />
    </div>
  );
}

export default RequirementsTab;
