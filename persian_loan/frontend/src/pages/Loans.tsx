import { Stack, Title } from '@mantine/core';
import { LoansList } from '../features/loans';

export default function Loans() {
  return (
    <Stack gap="lg">
      <Title order={2}>وام‌ها</Title>
      <LoansList />
    </Stack>
  );
}
