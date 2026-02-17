/**
 * Loan Guarantor Section Component
 * Displays guarantor requirements matrix, credit rating requirements, and related info
 */

import { memo } from 'react';
import { UserCheck, CreditCard, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui';
import type { LoanType } from '@/types';

interface LoanGuarantorSectionProps {
  loan: LoanType;
}

export const LoanGuarantorSection = memo(function LoanGuarantorSection({
  loan,
}: LoanGuarantorSectionProps) {
  const hasGuarantorRequirements = !!loan.guarantorRequirements;
  const hasCreditRatingRequirements = !!loan.creditRatingRequirements;
  const hasGuarantorNote = !!loan.guarantorNote;
  const hasCreditRatingRequired = loan.creditRatingRequired && loan.creditRatingRequired.length > 0;

  // Don't render if no guarantor-related info
  if (!hasGuarantorRequirements && !hasCreditRatingRequirements && !hasGuarantorNote && !hasCreditRatingRequired) {
    return null;
  }

  return (
    <>
      {/* Guarantor Requirements Matrix (Bank Day style) */}
      {hasGuarantorRequirements && (
        <div>
          <div className="flex items-center gap-2 text-gray-300 mb-3">
            <UserCheck className="w-5 h-5" />
            <span className="font-medium">جدول تعداد ضامنین</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-surface-50">
                  <th className="px-3 py-2 text-right text-gray-300">سقف مبلغ</th>
                  <th className="px-3 py-2 text-right text-gray-300">تعداد ضامن</th>
                  <th className="px-3 py-2 text-right text-gray-300">توضیحات</th>
                </tr>
              </thead>
              <tbody>
                {loan.guarantorRequirements!.upTo300M && (
                  <tr className="border-b border-surface-50">
                    <td className="px-3 py-2 text-gray-300">تا ۳۰۰ میلیون</td>
                    <td className="px-3 py-2 font-medium text-primary-400">{loan.guarantorRequirements!.upTo300M.guarantors} نفر</td>
                    <td className="px-3 py-2 text-gray-500">{loan.guarantorRequirements!.upTo300M.descriptionFA || '-'}</td>
                  </tr>
                )}
                {loan.guarantorRequirements!['300Mto500M'] && (
                  <tr className="border-b border-surface-50">
                    <td className="px-3 py-2 text-gray-300">۳۰۰ تا ۵۰۰ میلیون</td>
                    <td className="px-3 py-2 font-medium text-primary-400">{loan.guarantorRequirements!['300Mto500M'].guarantors} نفر</td>
                    <td className="px-3 py-2 text-gray-500">{loan.guarantorRequirements!['300Mto500M'].descriptionFA || '-'}</td>
                  </tr>
                )}
                {loan.guarantorRequirements!['500Mto1B'] && (
                  <tr className="border-b border-surface-50">
                    <td className="px-3 py-2 text-gray-300">۵۰۰ میلیون تا ۱ میلیارد</td>
                    <td className="px-3 py-2 font-medium text-primary-400">{loan.guarantorRequirements!['500Mto1B'].guarantors} نفر</td>
                    <td className="px-3 py-2 text-gray-500">{loan.guarantorRequirements!['500Mto1B'].descriptionFA || '-'}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {loan.guarantorRequirements!.additionalGuarantee && (
            <p className="text-xs text-yellow-400/70 mt-2 bg-yellow-900/20 p-2 rounded border border-yellow-700/30">
              {loan.guarantorRequirements!.additionalGuarantee}
            </p>
          )}
        </div>
      )}

      {/* Credit Rating Requirements Matrix */}
      {hasCreditRatingRequirements && (
        <div>
          <div className="flex items-center gap-2 text-gray-300 mb-3">
            <CreditCard className="w-5 h-5" />
            <span className="font-medium">شرایط بر اساس رتبه اعتباری</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-surface-50">
                  <th className="px-3 py-2 text-right text-gray-300">رتبه اعتباری</th>
                  <th className="px-3 py-2 text-right text-gray-300">سقف وام</th>
                  <th className="px-3 py-2 text-right text-gray-300">شرایط ضامن</th>
                </tr>
              </thead>
              <tbody>
                {loan.creditRatingRequirements!.ratingA && (
                  <tr className="border-b border-surface-50">
                    <td className="px-3 py-2"><Badge variant="green">رتبه A</Badge></td>
                    <td className="px-3 py-2 text-gray-300">{loan.creditRatingRequirements!.ratingA.maxLoanFA || loan.creditRatingRequirements!.ratingA.maxLoan || '-'}</td>
                    <td className="px-3 py-2 text-gray-500">{loan.creditRatingRequirements!.ratingA.guarantorRequirement || '-'}</td>
                  </tr>
                )}
                {loan.creditRatingRequirements!.ratingB && (
                  <tr className="border-b border-surface-50">
                    <td className="px-3 py-2"><Badge variant="blue">رتبه B</Badge></td>
                    <td className="px-3 py-2 text-gray-300">{loan.creditRatingRequirements!.ratingB.maxLoanFA || loan.creditRatingRequirements!.ratingB.maxLoan || '-'}</td>
                    <td className="px-3 py-2 text-gray-500">{loan.creditRatingRequirements!.ratingB.guarantorRequirement || '-'}</td>
                  </tr>
                )}
                {loan.creditRatingRequirements!.ratingCandD && (
                  <tr className="border-b border-surface-50">
                    <td className="px-3 py-2"><Badge variant="yellow">رتبه C و D</Badge></td>
                    <td className="px-3 py-2 text-gray-300">{loan.creditRatingRequirements!.ratingCandD.maxLoanFA || loan.creditRatingRequirements!.ratingCandD.maxLoan || '-'}</td>
                    <td className="px-3 py-2 text-gray-500">{loan.creditRatingRequirements!.ratingCandD.guarantorRequirement || '-'}</td>
                  </tr>
                )}
                {loan.creditRatingRequirements!.ratingE && (
                  <tr className="border-b border-surface-50">
                    <td className="px-3 py-2"><Badge variant="red">رتبه E</Badge></td>
                    <td className="px-3 py-2 text-gray-300">{loan.creditRatingRequirements!.ratingE.maxLoanFA || loan.creditRatingRequirements!.ratingE.maxLoan || '-'}</td>
                    <td className="px-3 py-2 text-gray-500">{loan.creditRatingRequirements!.ratingE.guarantorRequirement || '-'}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Guarantor Note */}
      {hasGuarantorNote && (
        <div className="bg-yellow-900/20 p-3 rounded-lg border border-yellow-700/30">
          <p className="text-yellow-300 text-sm">{loan.guarantorNote}</p>
        </div>
      )}

      {/* Credit Rating Required */}
      {hasCreditRatingRequired && (
        <div className="bg-yellow-900/20 p-4 rounded-lg border border-yellow-700/30">
          <div className="flex items-center gap-2 text-yellow-400 mb-2">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">رتبه اعتباری مورد نیاز</span>
          </div>
          <div className="flex gap-2">
            {loan.creditRatingRequired!.map((rating, idx) => (
              <Badge key={idx} variant="yellow">{rating}</Badge>
            ))}
          </div>
          {loan.creditRatingRequiredFA && (
            <p className="text-sm text-yellow-400/70 mt-2">{loan.creditRatingRequiredFA}</p>
          )}
        </div>
      )}
    </>
  );
});
