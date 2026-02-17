/**
 * Payment Schedule Table Component
 *
 * Displays the full payment schedule with status indicators.
 */

import { CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react';
import { PaymentScheduleItem, PaymentStatus } from '../../services';

interface PaymentScheduleTableProps {
  schedule: PaymentScheduleItem[];
  onMarkPaid?: (installmentNumber: number) => void;
  isPaying?: boolean;
  payingInstallment?: number;
}

const formatNumber = (value: string | number): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  return num.toLocaleString('fa-IR');
};

const getStatusConfig = (status: PaymentStatus) => {
  switch (status) {
    case 'paid':
      return {
        icon: CheckCircle,
        color: 'text-green-400',
        bgColor: 'bg-green-900/20',
        label: 'پرداخت شده',
      };
    case 'overdue':
      return {
        icon: AlertCircle,
        color: 'text-red-400',
        bgColor: 'bg-red-900/20',
        label: 'معوق',
      };
    case 'partial':
      return {
        icon: XCircle,
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-900/20',
        label: 'ناقص',
      };
    default:
      return {
        icon: Clock,
        color: 'text-gray-400',
        bgColor: 'bg-surface-50',
        label: 'در انتظار',
      };
  }
};

export function PaymentScheduleTable({
  schedule,
  onMarkPaid,
  isPaying,
  payingInstallment,
}: PaymentScheduleTableProps) {
  if (!schedule || schedule.length === 0) {
    return (
      <div className="bg-surface-100 border border-border-light rounded-lg p-6 text-center">
        <p className="text-gray-400">جدول پرداخت موجود نیست</p>
      </div>
    );
  }

  // Calculate totals
  const totalPrincipal = schedule.reduce(
    (sum, p) => sum + parseFloat(p.principalPayment || '0'),
    0
  );
  const totalInterest = schedule.reduce(
    (sum, p) => sum + parseFloat(p.interestPayment || '0'),
    0
  );
  const totalPayment = schedule.reduce(
    (sum, p) => sum + parseFloat(p.totalPayment || '0'),
    0
  );

  const paidCount = schedule.filter((p) => p.status === 'paid').length;
  const overdueCount = schedule.filter((p) => p.status === 'overdue').length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-surface-100 border border-border-light rounded-lg p-3 text-center">
          <p className="text-xs text-gray-400 mb-1">تعداد اقساط</p>
          <p className="text-lg font-bold text-gray-100">{schedule.length}</p>
        </div>
        <div className="bg-green-900/20 border border-green-500/40 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-400 mb-1">پرداخت شده</p>
          <p className="text-lg font-bold text-green-400">{paidCount}</p>
        </div>
        <div className="bg-red-900/20 border border-red-500/40 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-400 mb-1">معوق</p>
          <p className="text-lg font-bold text-red-400">{overdueCount}</p>
        </div>
        <div className="bg-surface-100 border border-border-light rounded-lg p-3 text-center">
          <p className="text-xs text-gray-400 mb-1">مجموع سود</p>
          <p className="text-sm font-bold text-yellow-400">{formatNumber(totalInterest)}</p>
        </div>
        <div className="bg-surface-100 border border-border-light rounded-lg p-3 text-center">
          <p className="text-xs text-gray-400 mb-1">مجموع پرداختی</p>
          <p className="text-sm font-bold text-gray-100">{formatNumber(totalPayment)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-100 border border-border-light rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-50 border-b border-border-dark">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                  شماره
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                  تاریخ سررسید
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                  اصل
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                  سود
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                  مبلغ قسط
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                  مانده
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">
                  وضعیت
                </th>
                {onMarkPaid && (
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">
                    عملیات
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark">
              {schedule.map((payment) => {
                const statusConfig = getStatusConfig(payment.status);
                const StatusIcon = statusConfig.icon;
                const isCurrentlyPaying = isPaying && payingInstallment === payment.installmentNumber;

                return (
                  <tr
                    key={payment.installmentNumber}
                    className={`${statusConfig.bgColor} hover:bg-surface-50 transition-colors`}
                  >
                    <td className="px-4 py-3 text-sm text-gray-100 font-medium">
                      {payment.installmentNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {payment.dueDateJalali}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {formatNumber(payment.principalPayment)}
                    </td>
                    <td className="px-4 py-3 text-sm text-yellow-400">
                      {formatNumber(payment.interestPayment)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-100 font-medium">
                      {formatNumber(payment.totalPayment)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {formatNumber(payment.remainingBalance)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
                        <span className={`text-xs ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                    </td>
                    {onMarkPaid && (
                      <td className="px-4 py-3 text-center">
                        {payment.status !== 'paid' && (
                          <button
                            onClick={() => onMarkPaid(payment.installmentNumber)}
                            disabled={isCurrentlyPaying}
                            className="px-3 py-1 text-xs bg-green-600/20 text-green-400 rounded hover:bg-green-600/30 transition-colors disabled:opacity-50"
                          >
                            {isCurrentlyPaying ? '...' : 'ثبت'}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-surface-50 border-t border-border-dark">
              <tr>
                <td colSpan={2} className="px-4 py-3 text-sm font-medium text-gray-100">
                  جمع کل
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-100">
                  {formatNumber(totalPrincipal)}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-yellow-400">
                  {formatNumber(totalInterest)}
                </td>
                <td className="px-4 py-3 text-sm font-bold text-gray-100">
                  {formatNumber(totalPayment)}
                </td>
                <td colSpan={onMarkPaid ? 3 : 2} className="px-4 py-3 text-sm text-gray-400">
                  تومان
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

export default PaymentScheduleTable;
