/**
 * Alerts Dashboard Component
 *
 * Shows upcoming payments with urgency indicators and overdue alerts.
 */

import {
  Card,
  Text,
  Title,
  Group,
  Stack,
  SimpleGrid,
  Box,
  Button,
  Skeleton,
  Badge,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconClock,
  IconCircleCheck,
  IconAlertTriangle,
  IconCalendar,
  IconChevronLeft,
} from '@tabler/icons-react';
import { PaymentAlert, AlertPriority, PaymentStatus } from '@/services/loans';
import { usePaymentAlerts, useMarkPaymentPaid } from '@/hooks/loans/useReminders';
import rallyColors from '@/theme/rallyColors';

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
      bgColor: `${rallyColors.red}4d`,
      borderColor: `${rallyColors.red}80`,
      textColor: rallyColors.red,
      icon: IconAlertCircle,
      label: 'معوق',
    };
  }

  switch (priority) {
    case 'urgent':
      return {
        bgColor: `${rallyColors.red}33`,
        borderColor: `${rallyColors.red}66`,
        textColor: rallyColors.red,
        icon: IconAlertTriangle,
        label: 'فوری',
      };
    case 'high':
      return {
        bgColor: `${rallyColors.yellow}33`,
        borderColor: `${rallyColors.yellow}66`,
        textColor: rallyColors.yellow,
        icon: IconClock,
        label: 'مهم',
      };
    case 'medium':
      return {
        bgColor: `${rallyColors.yellow}33`,
        borderColor: `${rallyColors.yellow}66`,
        textColor: rallyColors.yellow,
        icon: IconCalendar,
        label: 'پیش رو',
      };
    default:
      return {
        bgColor: `${rallyColors.blue}33`,
        borderColor: `${rallyColors.blue}66`,
        textColor: rallyColors.blue,
        icon: IconCalendar,
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
    <Card
      withBorder
      radius="md"
      p="md"
      style={{
        backgroundColor: config.bgColor,
        border: `1px solid ${config.borderColor}`,
      }}
    >
      <Group justify="space-between" align="flex-start">
        <Group gap="sm" align="flex-start">
          <Box
            p="xs"
            style={{
              borderRadius: '50%',
              backgroundColor: config.bgColor,
              color: config.textColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={20} />
          </Box>
          <div>
            <Group gap="xs">
              <Text c={rallyColors.textPrimary} fw={500}>
                {alert.loanNameFA || alert.loanName}
              </Text>
              <Badge
                size="xs"
                style={{
                  backgroundColor: config.bgColor,
                  color: config.textColor,
                  border: `1px solid ${config.borderColor}`,
                }}
              >
                {config.label}
              </Badge>
            </Group>
            {(alert.bankNameFA || alert.bankName) && (
              <Text size="sm" c={rallyColors.textSecondary} mt={2}>
                {alert.bankNameFA || alert.bankName}
              </Text>
            )}
            <Text size="xs" c={rallyColors.textSecondary} mt="xs">
              قسط {alert.installmentNumber} - {alert.dueDateJalali}
            </Text>
          </div>
        </Group>

        <Box ta="left">
          <Text size="lg" fw={700} c={rallyColors.textPrimary}>
            {formatNumber(alert.amount)}
          </Text>
          <Text size="xs" c={rallyColors.textSecondary}>تومان</Text>
          <Text size="sm" mt={4} c={config.textColor}>
            {daysText}
          </Text>
        </Box>
      </Group>

      <Group
        justify="space-between"
        mt="md"
        pt="sm"
        style={{ borderTop: `1px solid ${rallyColors.border}` }}
      >
        <Text size="sm" c={rallyColors.textSecondary}>
          {alert.messageFA}
        </Text>
        <Group gap="xs">
          {onLoanClick && (
            <Button
              variant="subtle"
              size="xs"
              color="gray"
              rightSection={<IconChevronLeft size={14} />}
              onClick={onLoanClick}
            >
              مشاهده وام
            </Button>
          )}
          <Button
            size="xs"
            variant="light"
            color="blue"
            onClick={onMarkPaid}
            disabled={isPaying || alert.status === 'paid'}
            leftSection={<IconCircleCheck size={14} />}
          >
            {isPaying ? 'در حال ثبت...' : 'ثبت پرداخت'}
          </Button>
        </Group>
      </Group>
    </Card>
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
      <Stack gap="md">
        {[1, 2, 3].map((i) => (
          <Card
            key={i}
            withBorder
            radius="md"
            p="md"
            style={{
              backgroundColor: rallyColors.card,
              border: `1px solid ${rallyColors.glassBorder}`,
            }}
          >
            <Group align="flex-start" gap="sm">
              <Skeleton circle height={40} />
              <Stack gap="xs" style={{ flex: 1 }}>
                <Skeleton height={16} width="33%" />
                <Skeleton height={12} width="25%" />
              </Stack>
              <Stack gap="xs" ta="left">
                <Skeleton height={20} width={96} />
                <Skeleton height={12} width={64} />
              </Stack>
            </Group>
          </Card>
        ))}
      </Stack>
    );
  }

  if (error) {
    return (
      <Card
        withBorder
        radius="md"
        p="xl"
        style={{
          backgroundColor: `${rallyColors.red}33`,
          border: `1px solid ${rallyColors.red}66`,
          textAlign: 'center',
        }}
      >
        <IconAlertCircle size={48} color={rallyColors.red} style={{ margin: '0 auto 12px' }} />
        <Text c={rallyColors.red}>خطا در دریافت هشدارها</Text>
        <Button
          mt="sm"
          variant="light"
          color="red"
          onClick={() => refetch()}
        >
          تلاش مجدد
        </Button>
      </Card>
    );
  }

  if (!data || data.total === 0) {
    return (
      <Card
        withBorder
        radius="md"
        p="xl"
        style={{
          backgroundColor: `${rallyColors.primary}33`,
          border: `1px solid ${rallyColors.primary}66`,
          textAlign: 'center',
        }}
      >
        <IconCircleCheck size={64} color={rallyColors.primary} style={{ margin: '0 auto 16px' }} />
        <Title order={3} c={rallyColors.primary} mb="xs">
          همه چیز مرتب است!
        </Title>
        <Text c={rallyColors.textSecondary}>
          هیچ پرداختی در {daysAhead} روز آینده ندارید
        </Text>
      </Card>
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
    <Stack gap="lg">
      {/* Summary Stats */}
      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
        <Card
          withBorder
          radius="md"
          p="md"
          style={{
            backgroundColor: rallyColors.card,
            border: `1px solid ${rallyColors.glassBorder}`,
            textAlign: 'center',
          }}
        >
          <Text size="2rem" fw={700} c={rallyColors.textPrimary}>
            {data.total}
          </Text>
          <Text size="sm" c={rallyColors.textSecondary}>کل پرداخت‌ها</Text>
        </Card>
        <Card
          withBorder
          radius="md"
          p="md"
          style={{
            backgroundColor: `${rallyColors.red}33`,
            border: `1px solid ${rallyColors.red}66`,
            textAlign: 'center',
          }}
        >
          <Text size="2rem" fw={700} c={rallyColors.red}>
            {data.overdue}
          </Text>
          <Text size="sm" c={rallyColors.textSecondary}>معوق</Text>
        </Card>
        <Card
          withBorder
          radius="md"
          p="md"
          style={{
            backgroundColor: `${rallyColors.yellow}33`,
            border: `1px solid ${rallyColors.yellow}66`,
            textAlign: 'center',
          }}
        >
          <Text size="2rem" fw={700} c={rallyColors.yellow}>
            {data.urgent}
          </Text>
          <Text size="sm" c={rallyColors.textSecondary}>فوری</Text>
        </Card>
        <Card
          withBorder
          radius="md"
          p="md"
          style={{
            backgroundColor: `${rallyColors.blue}33`,
            border: `1px solid ${rallyColors.blue}66`,
            textAlign: 'center',
          }}
        >
          <Text size="2rem" fw={700} c={rallyColors.blue}>
            {data.upcoming}
          </Text>
          <Text size="sm" c={rallyColors.textSecondary}>پیش رو</Text>
        </Card>
      </SimpleGrid>

      {/* Overdue Alerts */}
      {overdueAlerts.length > 0 && (
        <div>
          <Group gap="xs" mb="sm">
            <IconAlertCircle size={20} color={rallyColors.red} />
            <Title order={4} c={rallyColors.red}>
              پرداخت‌های معوق ({overdueAlerts.length})
            </Title>
          </Group>
          <Stack gap="sm">
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
          </Stack>
        </div>
      )}

      {/* Urgent Alerts */}
      {urgentAlerts.length > 0 && (
        <div>
          <Group gap="xs" mb="sm">
            <IconAlertTriangle size={20} color={rallyColors.yellow} />
            <Title order={4} c={rallyColors.yellow}>
              پرداخت‌های فوری - 3 روز یا کمتر ({urgentAlerts.length})
            </Title>
          </Group>
          <Stack gap="sm">
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
          </Stack>
        </div>
      )}

      {/* Upcoming Alerts */}
      {upcomingAlerts.length > 0 && (
        <div>
          <Group gap="xs" mb="sm">
            <IconCalendar size={20} color={rallyColors.blue} />
            <Title order={4} c={rallyColors.blue}>
              پرداخت‌های پیش رو ({upcomingAlerts.length})
            </Title>
          </Group>
          <Stack gap="sm">
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
          </Stack>
        </div>
      )}
    </Stack>
  );
}

export default AlertsDashboard;
