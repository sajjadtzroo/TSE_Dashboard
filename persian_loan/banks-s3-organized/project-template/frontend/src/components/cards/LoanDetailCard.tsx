/**
 * Comprehensive Loan Detail Card Component - Dark Theme
 * Shows all loan data including coefficient tables, requirements, etc.
 */

import {
  Percent,
  Banknote,
  Clock,
  UserCheck,
  FileText,
  Calculator,
  CheckCircle2,
  AlertCircle,
  Table,
  ListChecks,
  Shield,
  TrendingUp,
  Layers,
  CreditCard,
} from 'lucide-react';
import { Badge, Card } from '../ui';
import type { LoanType } from '../../types';

interface LoanDetailCardProps {
  loan: LoanType;
  bankNameFA?: string;
}

export function LoanDetailCard({ loan, bankNameFA }: LoanDetailCardProps) {
  const hasGuarantor = loan.guarantor !== false;

  return (
    <Card className="overflow-hidden">
      {/* Header */}
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Interest Rate */}
          {loan.interestRate && (
            <div className="bg-primary-800/20 p-3 rounded-lg border border-primary-700/30">
              <div className="flex items-center gap-2 text-primary-400 mb-1">
                <Percent className="w-4 h-4" />
                <span className="text-xs">نرخ سود</span>
              </div>
              <p className="font-bold text-primary-300">{loan.interestRate}</p>
              {loan.interestRateFA && (
                <p className="text-xs text-primary-400/70 mt-1">{loan.interestRateFA}</p>
              )}
            </div>
          )}

          {/* Amount */}
          {(loan.minAmount || loan.maxAmount) && (
            <div className="bg-secondary-800/20 p-3 rounded-lg border border-secondary-700/30">
              <div className="flex items-center gap-2 text-secondary-500 mb-1">
                <Banknote className="w-4 h-4" />
                <span className="text-xs">مبلغ</span>
              </div>
              <p className="font-bold text-secondary-400">
                {loan.maxAmount || loan.minAmount}
              </p>
              {loan.maxAmountFA && (
                <p className="text-xs text-secondary-500/70 mt-1">{loan.maxAmountFA}</p>
              )}
            </div>
          )}

          {/* Repayment Period */}
          {(loan.repaymentPeriod || loan.minTerm || loan.maxTerm) && (
            <div className="bg-purple-900/20 p-3 rounded-lg border border-purple-700/30">
              <div className="flex items-center gap-2 text-purple-400 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-xs">بازپرداخت</span>
              </div>
              <p className="font-bold text-purple-300">
                {loan.repaymentPeriod || `${loan.minTerm} تا ${loan.maxTerm}`}
              </p>
              {loan.repaymentPeriodFA && (
                <p className="text-xs text-purple-400/70 mt-1">{loan.repaymentPeriodFA}</p>
              )}
            </div>
          )}

          {/* Guarantor */}
          <div className={`p-3 rounded-lg border ${hasGuarantor ? 'bg-yellow-900/20 border-yellow-700/30' : 'bg-secondary-800/20 border-secondary-700/30'}`}>
            <div className={`flex items-center gap-2 mb-1 ${hasGuarantor ? 'text-yellow-400' : 'text-secondary-500'}`}>
              <UserCheck className="w-4 h-4" />
              <span className="text-xs">ضامن</span>
            </div>
            <p className={`font-bold ${hasGuarantor ? 'text-yellow-300' : 'text-secondary-400'}`}>
              {hasGuarantor ? 'نیاز به ضامن' : 'بدون ضامن'}
            </p>
            {loan.guarantorFA && (
              <p className={`text-xs mt-1 ${hasGuarantor ? 'text-yellow-400/70' : 'text-secondary-500/70'}`}>
                {loan.guarantorFA}
              </p>
            )}
          </div>
        </div>

        {/* Monthly Payment */}
        {loan.monthlyPayment && (
          <div className="bg-primary-800/20 p-4 rounded-lg border border-primary-700/30">
            <div className="flex items-center gap-2 text-primary-400 mb-2">
              <Calculator className="w-5 h-5" />
              <span className="font-medium">قسط ماهانه</span>
            </div>
            <p className="text-2xl font-bold text-primary-300">{loan.monthlyPayment}</p>
            {loan.monthlyPaymentFA && (
              <p className="text-sm text-primary-400/70 mt-1">{loan.monthlyPaymentFA}</p>
            )}
          </div>
        )}

        {/* Fee Info */}
        {(loan.fee || loan.creditCheckFee || loan.applicationFee) && (
          <div className="flex flex-wrap gap-3">
            {loan.fee && (
              <div className="bg-orange-900/20 px-4 py-2 rounded-lg border border-orange-700/30">
                <span className="text-orange-400 text-sm">کارمزد: </span>
                <span className="font-bold text-orange-300">{loan.fee}</span>
                {loan.feeFA && (
                  <p className="text-xs text-orange-400/70 mt-1">{loan.feeFA}</p>
                )}
              </div>
            )}
            {loan.creditCheckFee && (
              <div className="bg-orange-900/20 px-4 py-2 rounded-lg border border-orange-700/30">
                <span className="text-orange-400 text-sm">هزینه اعتبارسنجی: </span>
                <span className="font-bold text-orange-300">{loan.creditCheckFee}</span>
                {loan.creditCheckFeeFA && (
                  <p className="text-xs text-orange-400/70 mt-1">{loan.creditCheckFeeFA}</p>
                )}
              </div>
            )}
            {loan.applicationFee && (
              <div className="bg-orange-900/20 px-4 py-2 rounded-lg border border-orange-700/30">
                <span className="text-orange-400 text-sm">هزینه درخواست: </span>
                <span className="font-bold text-orange-300">{loan.applicationFee}</span>
                {loan.applicationFeeFA && (
                  <p className="text-xs text-orange-400/70 mt-1">{loan.applicationFeeFA}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Deposit Rate & Late Payment Rate */}
        {(loan.depositRate || loan.latePaymentRate) && (
          <div className="flex flex-wrap gap-3">
            {loan.depositRate && (
              <div className="bg-secondary-800/20 px-4 py-2 rounded-lg border border-secondary-700/30">
                <span className="text-secondary-500 text-sm">نرخ سپرده: </span>
                <span className="font-bold text-secondary-400">{loan.depositRate}</span>
                {loan.depositRateFA && (
                  <p className="text-xs text-secondary-500/70 mt-1">{loan.depositRateFA}</p>
                )}
              </div>
            )}
            {loan.latePaymentRate && (
              <div className="bg-error-900/20 px-4 py-2 rounded-lg border border-error-700/30">
                <span className="text-error-500 text-sm">نرخ دیرکرد: </span>
                <span className="font-bold text-error-400">{loan.latePaymentRate}</span>
                {loan.latePaymentRateFA && (
                  <p className="text-xs text-error-500/70 mt-1">{loan.latePaymentRateFA}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Total Repayment & Interest */}
        {(loan.totalRepayment || loan.totalInterest) && (
          <div className="bg-purple-900/20 p-4 rounded-lg border border-purple-700/30">
            <div className="flex items-center gap-2 text-purple-400 mb-2">
              <TrendingUp className="w-5 h-5" />
              <span className="font-medium">اطلاعات بازپرداخت کل</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {loan.totalRepayment && (
                <div>
                  <p className="text-xs text-purple-400/70">کل بازپرداخت</p>
                  <p className="font-bold text-purple-300">{loan.totalRepayment}</p>
                </div>
              )}
              {loan.totalInterest && (
                <div>
                  <p className="text-xs text-purple-400/70">کل سود</p>
                  <p className="font-bold text-purple-300">{loan.totalInterest}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Collateral */}
        {loan.collateral && (
          <div className="bg-yellow-900/20 p-4 rounded-lg border border-yellow-700/30">
            <div className="flex items-center gap-2 text-yellow-400 mb-2">
              <Shield className="w-5 h-5" />
              <span className="font-medium">وثیقه</span>
            </div>
            <p className="text-yellow-300">{loan.collateral}</p>
            {loan.collateralFA && (
              <p className="text-sm text-yellow-400/70 mt-1">{loan.collateralFA}</p>
            )}
          </div>
        )}

        {/* Average Period (for deposit-based loans) */}
        {loan.minAveragePeriod && (
          <div className="bg-cyan-900/20 px-4 py-2 rounded-lg border border-cyan-700/30">
            <span className="text-cyan-400 text-sm">حداقل مدت معدل‌گیری: </span>
            <span className="font-bold text-cyan-300">{loan.minAveragePeriod}</span>
            {loan.averagePeriodFA && (
              <p className="text-xs text-cyan-400/70 mt-1">{loan.averagePeriodFA}</p>
            )}
          </div>
        )}

        {/* Loan Options */}
        {loan.loanOptions && loan.loanOptions.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-gray-300 mb-3">
              <Layers className="w-5 h-5" />
              <span className="font-medium">گزینه‌های وام</span>
            </div>
            <div className="grid gap-3">
              {loan.loanOptions.map((option, idx) => (
                <div key={idx} className="bg-surface-50 p-3 rounded-lg border border-surface-50">
                  {(option.name || option.nameFA) && (
                    <p className="font-medium text-gray-200 mb-2">{option.nameFA || option.name}</p>
                  )}
                  <div className="flex flex-wrap gap-4 text-sm">
                    {option.amount && (
                      <span><span className="text-gray-500">مبلغ: </span><span className="text-gray-300">{option.amountFA || option.amount}</span></span>
                    )}
                    {option.interestRate && (
                      <span><span className="text-gray-500">نرخ سود: </span><span className="text-gray-300">{option.interestRate}</span></span>
                    )}
                    {option.repaymentPeriod && (
                      <span><span className="text-gray-500">بازپرداخت: </span><span className="text-gray-300">{option.repaymentPeriod}</span></span>
                    )}
                    {option.fee && (
                      <span><span className="text-gray-500">کارمزد: </span><span className="text-gray-300">{option.fee}</span></span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step System (Hi Bank style) */}
        {loan.stepSystem && (
          <div>
            <div className="flex items-center gap-2 text-gray-300 mb-3">
              <Layers className="w-5 h-5" />
              <span className="font-medium">سیستم پلکانی</span>
            </div>
            {loan.stepSystem.descriptionFA && (
              <p className="text-sm text-gray-400 mb-3">{loan.stepSystem.descriptionFA}</p>
            )}
            <div className="space-y-2">
              {loan.stepSystem.tiers.map((tier, idx) => (
                <div key={idx} className="bg-gradient-to-l from-primary-800/20 to-surface-100 p-3 rounded-lg border-r-4 border-primary-400">
                  <p className="font-medium text-gray-200">{tier.nameFA || tier.name}</p>
                  <div className="flex flex-wrap gap-4 text-sm mt-1">
                    {tier.amount && (
                      <span><span className="text-gray-500">مبلغ: </span><span className="text-gray-300">{tier.amountFA || tier.amount}</span></span>
                    )}
                    {tier.interestRate && (
                      <span><span className="text-gray-500">نرخ: </span><span className="text-gray-300">{tier.interestRate}</span></span>
                    )}
                    {tier.timeToUnlock && (
                      <span><span className="text-gray-500">زمان باز شدن: </span><span className="text-gray-300">{tier.timeToUnlock}</span></span>
                    )}
                  </div>
                  {tier.requirementFA && (
                    <p className="text-xs text-gray-500 mt-1">{tier.requirementFA}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Guarantor Requirements Matrix (Bank Day style) */}
        {loan.guarantorRequirements && (
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
                  {loan.guarantorRequirements.upTo300M && (
                    <tr className="border-b border-surface-50">
                      <td className="px-3 py-2 text-gray-300">تا ۳۰۰ میلیون</td>
                      <td className="px-3 py-2 font-medium text-primary-400">{loan.guarantorRequirements.upTo300M.guarantors} نفر</td>
                      <td className="px-3 py-2 text-gray-500">{loan.guarantorRequirements.upTo300M.descriptionFA || '-'}</td>
                    </tr>
                  )}
                  {loan.guarantorRequirements['300Mto500M'] && (
                    <tr className="border-b border-surface-50">
                      <td className="px-3 py-2 text-gray-300">۳۰۰ تا ۵۰۰ میلیون</td>
                      <td className="px-3 py-2 font-medium text-primary-400">{loan.guarantorRequirements['300Mto500M'].guarantors} نفر</td>
                      <td className="px-3 py-2 text-gray-500">{loan.guarantorRequirements['300Mto500M'].descriptionFA || '-'}</td>
                    </tr>
                  )}
                  {loan.guarantorRequirements['500Mto1B'] && (
                    <tr className="border-b border-surface-50">
                      <td className="px-3 py-2 text-gray-300">۵۰۰ میلیون تا ۱ میلیارد</td>
                      <td className="px-3 py-2 font-medium text-primary-400">{loan.guarantorRequirements['500Mto1B'].guarantors} نفر</td>
                      <td className="px-3 py-2 text-gray-500">{loan.guarantorRequirements['500Mto1B'].descriptionFA || '-'}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {loan.guarantorRequirements.additionalGuarantee && (
              <p className="text-xs text-yellow-400/70 mt-2 bg-yellow-900/20 p-2 rounded border border-yellow-700/30">
                {loan.guarantorRequirements.additionalGuarantee}
              </p>
            )}
          </div>
        )}

        {/* Credit Rating Requirements Matrix */}
        {loan.creditRatingRequirements && (
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
                  {loan.creditRatingRequirements.ratingA && (
                    <tr className="border-b border-surface-50">
                      <td className="px-3 py-2"><Badge variant="green">رتبه A</Badge></td>
                      <td className="px-3 py-2 text-gray-300">{loan.creditRatingRequirements.ratingA.maxLoanFA || loan.creditRatingRequirements.ratingA.maxLoan || '-'}</td>
                      <td className="px-3 py-2 text-gray-500">{loan.creditRatingRequirements.ratingA.guarantorRequirement || '-'}</td>
                    </tr>
                  )}
                  {loan.creditRatingRequirements.ratingB && (
                    <tr className="border-b border-surface-50">
                      <td className="px-3 py-2"><Badge variant="blue">رتبه B</Badge></td>
                      <td className="px-3 py-2 text-gray-300">{loan.creditRatingRequirements.ratingB.maxLoanFA || loan.creditRatingRequirements.ratingB.maxLoan || '-'}</td>
                      <td className="px-3 py-2 text-gray-500">{loan.creditRatingRequirements.ratingB.guarantorRequirement || '-'}</td>
                    </tr>
                  )}
                  {loan.creditRatingRequirements.ratingCandD && (
                    <tr className="border-b border-surface-50">
                      <td className="px-3 py-2"><Badge variant="yellow">رتبه C و D</Badge></td>
                      <td className="px-3 py-2 text-gray-300">{loan.creditRatingRequirements.ratingCandD.maxLoanFA || loan.creditRatingRequirements.ratingCandD.maxLoan || '-'}</td>
                      <td className="px-3 py-2 text-gray-500">{loan.creditRatingRequirements.ratingCandD.guarantorRequirement || '-'}</td>
                    </tr>
                  )}
                  {loan.creditRatingRequirements.ratingE && (
                    <tr className="border-b border-surface-50">
                      <td className="px-3 py-2"><Badge variant="red">رتبه E</Badge></td>
                      <td className="px-3 py-2 text-gray-300">{loan.creditRatingRequirements.ratingE.maxLoanFA || loan.creditRatingRequirements.ratingE.maxLoan || '-'}</td>
                      <td className="px-3 py-2 text-gray-500">{loan.creditRatingRequirements.ratingE.guarantorRequirement || '-'}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Guarantor Note */}
        {loan.guarantorNote && (
          <div className="bg-yellow-900/20 p-3 rounded-lg border border-yellow-700/30">
            <p className="text-yellow-300 text-sm">{loan.guarantorNote}</p>
          </div>
        )}

        {/* Loan Multiplier / Formula */}
        {(loan.loanMultiplier || loan.formula) && (
          <div className="bg-cyan-900/20 p-4 rounded-lg border border-cyan-700/30">
            <div className="flex items-center gap-2 text-cyan-400 mb-2">
              <Calculator className="w-5 h-5" />
              <span className="font-medium">فرمول محاسبه</span>
            </div>
            {loan.loanMultiplier && (
              <p className="font-bold text-cyan-300">ضریب: {loan.loanMultiplier}</p>
            )}
            {loan.loanMultiplierFA && (
              <p className="text-sm text-cyan-400/70">{loan.loanMultiplierFA}</p>
            )}
            {loan.formulaFA && (
              <p className="text-sm text-cyan-300 mt-2">{loan.formulaFA}</p>
            )}
          </div>
        )}

        {/* Available Amounts */}
        {(loan.availableAmounts || loan.amounts) && (
          <div>
            <div className="flex items-center gap-2 text-gray-300 mb-3">
              <Banknote className="w-5 h-5" />
              <span className="font-medium">مبالغ قابل دریافت</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {(loan.availableAmounts || loan.amounts)?.map((amount, idx) => (
                <span
                  key={idx}
                  className="bg-surface-50 text-gray-300 px-3 py-1 rounded-full text-sm border border-surface-50"
                >
                  {amount}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Credit Rating Required */}
        {loan.creditRatingRequired && loan.creditRatingRequired.length > 0 && (
          <div className="bg-yellow-900/20 p-4 rounded-lg border border-yellow-700/30">
            <div className="flex items-center gap-2 text-yellow-400 mb-2">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">رتبه اعتباری مورد نیاز</span>
            </div>
            <div className="flex gap-2">
              {loan.creditRatingRequired.map((rating, idx) => (
                <Badge key={idx} variant="yellow">{rating}</Badge>
              ))}
            </div>
            {loan.creditRatingRequiredFA && (
              <p className="text-sm text-yellow-400/70 mt-2">{loan.creditRatingRequiredFA}</p>
            )}
          </div>
        )}

        {/* Coefficient Table */}
        {loan.coefficientTable && loan.coefficientTable.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-gray-300 mb-3">
              <Table className="w-5 h-5" />
              <span className="font-medium">جدول ضرایب</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-surface-50">
                    {loan.coefficientTable[0].depositMonths !== undefined && (
                      <th className="px-3 py-2 text-right text-gray-300">مدت سپرده (ماه)</th>
                    )}
                    {loan.coefficientTable[0].avgMonths !== undefined && (
                      <th className="px-3 py-2 text-right text-gray-300">مدت معدل (ماه)</th>
                    )}
                    {loan.coefficientTable[0].loanPercent !== undefined && (
                      <th className="px-3 py-2 text-right text-gray-300">درصد وام</th>
                    )}
                    {loan.coefficientTable[0].coefficient !== undefined && (
                      <th className="px-3 py-2 text-right text-gray-300">ضریب</th>
                    )}
                    {loan.coefficientTable[0].repaymentMonths !== undefined && (
                      <th className="px-3 py-2 text-right text-gray-300">بازپرداخت (ماه)</th>
                    )}
                    {loan.coefficientTable[0].interestRate !== undefined && (
                      <th className="px-3 py-2 text-right text-gray-300">نرخ سود</th>
                    )}
                    {loan.coefficientTable[0].repaymentMethod !== undefined && (
                      <th className="px-3 py-2 text-right text-gray-300">روش بازپرداخت</th>
                    )}
                    {loan.coefficientTable[0].pointsNoSupporter !== undefined && (
                      <th className="px-3 py-2 text-right text-gray-300">امتیاز بدون حامی</th>
                    )}
                    {loan.coefficientTable[0].pointsWithSupporter !== undefined && (
                      <th className="px-3 py-2 text-right text-gray-300">امتیاز با حامی</th>
                    )}
                    {loan.coefficientTable[0].creditRating !== undefined && (
                      <th className="px-3 py-2 text-right text-gray-300">رتبه اعتباری</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {loan.coefficientTable.map((row, idx) => (
                    <tr key={idx} className="border-b border-surface-50">
                      {row.depositMonths !== undefined && (
                        <td className="px-3 py-2 text-gray-300">{row.depositMonths}</td>
                      )}
                      {row.avgMonths !== undefined && (
                        <td className="px-3 py-2 text-gray-300">{row.avgMonths}</td>
                      )}
                      {row.loanPercent !== undefined && (
                        <td className="px-3 py-2 font-medium text-primary-400">{row.loanPercent}</td>
                      )}
                      {row.coefficient !== undefined && (
                        <td className="px-3 py-2 font-medium text-primary-400">{row.coefficient}</td>
                      )}
                      {row.repaymentMonths !== undefined && (
                        <td className="px-3 py-2 text-gray-300">{row.repaymentMonths}</td>
                      )}
                      {row.interestRate !== undefined && (
                        <td className="px-3 py-2 text-gray-300">{row.interestRate}</td>
                      )}
                      {row.repaymentMethod !== undefined && (
                        <td className="px-3 py-2 text-gray-300">{row.repaymentMethod}</td>
                      )}
                      {row.pointsNoSupporter !== undefined && (
                        <td className="px-3 py-2 text-gray-300">{row.pointsNoSupporter ?? '-'}</td>
                      )}
                      {row.pointsWithSupporter !== undefined && (
                        <td className="px-3 py-2 text-gray-300">{row.pointsWithSupporter ?? '-'}</td>
                      )}
                      {row.creditRating !== undefined && (
                        <td className="px-3 py-2 text-gray-300">{row.creditRating}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Requirements */}
        {loan.requirements && loan.requirements.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-gray-300 mb-3">
              <ListChecks className="w-5 h-5" />
              <span className="font-medium">شرایط دریافت</span>
            </div>
            <ul className="space-y-2">
              {loan.requirements.map((req, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-secondary-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300 text-sm">{req}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Eligibility Requirements */}
        {loan.eligibilityRequirements && loan.eligibilityRequirements.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-gray-300 mb-3">
              <FileText className="w-5 h-5" />
              <span className="font-medium">شرایط واجدین شرایط</span>
            </div>
            <ul className="space-y-2">
              {loan.eligibilityRequirements.map((req, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300 text-sm">{req}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Financial Behavior Factors */}
        {loan.financialBehaviorFactors && loan.financialBehaviorFactors.length > 0 && (
          <div className="bg-surface-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-gray-300 mb-3">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">عوامل موثر در رفتار مالی</span>
            </div>
            <ul className="space-y-2">
              {loan.financialBehaviorFactors.map((factor, idx) => (
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
        {loan.creditCheckSystems && loan.creditCheckSystems.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-gray-300 mb-3">
              <FileText className="w-5 h-5" />
              <span className="font-medium">سامانه‌های استعلام</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {loan.creditCheckSystems.map((system, idx) => (
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
        {loan.processingTime && (
          <div className="text-center bg-surface-50 p-3 rounded-lg">
            <span className="text-gray-500 text-sm">زمان پردازش: </span>
            <span className="font-bold text-gray-200">{loan.processingTime}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

export default LoanDetailCard;
