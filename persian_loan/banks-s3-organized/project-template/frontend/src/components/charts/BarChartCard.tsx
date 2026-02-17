/**
 * Bar Chart Card Component - Dark Theme
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardHeader } from '../ui';

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
}

export function BarChartCard({
  title,
  subtitle,
  data,
  dataKey,
  height = 300,
  layout = 'vertical',
  color = '#BB86FC', // Primary color
  showLegend = false,
  showGrid = true,
}: BarChartCardProps) {
  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} />
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout={layout}>
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#2d2d2d"
              vertical={false}
            />
          )}
          {layout === 'vertical' ? (
            <>
              <XAxis
                type="number"
                tick={{ fill: '#9ca3af' }}
                axisLine={{ stroke: '#2d2d2d' }}
                tickLine={{ stroke: '#2d2d2d' }}
              />
              <YAxis
                dataKey="name"
                type="category"
                width={100}
                tick={{ fill: '#9ca3af' }}
                axisLine={{ stroke: '#2d2d2d' }}
                tickLine={{ stroke: '#2d2d2d' }}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey="name"
                tick={{ fill: '#9ca3af' }}
                axisLine={{ stroke: '#2d2d2d' }}
                tickLine={{ stroke: '#2d2d2d' }}
              />
              <YAxis
                tick={{ fill: '#9ca3af' }}
                axisLine={{ stroke: '#2d2d2d' }}
                tickLine={{ stroke: '#2d2d2d' }}
              />
            </>
          )}
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e1e1e',
              border: '1px solid #2d2d2d',
              borderRadius: '8px',
              color: '#e0e0e0',
            }}
            itemStyle={{ color: '#e0e0e0' }}
            cursor={{ fill: 'rgba(187, 134, 252, 0.1)' }}
          />
          {showLegend && (
            <Legend
              wrapperStyle={{ color: '#9ca3af' }}
              formatter={(value) => <span style={{ color: '#9ca3af' }}>{value}</span>}
            />
          )}
          <Bar dataKey={dataKey} fill={color} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

export default BarChartCard;
