/**
 * User Loans List Component
 *
 * Displays all user loans with summary information.
 */

import { CreditCard, TrendingUp, Calendar, ChevronLeft, Trash2, Edit } from 'lucide-react';
import { UserLoan } from '@/services';

interface LoansListProps {
  loans: UserLoan[];
  isLoading?: boolean;
  onLoanClick?: (loanId: string) => void;
  onEditLoan?: (loan: UserLoan) => void;
  onDeleteLoan?: (loanId: string) => void;
}

const formatNumber = (value: string | number): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  return num.toLocaleString('fa-IR');
};

const getLoanTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    equal_installments: 'قسط مساوی',
    reducing_balance: 'مانده نزولی',
    graduated: 'پلکانی',
    balloon: 'بالونی',
    interest_only: 'فقط سود',
  };
  return labels[type] || type;
};

function LoanCard({
  loan,
  onClick,
  onEdit,
  onDelete,
}: {
  loan: UserLoan;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const progressPercent = loan.totalInstallments > 0
    ? Math.round((loan.paidInstallments / loan.totalInstallments) * 100)
    : 0;

  const isCompleted = loan.paidInstallments >= loan.totalInstallments;

  return (
    <div
      className={`bg-surface-100 border ${
        isCompleted ? 'border-green-500/40' : 'border-border-light'
      } rounded-lg p-5 transition-all hover:shadow-lg hover:border-primary-500/40`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg ${isCompleted ? 'bg-green-900/30' : 'bg-primary-900/30'}`}>
            <CreditCard className={`w-5 h-5 ${isCompleted ? 'text-green-400' : 'text-primary-400'}`} />
          </div>
          <div>
            <h3 className="text-gray-100 font-medium">
              {loan.loanNameFA || loan.loanName}
            </h3>
            {(loan.bankNameFA || loan.bankName) && (
              <p className="text-sm text-gray-400">
                {loan.bankNameFA || loan.bankName}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-900/20 rounded-lg transition-colors"
              title="ویرایش"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
              title="حذف"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-400 mb-1">مبلغ وام</p>
          <p className="text-sm font-medium text-gray-100">
            {formatNumber(loan.principalAmount)}
          </p>
          <p className="text-xs text-gray-500">تومان</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">قسط ماهانه</p>
          <p className="text-sm font-medium text-primary-400">
            {formatNumber(loan.monthlyPayment)}
          </p>
          <p className="text-xs text-gray-500">تومان</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">نرخ سود</p>
          <p className="text-sm font-medium text-gray-100">{loan.interestRate}%</p>
          <p className="text-xs text-gray-500">سالانه</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-400">پیشرفت پرداخت</span>
          <span className="text-xs text-gray-300">
            {loan.paidInstallments} از {loan.totalInstallments} قسط
          </span>
        </div>
        <div className="h-2 bg-surface-50 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${isCompleted ? 'bg-green-500' : 'bg-primary-500'}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1 text-left">{progressPercent}%</p>
      </div>

      {/* Next Payment / Status */}
      <div className="flex items-center justify-between pt-3 border-t border-border-dark">
        {isCompleted ? (
          <div className="flex items-center gap-2 text-green-400">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">تسویه شده</span>
          </div>
        ) : loan.nextPaymentDateJalali ? (
          <div className="flex items-center gap-2 text-gray-300">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">قسط بعدی: {loan.nextPaymentDateJalali}</span>
          </div>
        ) : (
          <span className="text-sm text-gray-400">{getLoanTypeLabel(loan.loanType)}</span>
        )}

        {onClick && (
          <button
            onClick={onClick}
            className="flex items-center gap-1 text-sm text-primary-400 hover:text-primary-300 transition-colors"
          >
            جزئیات
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function LoanCardSkeleton() {
  return (
    <div className="bg-surface-100 border border-border-light rounded-lg p-5 animate-pulse">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 bg-surface-50 rounded-lg" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-surface-50 rounded w-2/3" />
          <div className="h-3 bg-surface-50 rounded w-1/3" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 bg-surface-50 rounded w-full" />
            <div className="h-4 bg-surface-50 rounded w-3/4" />
          </div>
        ))}
      </div>
      <div className="h-2 bg-surface-50 rounded-full mb-4" />
      <div className="h-4 bg-surface-50 rounded w-1/2" />
    </div>
  );
}

export function LoansList({
  loans,
  isLoading,
  onLoanClick,
  onEditLoan,
  onDeleteLoan,
}: LoansListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <LoanCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!loans || loans.length === 0) {
    return (
      <div className="bg-surface-100 border border-border-light rounded-lg p-8 text-center">
        <CreditCard className="w-16 h-16 text-gray-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-300 mb-2">هنوز وامی ثبت نشده</h3>
        <p className="text-gray-400">
          برای شروع، اولین وام خود را اضافه کنید
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {loans.map((loan) => (
        <LoanCard
          key={loan.id}
          loan={loan}
          onClick={onLoanClick ? () => onLoanClick(loan.id) : undefined}
          onEdit={onEditLoan ? () => onEditLoan(loan) : undefined}
          onDelete={onDeleteLoan ? () => onDeleteLoan(loan.id) : undefined}
        />
      ))}
    </div>
  );
}

export default LoansList;
