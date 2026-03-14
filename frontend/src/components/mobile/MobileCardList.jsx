import { useState } from 'react';
import { Card, Group, Text, Stack, Box, Collapse, Pagination, ActionIcon } from '@mantine/core';
import { IconChevronDown } from '@tabler/icons-react';
import PercentChangeCell from '../cells/PercentChangeCell';
import rallyColors from '../../theme/rallyColors';
import { formatNum, toPersianNum, formatSymbol } from '../../utils/formatUtils';

/**
 * Mobile card view for stock data — replaces horizontal-scroll tables on small screens.
 * Each card shows: symbol (bold), name, price, change %, volume.
 * Tap to expand full details. Tap card to navigate.
 */
export default function MobileCardList({
  records = [],
  onRowClick,
  page = 1,
  onPageChange,
  totalRecords = 0,
  recordsPerPage = 25,
  extraColumns = [],
}) {
  const [expandedId, setExpandedId] = useState(null);
  const totalPages = Math.ceil(totalRecords / recordsPerPage);

  return (
    <Stack gap="xs">
      {records.map((record) => {
        const id = record.ins_code || record.symbol;
        const isExpanded = expandedId === id;

        return (
          <Card
            key={id}
            radius="md"
            p="sm"
            style={{
              background: rallyColors.glassBg,
              border: `1px solid ${rallyColors.glassBorder}`,
              cursor: onRowClick ? 'pointer' : 'default',
            }}
            onClick={() => onRowClick?.({ record })}
          >
            <Group justify="space-between" wrap="nowrap">
              <Box style={{ minWidth: 0, flex: 1 }}>
                <Group gap={6} wrap="nowrap">
                  <Text size="sm" fw={700} c={rallyColors.textPrimary} truncate>
                    {formatSymbol(record.symbol, record.type)}
                  </Text>
                  {record.name_fa && (
                    <Text size="xs" c="dimmed" truncate>
                      {record.name_fa}
                    </Text>
                  )}
                </Group>
              </Box>

              <Group gap="sm" wrap="nowrap">
                <Stack gap={0} align="flex-end">
                  <Text size="sm" fw={600} c={rallyColors.textPrimary} style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatNum(record.close)}
                  </Text>
                  <PercentChangeCell value={record.close_change_pct} heatmap={false} />
                </Stack>

                <ActionIcon
                  variant="subtle"
                  size="xs"
                  color="gray"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedId(isExpanded ? null : id);
                  }}
                  aria-label={isExpanded ? 'بستن جزئیات' : 'نمایش جزئیات'}
                >
                  <IconChevronDown
                    size={14}
                    style={{
                      transform: isExpanded ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </ActionIcon>
              </Group>
            </Group>

            <Collapse in={isExpanded}>
              <Box mt="xs" pt="xs" style={{ borderTop: `1px solid ${rallyColors.border}` }}>
                <Group justify="space-between" gap="xs">
                  <Text size="xs" c="dimmed">حجم</Text>
                  <Text size="xs" fw={500} style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatNum(record.volume)}
                  </Text>
                </Group>
                {record.market_cap != null && (
                  <Group justify="space-between" gap="xs" mt={4}>
                    <Text size="xs" c="dimmed">ارزش بازار</Text>
                    <Text size="xs" fw={500} style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {toPersianNum((record.market_cap / 1e12).toFixed(1))}T
                    </Text>
                  </Group>
                )}
                {record.pe_ratio != null && record.pe_ratio > 0 && (
                  <Group justify="space-between" gap="xs" mt={4}>
                    <Text size="xs" c="dimmed">P/E</Text>
                    <Text size="xs" fw={500}>
                      {toPersianNum(record.pe_ratio.toFixed(1))}
                    </Text>
                  </Group>
                )}
                {extraColumns.map((col) => (
                  <Group key={col.accessor} justify="space-between" gap="xs" mt={4}>
                    <Text size="xs" c="dimmed">{col.title}</Text>
                    <Text size="xs" fw={500}>
                      {col.render ? col.render(record) : record[col.accessor]}
                    </Text>
                  </Group>
                ))}
              </Box>
            </Collapse>
          </Card>
        );
      })}

      {totalPages > 1 && (
        <Group justify="center" mt="sm">
          <Pagination
            total={totalPages}
            value={page}
            onChange={onPageChange}
            size="sm"
            radius="md"
          />
        </Group>
      )}
    </Stack>
  );
}
