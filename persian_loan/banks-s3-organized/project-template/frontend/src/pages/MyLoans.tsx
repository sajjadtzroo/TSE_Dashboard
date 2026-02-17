/**
 * My Loans Page
 *
 * User's personal loan management and payment reminders.
 */

import { useState } from 'react';
import { Plus, Bell, CreditCard, X } from 'lucide-react';
import { LoanForm, AlertsDashboard, LoansList, PaymentScheduleTable } from '../features/reminders';
import { useUserLoans, useCreateLoan, useDeleteLoan, useLoanDetail, useMarkPaymentPaid } from '../hooks/useReminders';
import { CreateLoanRequest, UserLoan } from '../services';

// For demo purposes, using a fixed user ID
// In production, this would come from authentication
const DEMO_USER_ID = 'demo-user-001';

type TabType = 'loans' | 'alerts';

export function MyLoans() {
  const [activeTab, setActiveTab] = useState<TabType>('loans');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [editingLoan, setEditingLoan] = useState<UserLoan | null>(null);

  // Queries
  const { data: loansData, isLoading: loansLoading, refetch: refetchLoans } = useUserLoans(DEMO_USER_ID);
  const { data: selectedLoan, isLoading: loanDetailLoading } = useLoanDetail(selectedLoanId || '');

  // Mutations
  const createLoanMutation = useCreateLoan();
  const deleteLoanMutation = useDeleteLoan(DEMO_USER_ID);
  const markPaidMutation = useMarkPaymentPaid(DEMO_USER_ID);

  const handleCreateLoan = (data: CreateLoanRequest) => {
    createLoanMutation.mutate(data, {
      onSuccess: () => {
        setShowAddForm(false);
        refetchLoans();
      },
    });
  };

  const handleDeleteLoan = (loanId: string) => {
    if (window.confirm('آیا از حذف این وام مطمئن هستید؟')) {
      deleteLoanMutation.mutate({ loanId }, {
        onSuccess: () => {
          if (selectedLoanId === loanId) {
            setSelectedLoanId(null);
          }
        },
      });
    }
  };

  const handleMarkPaid = (installmentNumber: number) => {
    if (!selectedLoanId) return;

    markPaidMutation.mutate(
      { loanId: selectedLoanId, installmentNumber },
      {
        onSuccess: () => {
          // Refetch loan detail to update schedule
        },
      }
    );
  };

  const handleLoanClick = (loanId: string) => {
    setSelectedLoanId(loanId);
  };

  const handleAlertLoanClick = (loanId: string) => {
    setSelectedLoanId(loanId);
    setActiveTab('loans');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-50">وام‌های من</h1>
          <p className="text-gray-400 mt-1">
            مدیریت وام‌ها و یادآوری پرداخت اقساط
          </p>
        </div>

        <button
          onClick={() => {
            setEditingLoan(null);
            setShowAddForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition-colors"
        >
          <Plus className="w-5 h-5" />
          افزودن وام جدید
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-dark">
        <button
          onClick={() => setActiveTab('loans')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'loans'
              ? 'text-primary-400 border-primary-400'
              : 'text-gray-400 border-transparent hover:text-gray-200'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          وام‌ها
          {loansData && (
            <span className="px-2 py-0.5 text-xs bg-surface-50 rounded-full">
              {loansData.total}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'alerts'
              ? 'text-primary-400 border-primary-400'
              : 'text-gray-400 border-transparent hover:text-gray-200'
          }`}
        >
          <Bell className="w-4 h-4" />
          هشدارها
        </button>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className={`${selectedLoanId ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          {activeTab === 'loans' ? (
            <LoansList
              loans={loansData?.loans || []}
              isLoading={loansLoading}
              onLoanClick={handleLoanClick}
              onEditLoan={(loan) => {
                setEditingLoan(loan);
                setShowAddForm(true);
              }}
              onDeleteLoan={handleDeleteLoan}
            />
          ) : (
            <AlertsDashboard
              userId={DEMO_USER_ID}
              daysAhead={30}
              onLoanClick={handleAlertLoanClick}
            />
          )}
        </div>

        {/* Loan Detail Sidebar */}
        {selectedLoanId && selectedLoan && (
          <div className="lg:col-span-1">
            <div className="bg-surface-100 border border-border-light rounded-lg overflow-hidden sticky top-4">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border-dark">
                <h3 className="font-medium text-gray-100">
                  {selectedLoan.loanNameFA || selectedLoan.loanName}
                </h3>
                <button
                  onClick={() => setSelectedLoanId(null)}
                  className="p-1 text-gray-400 hover:text-gray-200 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Stats */}
              <div className="p-4 space-y-3 border-b border-border-dark">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">مبلغ وام</span>
                  <span className="text-sm text-gray-100">
                    {parseFloat(selectedLoan.principalAmount).toLocaleString('fa-IR')} تومان
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">قسط ماهانه</span>
                  <span className="text-sm text-primary-400">
                    {parseFloat(selectedLoan.monthlyPayment).toLocaleString('fa-IR')} تومان
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">پیشرفت</span>
                  <span className="text-sm text-gray-100">
                    {selectedLoan.paidInstallments} از {selectedLoan.totalInstallments}
                  </span>
                </div>
                {selectedLoan.nextPaymentDateJalali && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">قسط بعدی</span>
                    <span className="text-sm text-yellow-400">
                      {selectedLoan.nextPaymentDateJalali}
                    </span>
                  </div>
                )}
              </div>

              {/* Schedule Preview */}
              <div className="p-4">
                <h4 className="text-sm font-medium text-gray-200 mb-3">جدول پرداخت</h4>
                {loanDetailLoading ? (
                  <div className="animate-pulse space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-8 bg-surface-50 rounded" />
                    ))}
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    {selectedLoan.paymentSchedule?.slice(0, 6).map((payment) => (
                      <div
                        key={payment.installmentNumber}
                        className={`flex items-center justify-between py-2 text-sm ${
                          payment.status === 'paid'
                            ? 'text-green-400'
                            : payment.status === 'overdue'
                            ? 'text-red-400'
                            : 'text-gray-300'
                        }`}
                      >
                        <span>
                          قسط {payment.installmentNumber} - {payment.dueDateJalali}
                        </span>
                        <span className="text-xs">
                          {payment.status === 'paid' ? 'پرداخت شده' :
                           payment.status === 'overdue' ? 'معوق' : 'در انتظار'}
                        </span>
                      </div>
                    ))}
                    {selectedLoan.paymentSchedule?.length > 6 && (
                      <p className="text-xs text-gray-400 mt-2 text-center">
                        و {selectedLoan.paymentSchedule.length - 6} قسط دیگر...
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Full Payment Schedule Modal */}
      {selectedLoanId && selectedLoan?.paymentSchedule && (
        <div className="mt-6">
          <h2 className="text-lg font-medium text-gray-100 mb-4">
            جدول کامل پرداخت - {selectedLoan.loanNameFA || selectedLoan.loanName}
          </h2>
          <PaymentScheduleTable
            schedule={selectedLoan.paymentSchedule}
            onMarkPaid={handleMarkPaid}
            isPaying={markPaidMutation.isPending}
            payingInstallment={markPaidMutation.variables?.installmentNumber}
          />
        </div>
      )}

      {/* Add/Edit Loan Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-surface-900/80"
            onClick={() => setShowAddForm(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-surface-100 border border-border-light rounded-lg shadow-dark-lg">
            <div className="sticky top-0 flex items-center justify-between p-4 border-b border-border-dark bg-surface-100">
              <h2 className="text-lg font-medium text-gray-100">
                {editingLoan ? 'ویرایش وام' : 'افزودن وام جدید'}
              </h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-2 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-surface-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <LoanForm
                userId={DEMO_USER_ID}
                initialData={editingLoan ? {
                  loanName: editingLoan.loanName,
                  loanNameFA: editingLoan.loanNameFA,
                  bankName: editingLoan.bankName,
                  bankNameFA: editingLoan.bankNameFA,
                  principalAmount: editingLoan.principalAmount,
                  interestRate: editingLoan.interestRate,
                  loanType: editingLoan.loanType,
                  totalInstallments: editingLoan.totalInstallments,
                  startDate: editingLoan.startDate,
                  paymentDay: editingLoan.paymentDay,
                  description: editingLoan.description,
                  notes: editingLoan.notes,
                } : undefined}
                onSubmit={handleCreateLoan}
                onCancel={() => setShowAddForm(false)}
                isSubmitting={createLoanMutation.isPending}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyLoans;
