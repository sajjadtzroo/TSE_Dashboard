/**
 * Pie Chart Card Component - Dark Theme
 */

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardHeader } from '../ui';

// Dark theme colors matching our palette
const COLORS = ['#BB86FC', '#03DAC5', '#f59e0b', '#CF6679', '#8b5cf6', '#ec4899'];

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
}

export function PieChartCard({
  title,
  subtitle,
  data,
  height = 300,
  showLegend = false,
  innerRadius = 60,
  outerRadius = 100,
}: PieChartCardProps) {
  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} />
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
            label={({ name, value }) => `${name}: ${value}`}
            labelLine={{ stroke: '#9ca3af' }}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
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
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}

export default PieChartCard;
