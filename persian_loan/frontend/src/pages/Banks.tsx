import { Stack, Title } from '@mantine/core';
import { BanksList } from '../features/banks';

export default function Banks() {
  return (
    <Stack gap="lg">
      <Title order={2}>بانک‌ها</Title>
      <BanksList />
    </Stack>
  );
}
