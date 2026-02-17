/**
 * Optimizer Charts Component - Enhanced
 * Visual comparison of top loans using improved chart components
 */

import React, { useMemo, useCallback } from 'react';
import { BarChartCard, RadarChartCard } from '@/components/charts';
import type { LoanAnalysisResult } from '../types';

interface OptimizerChartsProps {
  data: LoanAnalysisResult[];
  isLoading?: boolean;
}

const OptimizerCharts: React.FC<OptimizerChartsProps> = ({ data, isLoading = false }) => {
  // Memoize all chart data computations to prevent recalculation on every render
  const topByNPV = useMemo(() =>
    [...data]
      .sort((a, b) => b.npv - a.npv)
      .slice(0, 10)
      .map((loan) => ({
        name: loan.bankNameFA,
        value: loan.npv / 1_000_000, // Convert to millions
      })),
    [data]
  );

  const topByIRR = useMemo(() =>
    [...data]
      .sort((a, b) => b.irr - a.irr)
      .slice(0, 10)
      .map((loan) => ({
        name: loan.bankNameFA,
        value: loan.irr * 100, // Convert to percentage
      })),
    [data]
  );

  const topLoans = useMemo(() =>
    [...data]
      .sort((a, b) => b.npv - a.npv)
      .slice(0, 5),
    [data]
  );

  const { radarData, radarDataKeys } = useMemo(() => {
    const rd = [
      { metric: 'NPV', ...Object.fromEntries(topLoans.map((l, i) => [`loan${i}`, (l.npv / Math.max(...topLoans.map(x => x.npv))) * 100])) },
      { metric: 'IRR', ...Object.fromEntries(topLoans.map((l, i) => [`loan${i}`, (l.irr / Math.max(...topLoans.map(x => x.irr))) * 100])) },
      { metric: 'Cost', ...Object.fromEntries(topLoans.map((l, i) => [`loan${i}`, ((1 - l.totalCost / Math.max(...topLoans.map(x => x.totalCost))) * 100)])) },
      { metric: 'Risk', ...Object.fromEntries(topLoans.map((_, i) => [`loan${i}`, ((topLoans.length - i) / topLoans.length) * 100])) },
    ];

    const rdk = topLoans.map((loan, i) => ({
      key: `loan${i}`,
      name: loan.bankNameFA,
      color: ['#BB86FC', '#03DAC5', '#f59e0b', '#CF6679', '#8b5cf6'][i],
      fillOpacity: 0.2,
    }));

    return { radarData: rd, radarDataKeys: rdk };
  }, [topLoans]);

  const handleDownloadNPV = useCallback(() => {
    const csv = topByNPV.map(item => `${item.name},${item.value}`).join('\n');
    const blob = new Blob([`Bank,NPV (Millions)\n${csv}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'top-loans-by-npv.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [topByNPV]);

  const handleDownloadIRR = useCallback(() => {
    const csv = topByIRR.map(item => `${item.name},${item.value}`).join('\n');
    const blob = new Blob([`Bank,IRR (%)\n${csv}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'top-loans-by-irr.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [topByIRR]);

  if (data.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BarChartCard
          title="برترین وام‌ها بر اساس NPV"
          subtitle="خالص ارزش فعلی (میلیون تومان)"
          data={topByNPV}
          dataKey="value"
          height={350}
          layout="vertical"
          color="#BB86FC"
          multiColor={true}
          isLoading={isLoading}
          onDownload={handleDownloadNPV}
        />

        <BarChartCard
          title="برترین وام‌ها بر اساس IRR"
          subtitle="نرخ بازده داخلی (%)"
          data={topByIRR}
          dataKey="value"
          height={350}
          layout="vertical"
          color="#03DAC5"
          multiColor={true}
          isLoading={isLoading}
          onDownload={handleDownloadIRR}
        />
      </div>

      {topLoans.length >= 3 && (
        <RadarChartCard
          title="مقایسه جامع 5 وام برتر"
          subtitle="نمودار راداری شاخص‌های کلیدی"
          data={radarData}
          dataKeys={radarDataKeys}
          angleKey="metric"
          height={400}
          showLegend={true}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

export default React.memo(OptimizerCharts);
