/**
 * Loan Coefficient Table Component
 * Displays the coefficient table with dynamic columns
 */

import { memo } from 'react';
import { Table } from 'lucide-react';
import type { LoanType } from '@/types';

interface LoanCoefficientTableProps {
  loan: LoanType;
}

export const LoanCoefficientTable = memo(function LoanCoefficientTable({
  loan,
}: LoanCoefficientTableProps) {
  const hasTable = loan.coefficientTable && loan.coefficientTable.length > 0;

  if (!hasTable) {
    return null;
  }

  // Get first row to determine columns
  const firstRow = loan.coefficientTable![0];

  return (
    <div>
      <div className="flex items-center gap-2 text-gray-300 mb-3">
        <Table className="w-5 h-5" />
        <span className="font-medium">جدول ضرایب</span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-surface-50">
              {firstRow.depositMonths !== undefined && (
                <th className="px-3 py-2 text-right text-gray-300">مدت سپرده (ماه)</th>
              )}
              {firstRow.avgMonths !== undefined && (
                <th className="px-3 py-2 text-right text-gray-300">مدت معدل (ماه)</th>
              )}
              {firstRow.loanPercent !== undefined && (
                <th className="px-3 py-2 text-right text-gray-300">درصد وام</th>
              )}
              {firstRow.coefficient !== undefined && (
                <th className="px-3 py-2 text-right text-gray-300">ضریب</th>
              )}
              {firstRow.repaymentMonths !== undefined && (
                <th className="px-3 py-2 text-right text-gray-300">بازپرداخت (ماه)</th>
              )}
              {firstRow.interestRate !== undefined && (
                <th className="px-3 py-2 text-right text-gray-300">نرخ سود</th>
              )}
              {firstRow.repaymentMethod !== undefined && (
                <th className="px-3 py-2 text-right text-gray-300">روش بازپرداخت</th>
              )}
              {firstRow.pointsNoSupporter !== undefined && (
                <th className="px-3 py-2 text-right text-gray-300">امتیاز بدون حامی</th>
              )}
              {firstRow.pointsWithSupporter !== undefined && (
                <th className="px-3 py-2 text-right text-gray-300">امتیاز با حامی</th>
              )}
              {firstRow.creditRating !== undefined && (
                <th className="px-3 py-2 text-right text-gray-300">رتبه اعتباری</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loan.coefficientTable!.map((row, idx) => (
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
  );
});
