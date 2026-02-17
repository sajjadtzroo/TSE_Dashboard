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
import { Card, Text, Group, Skeleton, ActionIcon, Stack, Box } from '@mantine/core';
import { IconRefresh, IconDownload, IconArrowsMaximize } from '@tabler/icons-react';
import rallyColors from '../../../theme/rallyColors';

// Enhanced theme colors from Tailwind palette
const COLORS = [
  '#BB86FC', '#03DAC5', '#f59e0b', '#CF6679',
  '#8b5cf6', '#ec4899', '#06b6d4', '#10b981',
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
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} width={100} height={20} />
                ))}
              </Group>
            )}
          </Stack>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={height}>
              <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                {showGrid && (
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(45, 45, 45, 0.5)" />
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
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  itemStyle={{ color: '#e0e0e0', fontSize: '13px' }}
                  labelStyle={{ color: '#BB86FC', fontWeight: '600', marginBottom: '4px' }}
                  cursor={{ stroke: '#BB86FC', strokeWidth: 1, strokeDasharray: '5 5' }}
                />
                {showLegend && (
                  <Legend
                    wrapperStyle={{ paddingTop: '20px', fontSize: '13px' }}
                    iconType="line"
                    formatter={(value) => (
                      <span style={{ color: '#9ca3af', marginLeft: '8px' }}>{value}</span>
                    )}
                  />
                )}
                {dataKeys.map((item, index) => {
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
            {showLegend && dataKeys.length > 0 && (
              <Group justify="center" gap="md" mt="md" wrap="wrap">
                {dataKeys.map((item, index) => {
                  const isObject = typeof item === 'object';
                  const name = isObject ? (item as LineDataKey).name : item;
                  const color = isObject ? (item as LineDataKey).color : COLORS[index % COLORS.length];

                  return (
                    <Group key={`legend-${index}`} gap="xs">
                      <div style={{ width: 16, height: 2, borderRadius: 999, backgroundColor: color }} />
                      <Text size="sm" c={rallyColors.textDimmed}>{name}</Text>
                    </Group>
                  );
                })}
              </Group>
            )}
          </>
        )}
      </Box>
    </Card>
  );
}

export default LineChartCard;
