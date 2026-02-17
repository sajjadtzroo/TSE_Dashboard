/**
 * Loans Page
 */

import { LoansList } from '../features/loans';

export default function Loans() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-100">وام‌ها</h2>
      <LoansList />
    </div>
  );
}
