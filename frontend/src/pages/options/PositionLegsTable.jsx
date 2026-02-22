import {
  Button,
  Select,
  NumberInput,
  SegmentedControl,
  ActionIcon,
  Table,
  Badge,
  Text,
  Group,
} from '@mantine/core';
import { IconTrash, IconPlus } from '@tabler/icons-react';
import rallyColors from '../../theme/rallyColors';

export default function PositionLegsTable({
  legs,
  onLegChange,
  onAddLeg,
  onRemoveLeg,
  contracts,
  onContractSelect,
  legAnalytics,
}) {
  const hasMarketData = contracts && contracts.length > 0;
  const hasAnalytics = legAnalytics && legAnalytics.length > 0;

  return (
    <>
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <Table highlightOnHover={false} withTableBorder={false} style={{ minWidth: hasMarketData ? 720 : 520 }}>
        <Table.Thead>
          <Table.Tr>
            {hasMarketData && <Table.Th>قرارداد</Table.Th>}
            <Table.Th>نوع</Table.Th>
            <Table.Th>سمت</Table.Th>
            <Table.Th>اعمال</Table.Th>
            <Table.Th>پرمیوم</Table.Th>
            <Table.Th>تعداد</Table.Th>
            {hasAnalytics && <Table.Th>IV٪</Table.Th>}
            {hasAnalytics && <Table.Th>ارزش‌گذاری</Table.Th>}
            <Table.Th w={40}></Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {legs.map((leg, i) => {
            const analytics = hasAnalytics ? legAnalytics[i] : null;

            return (
              <Table.Tr key={i}>
                {hasMarketData && (
                  <Table.Td>
                    <Select
                      data={contracts}
                      placeholder="انتخاب..."
                      onChange={(v) => onContractSelect(i, v)}
                      size="xs"
                      searchable
                      clearable
                      w={160}
                      nothingFoundMessage="یافت نشد"
                    />
                  </Table.Td>
                )}
                <Table.Td>
                  <Select
                    data={[
                      { value: 'call', label: 'خرید' },
                      { value: 'put', label: 'فروش' },
                      { value: 'stock', label: 'سهم' },
                    ]}
                    value={leg.type}
                    onChange={(v) => onLegChange(i, 'type', v)}
                    size="xs"
                    w={90}
                  />
                </Table.Td>
                <Table.Td>
                  <SegmentedControl
                    data={[
                      { label: 'خرید', value: '1' },
                      { label: 'فروش', value: '-1' },
                    ]}
                    value={String(leg.direction)}
                    onChange={(v) => onLegChange(i, 'direction', Number(v))}
                    size="xs"
                  />
                </Table.Td>
                <Table.Td>
                  <NumberInput
                    value={leg.strike}
                    onChange={(v) => onLegChange(i, 'strike', v || 0)}
                    min={0}
                    step={100}
                    size="xs"
                    w={100}
                  />
                </Table.Td>
                <Table.Td>
                  <NumberInput
                    value={leg.premium}
                    onChange={(v) => onLegChange(i, 'premium', v ?? 0)}
                    min={0}
                    step={1}
                    decimalScale={2}
                    size="xs"
                    w={90}
                    disabled={leg.type === 'stock'}
                  />
                </Table.Td>
                <Table.Td>
                  <NumberInput
                    value={leg.qty}
                    onChange={(v) => onLegChange(i, 'qty', v || 1)}
                    min={1}
                    max={100}
                    size="xs"
                    w={60}
                  />
                </Table.Td>
                {hasAnalytics && (
                  <Table.Td>
                    {analytics?.iv != null ? (
                      <Text size="xs" fw={600} style={{ color: ivColor(analytics.iv) }}>
                        {analytics.iv.toFixed(1)}%
                      </Text>
                    ) : (
                      <Text size="xs" c="dimmed">-</Text>
                    )}
                  </Table.Td>
                )}
                {hasAnalytics && (
                  <Table.Td>
                    {analytics ? (
                      <Group gap={4} wrap="nowrap">
                        <Text size="xs" c="dimmed">BS: {analytics.bsPrice}</Text>
                        {analytics.overpriced && (
                          <Badge size="xs" color="red" variant="light">گران</Badge>
                        )}
                        {analytics.underpriced && (
                          <Badge size="xs" color="green" variant="light">ارزان</Badge>
                        )}
                        {!analytics.overpriced && !analytics.underpriced && analytics.bsPrice > 0 && (
                          <Badge size="xs" color="gray" variant="light">منصفانه</Badge>
                        )}
                      </Group>
                    ) : (
                      <Text size="xs" c="dimmed">-</Text>
                    )}
                  </Table.Td>
                )}
                <Table.Td>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size="sm"
                    onClick={() => onRemoveLeg(i)}
                    disabled={legs.length <= 1}
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
      </div>
      <Button
        variant="light"
        color="rally-green"
        size="xs"
        mt="sm"
        leftSection={<IconPlus size={14} />}
        onClick={onAddLeg}
        disabled={legs.length >= 4}
      >
        افزودن پا
      </Button>
    </>
  );
}

function ivColor(iv) {
  if (iv > 60) return '#EF4444';
  if (iv > 30) return '#F59E0B';
  return '#10B981';
}
