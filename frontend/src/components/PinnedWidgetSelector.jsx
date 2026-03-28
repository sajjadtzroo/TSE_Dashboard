import { ActionIcon, Checkbox, Popover, Stack, Text } from '@mantine/core';
import { IconPin } from '@tabler/icons-react';
import usePinnedWidgets, { WIDGET_OPTIONS } from '../hooks/usePinnedWidgets';
import rallyColors from '../theme/rallyColors';

export default function PinnedWidgetSelector() {
  const { pinned, togglePin } = usePinnedWidgets();

  return (
    <Popover width={220} position="bottom-end" withArrow shadow="md">
      <Popover.Target>
        <ActionIcon variant="subtle" size="sm" color="gray" aria-label="انتخاب ویجت‌ها">
          <IconPin size={16} />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <Text size="xs" fw={600} mb="xs" c="dimmed">ویجت‌های نمایشی</Text>
        <Stack gap={4}>
          {WIDGET_OPTIONS.map((opt) => (
            <Checkbox
              key={opt.id}
              label={opt.label}
              size="xs"
              checked={pinned.includes(opt.id)}
              onChange={() => togglePin(opt.id)}
              styles={{ label: { fontSize: 12 } }}
            />
          ))}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
