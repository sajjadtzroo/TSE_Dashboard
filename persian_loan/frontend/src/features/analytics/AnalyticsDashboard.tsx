/**
 * Analytics Dashboard - Main Container
 * Comprehensive analytics with 5 specialized tabs
 */

import { useState } from 'react';
import { BarChart3, TrendingUp, DollarSign, CheckSquare, GitCompare } from 'lucide-react';
import { Card } from '@/components/ui';
import { DashboardSummary } from './DashboardSummary';
import { OverviewTab } from './tabs/OverviewTab';
import { InterestRatesTab } from './tabs/InterestRatesTab';
import { LoanAmountsTab } from './tabs/LoanAmountsTab';
import { RequirementsTab } from './tabs/RequirementsTab';
import { ComparisonTab } from './tabs/ComparisonTab';

type TabType = 'overview' | 'rates' | 'amounts' | 'requirements' | 'comparison';

const TABS = [
  { id: 'overview' as TabType, label: 'نمای کلی', icon: BarChart3 },
  { id: 'rates' as TabType, label: 'نرخ سود', icon: TrendingUp },
  { id: 'amounts' as TabType, label: 'مبالغ وام', icon: DollarSign },
  { id: 'requirements' as TabType, label: 'الزامات', icon: CheckSquare },
  { id: 'comparison' as TabType, label: 'مقایسه بانک‌ها', icon: GitCompare },
];

export function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-50 mb-2">تحلیل وام‌ها</h1>
        <p className="text-gray-300">
          تحلیل جامع داده‌های وام بانک‌های ایران
        </p>
      </div>

      {/* Summary Stats */}
      <DashboardSummary />

      {/* Tabs Navigation */}
      <Card className="p-2">
        <div className="flex gap-2 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-primary-500 text-white font-semibold'
                    : 'text-gray-300 hover:bg-bg-dark hover:text-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Tab Content */}
      <div className="animate-fade-in">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'rates' && <InterestRatesTab />}
        {activeTab === 'amounts' && <LoanAmountsTab />}
        {activeTab === 'requirements' && <RequirementsTab />}
        {activeTab === 'comparison' && <ComparisonTab />}
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
