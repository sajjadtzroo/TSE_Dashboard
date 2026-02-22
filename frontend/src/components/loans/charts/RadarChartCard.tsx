/**
 * Radar Chart Card Component - Aligned with Rally theme
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
import { Text, Group, Skeleton, ActionIcon, Stack, Box } from '@mantine/core';
import { IconRefresh, IconDownload, IconArrowsMaximize, IconActivity } from '@tabler/icons-react';
import RallyMainCard from '../../RallyMainCard';
import ChartTooltipV2 from '../../charts/shared/ChartTooltipV2';
import ChartEmptyState from '../../charts/shared/ChartEmptyState';
import rallyColors from '../../../theme/rallyColors';
import { axisTick } from '../../charts/shared/chartStyles';
import { RALLY_COLOR_SCALE } from '../../charts/RallyPieChart';

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
          <ChartEmptyState height={height} message="No data available" />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={height}>
              <RadarChart data={data}>
                <PolarGrid stroke={rallyColors.border} strokeWidth={1} />
                <PolarAngleAxis
                  dataKey={angleKey}
                  tick={axisTick(12)}
                />
                <PolarRadiusAxis
                  tick={axisTick(10)}
                />
                <Tooltip
                  content={<ChartTooltipV2 />}
                />
                {showLegend && (
                  <Legend
                    wrapperStyle={{ paddingTop: '20px', fontSize: '13px' }}
                    iconType="circle"
                    formatter={(value: string) => (
                      <span style={{ color: rallyColors.textSecondary, marginLeft: '8px' }}>{value}</span>
                    )}
                  />
                )}
                {dataKeys.map((item, index) => {
                  const isObject = typeof item === 'object';
                  const key = isObject ? (item as RadarDataKey).key : item;
                  const name = isObject ? (item as RadarDataKey).name : item;
                  const color = isObject ? (item as RadarDataKey).color : RALLY_COLOR_SCALE[index % RALLY_COLOR_SCALE.length];
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
                      activeDot={{ r: 6, strokeWidth: 2, stroke: rallyColors.elevated }}
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
                  const color = isObject ? (item as RadarDataKey).color : RALLY_COLOR_SCALE[index % RALLY_COLOR_SCALE.length];

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
    </RallyMainCard>
  );
}

export default RadarChartCard;
