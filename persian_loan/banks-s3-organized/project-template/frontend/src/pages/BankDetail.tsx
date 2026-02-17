/**
 * Bank Detail Page
 */

import { useParams } from 'react-router-dom';
import { BankDetailView } from '../features/banks';

export default function BankDetail() {
  const { bankId } = useParams<{ bankId: string }>();

  if (!bankId) {
    return <div>شناسه بانک نامعتبر است</div>;
  }

  return <BankDetailView bankId={bankId} />;
}
