import { Table, Badge, Center, ScrollArea } from '@mantine/core';
import { IconCheck, IconX, IconMinus } from '@tabler/icons-react';
import rallyColors from '../../theme/rallyColors';
import type { RequirementsMatrixItem } from '@/types';

interface RequirementsTableProps {
  data: RequirementsMatrixItem[];
}

const requirementLabels: Record<string, string> = {
  guarantor: 'ضامن',
  check: 'چک',
  promissoryNote: 'سفته',
  creditRating: 'رتبه اعتباری',
  noBadChecks: 'بدون چک برگشتی',
  noOverdueDebts: 'بدون بدهی معوق',
  onlineCreditCheck: 'استعلام آنلاین',
};

function RequirementCell({ value }: { value: boolean | string | undefined }) {
  if (value === undefined || value === null) {
    return (
      <Center>
        <IconMinus size={16} color={rallyColors.TEXT_DIMMED} />
      </Center>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <Center>
        {value ? (
          <IconCheck size={16} color={rallyColors.RALLY_GREEN} />
        ) : (
          <IconX size={16} color="#ef4444" />
        )}
      </Center>
    );
  }

  return (
    <Center>
      <span style={{ fontSize: '0.875rem', color: rallyColors.TEXT_SECONDARY }}>
        {value}
      </span>
    </Center>
  );
}

export function RequirementsTable({ data }: RequirementsTableProps) {
  const requirementKeys = Object.keys(requirementLabels);

  return (
    <ScrollArea>
      <Table verticalSpacing="sm" horizontalSpacing="sm">
        <Table.Thead>
          <Table.Tr style={{ borderBottom: `1px solid ${rallyColors.GLASS_BORDER}` }}>
            <Table.Th
              style={{
                color: rallyColors.TEXT_DIMMED,
                fontSize: '0.75rem',
                fontWeight: 600,
                position: 'sticky',
                insetInlineStart: 0,
                backgroundColor: rallyColors.BG_CARD,
                zIndex: 1,
              }}
            >
              بانک
            </Table.Th>
            <Table.Th
              style={{
                color: rallyColors.TEXT_DIMMED,
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              دسته‌بندی
            </Table.Th>
            {requirementKeys.map((key) => (
              <Table.Th
                key={key}
                style={{
                  color: rallyColors.TEXT_DIMMED,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textAlign: 'center',
                }}
              >
                {requirementLabels[key]}
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {data.map((item) => (
            <Table.Tr
              key={item.bankId}
              style={{ borderBottom: `1px solid ${rallyColors.GLASS_BORDER}` }}
            >
              <Table.Td
                style={{
                  fontWeight: 500,
                  color: rallyColors.TEXT_PRIMARY,
                  position: 'sticky',
                  insetInlineStart: 0,
                  backgroundColor: rallyColors.BG_CARD,
                  zIndex: 1,
                }}
              >
                {item.bankNameFA}
              </Table.Td>
              <Table.Td>
                <Badge
                  color={item.category === 'digital-banks' ? 'violet' : 'blue'}
                  variant="light"
                  size="sm"
                >
                  {item.category === 'digital-banks' ? 'دیجیتال' : 'سنتی'}
                </Badge>
              </Table.Td>
              {requirementKeys.map((key) => (
                <Table.Td key={key}>
                  <RequirementCell
                    value={item.requirements[key as keyof typeof item.requirements]}
                  />
                </Table.Td>
              ))}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );
}

export default RequirementsTable;
