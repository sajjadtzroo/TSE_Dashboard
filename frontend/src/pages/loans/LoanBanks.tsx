import { Stack, Title } from '@mantine/core';
import { BanksList } from '../../features/loans/banks';
import RallyBreadcrumbs from '../../components/RallyBreadcrumbs';

export default function Banks() {
  return (
    <Stack gap="lg">
      <RallyBreadcrumbs items={[{ label: 'وام‌ها', path: '/loans' }, { label: 'بانک‌ها' }]} />
      <Title order={2}>بانک‌ها</Title>
      <BanksList />
    </Stack>
  );
}
