import { useParams } from 'react-router-dom';
import { Text } from '@mantine/core';
import { BankDetailView } from '../../features/loans/banks';

export default function BankDetail() {
  const { bankId } = useParams<{ bankId: string }>();

  if (!bankId) {
    return <Text c="dimmed">شناسه بانک نامعتبر است</Text>;
  }

  return <BankDetailView bankId={bankId} />;
}
