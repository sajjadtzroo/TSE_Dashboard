/**
 * Radar Chart Card Component - Dark Theme
 */

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

// Dark theme colors
const COLORS = ['#BB86FC', '#03DAC5', '#f59e0b', '#CF6679', '#8b5cf6', '#ec4899'];

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
}

export function RadarChartCard({
  title,
  subtitle,
  data,
  dataKeys,
  angleKey,
  height = 400,
  showLegend = true,
}: RadarChartCardProps) {
  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} />
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={data}>
          <PolarGrid stroke="#2d2d2d" />
          <PolarAngleAxis
            dataKey={angleKey}
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
          />
          <PolarRadiusAxis stroke="#9ca3af" style={{ fontSize: '10px' }} />
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
            const key = isObject ? (item as RadarDataKey).key : item;
            const name = isObject ? (item as RadarDataKey).name : item;
            const color = isObject ? (item as RadarDataKey).color : COLORS[index % COLORS.length];
            const fillOpacity = isObject ? (item as RadarDataKey).fillOpacity || 0.3 : 0.3;

            return (
              <Radar
                key={key}
                name={name}
                dataKey={key}
                stroke={color}
                fill={color}
                fillOpacity={fillOpacity}
                strokeWidth={2}
              />
            );
          })}
        </RadarChart>
      </ResponsiveContainer>
    </Card>
  );
}

export default RadarChartCard;
