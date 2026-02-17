/**
 * Line Chart Card Component - Dark Theme
 */

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

// Dark theme colors
const COLORS = ['#BB86FC', '#03DAC5', '#f59e0b', '#CF6679', '#8b5cf6', '#ec4899'];

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
}: LineChartCardProps) {
  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} />
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" />}
          <XAxis
            dataKey={xAxisKey}
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
          />
          <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e1e1e',
              border: '1px solid #2d2d2d',
              borderRadius: '8px',
              color: '#e0e0e0',
            }}
            itemStyle={{ color: '#e0e0e0' }}
          />
          {showLegend && (
            <Legend
              wrapperStyle={{ color: '#9ca3af' }}
              formatter={(value) => <span style={{ color: '#9ca3af' }}>{value}</span>}
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
                dot={{ fill: color, r: 4 }}
                activeDot={{ r: 6 }}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

export default LineChartCard;
