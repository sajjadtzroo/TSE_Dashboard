import { Skeleton, Table } from '@mantine/core';

export default function RallyTableSkeleton({ rows = 8, columns = 5, minHeight = 400 }) {
  return (
    <div style={{ minHeight, padding: 'var(--mantine-spacing-xs)' }}>
      <Table>
        <Table.Thead>
          <Table.Tr>
            {Array.from({ length: columns }).map((_, i) => (
              <Table.Th key={i}>
                <Skeleton height={14} width={i === 0 ? '60%' : '80%'} radius="sm" animate />
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <Table.Tr key={r}>
              {Array.from({ length: columns }).map((_, c) => (
                <Table.Td key={c}>
                  <Skeleton
                    height={12}
                    width={c === 0 ? '70%' : `${55 + (c * 7) % 30}%`}
                    radius="sm"
                    animate
                  />
                </Table.Td>
              ))}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </div>
  );
}
