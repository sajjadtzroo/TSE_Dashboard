import { useState } from 'react';
import { Box, Collapse, ActionIcon, SegmentedControl, Group, Text } from '@mantine/core';
import { IconChevronDown } from '@tabler/icons-react';
import RallyMainCard from '../../components/RallyMainCard';
import MultiIndexChart from '../../components/charts/MultiIndexChart';
import ChartEmptyState from '../../components/charts/shared/ChartEmptyState';
import { useMarketIndexHistory } from '../../hooks/useMarketData';

const INDEX_PRESETS = [
  { name: 'شاخص کل', key: 'شاخص کل' },
  { name: 'شاخص کل (هم وزن)', key: 'شاخص کل (هم وزن)' },
  { name: 'شاخص قیمت (وزنی-ارزشی)', key: 'شاخص قیمت (وزنی-ارزشی)' },
];

export default function DashboardIndexCompareSection({ expanded, onToggle }) {
  const [days, setDays] = useState('90');

  const { data: idx1 } = useMarketIndexHistory(INDEX_PRESETS[0].key, { days: Number(days) });
  const { data: idx2 } = useMarketIndexHistory(INDEX_PRESETS[1].key, { days: Number(days) });
  const { data: idx3 } = useMarketIndexHistory(INDEX_PRESETS[2].key, { days: Number(days) });

  const indices = [];
  if (idx1?.length) indices.push({ name: INDEX_PRESETS[0].name, data: idx1 });
  if (idx2?.length) indices.push({ name: INDEX_PRESETS[1].name, data: idx2 });
  if (idx3?.length) indices.push({ name: INDEX_PRESETS[2].name, data: idx3 });

  return (
    <Box>
      <RallyMainCard
        title="مقایسه شاخص‌ها"
        secondary={
          <ActionIcon variant="subtle" onClick={onToggle} size="sm">
            <IconChevronDown size={16} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </ActionIcon>
        }
        mb="md"
      >
        <Collapse in={expanded}>
          <Group gap="sm" mb="md">
            <Text size="xs" c="dimmed" fw={600}>بازه زمانی:</Text>
            <SegmentedControl
              value={days}
              onChange={setDays}
              data={[
                { value: '30', label: '۱ ماه' },
                { value: '90', label: '۳ ماه' },
                { value: '180', label: '۶ ماه' },
                { value: '365', label: '۱ سال' },
              ]}
              size="xs"
            />
          </Group>
          {indices.length > 0 ? (
            <MultiIndexChart indices={indices} />
          ) : (
            <ChartEmptyState height={320} message="داده شاخص موجود نیست" />
          )}
          <Text size="xs" c="dimmed" mt="xs" ta="center">
            مقادیر نرمال‌سازی شده (پایه = ۱۰۰) برای مقایسه عملکرد نسبی
          </Text>
        </Collapse>
      </RallyMainCard>
    </Box>
  );
}
