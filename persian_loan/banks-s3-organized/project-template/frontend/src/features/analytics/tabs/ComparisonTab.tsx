/**
 * Comparison Tab - Bank-to-bank comparison
 */

import { useState } from 'react';
import { RadarChartCard } from '../../../components/charts';
import { useBanks, useLoans } from '../../../hooks';
import { Loading, Card, Button } from '../../../components/ui';
import { parsePersianAmount, parseInterestRate } from '../../../utils/persianNumber';

export function ComparisonTab() {
  const { data: banks, isLoading: banksLoading } = useBanks();
  const { data: loans, isLoading: loansLoading } = useLoans();
  const [selectedBanks, setSelectedBanks] = useState<string[]>([]);

  if (banksLoading || loansLoading) {
    return <Loading text="در حال بارگذاری داده‌ها..." />;
  }

  const toggleBank = (bankId: string) => {
    setSelectedBanks((prev) => {
      if (prev.includes(bankId)) {
        return prev.filter((id) => id !== bankId);
      } else if (prev.length < 5) {
        return [...prev, bankId];
      }
      return prev;
    });
  };

  // Calculate metrics for each selected bank
  const comparisonData =
    selectedBanks.length > 0
      ? calculateBankMetrics(selectedBanks, banks || [], loans || [])
      : [];

  return (
    <div className="space-y-6">
      {/* Bank Selection */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-50 mb-4">
          انتخاب بانک‌ها (حداکثر ۵ بانک)
        </h3>
        <div className="flex flex-wrap gap-2">
          {banks?.slice(0, 15).map((bank) => (
            <Button
              key={bank.id}
              onClick={() => toggleBank(bank.id)}
              variant={selectedBanks.includes(bank.id) ? 'primary' : 'outline'}
              size="sm"
            >
              {bank.nameFA}
            </Button>
          ))}
        </div>
      </Card>

      {/* Radar Chart */}
      {selectedBanks.length >= 2 ? (
        <RadarChartCard
          title="مقایسه چند بُعدی بانک‌ها"
          data={comparisonData}
          dataKeys={selectedBanks.map((bankId, index) => {
            const bank = banks?.find((b) => b.id === bankId);
            const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
            return {
              key: bankId,
              name: bank?.nameFA || bankId,
              color: colors[index % colors.length],
              fillOpacity: 0.2,
            };
          })}
          angleKey="metric"
          height={450}
        />
      ) : (
        <Card className="p-12 text-center">
          <p className="text-gray-300">
            لطفاً حداقل ۲ بانک برای مقایسه انتخاب کنید
          </p>
        </Card>
      )}
    </div>
  );
}

function calculateBankMetrics(
  selectedBankIds: string[],
  _banks: any[],
  loans: any[]
): any[] {
  const metrics = [
    'تعداد وام‌ها',
    'وام‌های بدون ضامن',
    'میانگین نرخ سود',
    'حداکثر مبلغ وام',
    'تنوع محصولات',
  ];

  return metrics.map((metric) => {
    const dataPoint: any = { metric };

    selectedBankIds.forEach((bankId) => {
      const bankLoans = loans.filter((l: any) => l.bankId === bankId);

      let value = 0;

      switch (metric) {
        case 'تعداد وام‌ها':
          value = normalizeValue(bankLoans.length, 0, 20);
          break;
        case 'وام‌های بدون ضامن':
          const noGuarantor = bankLoans.filter((l: any) => l.guarantor === false).length;
          value = normalizeValue(noGuarantor, 0, 10);
          break;
        case 'میانگین نرخ سود':
          const rates = bankLoans
            .map((l: any) => parseInterestRate(l.interestRate || ''))
            .filter((r: number) => r > 0);
          const avgRate = rates.length > 0 ? rates.reduce((s: number, r: number) => s + r, 0) / rates.length : 0;
          // Invert: lower rate = higher score
          value = normalizeValue(30 - avgRate, 0, 30);
          break;
        case 'حداکثر مبلغ وام':
          const maxAmounts = bankLoans
            .map((l: any) => parsePersianAmount(l.maxAmount))
            .filter((a: number | null) => a !== null && a > 0);
          const maxAmount = maxAmounts.length > 0 ? Math.max(...(maxAmounts as number[])) : 0;
          value = normalizeValue(maxAmount, 0, 10_000_000_000);
          break;
        case 'تنوع محصولات':
          const categories = new Set(bankLoans.map((l: any) => l.category)).size;
          value = normalizeValue(categories, 0, 5);
          break;
      }

      dataPoint[bankId] = Math.round(value);
    });

    return dataPoint;
  });
}

// Normalize value to 0-100 scale
function normalizeValue(value: number, min: number, max: number): number {
  if (max === min) return 50;
  const normalized = ((value - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, normalized));
}

export default ComparisonTab;
