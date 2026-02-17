/**
 * Bank Loans Section Component
 * Displays the loans section with loan detail cards
 */

import { memo } from 'react';
import { CreditCard } from 'lucide-react';
import { Empty } from '@/components/ui';
import { LoanDetailCard } from '@/components/cards';
import type { LoanType } from '@/types';

interface BankLoansSectionProps {
  loans?: LoanType[];
}

export const BankLoansSection = memo(function BankLoansSection({
  loans,
}: BankLoansSectionProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <CreditCard className="w-6 h-6 text-primary-400" />
        <h2 className="text-xl font-bold text-gray-50">
          محصولات وام ({loans?.length || 0})
        </h2>
      </div>

      {loans?.length === 0 ? (
        <Empty title="محصول وامی یافت نشد" />
      ) : (
        <div className="space-y-6">
          {loans?.map((loan) => (
            <LoanDetailCard key={loan.id} loan={loan} />
          ))}
        </div>
      )}
    </div>
  );
});
