/**
 * Payment Schedule Table Component
 *
 * Displays the full payment schedule with status indicators.
 */

import {
  Card,
  Text,
  Group,
  Stack,
  SimpleGrid,
  Table,
  Button,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconCircleCheck,
  IconClock,
  IconAlertCircle,
  IconCircleX,
  IconPrinter,
} from '@tabler/icons-react';
import { PaymentScheduleItem, PaymentStatus } from '@/services/loans';
import rallyColors from '@/theme/rallyColors';

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
        icon: IconCircleCheck,
        color: rallyColors.primary,
        bgColor: `${rallyColors.primary}33`,
        label: 'پرداخت شده',
      };
    case 'overdue':
      return {
        icon: IconAlertCircle,
        color: rallyColors.red,
        bgColor: `${rallyColors.red}33`,
        label: 'معوق',
      };
    case 'partial':
      return {
        icon: IconCircleX,
        color: rallyColors.yellow,
        bgColor: `${rallyColors.yellow}33`,
        label: 'ناقص',
      };
    default:
      return {
        icon: IconClock,
        color: rallyColors.textSecondary,
        bgColor: rallyColors.elevated,
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
      <Card
        withBorder
        radius="md"
        p="xl"
        style={{
          backgroundColor: rallyColors.card,
          border: `1px solid ${rallyColors.glassBorder}`,
          textAlign: 'center',
        }}
      >
        <Text c={rallyColors.textSecondary}>جدول پرداخت موجود نیست</Text>
      </Card>
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

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const rows = schedule.map((p) => `
      <tr>
        <td>${p.installmentNumber}</td>
        <td>${p.dueDateJalali || ''}</td>
        <td>${formatNumber(p.principalPayment)}</td>
        <td>${formatNumber(p.interestPayment)}</td>
        <td>${formatNumber(p.totalPayment)}</td>
        <td>${formatNumber(p.remainingBalance)}</td>
        <td>${getStatusConfig(p.status).label}</td>
      </tr>`).join('');
    printWindow.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8">
      <title>جدول اقساط</title>
      <style>
        body { font-family: Tahoma, sans-serif; padding: 24px; direction: rtl; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: right; font-size: 13px; }
        th { background: #f5f5f5; font-weight: bold; }
        h2 { margin-bottom: 8px; }
        .summary { display: flex; gap: 24px; margin-bottom: 16px; }
        .summary span { font-weight: bold; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <h2>جدول اقساط</h2>
      <div class="summary">
        <div>تعداد اقساط: <span>${schedule.length}</span></div>
        <div>مجموع اصل: <span>${formatNumber(totalPrincipal)}</span></div>
        <div>مجموع سود: <span>${formatNumber(totalInterest)}</span></div>
        <div>مجموع پرداختی: <span>${formatNumber(totalPayment)}</span></div>
      </div>
      <table>
        <thead><tr><th>شماره</th><th>تاریخ سررسید</th><th>اصل</th><th>سود</th><th>مبلغ قسط</th><th>مانده</th><th>وضعیت</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <script>window.print();</script>
    </body></html>`);
    printWindow.document.close();
  };

  return (
    <Stack gap="md">
      {/* Summary + Print */}
      <Group justify="flex-end">
        <Tooltip label="چاپ جدول اقساط">
          <ActionIcon variant="light" color="gray" size="lg" onClick={handlePrint}>
            <IconPrinter size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>
      <SimpleGrid cols={{ base: 2, md: 5 }} spacing="sm">
        <Card
          withBorder
          radius="md"
          p="sm"
          style={{
            backgroundColor: rallyColors.card,
            border: `1px solid ${rallyColors.glassBorder}`,
            textAlign: 'center',
          }}
        >
          <Text size="xs" c={rallyColors.textSecondary} mb={4}>تعداد اقساط</Text>
          <Text size="lg" fw={700} c={rallyColors.textPrimary}>{schedule.length}</Text>
        </Card>
        <Card
          withBorder
          radius="md"
          p="sm"
          style={{
            backgroundColor: `${rallyColors.primary}33`,
            border: `1px solid ${rallyColors.primary}66`,
            textAlign: 'center',
          }}
        >
          <Text size="xs" c={rallyColors.textSecondary} mb={4}>پرداخت شده</Text>
          <Text size="lg" fw={700} c={rallyColors.primary}>{paidCount}</Text>
        </Card>
        <Card
          withBorder
          radius="md"
          p="sm"
          style={{
            backgroundColor: `${rallyColors.red}33`,
            border: `1px solid ${rallyColors.red}66`,
            textAlign: 'center',
          }}
        >
          <Text size="xs" c={rallyColors.textSecondary} mb={4}>معوق</Text>
          <Text size="lg" fw={700} c={rallyColors.red}>{overdueCount}</Text>
        </Card>
        <Card
          withBorder
          radius="md"
          p="sm"
          style={{
            backgroundColor: rallyColors.card,
            border: `1px solid ${rallyColors.glassBorder}`,
            textAlign: 'center',
          }}
        >
          <Text size="xs" c={rallyColors.textSecondary} mb={4}>مجموع سود</Text>
          <Text size="sm" fw={700} c={rallyColors.yellow}>{formatNumber(totalInterest)}</Text>
        </Card>
        <Card
          withBorder
          radius="md"
          p="sm"
          style={{
            backgroundColor: rallyColors.card,
            border: `1px solid ${rallyColors.glassBorder}`,
            textAlign: 'center',
          }}
        >
          <Text size="xs" c={rallyColors.textSecondary} mb={4}>مجموع پرداختی</Text>
          <Text size="sm" fw={700} c={rallyColors.textPrimary}>{formatNumber(totalPayment)}</Text>
        </Card>
      </SimpleGrid>

      {/* Table */}
      <Card
        withBorder
        radius="md"
        p={0}
        style={{
          backgroundColor: rallyColors.card,
          border: `1px solid ${rallyColors.glassBorder}`,
          overflow: 'hidden',
        }}
      >
        <Table.ScrollContainer minWidth={600}>
          <Table verticalSpacing="sm" horizontalSpacing="md">
            <Table.Thead
              style={{
                backgroundColor: rallyColors.elevated,
                borderBottom: `1px solid ${rallyColors.border}`,
              }}
            >
              <Table.Tr>
                <Table.Th style={{ textAlign: 'right' }}>
                  <Text size="xs" fw={500} c={rallyColors.textSecondary} tt="uppercase">شماره</Text>
                </Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>
                  <Text size="xs" fw={500} c={rallyColors.textSecondary} tt="uppercase">تاریخ سررسید</Text>
                </Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>
                  <Text size="xs" fw={500} c={rallyColors.textSecondary} tt="uppercase">اصل</Text>
                </Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>
                  <Text size="xs" fw={500} c={rallyColors.textSecondary} tt="uppercase">سود</Text>
                </Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>
                  <Text size="xs" fw={500} c={rallyColors.textSecondary} tt="uppercase">مبلغ قسط</Text>
                </Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>
                  <Text size="xs" fw={500} c={rallyColors.textSecondary} tt="uppercase">مانده</Text>
                </Table.Th>
                <Table.Th style={{ textAlign: 'center' }}>
                  <Text size="xs" fw={500} c={rallyColors.textSecondary} tt="uppercase">وضعیت</Text>
                </Table.Th>
                {onMarkPaid && (
                  <Table.Th style={{ textAlign: 'center' }}>
                    <Text size="xs" fw={500} c={rallyColors.textSecondary} tt="uppercase">عملیات</Text>
                  </Table.Th>
                )}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {schedule.map((payment) => {
                const statusConfig = getStatusConfig(payment.status);
                const StatusIcon = statusConfig.icon;
                const isCurrentlyPaying = isPaying && payingInstallment === payment.installmentNumber;

                return (
                  <Table.Tr
                    key={payment.installmentNumber}
                    style={{
                      backgroundColor: statusConfig.bgColor,
                    }}
                  >
                    <Table.Td>
                      <Text size="sm" fw={500} c={rallyColors.textPrimary}>
                        {payment.installmentNumber}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c={rallyColors.textSecondary}>
                        {payment.dueDateJalali}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c={rallyColors.textSecondary}>
                        {formatNumber(payment.principalPayment)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c={rallyColors.yellow}>
                        {formatNumber(payment.interestPayment)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500} c={rallyColors.textPrimary}>
                        {formatNumber(payment.totalPayment)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c={rallyColors.textSecondary}>
                        {formatNumber(payment.remainingBalance)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4} justify="center">
                        <StatusIcon size={16} color={statusConfig.color} />
                        <Text size="xs" c={statusConfig.color}>
                          {statusConfig.label}
                        </Text>
                      </Group>
                    </Table.Td>
                    {onMarkPaid && (
                      <Table.Td style={{ textAlign: 'center' }}>
                        {payment.status !== 'paid' && (
                          <Button
                            size="xs"
                            variant="light"
                            color="blue"
                            onClick={() => onMarkPaid(payment.installmentNumber)}
                            disabled={isCurrentlyPaying}
                            loading={isCurrentlyPaying}
                          >
                            {isCurrentlyPaying ? '...' : 'ثبت'}
                          </Button>
                        )}
                      </Table.Td>
                    )}
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
            <Table.Tfoot
              style={{
                backgroundColor: rallyColors.elevated,
                borderTop: `1px solid ${rallyColors.border}`,
              }}
            >
              <Table.Tr>
                <Table.Td colSpan={2}>
                  <Text size="sm" fw={500} c={rallyColors.textPrimary}>
                    جمع کل
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" fw={500} c={rallyColors.textPrimary}>
                    {formatNumber(totalPrincipal)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" fw={500} c={rallyColors.yellow}>
                    {formatNumber(totalInterest)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" fw={700} c={rallyColors.textPrimary}>
                    {formatNumber(totalPayment)}
                  </Text>
                </Table.Td>
                <Table.Td colSpan={onMarkPaid ? 3 : 2}>
                  <Text size="sm" c={rallyColors.textSecondary}>
                    تومان
                  </Text>
                </Table.Td>
              </Table.Tr>
            </Table.Tfoot>
          </Table>
        </Table.ScrollContainer>
      </Card>
    </Stack>
  );
}

export default PaymentScheduleTable;
