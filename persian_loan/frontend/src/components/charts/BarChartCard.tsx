/**
 * Bar Chart Card Component - Enhanced with Loading States and Actions
 */

import { ReactNode } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import { Card, CardHeader } from '../ui';
import { Skeleton } from '../ui/Skeleton';
import { Download, Maximize2, RefreshCw, BarChart2 } from 'lucide-react';

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

interface BarChartDataItem {
  name: string;
  [key: string]: string | number;
}

interface BarChartCardProps {
  title: string;
  subtitle?: string;
  data: BarChartDataItem[];
  dataKey: string;
  height?: number;
  layout?: 'horizontal' | 'vertical';
  color?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  isLoading?: boolean;
  actions?: ReactNode;
  onRefresh?: () => void;
  onDownload?: () => void;
  onExpand?: () => void;
  multiColor?: boolean;
}

export function BarChartCard({
  title,
  subtitle,
  data,
  dataKey,
  height = 300,
  layout = 'vertical',
  color = '#BB86FC',
  showLegend = false,
  showGrid = true,
  isLoading = false,
  actions,
  onRefresh,
  onDownload,
  onExpand,
  multiColor = false,
}: BarChartCardProps) {
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

  return (
    <Card className="overflow-hidden">
      <CardHeader title={title} subtitle={subtitle} action={chartActions} />
      <div className="px-6 pb-6">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton height={height} className="rounded-lg" />
            {showLegend && (
              <div className="flex justify-center gap-4">
                <Skeleton width={120} height={20} />
              </div>
            )}
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center" style={{ height }}>
            <BarChart2 className="w-12 h-12 text-gray-600 mb-3" />
            <p className="text-gray-400 text-sm">No data available</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={height}>
              <BarChart data={data} layout={layout} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                {showGrid && (
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(45, 45, 45, 0.5)"
                    vertical={false}
                    className="opacity-50"
                  />
                )}
                {layout === 'vertical' ? (
                  <>
                    <XAxis
                      type="number"
                      tick={{ fill: '#9ca3af', fontSize: '12px' }}
                      axisLine={{ stroke: '#2d2d2d' }}
                      tickLine={{ stroke: '#2d2d2d' }}
                      style={{ fontFamily: 'inherit' }}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={100}
                      tick={{ fill: '#9ca3af', fontSize: '12px' }}
                      axisLine={{ stroke: '#2d2d2d' }}
                      tickLine={{ stroke: '#2d2d2d' }}
                      style={{ fontFamily: 'inherit' }}
                    />
                  </>
                ) : (
                  <>
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#9ca3af', fontSize: '12px' }}
                      axisLine={{ stroke: '#2d2d2d' }}
                      tickLine={{ stroke: '#2d2d2d' }}
                      style={{ fontFamily: 'inherit' }}
                    />
                    <YAxis
                      tick={{ fill: '#9ca3af', fontSize: '12px' }}
                      axisLine={{ stroke: '#2d2d2d' }}
                      tickLine={{ stroke: '#2d2d2d' }}
                      style={{ fontFamily: 'inherit' }}
                    />
                  </>
                )}
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
                  cursor={{ fill: 'rgba(187, 134, 252, 0.1)' }}
                />
                {showLegend && (
                  <Legend
                    wrapperStyle={{
                      paddingTop: '20px',
                      fontSize: '13px',
                    }}
                    formatter={(value) => (
                      <span style={{ color: '#9ca3af', marginLeft: '8px' }}>{value}</span>
                    )}
                  />
                )}
                <Bar
                  dataKey={dataKey}
                  fill={color}
                  radius={layout === 'vertical' ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                  animationDuration={500}
                >
                  {multiColor && data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {/* Data summary */}
            {data.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border-dark">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Total Items</span>
                  <span className="text-gray-200 font-medium">{data.length}</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

export default BarChartCard;
