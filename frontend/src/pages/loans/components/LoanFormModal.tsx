import React from 'react';
import { Modal } from '@mantine/core';
import { LoanForm } from '../../../features/loans/reminders';
import { CreateLoanRequest, UserLoan } from '../../../services/loans';

interface LoanFormModalProps {
  opened: boolean;
  editingLoan: UserLoan | null;
  userId: string;
  isSubmitting: boolean;
  onSubmit: (data: CreateLoanRequest) => void;
  onClose: () => void;
}

const LoanFormModal: React.FC<LoanFormModalProps> = ({
  opened,
  editingLoan,
  userId,
  isSubmitting,
  onSubmit,
  onClose,
}) => {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
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
        onSubmit={onSubmit}
        onCancel={onClose}
        isSubmitting={isSubmitting}
      />
    </Modal>
  );
};

export default LoanFormModal;
