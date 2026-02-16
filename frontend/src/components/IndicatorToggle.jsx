import { Popover, Button, Stack, Text, Checkbox, Group, Box } from '@mantine/core';
import { IconChartLine } from '@tabler/icons-react';
import indicatorMeta from '../utils/indicatorMeta';

const overlayKeys = Object.entries(indicatorMeta).filter(([, m]) => m.category === 'overlay').map(([k]) => k);
const subchartKeys = Object.entries(indicatorMeta).filter(([, m]) => m.category === 'subchart').map(([k]) => k);

export default function IndicatorToggle({ prefs = {}, onToggle }) {
  return (
    <Popover position="bottom-end" withArrow shadow="md" width={220}>
      <Popover.Target>
        <Button variant="subtle" size="xs" leftSection={<IconChartLine size={14} />} color="gray">
          اندیکاتور
        </Button>
      </Popover.Target>
      <Popover.Dropdown>
        <Text size="xs" fw={600} mb="xs">روی نمودار</Text>
        <Stack gap={4} mb="sm">
          {overlayKeys.map((key) => {
            const meta = indicatorMeta[key];
            return (
              <Checkbox
                key={key}
                size="xs"
                checked={!!prefs[key]}
                onChange={() => onToggle(key)}
                label={
                  <Group gap={6}>
                    <Box w={10} h={10} style={{ background: meta.color, borderRadius: 2 }} />
                    <Text size="xs">{meta.label}</Text>
                  </Group>
                }
              />
            );
          })}
        </Stack>
        <Text size="xs" fw={600} mb="xs">زیرنمودار</Text>
        <Stack gap={4}>
          {subchartKeys.map((key) => {
            const meta = indicatorMeta[key];
            return (
              <Checkbox
                key={key}
                size="xs"
                checked={!!prefs[key]}
                onChange={() => onToggle(key)}
                label={
                  <Group gap={6}>
                    <Box w={10} h={10} style={{ background: meta.color, borderRadius: 2 }} />
                    <Text size="xs">{meta.label}</Text>
                  </Group>
                }
              />
            );
          })}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
