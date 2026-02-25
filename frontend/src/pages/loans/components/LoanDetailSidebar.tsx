import React from 'react';
import {
  Card, Group, Text, ActionIcon, Stack, Box, Skeleton,
} from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import rallyColors from '../../../theme/rallyColors';

interface Payment {
  installmentNumber: number;
  dueDateJalali: string;
  status: string;
}

interface LoanDetail {
  loanName: string;
  loanNameFA?: string;
  principalAmount: string;
  monthlyPayment: string;
  paidInstallments: number;
  totalInstallments: number;
  nextPaymentDateJalali?: string;
  paymentSchedule?: Payment[];
}

interface LoanDetailSidebarProps {
  loan: LoanDetail;
  isLoading: boolean;
  onClose: () => void;
}

const LoanDetailSidebar: React.FC<LoanDetailSidebarProps> = ({ loan, isLoading, onClose }) => {
  return (
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
          {loan.loanNameFA || loan.loanName}
        </Text>
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={onClose}
          aria-label="بستن جزئیات"
        >
          <IconX size={18} />
        </ActionIcon>
      </Group>

      <Stack gap="xs" p="md" style={{ borderBottom: `1px solid ${rallyColors.glassBorder}` }}>
        <Group justify="space-between">
          <Text size="sm" c={rallyColors.textDimmed}>مبلغ وام</Text>
          <Text size="sm">{parseFloat(loan.principalAmount).toLocaleString('fa-IR')} تومان</Text>
        </Group>
        <Group justify="space-between">
          <Text size="sm" c={rallyColors.textDimmed}>قسط ماهانه</Text>
          <Text size="sm" c={rallyColors.green}>
            {parseFloat(loan.monthlyPayment).toLocaleString('fa-IR')} تومان
          </Text>
        </Group>
        <Group justify="space-between">
          <Text size="sm" c={rallyColors.textDimmed}>پیشرفت</Text>
          <Text size="sm">{loan.paidInstallments} از {loan.totalInstallments}</Text>
        </Group>
        {loan.nextPaymentDateJalali && (
          <Group justify="space-between">
            <Text size="sm" c={rallyColors.textDimmed}>قسط بعدی</Text>
            <Text size="sm" c="#eab308">{loan.nextPaymentDateJalali}</Text>
          </Group>
        )}
      </Stack>

      <Box p="md">
        <Text size="sm" fw={500} mb="sm">جدول پرداخت</Text>
        {isLoading ? (
          <Stack gap="xs">
            {[1, 2, 3].map((i) => <Skeleton key={i} h={32} />)}
          </Stack>
        ) : (
          <Box mah={256} style={{ overflowY: 'auto' }}>
            {loan.paymentSchedule?.slice(0, 6).map((payment) => (
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
            {loan.paymentSchedule && loan.paymentSchedule.length > 6 && (
              <Text size="xs" c={rallyColors.textDimmed} ta="center" mt="xs">
                و {loan.paymentSchedule.length - 6} قسط دیگر...
              </Text>
            )}
          </Box>
        )}
      </Box>
    </Card>
  );
};

export default LoanDetailSidebar;
