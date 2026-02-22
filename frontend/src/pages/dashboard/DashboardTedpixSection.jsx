import { Badge, Box, Collapse, Group, Text, SegmentedControl, ActionIcon } from '@mantine/core';
import { IconChevronDown } from '@tabler/icons-react';
import RallyMainCard from '../../components/RallyMainCard';
import RallyChartSkeleton from '../../components/RallyChartSkeleton';
import RallyAreaChart from '../../components/charts/RallyAreaChart';
import rallyColors from '../../theme/rallyColors';
import { toPersianNum, formatTrillion } from '../../utils/formatUtils';

export default function DashboardTedpixSection({
  tedpixTrend, indexRange, onIndexRangeChange,
  expanded, onToggle, tedpixLoading, tedpixChartData,
}) {
  return (
    <Box>
      <RallyMainCard
        title={
          <Group gap="xs">
            <Text>روند شاخص کل (TEDPIX)</Text>
            <Badge color={Number(tedpixTrend) > 0 ? 'green' : 'red'} variant="light">
              {Number(tedpixTrend) > 0 ? '+' : ''}{toPersianNum(tedpixTrend)}%
            </Badge>
          </Group>
        }
        secondary={
          <Group gap="xs" wrap="wrap">
            <SegmentedControl
              value={indexRange}
              onChange={onIndexRangeChange}
              data={[
                { label: '۱ ماه', value: '30' },
                { label: '۳ ماه', value: '90' },
                { label: '۶ ماه', value: '180' },
                { label: '۱ سال', value: '365' },
              ]}
              size="xs"
            />
            <ActionIcon variant="subtle" onClick={onToggle} size="sm">
              <IconChevronDown size={16} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </ActionIcon>
          </Group>
        }
        fullscreenable
        mb="md"
      >
        <Collapse in={expanded}>
          {tedpixLoading ? (
            <RallyChartSkeleton height={260} />
          ) : tedpixChartData.length > 0 ? (
            <RallyAreaChart data={tedpixChartData} fillColor={rallyColors.blue} height={260} zoomable yFormatter={(v) => formatTrillion(v)} />
          ) : (
            <Text c="dimmed" ta="center" py="xl">داده شاخص موجود نیست</Text>
          )}
        </Collapse>
      </RallyMainCard>
    </Box>
  );
}
