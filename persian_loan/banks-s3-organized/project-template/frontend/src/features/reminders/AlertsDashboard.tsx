/**
 * Alerts Dashboard Component
 *
 * Shows upcoming payments with urgency indicators and overdue alerts.
 */

import { AlertCircle, Clock, CheckCircle, AlertTriangle, Calendar, ChevronLeft } from 'lucide-react';
import { PaymentAlert, AlertPriority, PaymentStatus } from '../../services';
import { usePaymentAlerts, useMarkPaymentPaid } from '../../hooks/useReminders';

interface AlertsDashboardProps {
  userId: string;
  daysAhead?: number;
  onLoanClick?: (loanId: string) => void;
}

const formatNumber = (value: string | number): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  return num.toLocaleString('fa-IR');
};

const getPriorityConfig = (priority: AlertPriority, status: PaymentStatus) => {
  if (status === 'overdue') {
    return {
      bgColor: 'bg-red-900/30',
      borderColor: 'border-red-600/50',
      textColor: 'text-red-400',
      icon: AlertCircle,
      label: 'معوق',
    };
  }

  switch (priority) {
    case 'urgent':
      return {
        bgColor: 'bg-red-900/20',
        borderColor: 'border-red-500/40',
        textColor: 'text-red-400',
        icon: AlertTriangle,
        label: 'فوری',
      };
    case 'high':
      return {
        bgColor: 'bg-orange-900/20',
        borderColor: 'border-orange-500/40',
        textColor: 'text-orange-400',
        icon: Clock,
        label: 'مهم',
      };
    case 'medium':
      return {
        bgColor: 'bg-yellow-900/20',
        borderColor: 'border-yellow-500/40',
        textColor: 'text-yellow-400',
        icon: Calendar,
        label: 'پیش رو',
      };
    default:
      return {
        bgColor: 'bg-blue-900/20',
        borderColor: 'border-blue-500/40',
        textColor: 'text-blue-400',
        icon: Calendar,
        label: 'عادی',
      };
  }
};

function AlertCard({
  alert,
  onMarkPaid,
  onLoanClick,
  isPaying,
}: {
  alert: PaymentAlert;
  onMarkPaid: () => void;
  onLoanClick?: () => void;
  isPaying: boolean;
}) {
  const config = getPriorityConfig(alert.priority, alert.status);
  const Icon = config.icon;

  const isOverdue = alert.status === 'overdue' || alert.daysUntilDue < 0;
  const daysText = isOverdue
    ? `${Math.abs(alert.daysUntilDue)} روز تاخیر`
    : alert.daysUntilDue === 0
    ? 'امروز'
    : `${alert.daysUntilDue} روز مانده`;

  return (
    <div
      className={`${config.bgColor} border ${config.borderColor} rounded-lg p-4 transition-all hover:shadow-lg`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-full ${config.bgColor} ${config.textColor}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-gray-100 font-medium">
                {alert.loanNameFA || alert.loanName}
              </h3>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${config.bgColor} ${config.textColor} border ${config.borderColor}`}
              >
                {config.label}
              </span>
            </div>
            {(alert.bankNameFA || alert.bankName) && (
              <p className="text-sm text-gray-400 mt-0.5">
                {alert.bankNameFA || alert.bankName}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-2">
              قسط {alert.installmentNumber} - {alert.dueDateJalali}
            </p>
          </div>
        </div>

        <div className="text-left">
          <p className="text-lg font-bold text-gray-100">
            {formatNumber(alert.amount)}
          </p>
          <p className="text-xs text-gray-400">تومان</p>
          <p className={`text-sm mt-1 ${config.textColor}`}>{daysText}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border-dark">
        <p className="text-sm text-gray-300">{alert.messageFA}</p>
        <div className="flex gap-2">
          {onLoanClick && (
            <button
              onClick={onLoanClick}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              مشاهده وام
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onMarkPaid}
            disabled={isPaying || alert.status === 'paid'}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-600/20 text-green-400 rounded-lg hover:bg-green-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle className="w-4 h-4" />
            {isPaying ? 'در حال ثبت...' : 'ثبت پرداخت'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AlertsDashboard({ userId, daysAhead = 30, onLoanClick }: AlertsDashboardProps) {
  const { data, isLoading, error, refetch } = usePaymentAlerts(userId, daysAhead);
  const markPaidMutation = useMarkPaymentPaid(userId);

  const handleMarkPaid = (loanId: string, installmentNumber: number) => {
    markPaidMutation.mutate(
      { loanId, installmentNumber },
      {
        onSuccess: () => {
          refetch();
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-surface-100 border border-border-light rounded-lg p-4 animate-pulse"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-surface-50 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-surface-50 rounded w-1/3" />
                <div className="h-3 bg-surface-50 rounded w-1/4" />
              </div>
              <div className="text-left space-y-1">
                <div className="h-5 bg-surface-50 rounded w-24" />
                <div className="h-3 bg-surface-50 rounded w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/40 rounded-lg p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="text-red-400">خطا در دریافت هشدارها</p>
        <button
          onClick={() => refetch()}
          className="mt-3 px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors"
        >
          تلاش مجدد
        </button>
      </div>
    );
  }

  if (!data || data.total === 0) {
    return (
      <div className="bg-green-900/20 border border-green-500/40 rounded-lg p-8 text-center">
        <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
        <h3 className="text-xl font-medium text-green-400 mb-2">همه چیز مرتب است!</h3>
        <p className="text-gray-400">
          هیچ پرداختی در {daysAhead} روز آینده ندارید
        </p>
      </div>
    );
  }

  // Group alerts by status
  const overdueAlerts = data.alerts.filter((a) => a.status === 'overdue' || a.daysUntilDue < 0);
  const urgentAlerts = data.alerts.filter(
    (a) => a.status !== 'overdue' && a.daysUntilDue >= 0 && a.daysUntilDue <= 3
  );
  const upcomingAlerts = data.alerts.filter(
    (a) => a.status !== 'overdue' && a.daysUntilDue > 3
  );

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-100 border border-border-light rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-gray-100">{data.total}</p>
          <p className="text-sm text-gray-400">کل پرداخت‌ها</p>
        </div>
        <div className="bg-red-900/20 border border-red-500/40 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-red-400">{data.overdue}</p>
          <p className="text-sm text-gray-400">معوق</p>
        </div>
        <div className="bg-orange-900/20 border border-orange-500/40 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-orange-400">{data.urgent}</p>
          <p className="text-sm text-gray-400">فوری</p>
        </div>
        <div className="bg-blue-900/20 border border-blue-500/40 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-blue-400">{data.upcoming}</p>
          <p className="text-sm text-gray-400">پیش رو</p>
        </div>
      </div>

      {/* Overdue Alerts */}
      {overdueAlerts.length > 0 && (
        <div>
          <h2 className="text-lg font-medium text-red-400 mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            پرداخت‌های معوق ({overdueAlerts.length})
          </h2>
          <div className="space-y-3">
            {overdueAlerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onMarkPaid={() => handleMarkPaid(alert.loanId, alert.installmentNumber)}
                onLoanClick={onLoanClick ? () => onLoanClick(alert.loanId) : undefined}
                isPaying={
                  markPaidMutation.isPending &&
                  markPaidMutation.variables?.loanId === alert.loanId &&
                  markPaidMutation.variables?.installmentNumber === alert.installmentNumber
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Urgent Alerts */}
      {urgentAlerts.length > 0 && (
        <div>
          <h2 className="text-lg font-medium text-orange-400 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            پرداخت‌های فوری - 3 روز یا کمتر ({urgentAlerts.length})
          </h2>
          <div className="space-y-3">
            {urgentAlerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onMarkPaid={() => handleMarkPaid(alert.loanId, alert.installmentNumber)}
                onLoanClick={onLoanClick ? () => onLoanClick(alert.loanId) : undefined}
                isPaying={
                  markPaidMutation.isPending &&
                  markPaidMutation.variables?.loanId === alert.loanId &&
                  markPaidMutation.variables?.installmentNumber === alert.installmentNumber
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Alerts */}
      {upcomingAlerts.length > 0 && (
        <div>
          <h2 className="text-lg font-medium text-blue-400 mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            پرداخت‌های پیش رو ({upcomingAlerts.length})
          </h2>
          <div className="space-y-3">
            {upcomingAlerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onMarkPaid={() => handleMarkPaid(alert.loanId, alert.installmentNumber)}
                onLoanClick={onLoanClick ? () => onLoanClick(alert.loanId) : undefined}
                isPaying={
                  markPaidMutation.isPending &&
                  markPaidMutation.variables?.loanId === alert.loanId &&
                  markPaidMutation.variables?.installmentNumber === alert.installmentNumber
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AlertsDashboard;
