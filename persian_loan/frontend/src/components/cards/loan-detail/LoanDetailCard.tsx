/**
 * Loan Detail Card Component (Refactored)
 * Main container that composes all loan detail sub-components
 */

import { Card } from '@/components/ui';
import type { LoanType } from '@/types';
import { LoanDetailHeader } from './LoanDetailHeader';
import { LoanKeyInfoGrid } from './LoanKeyInfoGrid';
import { LoanFinancialInfo } from './LoanFinancialInfo';
import { LoanOptionsSection } from './LoanOptionsSection';
import { LoanGuarantorSection } from './LoanGuarantorSection';
import { LoanCoefficientTable } from './LoanCoefficientTable';
import { LoanRequirementsSection } from './LoanRequirementsSection';

interface LoanDetailCardProps {
  loan: LoanType;
  bankNameFA?: string;
}

export function LoanDetailCard({ loan, bankNameFA }: LoanDetailCardProps) {
  const hasGuarantor = loan.guarantor !== false;

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <LoanDetailHeader
        loan={loan}
        bankNameFA={bankNameFA}
        hasGuarantor={hasGuarantor}
      />

      <div className="p-4 space-y-6">
        {/* Description */}
        {(loan.descriptionFA || loan.description) && (
          <div className="bg-surface-50 p-3 rounded-lg">
            <p className="text-gray-300 text-sm leading-relaxed">
              {loan.descriptionFA || loan.description}
            </p>
          </div>
        )}

        {/* Key Info Grid */}
        <LoanKeyInfoGrid loan={loan} hasGuarantor={hasGuarantor} />

        {/* Financial Info */}
        <LoanFinancialInfo loan={loan} />

        {/* Loan Options & Step System */}
        <LoanOptionsSection loan={loan} />

        {/* Guarantor & Credit Rating Info */}
        <LoanGuarantorSection loan={loan} />

        {/* Coefficient Table */}
        <LoanCoefficientTable loan={loan} />

        {/* Requirements */}
        <LoanRequirementsSection loan={loan} />
      </div>
    </Card>
  );
}

export default LoanDetailCard;
