/**
 * Dashboard Page - Main Overview
 */

import { DashboardSummary } from '@/features/analytics/DashboardSummary';
import { DashboardCharts } from '@/features/analytics/DashboardCharts';

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <DashboardSummary />

      {/* Charts and Analytics */}
      <DashboardCharts />
    </div>
  );
}
