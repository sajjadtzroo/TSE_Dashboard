/**
 * Pie Chart Card Component - Aligned with Rally theme
 */

import { ReactNode } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Text, Group, Skeleton, ActionIcon, Stack, Box } from '@mantine/core';
import { IconRefresh, IconDownload, IconArrowsMaximize, IconChartPie } from '@tabler/icons-react';
import RallyMainCard from '../../RallyMainCard';
import ChartTooltipV2 from '../../charts/shared/ChartTooltipV2';
import ChartEmptyState from '../../charts/shared/ChartEmptyState';
import rallyColors from '../../../theme/rallyColors';
import { RALLY_COLOR_SCALE } from '../../charts/RallyPieChart';
import { toPersianNum } from '../../../utils/formatUtils';

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

  const renderLabel = ({ percent }: { percent?: number }) => {
    if (!percent || percent < 0.05) return '';
    return toPersianNum(`${(percent * 100).toFixed(0)}`) + '%';
  };

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
          <ChartEmptyState height={height} message="No data available" />
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
                  labelLine={{ stroke: rallyColors.textDimmed, strokeWidth: 1 }}
                  animationDuration={500}
                >
                  {data.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={RALLY_COLOR_SCALE[index % RALLY_COLOR_SCALE.length]}
                      stroke={rallyColors.bg}
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={
                    <ChartTooltipV2
                      formatter={(value: number) => {
                        const v = Number(value ?? 0);
                        const percent = toPersianNum(((v / total) * 100).toFixed(1));
                        return `${toPersianNum(String(v))} (${percent}%)`;
                      }}
                    />
                  }
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
              </PieChart>
            </ResponsiveContainer>

            <Stack gap="sm" mt="lg">
              {data.map((item, index) => {
                const percent = toPersianNum(((item.value / total) * 100).toFixed(1));
                return (
                  <Group key={`legend-${index}`} justify="space-between">
                    <Group gap="sm">
                      <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: RALLY_COLOR_SCALE[index % RALLY_COLOR_SCALE.length] }} />
                      <Text size="sm" c={rallyColors.textDimmed}>{item.name}</Text>
                    </Group>
                    <Group gap="sm">
                      <Text size="sm" fw={500} c={rallyColors.textPrimary}>{toPersianNum(String(item.value))}</Text>
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
    </RallyMainCard>
  );
}

export default PieChartCard;
