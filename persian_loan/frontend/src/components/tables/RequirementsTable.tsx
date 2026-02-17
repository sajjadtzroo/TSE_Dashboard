/**
 * Requirements Matrix Table Component - Dark Theme
 */

import { Check, X, Minus } from 'lucide-react';
import { Badge } from '../ui';
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
    return <Minus className="w-4 h-4 text-gray-500" />;
  }

  if (typeof value === 'boolean') {
    return value ? (
      <Check className="w-4 h-4 text-secondary-500" />
    ) : (
      <X className="w-4 h-4 text-error-500" />
    );
  }

  return <span className="text-sm text-gray-300">{value}</span>;
}

export function RequirementsTable({ data }: RequirementsTableProps) {
  const requirementKeys = Object.keys(requirementLabels);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-border-light">
        <thead className="bg-surface-50">
          <tr>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider sticky right-0 bg-surface-50">
              بانک
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
              دسته‌بندی
            </th>
            {requirementKeys.map((key) => (
              <th
                key={key}
                className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider"
              >
                {requirementLabels[key]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-surface-100 divide-y divide-border-dark">
          {data.map((item) => (
            <tr key={item.bankId} className="hover:bg-surface-50 transition-colors">
              <td className="px-4 py-3 text-sm font-medium text-gray-50 sticky right-0 bg-surface-100">
                {item.bankNameFA}
              </td>
              <td className="px-4 py-3 text-sm">
                <Badge
                  variant={item.category === 'digital-banks' ? 'purple' : 'blue'}
                  size="sm"
                >
                  {item.category === 'digital-banks' ? 'دیجیتال' : 'سنتی'}
                </Badge>
              </td>
              {requirementKeys.map((key) => (
                <td key={key} className="px-4 py-3 text-center">
                  <div className="flex justify-center">
                    <RequirementCell
                      value={item.requirements[key as keyof typeof item.requirements]}
                    />
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default RequirementsTable;
