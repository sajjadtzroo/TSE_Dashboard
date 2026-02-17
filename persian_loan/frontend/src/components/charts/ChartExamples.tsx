/**
 * Chart Components Examples
 * Demonstrates usage of all improved chart components with MUI-style integration
 */

import { useState } from 'react';
import { LineChartCard, BarChartCard, PieChartCard, RadarChartCard } from './index';

// Sample data
const lineData = [
  { month: 'Jan', revenue: 4000, profit: 2400, expenses: 1600 },
  { month: 'Feb', revenue: 3000, profit: 1398, expenses: 1602 },
  { month: 'Mar', revenue: 2000, profit: 9800, expenses: 800 },
  { month: 'Apr', revenue: 2780, profit: 3908, expenses: 1872 },
  { month: 'May', revenue: 1890, profit: 4800, expenses: 690 },
  { month: 'Jun', revenue: 2390, profit: 3800, expenses: 590 },
];

const barData = [
  { name: 'Bank A', value: 4000 },
  { name: 'Bank B', value: 3000 },
  { name: 'Bank C', value: 2000 },
  { name: 'Bank D', value: 2780 },
  { name: 'Bank E', value: 1890 },
];

const pieData = [
  { name: 'Traditional Banks', value: 400 },
  { name: 'Digital Banks', value: 300 },
  { name: 'Credit Unions', value: 200 },
  { name: 'Other', value: 100 },
];

const radarData = [
  { metric: 'Performance', loanA: 120, loanB: 110, loanC: 150 },
  { metric: 'Risk', loanA: 90, loanB: 130, loanC: 100 },
  { metric: 'Cost', loanA: 86, loanB: 130, loanC: 120 },
  { metric: 'Flexibility', loanA: 99, loanB: 100, loanC: 85 },
  { metric: 'Support', loanA: 85, loanB: 90, loanC: 115 },
];

export function ChartExamples() {
  const [isLoading, setIsLoading] = useState(false);

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1500);
  };

  const handleDownload = () => {
    console.log('Download triggered');
  };

  const handleExpand = () => {
    console.log('Expand triggered');
  };

  return (
    <div className="p-8 space-y-8 bg-background min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-50 mb-2">Chart Components Examples</h1>
        <p className="text-gray-400">
          Enhanced chart components with loading states, actions, and improved styling
        </p>
      </div>

      {/* Line Chart Examples */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-100">Line Charts</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LineChartCard
            title="Revenue Trends"
            subtitle="Monthly revenue, profit, and expenses"
            data={lineData}
            dataKeys={['revenue', 'profit', 'expenses']}
            xAxisKey="month"
            height={300}
            showLegend={true}
            showGrid={true}
            isLoading={isLoading}
            onRefresh={handleRefresh}
            onDownload={handleDownload}
            onExpand={handleExpand}
          />

          <LineChartCard
            title="Simple Line Chart"
            subtitle="Single metric tracking"
            data={lineData}
            dataKeys={[{ key: 'revenue', name: 'Revenue', color: '#BB86FC' }]}
            xAxisKey="month"
            height={300}
            showLegend={false}
            isLoading={isLoading}
            onRefresh={handleRefresh}
          />
        </div>
      </section>

      {/* Bar Chart Examples */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-100">Bar Charts</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BarChartCard
            title="Top Banks by Loans"
            subtitle="Loan distribution across banks"
            data={barData}
            dataKey="value"
            height={300}
            layout="vertical"
            multiColor={true}
            isLoading={isLoading}
            onRefresh={handleRefresh}
            onDownload={handleDownload}
          />

          <BarChartCard
            title="Horizontal Bar Chart"
            subtitle="Same data, different layout"
            data={barData}
            dataKey="value"
            height={300}
            layout="horizontal"
            color="#03DAC5"
            isLoading={isLoading}
            onRefresh={handleRefresh}
          />
        </div>
      </section>

      {/* Pie Chart Examples */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-100">Pie Charts</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PieChartCard
            title="Bank Distribution"
            subtitle="Distribution by bank type"
            data={pieData}
            height={350}
            showLegend={true}
            isLoading={isLoading}
            onRefresh={handleRefresh}
            onDownload={handleDownload}
          />

          <PieChartCard
            title="Donut Chart"
            subtitle="With larger inner radius"
            data={pieData}
            height={350}
            innerRadius={80}
            outerRadius={120}
            showLegend={true}
            isLoading={isLoading}
          />
        </div>
      </section>

      {/* Radar Chart Examples */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-100">Radar Charts</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RadarChartCard
            title="Loan Comparison"
            subtitle="Multi-dimensional analysis"
            data={radarData}
            dataKeys={[
              { key: 'loanA', name: 'Loan A', color: '#BB86FC', fillOpacity: 0.3 },
              { key: 'loanB', name: 'Loan B', color: '#03DAC5', fillOpacity: 0.3 },
              { key: 'loanC', name: 'Loan C', color: '#f59e0b', fillOpacity: 0.3 },
            ]}
            angleKey="metric"
            height={400}
            showLegend={true}
            isLoading={isLoading}
            onRefresh={handleRefresh}
            onDownload={handleDownload}
          />

          <RadarChartCard
            title="Performance Metrics"
            subtitle="Single loan analysis"
            data={radarData}
            dataKeys={['loanA']}
            angleKey="metric"
            height={400}
            showLegend={false}
            isLoading={isLoading}
          />
        </div>
      </section>

      {/* Loading State Demo */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-100">Loading States</h2>
        <p className="text-gray-400 mb-4">
          Click the refresh button on any chart to see the loading state
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <LineChartCard
            title="Loading Line Chart"
            data={lineData}
            dataKeys={['revenue']}
            xAxisKey="month"
            height={250}
            isLoading={true}
          />

          <BarChartCard
            title="Loading Bar Chart"
            data={barData}
            dataKey="value"
            height={250}
            isLoading={true}
          />

          <PieChartCard
            title="Loading Pie Chart"
            data={pieData}
            height={250}
            isLoading={true}
          />
        </div>
      </section>
    </div>
  );
}

export default ChartExamples;
