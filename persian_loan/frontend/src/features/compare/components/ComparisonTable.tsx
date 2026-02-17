/**
 * Comparison Table Component
 * Side-by-side comparison table with collapsible categories
 */

import { useState } from 'react';
import { Card, Table, Group, Text } from '@mantine/core';
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import type { LoanType, LoanWithBank } from '@/types';
import {
  COMPARISON_FIELDS,
  getCategories,
  getFieldsByCategory,
  compareValues,
  getFieldsWithDifferences,
  type ComparisonField,
} from '../utils/comparisonLogic';
import rallyColors from '@/theme/rallyColors';

interface ComparisonTableProps {
  loans: (LoanType | LoanWithBank)[];
  showDifferencesOnly: boolean;
}

export function ComparisonTable({ loans, showDifferencesOnly }: ComparisonTableProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(getCategories())
  );

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Filter fields if showing differences only
  const fieldsToShow = showDifferencesOnly
    ? getFieldsWithDifferences(loans)
    : COMPARISON_FIELDS;

  const categories = getCategories().filter((category) =>
    fieldsToShow.some((field) => field.category === category)
  );

  return (
    <Card
      withBorder
      radius="md"
      p={0}
      style={{
        backgroundColor: rallyColors.card,
        border: `1px solid ${rallyColors.glassBorder}`,
        overflow: 'hidden',
      }}
    >
      <Table.ScrollContainer minWidth={400}>
        <Table verticalSpacing="sm" horizontalSpacing="md">
          <Table.Thead
            style={{
              position: 'sticky',
              top: 0,
              backgroundColor: rallyColors.bg,
              zIndex: 10,
            }}
          >
            <Table.Tr>
              <Table.Th
                style={{
                  textAlign: 'right',
                  borderBottom: `1px solid ${rallyColors.border}`,
                  minWidth: 200,
                }}
              >
                <Text c={rallyColors.textSecondary} fw={600} size="sm">
                  ویژگی
                </Text>
              </Table.Th>
              {loans.map((loan) => {
                const loanWithBank = loan as LoanWithBank;
                return (
                  <Table.Th
                    key={loan.id}
                    style={{
                      textAlign: 'center',
                      borderBottom: `1px solid ${rallyColors.border}`,
                      minWidth: 200,
                    }}
                  >
                    <Text c={rallyColors.textPrimary} fw={600} size="sm" mb={2}>
                      {loan.nameFA}
                    </Text>
                    {loanWithBank.bankNameFA && (
                      <Text size="xs" c={rallyColors.textSecondary}>
                        {loanWithBank.bankNameFA}
                      </Text>
                    )}
                  </Table.Th>
                );
              })}
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>
            {categories.map((category) => {
              const isExpanded = expandedCategories.has(category);
              const categoryFields = getFieldsByCategory(category).filter((field) =>
                fieldsToShow.includes(field)
              );

              if (categoryFields.length === 0) return null;

              return (
                <ComparisonCategory
                  key={category}
                  category={category}
                  fields={categoryFields}
                  loans={loans}
                  isExpanded={isExpanded}
                  onToggle={() => toggleCategory(category)}
                />
              );
            })}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Card>
  );
}

interface ComparisonCategoryProps {
  category: string;
  fields: ComparisonField[];
  loans: (LoanType | LoanWithBank)[];
  isExpanded: boolean;
  onToggle: () => void;
}

function ComparisonCategory({
  category,
  fields,
  loans,
  isExpanded,
  onToggle,
}: ComparisonCategoryProps) {
  return (
    <>
      {/* Category Header */}
      <Table.Tr
        style={{
          backgroundColor: rallyColors.elevated,
          borderTop: `2px solid ${rallyColors.border}`,
          cursor: 'pointer',
        }}
        onClick={onToggle}
      >
        <Table.Td colSpan={loans.length + 1} style={{ padding: '0.75rem' }}>
          <Group justify="space-between">
            <Text fw={600} c={rallyColors.textPrimary}>
              {category}
            </Text>
            {isExpanded ? (
              <IconChevronUp size={20} color={rallyColors.textSecondary} />
            ) : (
              <IconChevronDown size={20} color={rallyColors.textSecondary} />
            )}
          </Group>
        </Table.Td>
      </Table.Tr>

      {/* Category Fields */}
      {isExpanded &&
        fields.map((field) => (
          <ComparisonRow key={field.key} field={field} loans={loans} />
        ))}
    </>
  );
}

interface ComparisonRowProps {
  field: ComparisonField;
  loans: (LoanType | LoanWithBank)[];
}

function ComparisonRow({ field, loans }: ComparisonRowProps) {
  const comparisonResults = compareValues(loans, field);

  return (
    <Table.Tr
      style={{
        borderBottom: `1px solid ${rallyColors.glassBorder}`,
      }}
    >
      <Table.Td style={{ padding: '0.75rem' }}>
        <Text size="sm" c={rallyColors.textSecondary}>
          {field.label}
        </Text>
      </Table.Td>
      {loans.map((loan) => {
        const value = field.getValue(loan);
        const result = comparisonResults.get(loan.id);

        return (
          <ComparisonCell
            key={loan.id}
            value={value}
            result={result || 'neutral'}
            format={field.format}
          />
        );
      })}
    </Table.Tr>
  );
}

interface ComparisonCellProps {
  value: any;
  result: 'best' | 'worst' | 'neutral';
  format?: (value: any) => string;
}

function ComparisonCell({ value, result, format }: ComparisonCellProps) {
  const displayValue =
    value == null || value === undefined || value === ''
      ? '\u2014'
      : format
      ? format(value)
      : String(value);

  const cellColor =
    result === 'best'
      ? '#5eead4' // teal-300
      : result === 'worst'
      ? '#f9a8d4' // pink-300
      : rallyColors.textSecondary;

  const cellBg =
    result === 'best'
      ? '#14b8a618'
      : result === 'worst'
      ? '#ec489918'
      : undefined;

  return (
    <Table.Td
      style={{
        padding: '0.75rem',
        textAlign: 'center',
        backgroundColor: cellBg,
      }}
    >
      <Text
        size="sm"
        c={cellColor}
        fw={result !== 'neutral' ? 600 : 400}
      >
        {displayValue}
      </Text>
    </Table.Td>
  );
}

export default ComparisonTable;
