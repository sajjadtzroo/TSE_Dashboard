/**
 * Bank Detail Component - Shows all bank and loan data (Dark Theme)
 */

import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Globe,
  CreditCard,
  Info,
  Calculator,
  Table,
  FileText,
  CheckCircle2,
  Coins,
  Layers,
  UserCheck,
  Shield,
  Home,
} from 'lucide-react';
import { useBank, useBankLoans } from '../../hooks';
import { Card, Badge, LoadingPage, Empty, Breadcrumb } from '../../components/ui';
import { LoanDetailCard } from '../../components/cards';
import type { CoefficientRow } from '../../types';

interface BankDetailProps {
  bankId: string;
}

export function BankDetailView({ bankId }: BankDetailProps) {
  const { data: bank, isLoading: bankLoading } = useBank(bankId);
  const { data: loans, isLoading: loansLoading } = useBankLoans(bankId);

  if (bankLoading || loansLoading) {
    return <LoadingPage />;
  }

  if (!bank) {
    return (
      <Empty
        title="بانک یافت نشد"
        description="بانک مورد نظر در سیستم موجود نیست"
        action={
          <Link to="/banks" className="text-primary-400 hover:text-primary-300">
            بازگشت به لیست بانک‌ها
          </Link>
        }
      />
    );
  }

  const isDigital = bank.category === 'digital-banks';

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: 'خانه', href: '/', icon: Home },
          { label: 'بانک‌ها', href: '/banks' },
          { label: bank.nameFA },
        ]}
      />

      {/* Back link */}
      <Link
        to="/banks"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-200"
      >
        <ArrowRight className="w-4 h-4" />
        <span>بازگشت به لیست بانک‌ها</span>
      </Link>

      {/* Bank Header */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-800/20 rounded-xl border border-primary-700/30">
              <Building2 className="w-12 h-12 text-primary-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-50">{bank.nameFA}</h1>
              <p className="text-gray-200">{bank.nameEN}</p>
              {bank.parentBankFA && (
                <p className="text-sm text-gray-400 mt-1">
                  زیرمجموعه: {bank.parentBankFA}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant={isDigital ? 'purple' : 'blue'}>
                  {isDigital ? 'بانک دیجیتال' : 'بانک سنتی'}
                </Badge>
                {bank.type && (
                  <Badge variant="gray">{bank.type}</Badge>
                )}
                {bank.calculationMethod && (
                  <Badge variant="green">{bank.calculationMethod}</Badge>
                )}
              </div>
            </div>
          </div>
          {bank.website && (
            <a
              href={bank.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-primary-400 hover:text-primary-300 bg-primary-800/20 px-4 py-2 rounded-lg border border-primary-700/40 hover:border-primary-600/50 transition-all"
            >
              <Globe className="w-4 h-4" />
              <span>وبسایت رسمی</span>
            </a>
          )}
        </div>

        {/* Description */}
        {bank.descriptionFA && (
          <div className="mt-4 pt-4 border-t border-border-dark">
            <p className="text-gray-200 leading-relaxed">{bank.descriptionFA}</p>
          </div>
        )}
      </Card>

      {/* Scoring System */}
      {bank.scoringSystem && (
        <Card>
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border-dark">
            <Coins className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-semibold text-gray-50">سیستم امتیازدهی</h2>
          </div>
          <div className="bg-yellow-900/15 border border-yellow-700/40 p-4 rounded-lg space-y-3">
            {bank.scoringSystem.formulaFA && (
              <p className="text-yellow-200">
                <strong className="text-yellow-100">فرمول:</strong> {bank.scoringSystem.formulaFA}
              </p>
            )}
            {bank.scoringSystem.clubName && (
              <p className="text-yellow-200">
                <strong className="text-yellow-100">باشگاه:</strong> {bank.scoringSystem.clubName}
              </p>
            )}
            {bank.scoringSystem.calculationPeriodFA && (
              <p className="text-yellow-300 text-sm">
                {bank.scoringSystem.calculationPeriodFA}
              </p>
            )}
            {bank.scoringSystem.maxLoan && (
              <p className="text-yellow-100 font-bold">
                حداکثر وام: {bank.scoringSystem.maxLoan}
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Loan Calculator Examples */}
      {bank.loanCalculatorExamples && bank.loanCalculatorExamples.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border-dark">
            <Calculator className="w-5 h-5 text-primary-400" />
            <h2 className="text-lg font-semibold text-gray-50">نمونه محاسبه وام</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bank.loanCalculatorExamples?.map((example, idx) => (
              <div key={idx} className="bg-primary-800/15 border border-primary-700/40 p-4 rounded-lg space-y-2 hover:border-primary-600/50 transition-colors">
                <div className="flex justify-between">
                  <span className="text-primary-300 text-sm font-medium">مبلغ وام:</span>
                  <span className="font-bold text-gray-50">{example.amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-primary-300 text-sm font-medium">مدت بازپرداخت:</span>
                  <span className="text-gray-100">{example.repaymentPeriod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-primary-300 text-sm font-medium">قسط ماهانه:</span>
                  <span className="font-bold text-gray-50">{example.monthlyPayment}</span>
                </div>
                {example.interest && (
                  <div className="flex justify-between">
                    <span className="text-primary-300 text-sm font-medium">سود ({example.interestRate}):</span>
                    <span className="text-gray-100">{example.interest}</span>
                  </div>
                )}
                {example.digitalServiceFee && (
                  <div className="flex justify-between">
                    <span className="text-primary-300 text-sm font-medium">کارمزد خدمات:</span>
                    <span className="text-gray-100">{example.digitalServiceFee}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-primary-700/40">
                  <div className="flex justify-between">
                    <span className="text-primary-200 font-medium">جمع بازپرداخت:</span>
                    <span className="font-bold text-gray-50">{example.totalRepayment}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Vamino Tables (for Bankino) */}
      {bank.vaminoMonthlyTable && bank.vaminoMonthlyTable.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Table className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-gray-50">جدول وامینو ماهانه</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-purple-900/30">
                  <th className="px-4 py-2 text-right text-purple-300">امتیاز مورد نیاز</th>
                  <th className="px-4 py-2 text-right text-purple-300">مبلغ اعتبار</th>
                </tr>
              </thead>
              <tbody>
                {bank.vaminoMonthlyTable?.map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-surface-100' : 'bg-purple-900/10'}>
                    <td className="px-4 py-2 text-gray-300">{row.points}</td>
                    <td className="px-4 py-2 font-medium text-purple-400">{row.creditAmount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {bank.vaminoInstallmentTable && bank.vaminoInstallmentTable.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Table className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-gray-50">جدول وامینو اقساطی</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-purple-900/30">
                  <th className="px-3 py-2 text-right text-purple-300">مبلغ</th>
                  <th className="px-3 py-2 text-right text-purple-300">تعداد اقساط</th>
                  <th className="px-3 py-2 text-right text-purple-300">امتیاز بدون حامی</th>
                  <th className="px-3 py-2 text-right text-purple-300">امتیاز با حامی</th>
                  <th className="px-3 py-2 text-right text-purple-300">رتبه اعتباری</th>
                </tr>
              </thead>
              <tbody>
                {bank.vaminoInstallmentTable?.map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-surface-100' : 'bg-purple-900/10'}>
                    <td className="px-3 py-2 font-medium text-gray-200">{row.amount}</td>
                    <td className="px-3 py-2 text-gray-300">{row.months} ماه</td>
                    <td className="px-3 py-2 text-gray-300">
                      {row.pointsNoSupporter !== null ? row.pointsNoSupporter?.toLocaleString() : '-'}
                    </td>
                    <td className="px-3 py-2 text-secondary-500 font-medium">
                      {row.pointsWithSupporter?.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-400">{row.creditRating}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Coefficient Tables (object format with multiple fee scenarios) */}
      {bank.coefficientTables && Object.keys(bank.coefficientTables).length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Table className="w-5 h-5 text-secondary-500" />
            <h2 className="text-lg font-semibold text-gray-50">جداول ضرایب بر اساس کارمزد</h2>
          </div>
          <div className="space-y-6">
            {bank.coefficientTables && Object.entries(bank.coefficientTables).map(([feeKey, tableData]) => {
              const rows = tableData as CoefficientRow[];
              if (!rows || rows.length === 0) return null;

              const feeLabels: Record<string, string> = {
                zeroFee: 'بدون کارمزد (۰٪)',
                twoPercentFee: 'کارمزد ۲٪',
                fourPercentFee: 'کارمزد ۴٪',
              };

              return (
                <div key={feeKey} className="border border-secondary-700/30 rounded-lg overflow-hidden">
                  <div className="bg-secondary-900/20 px-4 py-2 border-b border-secondary-700/30">
                    <h3 className="font-medium text-secondary-400">{feeLabels[feeKey] || feeKey}</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-secondary-900/20">
                          {rows[0].depositMonths !== undefined && (
                            <th className="px-3 py-2 text-right text-secondary-400">مدت سپرده (ماه)</th>
                          )}
                          {rows[0].avgMonths !== undefined && (
                            <th className="px-3 py-2 text-right text-secondary-400">مدت معدل (ماه)</th>
                          )}
                          {rows[0].coefficient !== undefined && (
                            <th className="px-3 py-2 text-right text-secondary-400">ضریب</th>
                          )}
                          {rows[0].loanPercent !== undefined && (
                            <th className="px-3 py-2 text-right text-secondary-400">درصد وام</th>
                          )}
                          {rows[0].repaymentMonths !== undefined && (
                            <th className="px-3 py-2 text-right text-secondary-400">بازپرداخت (ماه)</th>
                          )}
                          {rows[0].interestRate !== undefined && (
                            <th className="px-3 py-2 text-right text-secondary-400">نرخ سود</th>
                          )}
                          {rows[0].repaymentMethod !== undefined && (
                            <th className="px-3 py-2 text-right text-secondary-400">روش بازپرداخت</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-surface-100' : 'bg-secondary-900/10'}>
                            {row.depositMonths !== undefined && (
                              <td className="px-3 py-2 text-gray-300">{row.depositMonths}</td>
                            )}
                            {row.avgMonths !== undefined && (
                              <td className="px-3 py-2 text-gray-300">{row.avgMonths}</td>
                            )}
                            {row.coefficient !== undefined && (
                              <td className="px-3 py-2 font-medium text-secondary-400">{row.coefficient}</td>
                            )}
                            {row.loanPercent !== undefined && (
                              <td className="px-3 py-2 font-medium text-secondary-400">{row.loanPercent}</td>
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
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Step System (Hi Bank style) */}
      {bank.stepSystem && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg font-semibold text-gray-50">سیستم پلکانی</h2>
          </div>
          {bank.stepSystem?.descriptionFA && (
            <p className="text-gray-300 mb-4">{bank.stepSystem.descriptionFA}</p>
          )}
          <div className="space-y-3">
            {bank.stepSystem?.tiers?.map((tier, idx) => (
              <div key={idx} className="bg-gradient-to-l from-orange-900/20 to-surface-100 p-4 rounded-lg border-r-4 border-orange-500">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-orange-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">
                    {idx + 1}
                  </span>
                  <p className="font-bold text-gray-100">{tier.nameFA || tier.name}</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {tier.amount && (
                    <div>
                      <span className="text-gray-400">مبلغ: </span>
                      <span className="font-medium text-gray-200">{tier.amountFA || tier.amount}</span>
                    </div>
                  )}
                  {tier.interestRate && (
                    <div>
                      <span className="text-gray-400">نرخ سود: </span>
                      <span className="font-medium text-gray-200">{tier.interestRate}</span>
                    </div>
                  )}
                  {tier.timeToUnlock && (
                    <div>
                      <span className="text-gray-400">زمان باز شدن: </span>
                      <span className="font-medium text-gray-200">{tier.timeToUnlock}</span>
                    </div>
                  )}
                </div>
                {tier.requirementFA && (
                  <p className="text-xs text-gray-500 mt-2">{tier.requirementFA}</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Guarantor Requirements (Bank-level) */}
      {bank.guarantorRequirements && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <UserCheck className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-gray-50">جدول تعداد ضامنین</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-amber-900/30">
                  <th className="px-4 py-2 text-right text-amber-300">سقف مبلغ</th>
                  <th className="px-4 py-2 text-right text-amber-300">تعداد ضامن</th>
                  <th className="px-4 py-2 text-right text-amber-300">توضیحات</th>
                </tr>
              </thead>
              <tbody>
                {bank.guarantorRequirements.upTo300M && (
                  <tr className="bg-surface-100">
                    <td className="px-4 py-2 text-gray-300">تا ۳۰۰ میلیون تومان</td>
                    <td className="px-4 py-2 font-bold text-amber-400">{bank.guarantorRequirements.upTo300M.guarantors} نفر</td>
                    <td className="px-4 py-2 text-gray-400">{bank.guarantorRequirements.upTo300M.descriptionFA || '-'}</td>
                  </tr>
                )}
                {bank.guarantorRequirements['300Mto500M'] && (
                  <tr className="bg-amber-900/10">
                    <td className="px-4 py-2 text-gray-300">۳۰۰ تا ۵۰۰ میلیون تومان</td>
                    <td className="px-4 py-2 font-bold text-amber-400">{bank.guarantorRequirements['300Mto500M'].guarantors} نفر</td>
                    <td className="px-4 py-2 text-gray-400">{bank.guarantorRequirements['300Mto500M'].descriptionFA || '-'}</td>
                  </tr>
                )}
                {bank.guarantorRequirements['500Mto1B'] && (
                  <tr className="bg-surface-100">
                    <td className="px-4 py-2 text-gray-300">۵۰۰ میلیون تا ۱ میلیارد تومان</td>
                    <td className="px-4 py-2 font-bold text-amber-400">{bank.guarantorRequirements['500Mto1B'].guarantors} نفر</td>
                    <td className="px-4 py-2 text-gray-400">{bank.guarantorRequirements['500Mto1B'].descriptionFA || '-'}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {bank.guarantorRequirements.additionalGuarantee && (
            <div className="mt-3 bg-yellow-900/20 border border-yellow-700/30 p-3 rounded-lg text-yellow-300 text-sm">
              {bank.guarantorRequirements.additionalGuarantee}
            </div>
          )}
        </Card>
      )}

      {/* Credit Rating Requirements (Bank-level) */}
      {bank.creditRatingRequirements && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-primary-400" />
            <h2 className="text-lg font-semibold text-gray-50">شرایط بر اساس رتبه اعتباری</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-primary-800/30">
                  <th className="px-4 py-2 text-right text-primary-300">رتبه اعتباری</th>
                  <th className="px-4 py-2 text-right text-primary-300">سقف وام</th>
                  <th className="px-4 py-2 text-right text-primary-300">شرایط ضامن</th>
                </tr>
              </thead>
              <tbody>
                {bank.creditRatingRequirements.ratingA && (
                  <tr className="bg-surface-100">
                    <td className="px-4 py-2"><Badge variant="green">رتبه A</Badge></td>
                    <td className="px-4 py-2 text-gray-200">{bank.creditRatingRequirements.ratingA.maxLoanFA || bank.creditRatingRequirements.ratingA.maxLoan || '-'}</td>
                    <td className="px-4 py-2 text-gray-400">{bank.creditRatingRequirements.ratingA.guarantorRequirement || '-'}</td>
                  </tr>
                )}
                {bank.creditRatingRequirements.ratingB && (
                  <tr className="bg-primary-800/10">
                    <td className="px-4 py-2"><Badge variant="blue">رتبه B</Badge></td>
                    <td className="px-4 py-2 text-gray-200">{bank.creditRatingRequirements.ratingB.maxLoanFA || bank.creditRatingRequirements.ratingB.maxLoan || '-'}</td>
                    <td className="px-4 py-2 text-gray-400">{bank.creditRatingRequirements.ratingB.guarantorRequirement || '-'}</td>
                  </tr>
                )}
                {bank.creditRatingRequirements.ratingCandD && (
                  <tr className="bg-surface-100">
                    <td className="px-4 py-2"><Badge variant="yellow">رتبه C و D</Badge></td>
                    <td className="px-4 py-2 text-gray-200">{bank.creditRatingRequirements.ratingCandD.maxLoanFA || bank.creditRatingRequirements.ratingCandD.maxLoan || '-'}</td>
                    <td className="px-4 py-2 text-gray-400">{bank.creditRatingRequirements.ratingCandD.guarantorRequirement || '-'}</td>
                  </tr>
                )}
                {bank.creditRatingRequirements.ratingE && (
                  <tr className="bg-primary-800/10">
                    <td className="px-4 py-2"><Badge variant="red">رتبه E</Badge></td>
                    <td className="px-4 py-2 text-gray-200">{bank.creditRatingRequirements.ratingE.maxLoanFA || bank.creditRatingRequirements.ratingE.maxLoan || '-'}</td>
                    <td className="px-4 py-2 text-gray-400">{bank.creditRatingRequirements.ratingE.guarantorRequirement || '-'}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Main Program (Bank Iran Zamin style) */}
      {bank.mainProgram && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-5 h-5 text-secondary-500" />
            <h2 className="text-lg font-semibold text-gray-50">برنامه اصلی</h2>
          </div>
          <div className="bg-secondary-900/20 border border-secondary-700/30 p-4 rounded-lg space-y-2">
            {bank.mainProgram.nameFA && (
              <p className="font-bold text-secondary-400">{bank.mainProgram.nameFA}</p>
            )}
            {bank.mainProgram.descriptionFA && (
              <p className="text-secondary-300">{bank.mainProgram.descriptionFA}</p>
            )}
            {bank.mainProgram.benefitsFA && (
              <ul className="list-disc list-inside text-secondary-300 text-sm">
                {(bank.mainProgram.benefitsFA as string[]).map((benefit: string, idx: number) => (
                  <li key={idx}>{benefit}</li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      )}

      {/* Process Steps */}
      {bank.process && bank.process.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-primary-400" />
            <h2 className="text-lg font-semibold text-gray-50">مراحل دریافت وام</h2>
          </div>
          <ol className="space-y-3">
            {bank.process?.map((step, idx) => (
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
      {(bank.requirements || bank.generalRequirements || bank.generalFeatures) && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-50">شرایط و ویژگی‌های عمومی</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bank.requirements?.guarantorFA && (
              <div className="flex items-center gap-2 bg-secondary-900/20 border border-secondary-700/30 p-3 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-secondary-500" />
                <span className="text-secondary-300">{bank.requirements.guarantorFA}</span>
              </div>
            )}
            {bank.requirements?.checkFA && (
              <div className="flex items-center gap-2 bg-secondary-900/20 border border-secondary-700/30 p-3 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-secondary-500" />
                <span className="text-secondary-300">{bank.requirements.checkFA}</span>
              </div>
            )}
            {bank.requirements?.promissoryNoteFA && (
              <div className="flex items-center gap-2 bg-secondary-900/20 border border-secondary-700/30 p-3 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-secondary-500" />
                <span className="text-secondary-300">{bank.requirements.promissoryNoteFA}</span>
              </div>
            )}
            {bank.requirements?.onlineCreditCheckFA && (
              <div className="flex items-center gap-2 bg-primary-800/20 border border-primary-700/30 p-3 rounded-lg">
                <Info className="w-5 h-5 text-primary-400" />
                <span className="text-primary-300">{bank.requirements.onlineCreditCheckFA}</span>
              </div>
            )}
            {bank.requirements?.noBadChecksFA && (
              <div className="flex items-center gap-2 bg-yellow-900/20 border border-yellow-700/30 p-3 rounded-lg">
                <Info className="w-5 h-5 text-yellow-400" />
                <span className="text-yellow-300">{bank.requirements.noBadChecksFA}</span>
              </div>
            )}
            {bank.requirements?.noOverduePaymentsFA && (
              <div className="flex items-center gap-2 bg-yellow-900/20 border border-yellow-700/30 p-3 rounded-lg">
                <Info className="w-5 h-5 text-yellow-400" />
                <span className="text-yellow-300">{bank.requirements.noOverduePaymentsFA}</span>
              </div>
            )}
            {bank.requirements?.moneyNotBlockedFA && (
              <div className="flex items-center gap-2 bg-secondary-900/20 border border-secondary-700/30 p-3 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-secondary-500" />
                <span className="text-secondary-300">{bank.requirements.moneyNotBlockedFA}</span>
              </div>
            )}
            {bank.features?.earlyRepaymentBenefitFA && (
              <div className="flex items-center gap-2 bg-primary-800/20 border border-primary-700/30 p-3 rounded-lg">
                <Info className="w-5 h-5 text-primary-400" />
                <span className="text-primary-300">{bank.features.earlyRepaymentBenefitFA}</span>
              </div>
            )}
            {bank.features?.zeroInterestOneMonthFA && (
              <div className="flex items-center gap-2 bg-secondary-900/20 border border-secondary-700/30 p-3 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-secondary-500" />
                <span className="text-secondary-300">{bank.features.zeroInterestOneMonthFA}</span>
              </div>
            )}
            {bank.features?.depositSpeedFA && (
              <div className="flex items-center gap-2 bg-secondary-900/20 border border-secondary-700/30 p-3 rounded-lg">
                <Info className="w-5 h-5 text-secondary-500" />
                <span className="text-secondary-300">{bank.features.depositSpeedFA}</span>
              </div>
            )}
            {bank.generalFeatures?.fullyOnlineFA && (
              <div className="flex items-center gap-2 bg-purple-900/20 border border-purple-700/30 p-3 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-purple-400" />
                <span className="text-purple-300">{bank.generalFeatures.fullyOnlineFA}</span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Important Note */}
      {(bank.importantNote || bank.note) && (
        <div className="bg-amber-900/20 border border-amber-700/30 p-4 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-amber-300">{bank.importantNote || bank.note}</p>
          </div>
        </div>
      )}

      {/* Loans Section */}
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
    </div>
  );
}

export default BankDetailView;
