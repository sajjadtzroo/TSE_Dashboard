/**
 * Loan Detail Card Header Component
 * Displays loan name, bank name, and category badges
 */

import { memo } from 'react';
import { Badge } from '@/components/ui';
import type { LoanType } from '@/types';

interface LoanDetailHeaderProps {
  loan: LoanType;
  bankNameFA?: string;
  hasGuarantor: boolean;
}

export const LoanDetailHeader = memo(function LoanDetailHeader({
  loan,
  bankNameFA,
  hasGuarantor,
}: LoanDetailHeaderProps) {
  return (
    <div className="bg-gradient-to-l from-primary-800/30 to-surface-100 p-4 border-b border-surface-50">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-100">{loan.nameFA}</h3>
          {loan.nameEN && (
            <p className="text-sm text-gray-400 mt-1">{loan.nameEN}</p>
          )}
          {bankNameFA && (
            <p className="text-sm text-primary-400 mt-1">{bankNameFA}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {!hasGuarantor && (
            <Badge variant="green">بدون ضامن</Badge>
          )}
          {loan.category && (
            <Badge variant="blue">{loan.categoryFA || loan.category}</Badge>
          )}
        </div>
      </div>
    </div>
  );
});
