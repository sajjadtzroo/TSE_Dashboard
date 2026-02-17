/**
 * Loan Requirements Section Component
 * Displays requirements, eligibility, financial behavior factors, and credit check systems
 */

import { memo } from 'react';
import { ListChecks, FileText, AlertCircle } from 'lucide-react';
import { CheckCircle2 } from 'lucide-react';
import type { LoanType } from '@/types';

interface LoanRequirementsSectionProps {
  loan: LoanType;
}

export const LoanRequirementsSection = memo(function LoanRequirementsSection({
  loan,
}: LoanRequirementsSectionProps) {
  const hasRequirements = loan.requirements && loan.requirements.length > 0;
  const hasEligibility = loan.eligibilityRequirements && loan.eligibilityRequirements.length > 0;
  const hasFinancialBehavior = loan.financialBehaviorFactors && loan.financialBehaviorFactors.length > 0;
  const hasCreditCheckSystems = loan.creditCheckSystems && loan.creditCheckSystems.length > 0;
  const hasProcessingTime = !!loan.processingTime;

  // Don't render if no requirements info
  if (!hasRequirements && !hasEligibility && !hasFinancialBehavior && !hasCreditCheckSystems && !hasProcessingTime) {
    return null;
  }

  return (
    <>
      {/* Requirements */}
      {hasRequirements && (
        <div>
          <div className="flex items-center gap-2 text-gray-300 mb-3">
            <ListChecks className="w-5 h-5" />
            <span className="font-medium">شرایط دریافت</span>
          </div>
          <ul className="space-y-2">
            {loan.requirements!.map((req, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-secondary-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300 text-sm">{req}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Eligibility Requirements */}
      {hasEligibility && (
        <div>
          <div className="flex items-center gap-2 text-gray-300 mb-3">
            <FileText className="w-5 h-5" />
            <span className="font-medium">شرایط واجدین شرایط</span>
          </div>
          <ul className="space-y-2">
            {loan.eligibilityRequirements!.map((req, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300 text-sm">{req}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Financial Behavior Factors */}
      {hasFinancialBehavior && (
        <div className="bg-surface-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-gray-300 mb-3">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">عوامل موثر در رفتار مالی</span>
          </div>
          <ul className="space-y-2">
            {loan.financialBehaviorFactors!.map((factor, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-gray-500">•</span>
                <span className="text-gray-300 text-sm">{factor}</span>
              </li>
            ))}
          </ul>
          {loan.monthlyAssessment && (
            <p className="text-xs text-gray-500 mt-3 border-t border-surface-50 pt-3">
              {loan.monthlyAssessment}
            </p>
          )}
        </div>
      )}

      {/* Credit Check Systems */}
      {hasCreditCheckSystems && (
        <div>
          <div className="flex items-center gap-2 text-gray-300 mb-3">
            <FileText className="w-5 h-5" />
            <span className="font-medium">سامانه‌های استعلام</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {loan.creditCheckSystems!.map((system, idx) => (
              <span
                key={idx}
                className="bg-primary-800/30 text-primary-400 px-3 py-1 rounded-full text-xs border border-primary-700/50"
              >
                {system}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Processing Time */}
      {hasProcessingTime && (
        <div className="text-center bg-surface-50 p-3 rounded-lg">
          <span className="text-gray-500 text-sm">زمان پردازش: </span>
          <span className="font-bold text-gray-200">{loan.processingTime}</span>
        </div>
      )}
    </>
  );
});
