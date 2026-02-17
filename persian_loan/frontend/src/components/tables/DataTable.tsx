import { type ReactNode } from 'react';
import { Table, Center, Loader, Text, ScrollArea } from '@mantine/core';
import rallyColors from '../../theme/rallyColors';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  width?: number;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  isLoading?: boolean;
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  emptyMessage = 'اطلاعاتی یافت نشد',
  isLoading = false,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <Center py="xl">
        <Loader color="rally-green" size="sm" />
      </Center>
    );
  }

  if (data.length === 0) {
    return (
      <Center py="xl">
        <Text c="dimmed">{emptyMessage}</Text>
      </Center>
    );
  }

  return (
    <ScrollArea>
      <Table
        highlightOnHover={!!onRowClick}
        verticalSpacing="sm"
        horizontalSpacing="md"
      >
        <Table.Thead>
          <Table.Tr
            style={{
              borderBottom: `1px solid ${rallyColors.GLASS_BORDER}`,
            }}
          >
            {columns.map((column) => (
              <Table.Th
                key={column.key}
                w={column.width}
                style={{
                  color: rallyColors.TEXT_DIMMED,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                {column.header}
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {data.map((item) => (
            <Table.Tr
              key={keyExtractor(item)}
              onClick={() => onRowClick?.(item)}
              style={{
                cursor: onRowClick ? 'pointer' : undefined,
                borderBottom: `1px solid ${rallyColors.GLASS_BORDER}`,
              }}
            >
              {columns.map((column) => (
                <Table.Td
                  key={column.key}
                  style={{
                    color: rallyColors.TEXT_PRIMARY,
                    fontSize: '0.875rem',
                  }}
                >
                  {column.render
                    ? column.render(item)
                    : String(item[column.key] ?? '')}
                </Table.Td>
              ))}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );
}

export default DataTable;
