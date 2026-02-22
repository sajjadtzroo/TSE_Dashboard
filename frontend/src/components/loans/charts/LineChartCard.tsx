/**
 * Line Chart Card Component - Aligned with Rally theme
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
import { Text, Group, Skeleton, ActionIcon, Stack, Box } from '@mantine/core';
import { IconRefresh, IconDownload, IconArrowsMaximize } from '@tabler/icons-react';
import RallyMainCard from '../../RallyMainCard';
import ChartTooltipV2 from '../../charts/shared/ChartTooltipV2';
import rallyColors from '../../../theme/rallyColors';
import { GRID_STROKE, axisTick, activeDotFor } from '../../charts/shared/chartStyles';
import { RALLY_COLOR_SCALE } from '../../charts/RallyPieChart';

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
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                )}
                <XAxis
                  dataKey={xAxisKey}
                  tick={axisTick(12)}
                  axisLine={{ stroke: rallyColors.border }}
                />
                <YAxis
                  tick={axisTick(12)}
                  axisLine={{ stroke: rallyColors.border }}
                />
                <Tooltip
                  content={<ChartTooltipV2 />}
                  cursor={{ stroke: rallyColors.textDimmed, strokeWidth: 1, strokeDasharray: '5 5' }}
                />
                {showLegend && (
                  <Legend
                    wrapperStyle={{ paddingTop: '20px', fontSize: '13px' }}
                    iconType="line"
                    formatter={(value: string) => (
                      <span style={{ color: rallyColors.textSecondary, marginLeft: '8px' }}>{value}</span>
                    )}
                  />
                )}
                {dataKeys.map((item, index) => {
                  const isObject = typeof item === 'object';
                  const key = isObject ? (item as LineDataKey).key : item;
                  const name = isObject ? (item as LineDataKey).name : item;
                  const color = isObject ? (item as LineDataKey).color : RALLY_COLOR_SCALE[index % RALLY_COLOR_SCALE.length];

                  return (
                    <Line
                      key={key}
                      name={name}
                      type="monotone"
                      dataKey={key}
                      stroke={color}
                      strokeWidth={2}
                      dot={{ fill: color, r: 4, strokeWidth: 0 }}
                      activeDot={activeDotFor(color)}
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
                  const color = isObject ? (item as LineDataKey).color : RALLY_COLOR_SCALE[index % RALLY_COLOR_SCALE.length];

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
    </RallyMainCard>
  );
}

export default LineChartCard;
