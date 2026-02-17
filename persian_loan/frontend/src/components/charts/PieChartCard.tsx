/**
 * Pie Chart Card Component - Enhanced with Loading States and Actions
 */

import { ReactNode } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardHeader } from '../ui';
import { Skeleton } from '../ui/Skeleton';
import { Download, Maximize2, RefreshCw, PieChartIcon } from 'lucide-react';

// Enhanced theme colors
const COLORS = [
  '#BB86FC', // Primary purple
  '#03DAC5', // Teal
  '#f59e0b', // Amber
  '#CF6679', // Pink
  '#8b5cf6', // Violet
  '#ec4899', // Fuchsia
  '#06b6d4', // Cyan
  '#10b981', // Emerald
];

interface PieChartDataItem {
  name: string;
  value: number;
}

interface PieChartCardProps {
  title: string;
  subtitle?: string;
  data: PieChartDataItem[];
  height?: number;
  showLegend?: boolean;
  innerRadius?: number;
  outerRadius?: number;
  isLoading?: boolean;
  actions?: ReactNode;
  onRefresh?: () => void;
  onDownload?: () => void;
  onExpand?: () => void;
}

export function PieChartCard({
  title,
  subtitle,
  data,
  height = 300,
  showLegend = true,
  innerRadius = 60,
  outerRadius = 100,
  isLoading = false,
  actions,
  onRefresh,
  onDownload,
  onExpand,
}: PieChartCardProps) {
  // Calculate total for percentage
  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Action buttons
  const chartActions = (
    <div className="flex items-center gap-2">
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="p-2 rounded-lg hover:bg-surface-50 transition-colors text-gray-400 hover:text-gray-200"
          title="Refresh"
          aria-label="Refresh chart"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      )}
      {onDownload && (
        <button
          onClick={onDownload}
          className="p-2 rounded-lg hover:bg-surface-50 transition-colors text-gray-400 hover:text-gray-200"
          title="Download"
          aria-label="Download chart data"
        >
          <Download className="w-4 h-4" />
        </button>
      )}
      {onExpand && (
        <button
          onClick={onExpand}
          className="p-2 rounded-lg hover:bg-surface-50 transition-colors text-gray-400 hover:text-gray-200"
          title="Expand"
          aria-label="Expand chart"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      )}
      {actions}
    </div>
  );

  // Custom label with percentage
  const renderLabel = ({ percent }: any) => {
    if (percent < 0.05) return ''; // Hide labels for small segments
    return `${(percent * 100).toFixed(0)}%`;
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader title={title} subtitle={subtitle} action={chartActions} />
      <div className="px-6 pb-6">
        {isLoading ? (
          <div className="space-y-4">
            <div className="flex justify-center">
              <Skeleton variant="circular" width={outerRadius * 2} height={outerRadius * 2} />
            </div>
            {showLegend && (
              <div className="flex flex-col gap-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} width="100%" height={20} />
                ))}
              </div>
            )}
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center" style={{ height }}>
            <PieChartIcon className="w-12 h-12 text-gray-600 mb-3" />
            <p className="text-gray-400 text-sm">No data available</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={height}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={innerRadius}
                  outerRadius={outerRadius}
                  paddingAngle={5}
                  dataKey="value"
                  label={renderLabel}
                  labelLine={{ stroke: '#9ca3af', strokeWidth: 1 }}
                  animationDuration={500}
                >
                  {data.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      stroke="#121212"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e1e1e',
                    border: '1px solid #2d2d2d',
                    borderRadius: '8px',
                    color: '#e0e0e0',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  }}
                  itemStyle={{ color: '#e0e0e0', fontSize: '13px' }}
                  labelStyle={{ color: '#BB86FC', fontWeight: '600', marginBottom: '4px' }}
                  formatter={(value: number) => {
                    const percent = ((value / total) * 100).toFixed(1);
                    return `${value} (${percent}%)`;
                  }}
                />
                {showLegend && (
                  <Legend
                    wrapperStyle={{
                      paddingTop: '20px',
                      fontSize: '13px',
                    }}
                    iconType="circle"
                    formatter={(value) => (
                      <span style={{ color: '#9ca3af', marginLeft: '8px' }}>{value}</span>
                    )}
                  />
                )}
              </PieChart>
            </ResponsiveContainer>

            {/* Custom Legend with values */}
            <div className="mt-6 space-y-3">
              {data.map((item, index) => {
                const percent = ((item.value / total) * 100).toFixed(1);
                return (
                  <div key={`legend-${index}`} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm text-gray-400">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-300 font-medium">{item.value}</span>
                      <span className="text-xs text-gray-500 w-12 text-right">{percent}%</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total */}
            <div className="mt-4 pt-4 border-t border-border-dark">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400 font-medium">Total</span>
                <span className="text-sm text-gray-200 font-semibold">{total}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

export default PieChartCard;
