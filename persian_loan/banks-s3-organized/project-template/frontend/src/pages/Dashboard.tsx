/**
 * Dashboard Page
 */

import { DashboardSummary, DashboardCharts } from '../features/analytics';

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">داشبورد</h2>
      <DashboardSummary />
      <DashboardCharts />
    </div>
  );
}
