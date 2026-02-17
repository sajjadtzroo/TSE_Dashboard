/**
 * Comparison Table Component
 * Side-by-side comparison table with collapsible categories
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { LoanType, LoanWithBank } from '../../../types';
import { Card } from '../../../components/ui';
import {
  COMPARISON_FIELDS,
  getCategories,
  getFieldsByCategory,
  compareValues,
  getFieldsWithDifferences,
  type ComparisonField,
} from '../utils/comparisonLogic';

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
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-bg-darker z-10">
            <tr>
              <th className="p-4 text-right border-b border-border-dark min-w-[200px]">
                <span className="text-gray-300 font-semibold">ویژگی</span>
              </th>
              {loans.map((loan) => {
                const loanWithBank = loan as LoanWithBank;
                return (
                  <th
                    key={loan.id}
                    className="p-4 text-center border-b border-border-dark min-w-[200px]"
                  >
                    <div className="text-gray-50 font-semibold mb-1">
                      {loan.nameFA}
                    </div>
                    {loanWithBank.bankNameFA && (
                      <div className="text-sm text-gray-400">
                        {loanWithBank.bankNameFA}
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
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
          </tbody>
        </table>
      </div>
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
      <tr
        className="bg-bg-dark border-t-2 border-border-dark cursor-pointer hover:bg-bg-darker/50 transition-colors"
        onClick={onToggle}
      >
        <td colSpan={loans.length + 1} className="p-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-100">{category}</span>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </td>
      </tr>

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
    <tr className="border-b border-border-dark/50 hover:bg-bg-dark/50 transition-colors">
      <td className="p-3 text-gray-300 text-sm">{field.label}</td>
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
    </tr>
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
      ? '—'
      : format
      ? format(value)
      : String(value);

  let cellClass = 'p-3 text-center text-sm';

  if (result === 'best') {
    cellClass += ' bg-teal-500/10 text-teal-300 font-semibold';
  } else if (result === 'worst') {
    cellClass += ' bg-pink-500/10 text-pink-300 font-semibold';
  } else {
    cellClass += ' text-gray-300';
  }

  return <td className={cellClass}>{displayValue}</td>;
}

export default ComparisonTable;
