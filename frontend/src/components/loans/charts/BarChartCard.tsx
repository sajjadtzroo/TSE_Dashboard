/**
 * Bar Chart Card Component - Aligned with Rally theme
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
import { Text, Group, Skeleton, ActionIcon, Stack, Box } from '@mantine/core';
import { IconRefresh, IconDownload, IconArrowsMaximize, IconChartBar } from '@tabler/icons-react';
import RallyMainCard from '../../RallyMainCard';
import ChartTooltipV2 from '../../charts/shared/ChartTooltipV2';
import ChartEmptyState from '../../charts/shared/ChartEmptyState';
import rallyColors from '../../../theme/rallyColors';
import { GRID_STROKE, axisTick, barGradientDef } from '../../charts/shared/chartStyles';
import { RALLY_COLOR_SCALE } from '../../charts/RallyPieChart';

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
  color = rallyColors.purple,
  showLegend = false,
  showGrid = true,
  isLoading = false,
  actions,
  onRefresh,
  onDownload,
  onExpand,
  multiColor = false,
}: BarChartCardProps) {
  const gradId = `loan-bar-grad-${color.replace('#', '')}`;

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
    <RallyMainCard
      title={
        <div>
          <Text fw={600} c={rallyColors.textPrimary}>{title}</Text>
          {subtitle && <Text size="sm" c={rallyColors.textDimmed}>{subtitle}</Text>}
        </div>
      }
      secondary={chartActions}
    >
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
          <ChartEmptyState height={height} message="No data available" />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={height}>
              <BarChart data={data} layout={layout} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  {barGradientDef(gradId, color)}
                </defs>
                {showGrid && (
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={GRID_STROKE}
                    vertical={false}
                  />
                )}
                {layout === 'vertical' ? (
                  <>
                    <XAxis
                      type="number"
                      tick={axisTick(12)}
                      axisLine={{ stroke: rallyColors.border }}
                      tickLine={{ stroke: rallyColors.border }}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={100}
                      tick={axisTick(12)}
                      axisLine={{ stroke: rallyColors.border }}
                      tickLine={{ stroke: rallyColors.border }}
                    />
                  </>
                ) : (
                  <>
                    <XAxis
                      dataKey="name"
                      tick={axisTick(12)}
                      axisLine={{ stroke: rallyColors.border }}
                      tickLine={{ stroke: rallyColors.border }}
                    />
                    <YAxis
                      tick={axisTick(12)}
                      axisLine={{ stroke: rallyColors.border }}
                      tickLine={{ stroke: rallyColors.border }}
                    />
                  </>
                )}
                <Tooltip
                  content={<ChartTooltipV2 />}
                  cursor={{ fill: 'rgba(156, 163, 175, 0.06)' }}
                />
                {showLegend && (
                  <Legend
                    wrapperStyle={{ paddingTop: '20px', fontSize: '13px' }}
                    formatter={(value: string) => (
                      <span style={{ color: rallyColors.textSecondary, marginLeft: '8px' }}>{value}</span>
                    )}
                  />
                )}
                <Bar
                  dataKey={dataKey}
                  fill={multiColor ? color : `url(#${gradId})`}
                  radius={layout === 'vertical' ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                  animationDuration={500}
                >
                  {multiColor && data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={RALLY_COLOR_SCALE[index % RALLY_COLOR_SCALE.length]} />
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
    </RallyMainCard>
  );
}

export default BarChartCard;
