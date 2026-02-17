/**
 * Dashboard Summary Component - Dark Theme
 */

import { Building2, CreditCard, Users, TrendingUp } from 'lucide-react';
import { StatCard } from '../../components/cards';
import { useSummary } from '../../hooks';

export function DashboardSummary() {
  const { data: summary, isLoading } = useSummary();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-surface-100 p-6 rounded-lg shadow-dark border border-surface-50 animate-pulse"
          >
            <div className="h-16 bg-surface-50 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
      <StatCard
        title="کل بانک‌ها"
        value={summary?.totalBanks || 0}
        icon={Building2}
        color="blue"
      />
      <StatCard
        title="کل محصولات وام"
        value={summary?.totalLoans || 0}
        icon={CreditCard}
        color="green"
      />
      <StatCard
        title="وام‌های بدون ضامن"
        value={summary?.noGuarantorLoans || 0}
        icon={Users}
        color="yellow"
      />
      <StatCard
        title="بانک‌های دیجیتال"
        value={summary?.digitalBanks || 0}
        icon={TrendingUp}
        color="purple"
      />
    </div>
  );
}

export default DashboardSummary;
