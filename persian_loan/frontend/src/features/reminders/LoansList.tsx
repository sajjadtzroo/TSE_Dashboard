/**
 * User Loans List Component
 *
 * Displays all user loans with summary information.
 */

import {
  Card,
  Text,
  Title,
  Group,
  Stack,
  SimpleGrid,
  Box,
  ActionIcon,
  Button,
  Skeleton,
  Progress,
  Tooltip,
} from '@mantine/core';
import {
  IconCreditCard,
  IconTrendingUp,
  IconCalendar,
  IconChevronLeft,
  IconTrash,
  IconEdit,
} from '@tabler/icons-react';
import { UserLoan } from '@/services';
import rallyColors from '@/theme/rallyColors';

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
    <Card
      withBorder
      radius="md"
      p="lg"
      style={{
        backgroundColor: rallyColors.card,
        border: `1px solid ${isCompleted ? `${rallyColors.green}66` : rallyColors.glassBorder}`,
      }}
    >
      {/* Header */}
      <Group justify="space-between" mb="md">
        <Group gap="sm">
          <Box
            p="xs"
            style={{
              borderRadius: 8,
              backgroundColor: isCompleted ? `${rallyColors.green}4d` : `${rallyColors.blue}4d`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconCreditCard
              size={20}
              color={isCompleted ? rallyColors.green : rallyColors.blue}
            />
          </Box>
          <div>
            <Text c={rallyColors.textPrimary} fw={500}>
              {loan.loanNameFA || loan.loanName}
            </Text>
            {(loan.bankNameFA || loan.bankName) && (
              <Text size="sm" c={rallyColors.textSecondary}>
                {loan.bankNameFA || loan.bankName}
              </Text>
            )}
          </div>
        </Group>

        <Group gap={4}>
          {onEdit && (
            <Tooltip label="ویرایش">
              <ActionIcon
                variant="subtle"
                color="blue"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <IconEdit size={16} />
              </ActionIcon>
            </Tooltip>
          )}
          {onDelete && (
            <Tooltip label="حذف">
              <ActionIcon
                variant="subtle"
                color="red"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </Group>

      {/* Stats */}
      <SimpleGrid cols={3} spacing="md" mb="md">
        <div>
          <Text size="xs" c={rallyColors.textSecondary} mb={4}>مبلغ وام</Text>
          <Text size="sm" fw={500} c={rallyColors.textPrimary}>
            {formatNumber(loan.principalAmount)}
          </Text>
          <Text size="xs" c={rallyColors.textDimmed}>تومان</Text>
        </div>
        <div>
          <Text size="xs" c={rallyColors.textSecondary} mb={4}>قسط ماهانه</Text>
          <Text size="sm" fw={500} c={rallyColors.blue}>
            {formatNumber(loan.monthlyPayment)}
          </Text>
          <Text size="xs" c={rallyColors.textDimmed}>تومان</Text>
        </div>
        <div>
          <Text size="xs" c={rallyColors.textSecondary} mb={4}>نرخ سود</Text>
          <Text size="sm" fw={500} c={rallyColors.textPrimary}>
            {loan.interestRate}%
          </Text>
          <Text size="xs" c={rallyColors.textDimmed}>سالانه</Text>
        </div>
      </SimpleGrid>

      {/* Progress Bar */}
      <Box mb="md">
        <Group justify="space-between" mb={4}>
          <Text size="xs" c={rallyColors.textSecondary}>پیشرفت پرداخت</Text>
          <Text size="xs" c={rallyColors.textSecondary}>
            {loan.paidInstallments} از {loan.totalInstallments} قسط
          </Text>
        </Group>
        <Progress
          value={progressPercent}
          color={isCompleted ? 'green' : 'blue'}
          size="sm"
          radius="xl"
        />
        <Text size="xs" c={rallyColors.textSecondary} mt={4} ta="left">
          {progressPercent}%
        </Text>
      </Box>

      {/* Next Payment / Status */}
      <Group
        justify="space-between"
        pt="sm"
        style={{ borderTop: `1px solid ${rallyColors.border}` }}
      >
        {isCompleted ? (
          <Group gap="xs" c={rallyColors.green}>
            <IconTrendingUp size={16} />
            <Text size="sm">تسویه شده</Text>
          </Group>
        ) : loan.nextPaymentDateJalali ? (
          <Group gap="xs" c={rallyColors.textSecondary}>
            <IconCalendar size={16} />
            <Text size="sm">قسط بعدی: {loan.nextPaymentDateJalali}</Text>
          </Group>
        ) : (
          <Text size="sm" c={rallyColors.textSecondary}>
            {getLoanTypeLabel(loan.loanType)}
          </Text>
        )}

        {onClick && (
          <Button
            variant="subtle"
            size="xs"
            rightSection={<IconChevronLeft size={14} />}
            onClick={onClick}
            style={{ color: rallyColors.blue }}
          >
            جزئیات
          </Button>
        )}
      </Group>
    </Card>
  );
}

function LoanCardSkeleton() {
  return (
    <Card
      withBorder
      radius="md"
      p="lg"
      style={{
        backgroundColor: rallyColors.card,
        border: `1px solid ${rallyColors.glassBorder}`,
      }}
    >
      <Group gap="sm" mb="md">
        <Skeleton height={40} width={40} radius="md" />
        <Stack gap="xs" style={{ flex: 1 }}>
          <Skeleton height={16} width="66%" />
          <Skeleton height={12} width="33%" />
        </Stack>
      </Group>
      <SimpleGrid cols={3} spacing="md" mb="md">
        {[1, 2, 3].map((i) => (
          <Stack key={i} gap="xs">
            <Skeleton height={12} width="100%" />
            <Skeleton height={16} width="75%" />
          </Stack>
        ))}
      </SimpleGrid>
      <Skeleton height={8} radius="xl" mb="md" />
      <Skeleton height={16} width="50%" />
    </Card>
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
      <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="md">
        {[1, 2, 3].map((i) => (
          <LoanCardSkeleton key={i} />
        ))}
      </SimpleGrid>
    );
  }

  if (!loans || loans.length === 0) {
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
        <IconCreditCard
          size={64}
          color={rallyColors.textDimmed}
          style={{ margin: '0 auto 16px' }}
        />
        <Title order={4} c={rallyColors.textSecondary} mb="xs">
          هنوز وامی ثبت نشده
        </Title>
        <Text c={rallyColors.textSecondary}>
          برای شروع، اولین وام خود را اضافه کنید
        </Text>
      </Card>
    );
  }

  return (
    <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="md">
      {loans.map((loan) => (
        <LoanCard
          key={loan.id}
          loan={loan}
          onClick={onLoanClick ? () => onLoanClick(loan.id) : undefined}
          onEdit={onEditLoan ? () => onEditLoan(loan) : undefined}
          onDelete={onDeleteLoan ? () => onDeleteLoan(loan.id) : undefined}
        />
      ))}
    </SimpleGrid>
  );
}

export default LoansList;
