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
import { Card, Text, Group, Skeleton, ActionIcon, Stack, Box } from '@mantine/core';
import { IconRefresh, IconDownload, IconArrowsMaximize, IconChartBar } from '@tabler/icons-react';
import rallyColors from '../../theme/rallyColors';

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
  const chartActions = (
    <Group gap="xs">
      {onRefresh && (
        <ActionIcon variant="subtle" color="gray" onClick={onRefresh} title="Refresh" aria-label="Refresh chart">
          <IconRefresh size={16} />
        </ActionIcon>
      )}
      {onDownload && (
        <ActionIcon variant="subtle" color="gray" onClick={onDownload} title="Download" aria-label="Download chart data">
          <IconDownload size={16} />
        </ActionIcon>
      )}
      {onExpand && (
        <ActionIcon variant="subtle" color="gray" onClick={onExpand} title="Expand" aria-label="Expand chart">
          <IconArrowsMaximize size={16} />
        </ActionIcon>
      )}
      {actions}
    </Group>
  );

  return (
    <Card padding="lg" radius="md" style={{ backgroundColor: rallyColors.card, border: `1px solid ${rallyColors.border}`, overflow: 'hidden' }}>
      <Group justify="space-between" mb="md">
        <div>
          <Text fw={600} c={rallyColors.textPrimary}>{title}</Text>
          {subtitle && <Text size="sm" c={rallyColors.textDimmed}>{subtitle}</Text>}
        </div>
        {chartActions}
      </Group>

      <Box>
        {isLoading ? (
          <Stack gap="md">
            <Skeleton height={height} radius="md" />
            {showLegend && (
              <Group justify="center" gap="md">
                <Skeleton width={120} height={20} />
              </Group>
            )}
          </Stack>
        ) : data.length === 0 ? (
          <Stack align="center" justify="center" style={{ height }} gap="sm">
            <IconChartBar size={48} color={rallyColors.textDimmed} />
            <Text size="sm" c={rallyColors.textDimmed}>No data available</Text>
          </Stack>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={height}>
              <BarChart data={data} layout={layout} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                {showGrid && (
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(45, 45, 45, 0.5)"
                    vertical={false}
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
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  itemStyle={{ color: '#e0e0e0', fontSize: '13px' }}
                  labelStyle={{ color: '#BB86FC', fontWeight: '600', marginBottom: '4px' }}
                  cursor={{ fill: 'rgba(187, 134, 252, 0.1)' }}
                />
                {showLegend && (
                  <Legend
                    wrapperStyle={{ paddingTop: '20px', fontSize: '13px' }}
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
            {data.length > 0 && (
              <Group justify="space-between" mt="md" pt="md" style={{ borderTop: `1px solid ${rallyColors.border}` }}>
                <Text size="sm" c={rallyColors.textDimmed}>Total Items</Text>
                <Text size="sm" fw={500} c={rallyColors.textPrimary}>{data.length}</Text>
              </Group>
            )}
          </>
        )}
      </Box>
    </Card>
  );
}

export default BarChartCard;
