import { useParams, Link } from 'react-router-dom';
import { Stack, Group, Anchor, Button, Center } from '@mantine/core';
import { IconArrowRight, IconHome } from '@tabler/icons-react';
import { useLoans, useBank } from '../../hooks/loans';
import { LoadingPage, Empty, Breadcrumb } from '../../components/loans/ui';
import { LoanDetailCard } from '../../components/loans/cards';
import { LoanDetailCFASection } from '../../features/loans/loan-list/LoanDetailCFASection';
import rallyColors from '../../theme/rallyColors';

export default function LoanDetail() {
  const { bankId, loanId } = useParams<{ bankId: string; loanId: string }>();
  const { data: allLoans, isLoading: loansLoading } = useLoans();
  const { data: bank, isLoading: bankLoading } = useBank(bankId || '');

  if (loansLoading || bankLoading) {
    return <LoadingPage />;
  }

  const loan = allLoans?.find(
    (l) => l.bankId === bankId && l.id === loanId
  );

  if (!loan) {
    return (
      <Stack gap="lg">
        <Anchor component={Link} to="/loans/list" c="dimmed" size="sm">
          <Group gap={6}>
            <IconArrowRight size={16} />
            <span>بازگشت به لیست وام‌ها</span>
          </Group>
        </Anchor>
        <Empty
          title="وام یافت نشد"
          description="وام مورد نظر در سیستم موجود نیست"
          action={
            <Anchor component={Link} to="/loans/list" c={rallyColors.primary}>
              بازگشت به لیست وام‌ها
            </Anchor>
          }
        />
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <Breadcrumb
        items={[
          { label: 'خانه', href: '/loans', icon: IconHome },
          { label: 'بانک‌ها', href: '/loans/banks' },
          ...(bank ? [{ label: bank.nameFA, href: `/loans/banks/${bank.id}` }] : []),
          { label: loan.nameFA },
        ]}
      />

      <Anchor component={Link} to="/loans/list" c="dimmed" size="sm">
        <Group gap={6}>
          <IconArrowRight size={16} />
          <span>بازگشت به لیست وام‌ها</span>
        </Group>
      </Anchor>

      <LoanDetailCard loan={loan} />

      <LoanDetailCFASection loan={loan} />

      <Center>
        <Button
          component={Link}
          to={`/loans/banks/${loan.bankId}`}
          variant="light"
          color="rally-primary"
          size="md"
        >
          مشاهده جزئیات بانک {loan.bankNameFA || ''}
        </Button>
      </Center>
    </Stack>
  );
}
