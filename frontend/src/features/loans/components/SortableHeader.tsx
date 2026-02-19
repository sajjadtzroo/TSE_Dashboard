import { Text, Group, UnstyledButton } from '@mantine/core';
import { IconArrowUp, IconArrowDown } from '@tabler/icons-react';
import rallyColors from '../../../theme/rallyColors';

interface SortableHeaderProps<T extends string> {
  label: string;
  field: T;
  sortField: T;
  sortOrder: 'asc' | 'desc';
  onSort: (field: T) => void;
  activeColor?: string;
}

export default function SortableHeader<T extends string>({
  label,
  field,
  sortField,
  sortOrder,
  onSort,
  activeColor = rallyColors.blue,
}: SortableHeaderProps<T>) {
  const isActive = sortField === field;
  return (
    <UnstyledButton onClick={() => onSort(field)}>
      <Group gap={4} wrap="nowrap">
        <Text fw={isActive ? 700 : 500} size="sm" c={rallyColors.textPrimary}>
          {label}
        </Text>
        {isActive &&
          (sortOrder === 'asc' ? (
            <IconArrowUp size={14} color={activeColor} />
          ) : (
            <IconArrowDown size={14} color={activeColor} />
          ))}
      </Group>
    </UnstyledButton>
  );
}
