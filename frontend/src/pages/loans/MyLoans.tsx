import { useState } from 'react';
import {
  Stack, Group, Title, Text, Button, Tabs, Badge, Card, Box,
  ActionIcon, Modal, Skeleton, Center, Loader,
} from '@mantine/core';
import { IconPlus, IconBell, IconCreditCard, IconX } from '@tabler/icons-react';
import { LoanForm, AlertsDashboard, LoansList, PaymentScheduleTable } from '../../features/loans/reminders';
import { useUserLoans, useCreateLoan, useDeleteLoan, useLoanDetail, useMarkPaymentPaid } from '../../hooks/loans/useReminders';
import { CreateLoanRequest, UserLoan } from '../../services/loans';
import { useAuth } from '../../context/AuthContext';
import rallyColors from '../../theme/rallyColors';

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
        <Loader color="rally-green" />
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
    if (window.confirm('آیا از حذف این وام مطمئن هستید؟')) {
      deleteLoanMutation.mutate({ loanId }, {
        onSuccess: () => {
          if (selectedLoanId === loanId) setSelectedLoanId(null);
        },
      });
    }
  };

  const handleMarkPaid = (installmentNumber: number) => {
    if (!selectedLoanId) return;
    markPaidMutation.mutate({ loanId: selectedLoanId, installmentNumber });
  };

  return (
    <Stack gap="lg">
      {/* Page Header */}
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={2}>وام‌های من</Title>
          <Text c={rallyColors.textDimmed} mt={4}>
            مدیریت وام‌ها و یادآوری پرداخت اقساط
          </Text>
        </div>
        <Button
          leftSection={<IconPlus size={18} />}
          color="rally-green"
          onClick={() => {
            setEditingLoan(null);
            setShowAddForm(true);
          }}
        >
          افزودن وام جدید
        </Button>
      </Group>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(val) => setActiveTab(val as TabType)}
        color="rally-green"
      >
        <Tabs.List>
          <Tabs.Tab value="loans" leftSection={<IconCreditCard size={16} />}>
            <Group gap={6}>
              وام‌ها
              {loansData && (
                <Badge size="xs" variant="light" color="gray" circle>
                  {loansData.total}
                </Badge>
              )}
            </Group>
          </Tabs.Tab>
          <Tabs.Tab value="alerts" leftSection={<IconBell size={16} />}>
            هشدارها
          </Tabs.Tab>
        </Tabs.List>
      </Tabs>

      {/* Content */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedLoanId ? '2fr 1fr' : '1fr', gap: 24 }}>
        {/* Main Content */}
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

        {/* Loan Detail Sidebar */}
        {selectedLoanId && selectedLoan && (
          <Card
            padding={0}
            radius="md"
            style={{
              backgroundColor: rallyColors.glassBg,
              border: `1px solid ${rallyColors.glassBorder}`,
              position: 'sticky',
              top: 16,
              overflow: 'hidden',
            }}
          >
            <Group
              justify="space-between"
              p="md"
              style={{ borderBottom: `1px solid ${rallyColors.glassBorder}` }}
            >
              <Text fw={500}>
                {selectedLoan.loanNameFA || selectedLoan.loanName}
              </Text>
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={() => setSelectedLoanId(null)}
                aria-label="بستن جزئیات"
              >
                <IconX size={18} />
              </ActionIcon>
            </Group>

            <Stack gap="xs" p="md" style={{ borderBottom: `1px solid ${rallyColors.glassBorder}` }}>
              <Group justify="space-between">
                <Text size="sm" c={rallyColors.textDimmed}>مبلغ وام</Text>
                <Text size="sm">{parseFloat(selectedLoan.principalAmount).toLocaleString('fa-IR')} تومان</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c={rallyColors.textDimmed}>قسط ماهانه</Text>
                <Text size="sm" c={rallyColors.green}>
                  {parseFloat(selectedLoan.monthlyPayment).toLocaleString('fa-IR')} تومان
                </Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c={rallyColors.textDimmed}>پیشرفت</Text>
                <Text size="sm">{selectedLoan.paidInstallments} از {selectedLoan.totalInstallments}</Text>
              </Group>
              {selectedLoan.nextPaymentDateJalali && (
                <Group justify="space-between">
                  <Text size="sm" c={rallyColors.textDimmed}>قسط بعدی</Text>
                  <Text size="sm" c="#eab308">{selectedLoan.nextPaymentDateJalali}</Text>
                </Group>
              )}
            </Stack>

            <Box p="md">
              <Text size="sm" fw={500} mb="sm">جدول پرداخت</Text>
              {loanDetailLoading ? (
                <Stack gap="xs">
                  {[1, 2, 3].map((i) => <Skeleton key={i} h={32} />)}
                </Stack>
              ) : (
                <Box mah={256} style={{ overflowY: 'auto' }}>
                  {selectedLoan.paymentSchedule?.slice(0, 6).map((payment: any) => (
                    <Group
                      key={payment.installmentNumber}
                      justify="space-between"
                      py={6}
                    >
                      <Text
                        size="sm"
                        c={
                          payment.status === 'paid' ? rallyColors.green :
                          payment.status === 'overdue' ? '#ef4444' :
                          rallyColors.textSecondary
                        }
                      >
                        قسط {payment.installmentNumber} - {payment.dueDateJalali}
                      </Text>
                      <Text size="xs" c={rallyColors.textDimmed}>
                        {payment.status === 'paid' ? 'پرداخت شده' :
                         payment.status === 'overdue' ? 'معوق' : 'در انتظار'}
                      </Text>
                    </Group>
                  ))}
                  {selectedLoan.paymentSchedule?.length > 6 && (
                    <Text size="xs" c={rallyColors.textDimmed} ta="center" mt="xs">
                      و {selectedLoan.paymentSchedule.length - 6} قسط دیگر...
                    </Text>
                  )}
                </Box>
              )}
            </Box>
          </Card>
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

      {/* Add/Edit Loan Modal */}
      <Modal
        opened={showAddForm}
        onClose={() => setShowAddForm(false)}
        title={editingLoan ? 'ویرایش وام' : 'افزودن وام جدید'}
        size="lg"
        centered
        lockScroll
      >
        <LoanForm
          userId={userId}
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
      </Modal>
    </Stack>
  );
}

export default MyLoans;
