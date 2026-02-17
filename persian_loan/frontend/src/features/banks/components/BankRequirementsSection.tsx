/**
 * Bank Requirements Section Component
 * Displays guarantor requirements, credit rating, process steps, and general requirements
 */

import { memo } from 'react';
import {
  UserCheck,
  Shield,
  FileText,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import type { Bank } from '@/types';

interface BankRequirementsSectionProps {
  bank: Bank;
}

export const BankRequirementsSection = memo(function BankRequirementsSection({
  bank,
}: BankRequirementsSectionProps) {
  const hasGuarantorRequirements = !!bank.guarantorRequirements;
  const hasCreditRatingRequirements = !!bank.creditRatingRequirements;
  const hasProcess = bank.process && bank.process.length > 0;
  const hasGeneralRequirements =
    bank.requirements || bank.generalRequirements || bank.generalFeatures;

  if (
    !hasGuarantorRequirements &&
    !hasCreditRatingRequirements &&
    !hasProcess &&
    !hasGeneralRequirements
  ) {
    return null;
  }

  return (
    <>
      {/* Guarantor Requirements (Bank-level) */}
      {hasGuarantorRequirements && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <UserCheck className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-gray-50">
              جدول تعداد ضامنین
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-amber-900/30">
                  <th className="px-4 py-2 text-right text-amber-300">
                    سقف مبلغ
                  </th>
                  <th className="px-4 py-2 text-right text-amber-300">
                    تعداد ضامن
                  </th>
                  <th className="px-4 py-2 text-right text-amber-300">
                    توضیحات
                  </th>
                </tr>
              </thead>
              <tbody>
                {bank.guarantorRequirements!.upTo300M && (
                  <tr className="bg-surface-100">
                    <td className="px-4 py-2 text-gray-300">
                      تا ۳۰۰ میلیون تومان
                    </td>
                    <td className="px-4 py-2 font-bold text-amber-400">
                      {bank.guarantorRequirements!.upTo300M.guarantors} نفر
                    </td>
                    <td className="px-4 py-2 text-gray-400">
                      {bank.guarantorRequirements!.upTo300M.descriptionFA ||
                        '-'}
                    </td>
                  </tr>
                )}
                {bank.guarantorRequirements!['300Mto500M'] && (
                  <tr className="bg-amber-900/10">
                    <td className="px-4 py-2 text-gray-300">
                      ۳۰۰ تا ۵۰۰ میلیون تومان
                    </td>
                    <td className="px-4 py-2 font-bold text-amber-400">
                      {bank.guarantorRequirements!['300Mto500M'].guarantors}{' '}
                      نفر
                    </td>
                    <td className="px-4 py-2 text-gray-400">
                      {bank.guarantorRequirements!['300Mto500M']
                        .descriptionFA || '-'}
                    </td>
                  </tr>
                )}
                {bank.guarantorRequirements!['500Mto1B'] && (
                  <tr className="bg-surface-100">
                    <td className="px-4 py-2 text-gray-300">
                      ۵۰۰ میلیون تا ۱ میلیارد تومان
                    </td>
                    <td className="px-4 py-2 font-bold text-amber-400">
                      {bank.guarantorRequirements!['500Mto1B'].guarantors} نفر
                    </td>
                    <td className="px-4 py-2 text-gray-400">
                      {bank.guarantorRequirements!['500Mto1B'].descriptionFA ||
                        '-'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {bank.guarantorRequirements!.additionalGuarantee && (
            <div className="mt-3 bg-yellow-900/20 border border-yellow-700/30 p-3 rounded-lg text-yellow-300 text-sm">
              {bank.guarantorRequirements!.additionalGuarantee}
            </div>
          )}
        </Card>
      )}

      {/* Credit Rating Requirements (Bank-level) */}
      {hasCreditRatingRequirements && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-primary-400" />
            <h2 className="text-lg font-semibold text-gray-50">
              شرایط بر اساس رتبه اعتباری
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-primary-800/30">
                  <th className="px-4 py-2 text-right text-primary-300">
                    رتبه اعتباری
                  </th>
                  <th className="px-4 py-2 text-right text-primary-300">
                    سقف وام
                  </th>
                  <th className="px-4 py-2 text-right text-primary-300">
                    شرایط ضامن
                  </th>
                </tr>
              </thead>
              <tbody>
                {bank.creditRatingRequirements!.ratingA && (
                  <tr className="bg-surface-100">
                    <td className="px-4 py-2">
                      <Badge variant="green">رتبه A</Badge>
                    </td>
                    <td className="px-4 py-2 text-gray-200">
                      {bank.creditRatingRequirements!.ratingA.maxLoanFA ||
                        bank.creditRatingRequirements!.ratingA.maxLoan ||
                        '-'}
                    </td>
                    <td className="px-4 py-2 text-gray-400">
                      {bank.creditRatingRequirements!.ratingA
                        .guarantorRequirement || '-'}
                    </td>
                  </tr>
                )}
                {bank.creditRatingRequirements!.ratingB && (
                  <tr className="bg-primary-800/10">
                    <td className="px-4 py-2">
                      <Badge variant="blue">رتبه B</Badge>
                    </td>
                    <td className="px-4 py-2 text-gray-200">
                      {bank.creditRatingRequirements!.ratingB.maxLoanFA ||
                        bank.creditRatingRequirements!.ratingB.maxLoan ||
                        '-'}
                    </td>
                    <td className="px-4 py-2 text-gray-400">
                      {bank.creditRatingRequirements!.ratingB
                        .guarantorRequirement || '-'}
                    </td>
                  </tr>
                )}
                {bank.creditRatingRequirements!.ratingCandD && (
                  <tr className="bg-surface-100">
                    <td className="px-4 py-2">
                      <Badge variant="yellow">رتبه C و D</Badge>
                    </td>
                    <td className="px-4 py-2 text-gray-200">
                      {bank.creditRatingRequirements!.ratingCandD.maxLoanFA ||
                        bank.creditRatingRequirements!.ratingCandD.maxLoan ||
                        '-'}
                    </td>
                    <td className="px-4 py-2 text-gray-400">
                      {bank.creditRatingRequirements!.ratingCandD
                        .guarantorRequirement || '-'}
                    </td>
                  </tr>
                )}
                {bank.creditRatingRequirements!.ratingE && (
                  <tr className="bg-primary-800/10">
                    <td className="px-4 py-2">
                      <Badge variant="red">رتبه E</Badge>
                    </td>
                    <td className="px-4 py-2 text-gray-200">
                      {bank.creditRatingRequirements!.ratingE.maxLoanFA ||
                        bank.creditRatingRequirements!.ratingE.maxLoan ||
                        '-'}
                    </td>
                    <td className="px-4 py-2 text-gray-400">
                      {bank.creditRatingRequirements!.ratingE
                        .guarantorRequirement || '-'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Process Steps */}
      {hasProcess && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-primary-400" />
            <h2 className="text-lg font-semibold text-gray-50">
              مراحل دریافت وام
            </h2>
          </div>
          <ol className="space-y-3">
            {bank.process!.map((step, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-primary-800/30 text-primary-400 rounded-full flex items-center justify-center text-sm font-bold">
                  {idx + 1}
                </span>
                <span className="text-gray-300">{step}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* General Requirements */}
      {hasGeneralRequirements && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-50">
              شرایط و ویژگی‌های عمومی
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bank.requirements?.guarantorFA && (
              <div className="flex items-center gap-2 bg-secondary-900/20 border border-secondary-700/30 p-3 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-secondary-500" />
                <span className="text-secondary-300">
                  {bank.requirements.guarantorFA}
                </span>
              </div>
            )}
            {bank.requirements?.checkFA && (
              <div className="flex items-center gap-2 bg-secondary-900/20 border border-secondary-700/30 p-3 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-secondary-500" />
                <span className="text-secondary-300">
                  {bank.requirements.checkFA}
                </span>
              </div>
            )}
            {bank.requirements?.promissoryNoteFA && (
              <div className="flex items-center gap-2 bg-secondary-900/20 border border-secondary-700/30 p-3 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-secondary-500" />
                <span className="text-secondary-300">
                  {bank.requirements.promissoryNoteFA}
                </span>
              </div>
            )}
            {bank.requirements?.onlineCreditCheckFA && (
              <div className="flex items-center gap-2 bg-primary-800/20 border border-primary-700/30 p-3 rounded-lg">
                <Info className="w-5 h-5 text-primary-400" />
                <span className="text-primary-300">
                  {bank.requirements.onlineCreditCheckFA}
                </span>
              </div>
            )}
            {bank.requirements?.noBadChecksFA && (
              <div className="flex items-center gap-2 bg-yellow-900/20 border border-yellow-700/30 p-3 rounded-lg">
                <Info className="w-5 h-5 text-yellow-400" />
                <span className="text-yellow-300">
                  {bank.requirements.noBadChecksFA}
                </span>
              </div>
            )}
            {bank.requirements?.noOverduePaymentsFA && (
              <div className="flex items-center gap-2 bg-yellow-900/20 border border-yellow-700/30 p-3 rounded-lg">
                <Info className="w-5 h-5 text-yellow-400" />
                <span className="text-yellow-300">
                  {bank.requirements.noOverduePaymentsFA}
                </span>
              </div>
            )}
            {bank.requirements?.moneyNotBlockedFA && (
              <div className="flex items-center gap-2 bg-secondary-900/20 border border-secondary-700/30 p-3 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-secondary-500" />
                <span className="text-secondary-300">
                  {bank.requirements.moneyNotBlockedFA}
                </span>
              </div>
            )}
            {bank.features?.earlyRepaymentBenefitFA && (
              <div className="flex items-center gap-2 bg-primary-800/20 border border-primary-700/30 p-3 rounded-lg">
                <Info className="w-5 h-5 text-primary-400" />
                <span className="text-primary-300">
                  {bank.features.earlyRepaymentBenefitFA}
                </span>
              </div>
            )}
            {bank.features?.zeroInterestOneMonthFA && (
              <div className="flex items-center gap-2 bg-secondary-900/20 border border-secondary-700/30 p-3 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-secondary-500" />
                <span className="text-secondary-300">
                  {bank.features.zeroInterestOneMonthFA}
                </span>
              </div>
            )}
            {bank.features?.depositSpeedFA && (
              <div className="flex items-center gap-2 bg-secondary-900/20 border border-secondary-700/30 p-3 rounded-lg">
                <Info className="w-5 h-5 text-secondary-500" />
                <span className="text-secondary-300">
                  {bank.features.depositSpeedFA}
                </span>
              </div>
            )}
            {bank.generalFeatures?.fullyOnlineFA && (
              <div className="flex items-center gap-2 bg-purple-900/20 border border-purple-700/30 p-3 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-purple-400" />
                <span className="text-purple-300">
                  {bank.generalFeatures.fullyOnlineFA}
                </span>
              </div>
            )}
          </div>
        </Card>
      )}
    </>
  );
});
