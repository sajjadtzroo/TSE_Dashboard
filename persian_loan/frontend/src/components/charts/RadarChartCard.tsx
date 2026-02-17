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
import { Card, Text, Group, Skeleton, ActionIcon, Stack, Box } from '@mantine/core';
import { IconRefresh, IconDownload, IconArrowsMaximize, IconActivity } from '@tabler/icons-react';
import rallyColors from '../../theme/rallyColors';

// Enhanced theme colors
const COLORS = [
  '#BB86FC', '#03DAC5', '#f59e0b', '#CF6679',
  '#8b5cf6', '#ec4899', '#06b6d4', '#10b981',
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
          <Stack gap="md" align="center">
            <Skeleton height={250} width={250} circle />
            {showLegend && (
              <Group justify="center" gap="md">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} width={100} height={20} />
                ))}
              </Group>
            )}
          </Stack>
        ) : data.length === 0 ? (
          <Stack align="center" justify="center" style={{ height }} gap="sm">
            <IconActivity size={48} color={rallyColors.textDimmed} />
            <Text size="sm" c={rallyColors.textDimmed}>No data available</Text>
          </Stack>
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
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  itemStyle={{ color: '#e0e0e0', fontSize: '13px' }}
                  labelStyle={{ color: '#BB86FC', fontWeight: '600', marginBottom: '4px' }}
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
                {dataKeys.map((item, index) => {
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

            {showLegend && dataKeys.length > 0 && (
              <Group justify="center" gap="md" mt="lg" wrap="wrap">
                {dataKeys.map((item, index) => {
                  const isObject = typeof item === 'object';
                  const name = isObject ? (item as RadarDataKey).name : item;
                  const color = isObject ? (item as RadarDataKey).color : COLORS[index % COLORS.length];

                  return (
                    <Group key={`legend-${index}`} gap="xs">
                      <Group gap={4}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: color }} />
                        <div style={{ width: 32, height: 2, backgroundColor: color }} />
                      </Group>
                      <Text size="sm" c={rallyColors.textDimmed}>{name}</Text>
                    </Group>
                  );
                })}
              </Group>
            )}

            <Group justify="space-between" mt="md" pt="md" style={{ borderTop: `1px solid ${rallyColors.border}` }}>
              <Text size="sm" c={rallyColors.textDimmed}>Data Points</Text>
              <Text size="sm" fw={500} c={rallyColors.textPrimary}>{data.length}</Text>
            </Group>
          </>
        )}
      </Box>
    </Card>
  );
}

export default RadarChartCard;
