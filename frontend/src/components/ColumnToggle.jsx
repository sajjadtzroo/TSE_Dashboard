import { useState, useEffect } from 'react';
import { ActionIcon, Checkbox, Popover, Stack, Text } from '@mantine/core';
import { IconColumns } from '@tabler/icons-react';

export default function ColumnToggle({ columns, storageKey, onChange }) {
  const [hiddenAccessors, setHiddenAccessors] = useState(() => {
    try {
      const saved = localStorage.getItem(`col-vis-${storageKey}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(`col-vis-${storageKey}`, JSON.stringify(hiddenAccessors));
    if (onChange) {
      onChange(columns.filter((c) => !hiddenAccessors.includes(c.accessor)));
    }
  }, [hiddenAccessors, columns, storageKey, onChange]);

  const toggle = (accessor) => {
    setHiddenAccessors((prev) =>
      prev.includes(accessor) ? prev.filter((a) => a !== accessor) : [...prev, accessor]
    );
  };

  return (
    <Popover width={220} position="bottom-end" shadow="md">
      <Popover.Target>
        <ActionIcon variant="subtle" size="sm" color="gray">
          <IconColumns size={18} />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <Text size="xs" fw={600} c="dimmed" mb="xs">
          ستون‌های قابل نمایش
        </Text>
        <Stack gap={4}>
          {columns.map((col) => (
            <Checkbox
              key={col.accessor}
              label={col.title || col.accessor}
              size="xs"
              checked={!hiddenAccessors.includes(col.accessor)}
              onChange={() => toggle(col.accessor)}
            />
          ))}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
