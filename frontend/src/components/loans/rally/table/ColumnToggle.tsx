import { ActionIcon, Menu, Checkbox, Text } from '@mantine/core';
import { IconColumns } from '@tabler/icons-react';

interface Column {
  accessor: string;
  title?: string;
  hidden?: boolean;
}

interface ColumnToggleProps {
  columns: Column[];
  visibleColumns: string[];
  onToggle: (accessor: string) => void;
}

export default function ColumnToggle({ columns, visibleColumns, onToggle }: ColumnToggleProps) {
  return (
    <Menu position="bottom-end" shadow="md" width={220} closeOnItemClick={false}>
      <Menu.Target>
        <ActionIcon variant="subtle" size="lg" color="gray" aria-label="انتخاب ستون‌ها">
          <IconColumns size={18} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>ستون‌های قابل نمایش</Menu.Label>
        {columns.map((col) => (
          <Menu.Item key={col.accessor} onClick={() => onToggle(col.accessor)}>
            <Checkbox
              checked={visibleColumns.includes(col.accessor)}
              onChange={() => onToggle(col.accessor)}
              label={<Text size="sm">{col.title || col.accessor}</Text>}
              size="xs"
            />
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
