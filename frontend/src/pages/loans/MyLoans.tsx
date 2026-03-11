import { useState } from 'react';
import {
  Stack, Text, Center, Loader,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { LoansList, AlertsDashboard, PaymentScheduleTable } from '../../features/loans/reminders';
import { useUserLoans, useCreateLoan, useDeleteLoan, useLoanDetail, useMarkPaymentPaid } from '../../hooks/loans/useReminders';
import { CreateLoanRequest, UserLoan } from '../../services/loans';
import { useAuth } from '../../context/AuthContext';
import rallyColors from '../../theme/rallyColors';
import RallyBreadcrumbs from '../../components/RallyBreadcrumbs';
import LoanDetailSidebar from './components/LoanDetailSidebar';
import LoanFormModal from './components/LoanFormModal';
import MyLoansHeader from './components/MyLoansHeader';
import MyLoansTabs from './components/MyLoansTabs';

type TabType = 'loans' | 'alerts';

export function MyLoans() {
  const { user, loading: authLoading, isAuthenticated } = useAuth() as {
    user: { id: number; username: string; email: string; role: string } | null;
    loading: boolean;
    isAuthenticated: boolean;
    login: (username: string, password: string) => Promise<unknown>;
    logout: () => void;
    token: string | null;
  };
  const userId = user ? String(user.id) : '';

  const [activeTab, setActiveTab] = useState<TabType>('loans');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [editingLoan, setEditingLoan] = useState<UserLoan | null>(null);

  const { data: loansData, isLoading: loansLoading, refetch: refetchLoans } = useUserLoans(userId);
  const { data: selectedLoan, isLoading: loanDetailLoading } = useLoanDetail(selectedLoanId || '');

  const createLoanMutation = useCreateLoan();
  const deleteLoanMutation = useDeleteLoan(userId);
  const markPaidMutation = useMarkPaymentPaid(userId);

  if (authLoading) {
    return (
      <Center h={300}>
        <Loader color="rally-primary" />
      </Center>
    );
  }

  if (!isAuthenticated || !userId) {
    return (
      <Center h={300}>
        <Text c={rallyColors.textDimmed}>برای مشاهده وام‌ها ابتدا وارد حساب کاربری شوید.</Text>
      </Center>
    );
  }

  const handleCreateLoan = (data: CreateLoanRequest) => {
    createLoanMutation.mutate(data, {
      onSuccess: () => {
        setShowAddForm(false);
        refetchLoans();
      },
    });
  };

  const handleDeleteLoan = (loanId: string) => {
    modals.openConfirmModal({
      title: 'حذف وام',
      children: <Text size="sm">آیا از حذف این وام مطمئن هستید؟ این عمل قابل بازگشت نیست.</Text>,
      labels: { confirm: 'حذف', cancel: 'انصراف' },
      confirmProps: { color: 'red' },
      onConfirm: () => {
        deleteLoanMutation.mutate({ loanId }, {
          onSuccess: () => {
            if (selectedLoanId === loanId) setSelectedLoanId(null);
          },
        });
      },
    });
  };

  const handleMarkPaid = (installmentNumber: number) => {
    if (!selectedLoanId) return;
    markPaidMutation.mutate({ loanId: selectedLoanId, installmentNumber });
  };

  return (
    <Stack gap="lg">
      <RallyBreadcrumbs items={[{ label: 'وام‌ها', path: '/loans' }, { label: 'وام‌های من' }]} />

      <MyLoansHeader
        onAddLoan={() => {
          setEditingLoan(null);
          setShowAddForm(true);
        }}
      />

      <MyLoansTabs
        activeTab={activeTab}
        loansTotal={loansData?.total}
        onChange={setActiveTab}
      />

      {/* Content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedLoanId ? '2fr 1fr' : '1fr', gap: 24 }}>
        <div>
          {activeTab === 'loans' ? (
            <LoansList
              loans={loansData?.loans || []}
              isLoading={loansLoading}
              onLoanClick={(loanId: string) => setSelectedLoanId(loanId)}
              onEditLoan={(loan: UserLoan) => {
                setEditingLoan(loan);
                setShowAddForm(true);
              }}
              onDeleteLoan={handleDeleteLoan}
            />
          ) : (
            <AlertsDashboard
              userId={userId}
              daysAhead={30}
              onLoanClick={(loanId: string) => {
                setSelectedLoanId(loanId);
                setActiveTab('loans');
              }}
            />
          )}
        </div>

        {selectedLoanId && selectedLoan && (
          <LoanDetailSidebar
            loan={selectedLoan}
            isLoading={loanDetailLoading}
            onClose={() => setSelectedLoanId(null)}
          />
        )}
      </div>

      {/* Full Payment Schedule */}
      {selectedLoanId && selectedLoan?.paymentSchedule && (
        <div>
          <Text size="lg" fw={500} mb="md">
            جدول کامل پرداخت - {selectedLoan.loanNameFA || selectedLoan.loanName}
          </Text>
          <PaymentScheduleTable
            schedule={selectedLoan.paymentSchedule}
            onMarkPaid={handleMarkPaid}
            isPaying={markPaidMutation.isPending}
            payingInstallment={markPaidMutation.variables?.installmentNumber}
          />
        </div>
      )}

      <LoanFormModal
        opened={showAddForm}
        editingLoan={editingLoan}
        userId={userId}
        isSubmitting={createLoanMutation.isPending}
        onSubmit={handleCreateLoan}
        onClose={() => setShowAddForm(false)}
      />
    </Stack>
  );
}

export default MyLoans;
