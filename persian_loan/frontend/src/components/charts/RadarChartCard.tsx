/**
 * Radar Chart Card Component - Enhanced with Loading States and Actions
 */

import { ReactNode } from 'react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { Card, CardHeader } from '../ui';
import { Skeleton } from '../ui/Skeleton';
import { Download, Maximize2, RefreshCw, Activity } from 'lucide-react';

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

interface RadarDataKey {
  key: string;
  name: string;
  color: string;
  fillOpacity?: number;
}

interface RadarChartCardProps {
  title: string;
  subtitle?: string;
  data: any[];
  dataKeys: string[] | RadarDataKey[];
  angleKey: string;
  height?: number;
  showLegend?: boolean;
  isLoading?: boolean;
  actions?: ReactNode;
  onRefresh?: () => void;
  onDownload?: () => void;
  onExpand?: () => void;
}

export function RadarChartCard({
  title,
  subtitle,
  data,
  dataKeys,
  angleKey,
  height = 400,
  showLegend = true,
  isLoading = false,
  actions,
  onRefresh,
  onDownload,
  onExpand,
}: RadarChartCardProps) {
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
            <div className="flex justify-center">
              <Skeleton variant="circular" width={250} height={250} />
            </div>
            {showLegend && (
              <div className="flex justify-center gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} width={100} height={20} />
                ))}
              </div>
            )}
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center" style={{ height }}>
            <Activity className="w-12 h-12 text-gray-600 mb-3" />
            <p className="text-gray-400 text-sm">No data available</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={height}>
              <RadarChart data={data}>
                <PolarGrid stroke="#2d2d2d" strokeWidth={1} />
                <PolarAngleAxis
                  dataKey={angleKey}
                  stroke="#9ca3af"
                  style={{ fontSize: '12px', fontFamily: 'inherit' }}
                  tick={{ fill: '#9ca3af' }}
                />
                <PolarRadiusAxis
                  stroke="#9ca3af"
                  style={{ fontSize: '10px', fontFamily: 'inherit' }}
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
                {dataKeys.map((item, index) => {
                  // Handle both string and object formats
                  const isObject = typeof item === 'object';
                  const key = isObject ? (item as RadarDataKey).key : item;
                  const name = isObject ? (item as RadarDataKey).name : item;
                  const color = isObject ? (item as RadarDataKey).color : COLORS[index % COLORS.length];
                  const fillOpacity = isObject ? (item as RadarDataKey).fillOpacity || 0.25 : 0.25;

                  return (
                    <Radar
                      key={key}
                      name={name}
                      dataKey={key}
                      stroke={color}
                      fill={color}
                      fillOpacity={fillOpacity}
                      strokeWidth={2}
                      animationDuration={500}
                      dot={{ fill: color, r: 4, strokeWidth: 0 }}
                      activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                    />
                  );
                })}
              </RadarChart>
            </ResponsiveContainer>

            {/* Custom Legend with color indicators */}
            {showLegend && dataKeys.length > 0 && (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
                {dataKeys.map((item, index) => {
                  const isObject = typeof item === 'object';
                  const name = isObject ? (item as RadarDataKey).name : item;
                  const color = isObject ? (item as RadarDataKey).color : COLORS[index % COLORS.length];

                  return (
                    <div key={`legend-${index}`} className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <div
                          className="w-8 h-0.5"
                          style={{ backgroundColor: color }}
                        />
                      </div>
                      <span className="text-sm text-gray-400">{name}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Metrics info */}
            <div className="mt-4 pt-4 border-t border-border-dark">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Data Points</span>
                <span className="text-gray-200 font-medium">{data.length}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

export default RadarChartCard;
