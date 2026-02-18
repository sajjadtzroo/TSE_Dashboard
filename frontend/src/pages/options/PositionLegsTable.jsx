import {
  Button,
  Select,
  NumberInput,
  SegmentedControl,
  ActionIcon,
  Table,
} from '@mantine/core';
import { IconTrash, IconPlus } from '@tabler/icons-react';

export default function PositionLegsTable({ legs, onLegChange, onAddLeg, onRemoveLeg }) {
  return (
    <>
      <Table highlightOnHover={false} withTableBorder={false}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>نوع</Table.Th>
            <Table.Th>سمت</Table.Th>
            <Table.Th>اعمال</Table.Th>
            <Table.Th>پرمیوم</Table.Th>
            <Table.Th>تعداد</Table.Th>
            <Table.Th w={40}></Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {legs.map((leg, i) => (
            <Table.Tr key={i}>
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
          ))}
        </Table.Tbody>
      </Table>
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
