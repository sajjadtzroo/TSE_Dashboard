/**
 * Line Chart Card Component - Enhanced with Loading States and Actions
 */

import { ReactNode } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardHeader } from '../ui';
import { Skeleton } from '../ui/Skeleton';
import { Download, Maximize2, RefreshCw } from 'lucide-react';

// Enhanced theme colors from Tailwind palette
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

interface LineDataKey {
  key: string;
  name: string;
  color: string;
}

interface LineChartCardProps {
  title: string;
  subtitle?: string;
  data: any[];
  dataKeys: string[] | LineDataKey[];
  xAxisKey: string;
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
  isLoading?: boolean;
  actions?: ReactNode;
  onRefresh?: () => void;
  onDownload?: () => void;
  onExpand?: () => void;
}

export function LineChartCard({
  title,
  subtitle,
  data,
  dataKeys,
  xAxisKey,
  height = 300,
  showLegend = true,
  showGrid = true,
  isLoading = false,
  actions,
  onRefresh,
  onDownload,
  onExpand,
}: LineChartCardProps) {
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
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} width={100} height={20} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={height}>
              <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                {showGrid && (
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(45, 45, 45, 0.5)"
                    className="opacity-50"
                  />
                )}
                <XAxis
                  dataKey={xAxisKey}
                  stroke="#9ca3af"
                  style={{ fontSize: '12px', fontFamily: 'inherit' }}
                  tick={{ fill: '#9ca3af' }}
                />
                <YAxis
                  stroke="#9ca3af"
                  style={{ fontSize: '12px', fontFamily: 'inherit' }}
                  tick={{ fill: '#9ca3af' }}
                />
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
                  cursor={{ stroke: '#BB86FC', strokeWidth: 1, strokeDasharray: '5 5' }}
                />
                {showLegend && (
                  <Legend
                    wrapperStyle={{
                      paddingTop: '20px',
                      fontSize: '13px',
                    }}
                    iconType="line"
                    formatter={(value) => (
                      <span style={{ color: '#9ca3af', marginLeft: '8px' }}>{value}</span>
                    )}
                  />
                )}
                {dataKeys.map((item, index) => {
                  // Handle both string and object formats
                  const isObject = typeof item === 'object';
                  const key = isObject ? (item as LineDataKey).key : item;
                  const name = isObject ? (item as LineDataKey).name : item;
                  const color = isObject ? (item as LineDataKey).color : COLORS[index % COLORS.length];

                  return (
                    <Line
                      key={key}
                      name={name}
                      type="monotone"
                      dataKey={key}
                      stroke={color}
                      strokeWidth={2}
                      dot={{ fill: color, r: 4, strokeWidth: 0 }}
                      activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                      animationDuration={500}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
            {/* Custom Legend with Typography */}
            {showLegend && dataKeys.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm">
                {dataKeys.map((item, index) => {
                  const isObject = typeof item === 'object';
                  const name = isObject ? (item as LineDataKey).name : item;
                  const color = isObject ? (item as LineDataKey).color : COLORS[index % COLORS.length];

                  return (
                    <div key={`legend-${index}`} className="flex items-center gap-2">
                      <div
                        className="w-4 h-0.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-gray-400">{name}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

export default LineChartCard;
