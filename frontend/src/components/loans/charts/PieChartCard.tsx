/**
 * Pie Chart Card Component - Enhanced with Loading States and Actions
 */

import { ReactNode } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, Text, Group, Skeleton, ActionIcon, Stack, Box } from '@mantine/core';
import { IconRefresh, IconDownload, IconArrowsMaximize, IconChartPie } from '@tabler/icons-react';
import rallyColors from '../../../theme/rallyColors';

// Enhanced theme colors
const COLORS = [
  '#BB86FC', '#03DAC5', '#f59e0b', '#CF6679',
  '#8b5cf6', '#ec4899', '#06b6d4', '#10b981',
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
  const total = data.reduce((sum, item) => sum + item.value, 0);

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

  const renderLabel = ({ percent }: { percent: number }) => {
    if (percent < 0.05) return '';
    return `${(percent * 100).toFixed(0)}%`;
  };

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
          <Stack gap="md" align="center">
            <Skeleton height={outerRadius * 2} width={outerRadius * 2} circle />
            {showLegend && (
              <Stack gap="xs" w="100%">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} width="100%" height={20} />
                ))}
              </Stack>
            )}
          </Stack>
        ) : data.length === 0 ? (
          <Stack align="center" justify="center" style={{ height }} gap="sm">
            <IconChartPie size={48} color={rallyColors.textDimmed} />
            <Text size="sm" c={rallyColors.textDimmed}>No data available</Text>
          </Stack>
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
                      stroke={rallyColors.bg}
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
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
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
                    wrapperStyle={{ paddingTop: '20px', fontSize: '13px' }}
                    iconType="circle"
                    formatter={(value) => (
                      <span style={{ color: '#9ca3af', marginLeft: '8px' }}>{value}</span>
                    )}
                  />
                )}
              </PieChart>
            </ResponsiveContainer>

            <Stack gap="sm" mt="lg">
              {data.map((item, index) => {
                const percent = ((item.value / total) * 100).toFixed(1);
                return (
                  <Group key={`legend-${index}`} justify="space-between">
                    <Group gap="sm">
                      <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: COLORS[index % COLORS.length] }} />
                      <Text size="sm" c={rallyColors.textDimmed}>{item.name}</Text>
                    </Group>
                    <Group gap="sm">
                      <Text size="sm" fw={500} c={rallyColors.textPrimary}>{item.value}</Text>
                      <Text size="xs" c={rallyColors.textDimmed} w={48} ta="right">{percent}%</Text>
                    </Group>
                  </Group>
                );
              })}
            </Stack>

            <Group justify="space-between" mt="md" pt="md" style={{ borderTop: `1px solid ${rallyColors.border}` }}>
              <Text size="sm" fw={500} c={rallyColors.textDimmed}>Total</Text>
              <Text size="sm" fw={600} c={rallyColors.textPrimary}>{total}</Text>
            </Group>
          </>
        )}
      </Box>
    </Card>
  );
}

export default PieChartCard;
