/**
 * Bank Coefficient Tables Component
 * Displays Vamino tables and coefficient tables with multiple fee scenarios
 */

import { memo } from 'react';
import { Table } from 'lucide-react';
import { Card } from '@/components/ui';
import type { Bank, CoefficientRow } from '@/types';

interface BankCoefficientTablesProps {
  bank: Bank;
}

export const BankCoefficientTables = memo(function BankCoefficientTables({
  bank,
}: BankCoefficientTablesProps) {
  const hasVaminoMonthly =
    bank.vaminoMonthlyTable && bank.vaminoMonthlyTable.length > 0;
  const hasVaminoInstallment =
    bank.vaminoInstallmentTable && bank.vaminoInstallmentTable.length > 0;
  const hasCoefficientTables =
    bank.coefficientTables && Object.keys(bank.coefficientTables).length > 0;

  if (!hasVaminoMonthly && !hasVaminoInstallment && !hasCoefficientTables) {
    return null;
  }

  return (
    <>
      {/* Vamino Monthly Table */}
      {hasVaminoMonthly && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Table className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-gray-50">
              جدول وامینو ماهانه
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-purple-900/30">
                  <th className="px-4 py-2 text-right text-purple-300">
                    امتیاز مورد نیاز
                  </th>
                  <th className="px-4 py-2 text-right text-purple-300">
                    مبلغ اعتبار
                  </th>
                </tr>
              </thead>
              <tbody>
                {bank.vaminoMonthlyTable?.map((row, idx) => (
                  <tr
                    key={idx}
                    className={
                      idx % 2 === 0 ? 'bg-surface-100' : 'bg-purple-900/10'
                    }
                  >
                    <td className="px-4 py-2 text-gray-300">{row.points}</td>
                    <td className="px-4 py-2 font-medium text-purple-400">
                      {row.creditAmount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Vamino Installment Table */}
      {hasVaminoInstallment && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Table className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-gray-50">
              جدول وامینو اقساطی
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-purple-900/30">
                  <th className="px-3 py-2 text-right text-purple-300">مبلغ</th>
                  <th className="px-3 py-2 text-right text-purple-300">
                    تعداد اقساط
                  </th>
                  <th className="px-3 py-2 text-right text-purple-300">
                    امتیاز بدون حامی
                  </th>
                  <th className="px-3 py-2 text-right text-purple-300">
                    امتیاز با حامی
                  </th>
                  <th className="px-3 py-2 text-right text-purple-300">
                    رتبه اعتباری
                  </th>
                </tr>
              </thead>
              <tbody>
                {bank.vaminoInstallmentTable?.map((row, idx) => (
                  <tr
                    key={idx}
                    className={
                      idx % 2 === 0 ? 'bg-surface-100' : 'bg-purple-900/10'
                    }
                  >
                    <td className="px-3 py-2 font-medium text-gray-200">
                      {row.amount}
                    </td>
                    <td className="px-3 py-2 text-gray-300">
                      {row.months} ماه
                    </td>
                    <td className="px-3 py-2 text-gray-300">
                      {row.pointsNoSupporter !== null
                        ? row.pointsNoSupporter?.toLocaleString()
                        : '-'}
                    </td>
                    <td className="px-3 py-2 text-secondary-500 font-medium">
                      {row.pointsWithSupporter?.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-400">
                      {row.creditRating}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Coefficient Tables */}
      {hasCoefficientTables && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Table className="w-5 h-5 text-secondary-500" />
            <h2 className="text-lg font-semibold text-gray-50">
              جداول ضرایب بر اساس کارمزد
            </h2>
          </div>
          <div className="space-y-6">
            {Object.entries(bank.coefficientTables!).map(([feeKey, tableData]) => {
              const rows = tableData as CoefficientRow[];
              if (!rows || rows.length === 0) return null;

              const feeLabels: Record<string, string> = {
                zeroFee: 'بدون کارمزد (۰٪)',
                twoPercentFee: 'کارمزد ۲٪',
                fourPercentFee: 'کارمزد ۴٪',
              };

              return (
                <div
                  key={feeKey}
                  className="border border-secondary-700/30 rounded-lg overflow-hidden"
                >
                  <div className="bg-secondary-900/20 px-4 py-2 border-b border-secondary-700/30">
                    <h3 className="font-medium text-secondary-400">
                      {feeLabels[feeKey] || feeKey}
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-secondary-900/20">
                          {rows[0].depositMonths !== undefined && (
                            <th className="px-3 py-2 text-right text-secondary-400">
                              مدت سپرده (ماه)
                            </th>
                          )}
                          {rows[0].avgMonths !== undefined && (
                            <th className="px-3 py-2 text-right text-secondary-400">
                              مدت معدل (ماه)
                            </th>
                          )}
                          {rows[0].coefficient !== undefined && (
                            <th className="px-3 py-2 text-right text-secondary-400">
                              ضریب
                            </th>
                          )}
                          {rows[0].loanPercent !== undefined && (
                            <th className="px-3 py-2 text-right text-secondary-400">
                              درصد وام
                            </th>
                          )}
                          {rows[0].repaymentMonths !== undefined && (
                            <th className="px-3 py-2 text-right text-secondary-400">
                              بازپرداخت (ماه)
                            </th>
                          )}
                          {rows[0].interestRate !== undefined && (
                            <th className="px-3 py-2 text-right text-secondary-400">
                              نرخ سود
                            </th>
                          )}
                          {rows[0].repaymentMethod !== undefined && (
                            <th className="px-3 py-2 text-right text-secondary-400">
                              روش بازپرداخت
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, idx) => (
                          <tr
                            key={idx}
                            className={
                              idx % 2 === 0
                                ? 'bg-surface-100'
                                : 'bg-secondary-900/10'
                            }
                          >
                            {row.depositMonths !== undefined && (
                              <td className="px-3 py-2 text-gray-300">
                                {row.depositMonths}
                              </td>
                            )}
                            {row.avgMonths !== undefined && (
                              <td className="px-3 py-2 text-gray-300">
                                {row.avgMonths}
                              </td>
                            )}
                            {row.coefficient !== undefined && (
                              <td className="px-3 py-2 font-medium text-secondary-400">
                                {row.coefficient}
                              </td>
                            )}
                            {row.loanPercent !== undefined && (
                              <td className="px-3 py-2 font-medium text-secondary-400">
                                {row.loanPercent}
                              </td>
                            )}
                            {row.repaymentMonths !== undefined && (
                              <td className="px-3 py-2 text-gray-300">
                                {row.repaymentMonths}
                              </td>
                            )}
                            {row.interestRate !== undefined && (
                              <td className="px-3 py-2 text-gray-300">
                                {row.interestRate}
                              </td>
                            )}
                            {row.repaymentMethod !== undefined && (
                              <td className="px-3 py-2 text-gray-300">
                                {row.repaymentMethod}
                              </td>
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
    </>
  );
});
